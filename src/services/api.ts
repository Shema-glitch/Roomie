/**
 * Roomie Fake Data & Service Layer
 * Simulates a real backend (Supabase/Postgres) with local state persistence
 */

import {
  User,
  Household,
  Membership,
  JoinRequest,
  Expense,
  Settlement,
  PersonalExpense,
  Chore,
  DraftRound,
  DraftPick,
  ChoreAssignment,
  ChatMessage,
  MeetingTopic,
  HouseAgreement,
  InAppNotification,
  UserSettings,
  DutySchedule,
  DutyDayEntry,
  DayOfWeek,
} from '../types';
import {
  generateDutySchedule,
  reassignDutyDay as reassignDutyDayUtil,
  swapDutyDays as swapDutyDaysUtil,
  getTodayDuty,
  getMondayOfWeek,
} from '../utils/dutyRotation';
import { calculateBalances } from '../utils/balances';
import { matchChores } from '../utils/matching';
import { getChoreDraftState, getChoreStateEvent, UnifiedDraftState } from '../utils/stateTable';
import { outbox, OutboxActionType } from './outbox';
import { debugLog, DebugModule } from '../utils/debugLog';
import { hashLocalPassword, validateEmail, validatePassword } from '../utils/authValidation';
import { getPendingInviteCode } from '../utils/inviteLink';
import {
  getSavedAccounts,
  isAccountSaved,
  removeSavedAccount,
  SavedLoginAccount,
  updateSavedAccountTokens,
  upsertSavedAccount,
} from '../utils/savedAccounts';
import { clearLocalSupabaseSessionStorage, supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'roomie_prototype_v3_store';

interface AppStore {
  currentUser: User;
  users: User[];
  households: Household[];
  activeHouseholdId: string;
  memberships: Membership[];
  joinRequests: JoinRequest[];
  expenses: Expense[];
  settlements: Settlement[];
  personalExpenses: PersonalExpense[];
  chores: Chore[];
  draftRounds: Record<string, DraftRound>; // householdId -> DraftRound
  messages: Record<string, ChatMessage[]>; // householdId -> messages
  meetingTopics: Record<string, MeetingTopic[]>;
  agreements: Record<string, HouseAgreement[]>;
  notifications: InAppNotification[];
  dutySchedules?: Record<string, DutySchedule>;
  settings: UserSettings;
  householdSetupMode?: 'pending' | 'configured' | 'demo';
  localSessionActive?: boolean;
  localAccounts?: Record<
    string,
    {
      id: string;
      name: string;
      email: string;
      passwordHash: string;
      setupMode: 'pending' | 'configured' | 'demo';
      createdAt: string;
    }
  >;
  localSession?: {
    userId: string;
    email: string;
    expiresAt: number;
  } | null;
}

// Initial realistic seed data
function getInitialStore(): AppStore {
  const currentUser: User = {
    id: 'u_curr',
    name: 'Kai Tanaka',
    email: 'kai.tanaka@student.emu.edu.tr',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    country: 'Japan',
    countryCode: 'JP',
    flag: '🇯🇵',
    isHome: true,
    streakDays: 7,
    points: 140,
    awayUntil: null,
  };

  const users: User[] = [
    currentUser,
    {
      id: 'u_amina',
      name: 'Amina Mansour',
      email: 'amina.m@student.emu.edu.tr',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
      country: 'Morocco',
      countryCode: 'MA',
      flag: '🇲🇦',
      isHome: true,
      streakDays: 14,
      points: 230,
      awayUntil: null,
    },
    {
      id: 'u_lucas',
      name: 'Lucas Müller',
      email: 'lucas.m@student.emu.edu.tr',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      country: 'Germany',
      countryCode: 'DE',
      flag: '🇩🇪',
      isHome: false,
      streakDays: 5,
      points: 95,
      awayUntil: null,
    },
    {
      id: 'u_yasmin',
      name: 'Yasmin Demir',
      email: 'yasmin.d@student.emu.edu.tr',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      country: 'Cyprus',
      countryCode: 'CY',
      flag: '🇨🇾',
      isHome: true,
      streakDays: 9,
      points: 180,
      awayUntil: null,
    },
  ];

  const households: Household[] = [
    {
      id: 'h_main',
      name: 'Sunny Flat 4B',
      currency: 'TRY',
      inviteCode: 'CYP4B892',
      invitesEnabled: true,
      createdBy: 'u_amina',
      settings: {
        rotationInterval: 'weekly',
        rotatingAdmin: false,
        quietHours: '23:00 - 08:00',
      },
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'h_second',
      name: 'Summer Flat Kyrenia',
      currency: 'TRY',
      inviteCode: 'KYR81088',
      invitesEnabled: true,
      createdBy: 'u_curr',
      settings: {
        rotationInterval: 'monthly',
        rotatingAdmin: true,
        quietHours: '00:00 - 09:00',
      },
      createdAt: '2026-06-15T00:00:00Z',
    },
  ];

  const memberships: Membership[] = [
    { id: 'm1', userId: 'u_curr', householdId: 'h_main', role: 'admin', status: 'active', joinedAt: '2026-09-01T00:00:00Z' },
    { id: 'm2', userId: 'u_amina', householdId: 'h_main', role: 'member', status: 'active', joinedAt: '2026-09-01T00:00:00Z' },
    { id: 'm3', userId: 'u_lucas', householdId: 'h_main', role: 'member', status: 'active', joinedAt: '2026-09-02T00:00:00Z' },
    { id: 'm4', userId: 'u_yasmin', householdId: 'h_main', role: 'member', status: 'active', joinedAt: '2026-09-03T00:00:00Z' },
    // second household
    { id: 'm5', userId: 'u_curr', householdId: 'h_second', role: 'admin', status: 'active', joinedAt: '2026-06-15T00:00:00Z' },
  ];

  const joinRequests: JoinRequest[] = [
    {
      id: 'jr_1',
      householdId: 'h_main',
      userName: 'Tariq Al-Mansoor',
      userEmail: 'tariq.mansoor@student.emu.edu.tr',
      userCountry: 'Egypt',
      userFlag: '🇪🇬',
      userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      createdAt: '2026-10-22T14:30:00Z',
      votes: [
        { userId: 'u_amina', vote: 'ok' },
        { userId: 'u_lucas', vote: 'ok' },
      ],
      status: 'pending',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp_0_rent',
      householdId: 'h_main',
      paidBy: 'u_curr',
      title: 'October Apartment Rent (Lefkoşa 4B)',
      amount: 3200,
      category: 'rent',
      receiptUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80',
      date: '2026-10-01',
      status: 'agreed',
      shares: [
        { userId: 'u_curr', shareAmount: 800, response: 'agreed' },
        { userId: 'u_amina', shareAmount: 800, response: 'agreed' },
        { userId: 'u_lucas', shareAmount: 800, response: 'agreed' },
        { userId: 'u_yasmin', shareAmount: 800, response: 'agreed' },
      ],
      createdAt: '2026-10-01T09:00:00Z',
    },
    {
      id: 'exp_1',
      householdId: 'h_main',
      paidBy: 'u_amina',
      title: 'Weekly Groceries (Lemar Supermarket)',
      amount: 780,
      category: 'groceries',
      receiptUrl: 'https://images.unsplash.com/photo-1554415707-9e44667ff469?w=600&auto=format&fit=crop&q=80',
      date: '2026-10-20',
      status: 'agreed',
      shares: [
        { userId: 'u_amina', shareAmount: 195, response: 'agreed' },
        { userId: 'u_curr', shareAmount: 195, response: 'agreed' },
        { userId: 'u_lucas', shareAmount: 195, response: 'agreed' },
        { userId: 'u_yasmin', shareAmount: 195, response: 'agreed' },
      ],
      createdAt: '2026-10-20T11:15:00Z',
    },
    {
      id: 'exp_2',
      householdId: 'h_main',
      paidBy: 'u_lucas',
      title: 'Fiber Internet 100Mbps (KKTCELL)',
      amount: 420,
      category: 'utilities',
      receiptUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&auto=format&fit=crop&q=80',
      date: '2026-10-18',
      status: 'agreed',
      shares: [
        { userId: 'u_lucas', shareAmount: 105, response: 'agreed' },
        { userId: 'u_amina', shareAmount: 105, response: 'agreed' },
        { userId: 'u_curr', shareAmount: 105, response: 'agreed' },
        { userId: 'u_yasmin', shareAmount: 105, response: 'agreed' },
      ],
      createdAt: '2026-10-18T09:00:00Z',
    },
    {
      id: 'exp_shoerack',
      householdId: 'h_main',
      paidBy: 'u_amina',
      title: 'Hallway Shoe Rack & Storage Bins',
      amount: 360,
      category: 'household',
      receiptUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&auto=format&fit=crop&q=80',
      date: '2026-10-23',
      status: 'pending',
      shares: [
        { userId: 'u_amina', shareAmount: 90, response: 'agreed' },
        { userId: 'u_curr', shareAmount: 90, response: 'pending' },
        { userId: 'u_lucas', shareAmount: 90, response: 'agreed' },
        { userId: 'u_yasmin', shareAmount: 90, response: 'agreed' },
      ],
      createdAt: '2026-10-23T11:15:00Z',
    },
    {
      id: 'exp_3',
      householdId: 'h_main',
      paidBy: 'u_curr',
      title: 'Bathroom Cleaners & New Mop Head',
      amount: 240,
      category: 'household',
      receiptUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
      date: '2026-10-22',
      status: 'pending',
      shares: [
        { userId: 'u_curr', shareAmount: 60, response: 'agreed' },
        { userId: 'u_amina', shareAmount: 60, response: 'agreed' },
        { userId: 'u_lucas', shareAmount: 60, response: 'pending' },
        { userId: 'u_yasmin', shareAmount: 60, response: 'pending' },
      ],
      createdAt: '2026-10-22T16:20:00Z',
    },
    {
      id: 'exp_4',
      householdId: 'h_main',
      paidBy: 'u_yasmin',
      title: 'Extra Olive Oil & Halloumi Cheese',
      amount: 180,
      category: 'groceries',
      date: '2026-10-21',
      status: 'disputed',
      shares: [
        { userId: 'u_yasmin', shareAmount: 60, response: 'agreed' },
        { userId: 'u_curr', shareAmount: 60, response: 'agreed' },
        { userId: 'u_lucas', shareAmount: 60, response: 'disputed', disputeReason: "Lucas has his own lactose-free butter and didn't eat the cheese" },
      ],
      createdAt: '2026-10-21T18:40:00Z',
    },
  ];

  const settlements: Settlement[] = [
    {
      id: 'set_1',
      householdId: 'h_main',
      fromUser: 'u_lucas',
      toUser: 'u_amina',
      amount: 150,
      status: 'confirmed',
      createdAt: '2026-10-21T14:00:00Z',
      confirmedAt: '2026-10-21T15:30:00Z',
    },
  ];

  const personalExpenses: PersonalExpense[] = [
    { id: 'pe_1', userId: 'u_curr', title: 'Course Notebooks & Coffee', amount: 120, category: 'other', date: '2026-10-22' },
  ];

  const chores: Chore[] = [
    {
      id: 'ch_bathroom',
      householdId: 'h_main',
      name: 'Deep Clean Bathroom & Shower',
      frequency: 'weekly',
      effortLevel: 'heavy',
      active: true,
      description: 'Scrub tiles, wipe mirror, clean sink and shower drain',
      iconName: 'Bath',
    },
    {
      id: 'ch_kitchen',
      householdId: 'h_main',
      name: 'Kitchen Counters & Stovetop',
      frequency: 'daily',
      effortLevel: 'medium',
      active: true,
      description: 'Wipe down cooking grease, disinfect surfaces',
      iconName: 'Flame',
    },
    {
      id: 'ch_dishes',
      householdId: 'h_main',
      name: 'Dishwasher & Sink Clearance',
      frequency: 'daily',
      effortLevel: 'medium',
      active: true,
      description: 'Unload clean dishwasher and keep sink empty',
      iconName: 'Sparkles',
    },
    {
      id: 'ch_trash',
      householdId: 'h_main',
      name: 'Take Out Trash & Recycling',
      frequency: 'daily',
      effortLevel: 'light',
      active: true,
      description: 'Empty main bins to outside container, new liner',
      iconName: 'Trash2',
    },
    {
      id: 'ch_mop',
      householdId: 'h_main',
      name: 'Living Room Sweep & Mop',
      frequency: 'weekly',
      effortLevel: 'medium',
      active: true,
      description: 'Sweep hallway and living area, mop with lemon pine',
      iconName: 'Brush',
    },
    {
      id: 'ch_cook',
      householdId: 'h_main',
      name: 'Cook House Dinner',
      frequency: 'daily',
      effortLevel: 'heavy',
      active: true,
      description: 'Prepare dinner for everyone dining in tonight',
      iconName: 'Utensils',
    },
    {
      id: 'ch_groceries',
      householdId: 'h_main',
      name: 'Supermarket Supply Run',
      frequency: 'weekly',
      effortLevel: 'light',
      active: true,
      description: 'Pick up milk, eggs, bread and household essentials',
      iconName: 'ShoppingCart',
    },
  ];

  const draftRound: DraftRound = {
    id: 'dr_round_42',
    householdId: 'h_main',
    status: 'ready_to_reveal',
    createdAt: '2026-10-23T08:00:00Z',
    picks: [
      { userId: 'u_curr', choreId: 'ch_cook', pickType: 'want' },
      { userId: 'u_curr', choreId: 'ch_bathroom', pickType: 'avoid' },
      { userId: 'u_curr', choreId: 'ch_dishes', pickType: 'suggest_for', targetUserId: 'u_lucas' },
      
      { userId: 'u_amina', choreId: 'ch_bathroom', pickType: 'want' },
      { userId: 'u_amina', choreId: 'ch_trash', pickType: 'avoid' },
      
      { userId: 'u_lucas', choreId: 'ch_trash', pickType: 'want' },
      { userId: 'u_lucas', choreId: 'ch_cook', pickType: 'avoid' },
      
      { userId: 'u_yasmin', choreId: 'ch_kitchen', pickType: 'want' },
      { userId: 'u_yasmin', choreId: 'ch_dishes', pickType: 'avoid' },
    ],
    assignments: [
      {
        choreId: 'ch_cook',
        userId: 'u_curr',
        scheduledDays: ['Daily'],
        scheduledTime: '19:30',
        completedToday: false,
        kudos: [],
      },
      {
        choreId: 'ch_mop',
        userId: 'u_curr',
        scheduledDays: ['Sat'],
        scheduledTime: '11:00',
        completedToday: false,
        kudos: [],
      },
      {
        choreId: 'ch_bathroom',
        userId: 'u_amina',
        scheduledDays: ['Sat'],
        scheduledTime: '18:00',
        completedToday: true,
        lastPhotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
        kudos: [
          { id: 'k1', fromUser: 'u_curr', type: 'great_job', note: 'Bathroom smells like fresh lavender!', createdAt: '2026-10-23T11:00:00Z' },
          { id: 'k2', fromUser: 'u_yasmin', type: 'thanks', note: 'Thank you Amina!', createdAt: '2026-10-23T11:15:00Z' },
        ],
      },
      {
        choreId: 'ch_trash',
        userId: 'u_lucas',
        scheduledDays: ['Daily'],
        scheduledTime: '21:00',
        completedToday: true,
        kudos: [
          { id: 'k3', fromUser: 'u_amina', type: 'thanks', createdAt: '2026-10-23T09:30:00Z' }
        ],
      },
      {
        choreId: 'ch_kitchen',
        userId: 'u_yasmin',
        scheduledDays: ['Daily'],
        scheduledTime: '20:00',
        completedToday: false,
        kudos: [],
      },
      {
        choreId: 'ch_dishes',
        userId: 'u_lucas',
        scheduledDays: ['Daily'],
        scheduledTime: '22:00',
        completedToday: false,
        kudos: [],
      },
      {
        choreId: 'ch_groceries',
        userId: 'u_yasmin',
        scheduledDays: ['Sat'],
        scheduledTime: '14:00',
        completedToday: false,
        kudos: [],
      },
    ],
  };

  const messages: Record<string, ChatMessage[]> = {
    h_main: [
      {
        id: 'msg_1',
        householdId: 'h_main',
        senderId: 'u_amina',
        type: 'text',
        body: 'Hey roomies! Welcome to our flat! Who is cooking dinner tonight? 🥘',
        createdAt: '2026-10-23T10:15:00Z',
        reactions: [{ emoji: '😋', userIds: ['u_curr', 'u_lucas'] }],
      },
      {
        id: 'msg_2',
        householdId: 'h_main',
        senderId: null,
        type: 'activity',
        body: 'Amina added a receipt: Weekly Groceries (₺780.00)',
        linkTarget: { screen: 'expenses', id: 'exp_1' },
        createdAt: '2026-10-23T10:20:00Z',
      },
      {
        id: 'msg_3',
        householdId: 'h_main',
        senderId: 'u_curr',
        type: 'text',
        body: "I'll make Japanese curry tonight! Ready around 19:30.",
        createdAt: '2026-10-23T10:25:00Z',
        reactions: [{ emoji: '🎉', userIds: ['u_amina', 'u_yasmin', 'u_lucas'] }],
      },
      {
        id: 'msg_4',
        householdId: 'h_main',
        senderId: null,
        type: 'activity',
        body: 'Amina completed Deep Clean Bathroom! ✨ Give kudos?',
        linkTarget: { screen: 'chores', id: 'ch_bathroom' },
        createdAt: '2026-10-23T11:00:00Z',
      },
      {
        id: 'msg_5',
        householdId: 'h_main',
        senderId: 'u_lucas',
        type: 'text',
        body: 'Curry sounds amazing Kai! I took the bins out already btw.',
        createdAt: '2026-10-23T11:30:00Z',
      },
      {
        id: 'msg_draft_status',
        householdId: 'h_main',
        senderId: null,
        type: 'activity',
        body: getChoreStateEvent(getChoreDraftState(draftRound, currentUser.id).state).activityMessage,
        linkTarget: getChoreStateEvent(getChoreDraftState(draftRound, currentUser.id).state).linkTarget,
        createdAt: '2026-10-23T11:45:00Z',
      },
    ],
  };

  const meetingTopics: Record<string, MeetingTopic[]> = {
    h_main: [
      {
        id: 'mt_1',
        householdId: 'h_main',
        proposedBy: 'u_curr',
        title: 'Quiet hours during midterm exams next week',
        description: 'Midterms start Monday. Can we agree on quiet after 22:30 instead of 23:00 so everyone can sleep and focus?',
        status: 'open',
        votes: [
          { userId: 'u_curr', vote: 'agree' },
          { userId: 'u_amina', vote: 'agree' },
          { userId: 'u_lucas', vote: 'agree' },
        ],
        comments: [
          { id: 'c1', userId: 'u_amina', text: '100% agreed, I have 8:30 AM biology exam.', createdAt: '2026-10-23T09:00:00Z' },
          { id: 'c2', userId: 'u_lucas', text: 'Sounds fair! Headphone rule in common room too.', createdAt: '2026-10-23T09:30:00Z' },
        ],
      },
      {
        id: 'mt_2',
        householdId: 'h_main',
        proposedBy: 'u_yasmin',
        title: 'Air conditioning schedule & electricity cap',
        description: 'Electricity rates in TRNC are high in autumn/summer. Let us agree to turn AC off when leaving the apartment.',
        status: 'agreed',
        votes: [
          { userId: 'u_yasmin', vote: 'agree' },
          { userId: 'u_amina', vote: 'agree' },
          { userId: 'u_curr', vote: 'agree' },
          { userId: 'u_lucas', vote: 'agree' },
        ],
        comments: [],
      },
    ],
  };

  const agreements: Record<string, HouseAgreement[]> = {
    h_main: [
      {
        id: 'agr_1',
        householdId: 'h_main',
        text: 'Quiet hours are from 23:00 to 08:00 on weeknights (headphones in living room).',
        category: 'Noise & Guests',
        agreedAt: '2026-09-05T00:00:00Z',
      },
      {
        id: 'agr_2',
        householdId: 'h_main',
        text: 'Turn off all AC units and water heaters whenever stepping outside the flat.',
        category: 'Utilities & Bills',
        agreedAt: '2026-09-10T00:00:00Z',
      },
      {
        id: 'agr_3',
        householdId: 'h_main',
        text: 'Rinse plates and soak pans immediately after cooking—no overnight crusts in the sink.',
        category: 'Kitchen Standards',
        agreedAt: '2026-09-15T00:00:00Z',
      },
    ],
  };

  const notifications: InAppNotification[] = [
    {
      id: 'notif_1',
      userId: 'u_curr',
      type: 'chore',
      title: getChoreStateEvent(getChoreDraftState(draftRound, currentUser.id).state).title,
      body: getChoreStateEvent(getChoreDraftState(draftRound, currentUser.id).state).body,
      read: false,
      createdAt: '2026-10-23T11:45:00Z',
      linkTarget: getChoreStateEvent(getChoreDraftState(draftRound, currentUser.id).state).linkTarget,
    },
    {
      id: 'notif_2',
      userId: 'u_curr',
      type: 'expense',
      title: 'New receipt from Amina',
      body: 'Weekly Groceries (₺780.00). Your share is ₺195.00.',
      read: false,
      createdAt: '2026-10-20T11:15:00Z',
      linkTarget: { screen: 'expenses', id: 'exp_1' },
    },
    {
      id: 'notif_3',
      userId: 'u_curr',
      type: 'household',
      title: 'New roomie join request',
      body: 'Tariq Al-Mansoor wants to join your flat.',
      read: false,
      createdAt: '2026-10-22T14:30:00Z',
      linkTarget: { screen: 'members' },
    },
  ];

  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const settings: UserSettings = {
    language: 'en',
    soundEnabled: false,
    reducedMotion: prefersReduced,
    pushNotifications: true,
    reminderEarly30Min: true,
  };

  return {
    currentUser,
    users,
    households,
    activeHouseholdId: 'h_main',
    memberships,
    joinRequests,
    expenses,
    settlements,
    personalExpenses,
    chores,
    draftRounds: { h_main: draftRound },
    messages,
    meetingTopics,
    agreements,
    notifications,
    dutySchedules: {},
    settings,
  };
}

// --- Supabase Postgres Row Mappers ---
function mapProfileToUser(p: any): User {
  if (!p) {
    return {
      id: 'u_curr',
      name: 'Roomie',
      email: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      country: '',
      countryCode: 'XX',
      flag: '🌐',
      isHome: true,
      streakDays: 0,
      points: 0,
      awayUntil: null,
    };
  }
  return {
    id: p.id,
    name: p.name || 'Roomie',
    email: p.email || '',
    avatar: p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    country: p.country || '',
    countryCode: p.country_code || 'XX',
    flag: p.flag || '🌐',
    isHome: p.is_home ?? true,
    streakDays: p.streak_days ?? 0,
    points: p.points ?? 0,
    awayUntil: p.away_until || null,
  };
}

function mapHousehold(h: any): Household {
  return {
    id: h.id,
    name: h.name,
    currency: h.currency || 'TRY',
    inviteCode: h.invite_code,
    invitesEnabled: h.invites_enabled ?? true,
    createdBy: h.created_by,
    settings: h.settings || { rotationInterval: 'weekly', rotatingAdmin: false, quietHours: '23:00 - 08:00' },
    createdAt: h.created_at,
  };
}

function mapExpense(e: any, shares: any[] = []): Expense {
  return {
    id: e.id,
    householdId: e.household_id,
    paidBy: e.paid_by,
    title: e.title,
    amount: Number(e.amount),
    category: e.category,
    receiptUrl: e.receipt_url || undefined,
    date: e.date,
    status: e.status,
    shares: shares.map((s) => ({
      userId: s.user_id,
      shareAmount: Number(s.share_amount),
      response: s.response,
      disputeReason: s.dispute_reason || undefined,
    })),
    createdAt: e.created_at,
  };
}

function mapSettlement(s: any): Settlement {
  return {
    id: s.id,
    householdId: s.household_id,
    fromUser: s.from_user,
    toUser: s.to_user,
    amount: Number(s.amount),
    status: s.status,
    confirmedAt: s.confirmed_at || undefined,
    createdAt: s.created_at,
  };
}

function mapChore(c: any): Chore {
  return {
    id: c.id,
    householdId: c.household_id,
    name: c.name,
    frequency: c.frequency,
    effortLevel: c.effort_level,
    active: c.active ?? true,
    description: c.description || '',
    iconName: c.icon_name || 'Sparkles',
  };
}

function isUuid(val?: string | null): boolean {
  return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
}

function makeEntityId(prefix: string, useUuid: boolean): string {
  if (useUuid && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function mapMeetingTopic(t: any): MeetingTopic {
  return {
    id: t.id,
    householdId: t.household_id,
    proposedBy: t.proposed_by,
    title: t.title,
    description: t.description || '',
    status: t.status,
    votes: Array.isArray(t.votes) ? t.votes : [],
    comments: Array.isArray(t.comments) ? t.comments : [],
  };
}

function mapAgreement(a: any): HouseAgreement {
  return {
    id: a.id,
    householdId: a.household_id,
    text: a.text,
    category: a.category,
    agreedAt: a.agreed_at || a.created_at,
  };
}

function mapNotification(n: any): InAppNotification {
  return {
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: Boolean(n.read),
    createdAt: n.created_at,
    linkTarget: n.link_target || undefined,
  };
}

function toDraftPickRow(roundId: string, pk: DraftPick) {
  return {
    round_id: roundId,
    user_id: pk.userId,
    chore_id: pk.choreId,
    pick_type: pk.pickType,
    target_user_id: pk.targetUserId || null,
  };
}

function toChoreAssignmentRow(roundId: string, a: ChoreAssignment) {
  return {
    round_id: roundId,
    chore_id: a.choreId,
    user_id: a.userId,
    scheduled_days: a.scheduledDays,
    scheduled_time: a.scheduledTime,
    completed_today: a.completedToday,
    last_photo_url: a.lastPhotoUrl || null,
    kudos: (a.kudos || []) as any,
  };
}

function mapChatMessage(m: any): ChatMessage {
  return {
    id: m.id,
    householdId: m.household_id,
    senderId: m.sender_id,
    type: m.type,
    body: m.body,
    linkTarget: m.link_target || undefined,
    reactions: m.reactions || [],
    createdAt: m.created_at,
  };
}

class ApiService {
  private store: AppStore;

  constructor() {
    this.store = this.load();
    outbox.setSyncHandler(this.processOutboxItem.bind(this));
    outbox.initAutoFlush();
  }

  private getDebugModuleForOutboxType(type: OutboxActionType): DebugModule {
    if (type.includes('expense')) return 'expenses';
    if (type.includes('settlement')) return 'settlements';
    if (type.includes('draft') || type.includes('chore') || type.includes('kudos') || type.includes('assignment')) {
      return 'chores_draft';
    }
    if (type.includes('topic') || type.includes('comment') || type.includes('agreement')) return 'governance';
    if (type.includes('message') || type.includes('reaction')) return 'chat';
    if (type.includes('notification')) return 'notifications';
    return 'outbox';
  }

  private dispatchRemoteMutation<T>(
    householdId: string,
    module: DebugModule,
    outboxType: OutboxActionType,
    payload: T,
    summary: string,
    remoteExec: () => Promise<{ error: any } | void>
  ): void {
    if (this.isDemoMode() || !isUuid(householdId)) return;
    const action = outbox.enqueue(householdId, outboxType, payload);
    if (!supabase) return;

    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    Promise.resolve()
      .then(() => remoteExec())
      .then((res) => {
        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        const err = res && 'error' in res ? res.error : null;
        if (!err) {
          outbox.markSuccess(action.id);
          debugLog.info(module, outboxType, summary, { householdId, actionId: action.id }, durationMs);
        } else {
          outbox.markFailed(action.id, err.message);
          debugLog.warn(module, outboxType, `${summary} failed: ${err.message}`, {
            householdId,
            actionId: action.id,
            code: err.code,
          }, durationMs);
        }
      })
      .catch((err: any) => {
        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        const msg = err?.message || 'Network error';
        outbox.markFailed(action.id, msg);
        debugLog.error(module, outboxType, `${summary} network error: ${msg}`, { householdId, actionId: action.id }, durationMs);
      });
  }

  private async processOutboxItem(item: any): Promise<boolean> {
    if (!supabase) return false;
    const sb = supabase;
    const mod = this.getDebugModuleForOutboxType(item.type);
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      let error: any = null;
      const p = item.payload || {};

      switch (item.type as OutboxActionType) {
        case 'create_expense': {
          const exp: Expense = p.expense;
          const res1 = await sb.from('expenses').upsert(
            {
              ...(isUuid(exp.id) ? { id: exp.id } : {}),
              household_id: exp.householdId,
              paid_by: exp.paidBy,
              title: exp.title,
              amount: exp.amount,
              category: exp.category,
              receipt_url: exp.receiptUrl || null,
              date: exp.date,
              status: exp.status,
            },
            { onConflict: 'id' }
          );
          error = res1.error;
          if (!error && Array.isArray(exp.shares) && exp.shares.length > 0 && isUuid(exp.id)) {
            const shareRows = exp.shares.map((s) => ({
              expense_id: exp.id,
              user_id: s.userId,
              share_amount: s.shareAmount,
              response: s.response,
              dispute_reason: s.disputeReason || null,
            }));
            const res2 = await sb.from('expense_shares').upsert(shareRows, { onConflict: 'expense_id,user_id' });
            error = res2.error;
          }
          break;
        }
        case 'agree_expense':
        case 'dispute_expense': {
          const { expenseId, userId, response, disputeReason, nextStatus } = p;
          let shareQuery = sb
            .from('expense_shares')
            .update({ response, dispute_reason: disputeReason || null })
            .eq('expense_id', expenseId);
          if (userId) shareQuery = shareQuery.eq('user_id', userId);
          const res1 = await shareQuery;
          error = res1.error;
          if (!error && nextStatus) {
            const res2 = await sb
              .from('expenses')
              .update({
                status: nextStatus,
                dispute_reason: response === 'disputed' ? disputeReason || null : null,
              })
              .eq('id', expenseId);
            error = res2.error;
          }
          break;
        }
        case 'edit_expense_split': {
          const { expenseId, shares } = p;
          const res1 = await sb
            .from('expense_shares')
            .upsert(
              (shares || []).map((s: any) => ({
                expense_id: expenseId,
                user_id: s.userId,
                share_amount: s.shareAmount,
                response: 'agreed',
                dispute_reason: null,
              })),
              { onConflict: 'expense_id,user_id' }
            );
          error = res1.error;
          if (!error) {
            const res2 = await sb.from('expenses').update({ status: 'agreed', dispute_reason: null }).eq('id', expenseId);
            error = res2.error;
          }
          break;
        }
        case 'cancel_expense': {
          const res = await sb.from('expenses').update({ status: 'cancelled' }).eq('id', p.expenseId);
          error = res.error;
          break;
        }
        case 'create_settlement': {
          const s: Settlement = p.settlement;
          const res = await sb.from('settlements').upsert(
            {
              ...(isUuid(s.id) ? { id: s.id } : {}),
              household_id: s.householdId,
              from_user: s.fromUser,
              to_user: s.toUser,
              amount: s.amount,
              status: s.status,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'confirm_settlement': {
          const res = await sb
            .from('settlements')
            .update({ status: 'confirmed', confirmed_at: p.confirmedAt || new Date().toISOString() })
            .eq('id', p.settlementId);
          error = res.error;
          break;
        }
        case 'open_draft_round': {
          const res = await sb.from('draft_rounds').upsert(
            {
              ...(isUuid(p.roundId) ? { id: p.roundId } : {}),
              household_id: p.householdId,
              status: 'collecting',
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'submit_draft_picks': {
          const { roundId, userId, picks, status, assignments } = p;
          if (isUuid(roundId) && Array.isArray(picks) && picks.length > 0) {
            const resDel = await sb.from('draft_picks').delete().eq('round_id', roundId).eq('user_id', userId);
            error = resDel.error;
            if (!error) {
              const resIns = await sb.from('draft_picks').upsert(
                picks.map((pk: DraftPick) => toDraftPickRow(roundId, pk)),
                { onConflict: 'round_id,user_id,chore_id' }
              );
              error = resIns.error;
            }
          }
          if (!error && status === 'ready_to_reveal' && Array.isArray(assignments) && assignments.length > 0 && isUuid(roundId)) {
            const resAssign = await sb.from('chore_assignments').upsert(
              assignments.map((a: ChoreAssignment) => toChoreAssignmentRow(roundId, a)),
              { onConflict: 'round_id,chore_id' }
            );
            error = resAssign.error;
            if (!error) {
              const resStatus = await sb.from('draft_rounds').update({ status: 'ready_to_reveal' }).eq('id', roundId);
              error = resStatus.error;
            }
          }
          break;
        }
        case 'update_assignments': {
          const { roundId, assignments } = p;
          if (isUuid(roundId) && Array.isArray(assignments) && assignments.length > 0) {
            const res = await sb.from('chore_assignments').upsert(
              assignments.map((a: ChoreAssignment) => toChoreAssignmentRow(roundId, a)),
              { onConflict: 'round_id,chore_id' }
            );
            error = res.error;
          }
          break;
        }
        case 'reveal_draft': {
          const res = await sb
            .from('draft_rounds')
            .update({ status: 'revealed', revealed_at: p.revealedAt || new Date().toISOString() })
            .eq('id', p.roundId);
          error = res.error;
          break;
        }
        case 'complete_chore': {
          const { roundId, householdId, choreId, userId, photoUrl, logId } = p;
          let q = sb
            .from('chore_assignments')
            .update({ completed_today: true, last_photo_url: photoUrl || null })
            .eq('chore_id', choreId);
          if (isUuid(roundId)) q = q.eq('round_id', roundId);
          const res1 = await q;
          error = res1.error;
          if (!error && isUuid(householdId) && isUuid(choreId) && isUuid(userId)) {
            const res2 = await sb.from('chore_logs').upsert(
              {
                ...(isUuid(logId) ? { id: logId } : {}),
                household_id: householdId,
                chore_id: choreId,
                user_id: userId,
                photo_url: photoUrl || null,
              },
              { onConflict: 'id' }
            );
            error = res2.error;
          }
          break;
        }
        case 'give_kudos': {
          const { roundId, choreId, kudos } = p;
          let q = sb.from('chore_assignments').update({ kudos: kudos || [] }).eq('chore_id', choreId);
          if (isUuid(roundId)) q = q.eq('round_id', roundId);
          const res = await q;
          error = res.error;
          break;
        }
        case 'swap_chore': {
          const { roundId, choreId, toUserId } = p;
          let q = sb.from('chore_assignments').update({ user_id: toUserId }).eq('chore_id', choreId);
          if (isUuid(roundId)) q = q.eq('round_id', roundId);
          const res = await q;
          error = res.error;
          break;
        }
        case 'send_message': {
          const msg: ChatMessage = p.message;
          const res = await sb.from('chat_messages').upsert(
            {
              ...(isUuid(msg.id) ? { id: msg.id } : {}),
              household_id: msg.householdId,
              sender_id: msg.senderId,
              type: msg.type,
              body: msg.body,
              link_target: (msg.linkTarget as any) || null,
              reactions: (msg.reactions as any) || [],
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'add_reaction': {
          const res = await sb
            .from('chat_messages')
            .update({ reactions: p.reactions || [] })
            .eq('id', p.messageId);
          error = res.error;
          break;
        }
        case 'create_topic': {
          const t: MeetingTopic = p.topic;
          const res = await sb.from('meeting_topics').upsert(
            {
              ...(isUuid(t.id) ? { id: t.id } : {}),
              household_id: t.householdId,
              proposed_by: t.proposedBy,
              title: t.title,
              description: t.description,
              status: t.status,
              votes: t.votes as any,
              comments: t.comments as any,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'vote_topic': {
          const res = await sb
            .from('meeting_topics')
            .update({ votes: p.votes || [], status: p.status || 'open' })
            .eq('id', p.topicId);
          error = res.error;
          break;
        }
        case 'add_comment': {
          const res = await sb
            .from('meeting_topics')
            .update({ comments: p.comments || [] })
            .eq('id', p.topicId);
          error = res.error;
          break;
        }
        case 'add_agreement': {
          const a: HouseAgreement = p.agreement;
          const res = await sb.from('house_agreements').upsert(
            {
              ...(isUuid(a.id) ? { id: a.id } : {}),
              household_id: a.householdId,
              text: a.text,
              category: a.category,
              agreed_at: a.agreedAt,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'mark_notification_read': {
          const res = await sb.from('notifications').update({ read: true }).eq('id', p.id);
          error = res.error;
          break;
        }
        case 'mark_all_notifications_read': {
          if (Array.isArray(p.ids) && p.ids.length > 0) {
            const res = await sb.from('notifications').update({ read: true }).in('id', p.ids);
            error = res.error;
          }
          break;
        }
        default:
          return true;
      }

      const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
      if (error) {
        debugLog.warn(mod, `outbox_replay_${item.type}`, error.message, { actionId: item.id, code: error.code }, durationMs);
        return false;
      }
      debugLog.info(mod, `outbox_replay_${item.type}`, `Replayed ${item.type}`, { actionId: item.id }, durationMs);
      return true;
    } catch (err: any) {
      const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
      debugLog.error(mod, `outbox_replay_${item.type}`, err?.message || 'Outbox replay exception', { actionId: item.id }, durationMs);
      return false;
    }
  }

  private load(): AppStore {
    if (typeof window === 'undefined') return getInitialStore();
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (!parsed.dutySchedules) parsed.dutySchedules = {};
        return parsed;
      }
    } catch {
      // fallback
    }
    const fresh = getInitialStore();
    this.save(fresh);
    return fresh;
  }

  private save(store?: AppStore) {
    if (store) this.store = store;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
      } catch {
        // quota limit
      }
    }
  }

  public resetData() {
    this.store = getInitialStore();
    this.save();
    return this.store;
  }

  // --- Household Setup & Session Helpers ---
  public hasLocalSession(): boolean {
    const isDemo = this.store.householdSetupMode === 'demo';
    if (supabase && !isDemo) return false;
    const sess = this.store.localSession;
    if (sess && sess.expiresAt > Date.now()) {
      return true;
    }
    // Smooth migration if localSessionActive was set prior to structured sessions
    if (this.store.localSessionActive) {
      this.store.localSession = {
        userId: this.store.currentUser.id,
        email: this.store.currentUser.email,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      this.save();
      return true;
    }
    return false;
  }

  public isDemoMode(): boolean {
    if (this.store.householdSetupMode === 'demo') return true;
    return !supabase && this.store.currentUser.id === 'u_curr' && !this.store.householdSetupMode;
  }

  private getScopedLocalHouseholds(): Household[] {
    if (this.isDemoMode()) {
      return [...this.store.households];
    }
    const memberIds = new Set(
      this.store.memberships
        .filter((m) => m.userId === this.store.currentUser.id && m.status === 'active')
        .map((m) => m.householdId)
    );
    return this.store.households.filter((h) => memberIds.has(h.id));
  }

  private syncAccountSetupMode(mode: 'pending' | 'configured' | 'demo'): void {
    const cleanEmail = this.store.currentUser.email.trim().toLowerCase();
    if (this.store.localAccounts && this.store.localAccounts[cleanEmail]) {
      this.store.localAccounts[cleanEmail].setupMode = mode;
    }
  }

  public needsHouseholdSetup(): boolean {
    const mode = this.store.householdSetupMode;
    if (mode === 'demo') return false;

    const myFlats = this.getScopedLocalHouseholds();
    if (myFlats.length > 0) {
      if (mode === 'pending') return true;
      if (mode !== 'configured') {
        this.store.householdSetupMode = 'configured';
        this.syncAccountSetupMode('configured');
        this.save();
      }
      return false;
    }

    if (mode === 'pending') return true;

    const hasCustomProfile = this.store.currentUser.email !== 'kai.tanaka@student.emu.edu.tr';
    if (supabase || hasCustomProfile) {
      this.store.householdSetupMode = 'pending';
      this.syncAccountSetupMode('pending');
      this.save();
      return true;
    }
    return false;
  }

  public markDemoMode(useSampleProfile = false): void {
    const seed = getInitialStore();
    if (!this.store.households.some((h) => h.id === 'h_main')) {
      this.store.households = seed.households;
      this.store.memberships = seed.memberships;
      this.store.users = seed.users;
      this.store.expenses = seed.expenses;
      this.store.settlements = seed.settlements;
      this.store.personalExpenses = seed.personalExpenses;
      this.store.chores = seed.chores;
      this.store.draftRounds = seed.draftRounds;
      this.store.messages = seed.messages;
      this.store.meetingTopics = seed.meetingTopics;
      this.store.agreements = seed.agreements;
      this.store.notifications = seed.notifications;
    }
    if (useSampleProfile) {
      const kai = this.store.users.find((u) => u.id === 'u_curr') || seed.currentUser;
      this.store.currentUser = { ...kai };
      this.store.activeHouseholdId = 'h_main';
    }
    this.store.householdSetupMode = 'demo';
    this.store.localSessionActive = true;
    this.store.localSession = {
      userId: this.store.currentUser.id,
      email: this.store.currentUser.email,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    this.save();
  }

  public markHouseholdSetupPending(): void {
    this.store.householdSetupMode = 'pending';
    this.syncAccountSetupMode('pending');
    this.save();
  }

  public markHouseholdConfigured(): void {
    this.store.householdSetupMode = 'configured';
    this.syncAccountSetupMode('configured');
    this.save();
  }

  // --- Authentication ---
  public async getSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  public onAuthStateChange(callback: (event: string, hasSession: boolean) => void): () => void {
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
        const uidOrEmail = session.user?.id || session.user?.email;
        if (uidOrEmail && isAccountSaved(uidOrEmail)) {
          updateSavedAccountTokens(uidOrEmail, {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          });
        }
      }
      callback(event, Boolean(session));
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }

  private formatSupabaseAuthError(rawMessage: string): string {
    const msg = rawMessage.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
      return 'Invalid login credentials. Double-check your password, or if this account was created before live Supabase was connected, tap Get Started to register it.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Email not confirmed yet. Check your inbox (and spam folder) for the verification link before signing in.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('429')) {
      return 'Supabase built-in email limit reached (2 emails/hour). Wait an hour, or turn off "Confirm email" / add custom SMTP in Supabase Dashboard → Authentication.';
    }
    if (msg.includes('already registered') || msg.includes('already exists')) {
      return 'An account with this email already exists on Roomie. Tap Log in instead.';
    }
    return rawMessage;
  }

  public getSavedLoginAccounts(): SavedLoginAccount[] {
    const targetMode = supabase ? 'supabase' : 'local';
    return getSavedAccounts().filter((a) => a.mode === targetMode);
  }

  public isCurrentUserLoginSaved(): boolean {
    if (this.isDemoMode()) return false;
    return isAccountSaved(this.store.currentUser?.id) || isAccountSaved(this.store.currentUser?.email);
  }

  public async setCurrentUserLoginSaved(save: boolean): Promise<boolean> {
    if (this.isDemoMode()) return false;
    const u = this.store.currentUser;
    if (!save) {
      removeSavedAccount(u.id || u.email);
      if (u.email) removeSavedAccount(u.email);
      return false;
    }

    let sessionTokens: { accessToken: string; refreshToken: string } | undefined;
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        sessionTokens = {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        };
      }
    }

    upsertSavedAccount({
      userId: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      flag: u.flag,
      mode: supabase ? 'supabase' : 'local',
      sessionTokens,
    });
    return true;
  }

  public removeSavedLoginAccount(userIdOrEmail: string): SavedLoginAccount[] {
    removeSavedAccount(userIdOrEmail);
    return this.getSavedLoginAccounts();
  }

  public async quickSignInSavedAccount(
    userIdOrEmail: string
  ): Promise<{ success: boolean; message: string; requiresPassword?: boolean; email?: string }> {
    const saved = this.getSavedLoginAccounts().find(
      (a) =>
        a.userId === userIdOrEmail ||
        a.email.toLowerCase() === userIdOrEmail.trim().toLowerCase()
    );
    if (!saved) {
      return { success: false, message: 'Saved login was not found on this device.' };
    }

    if (supabase) {
      if (!saved.sessionTokens?.refreshToken) {
        return {
          success: false,
          requiresPassword: true,
          email: saved.email,
          message: 'Enter your password once to activate 1-tap quick login for this account.',
        };
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: saved.sessionTokens.accessToken,
        refresh_token: saved.sessionTokens.refreshToken,
      });

      if (error || !data.session) {
        // Keep the saved profile tile, clear only the expired token
        updateSavedAccountTokens(saved.email, undefined);
        return {
          success: false,
          requiresPassword: true,
          email: saved.email,
          message: 'Saved login session expired. Enter your password to sign back in.',
        };
      }

      await supabase.auth.startAutoRefresh();
      if (this.store.householdSetupMode === 'demo') {
        this.store.householdSetupMode = undefined;
      }
      this.store.localSessionActive = false;
      this.store.localSession = null;

      const user = await this.getCurrentUser();
      await this.getHouseholds();
      upsertSavedAccount({
        userId: user.id,
        email: user.email || saved.email,
        name: user.name || saved.name,
        avatar: user.avatar || saved.avatar,
        flag: user.flag || saved.flag,
        mode: 'supabase',
        sessionTokens: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        },
      });
      this.save();
      return { success: true, message: `Signed back in as ${user.name || saved.name}!` };
    }

    // Local/offline account 1-tap restore
    const cleanEmail = saved.email.trim().toLowerCase();
    const account = this.store.localAccounts?.[cleanEmail];
    if (!account) {
      return {
        success: false,
        requiresPassword: true,
        email: saved.email,
        message: 'Could not restore local account automatically. Please sign in.',
      };
    }

    const existingProfile = this.store.users.find((u) => u.id === account.id);
    if (existingProfile) {
      this.store.currentUser = { ...existingProfile };
    }
    this.store.householdSetupMode = account.setupMode;
    this.store.localSessionActive = true;
    this.store.localSession = {
      userId: account.id,
      email: cleanEmail,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    upsertSavedAccount({
      userId: account.id,
      email: cleanEmail,
      name: this.store.currentUser.name || account.name,
      avatar: this.store.currentUser.avatar,
      flag: this.store.currentUser.flag,
      mode: 'local',
    });
    this.save();
    return { success: true, message: `Signed back in as ${this.store.currentUser.name}!` };
  }

  private getAuthRedirectUrl(): string | undefined {
    if (typeof window === 'undefined' || !/^https?:$/.test(window.location.protocol)) {
      return undefined;
    }
    const pendingCode = getPendingInviteCode();
    return pendingCode
      ? `${window.location.origin}/?code=${encodeURIComponent(pendingCode)}`
      : window.location.origin;
  }

  public async signUpWithSupabase(
    email: string,
    password?: string,
    name?: string,
    options?: { rememberMe?: boolean }
  ): Promise<{ success: boolean; message: string; requiresEmailVerification?: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const emailCheck = validateEmail(cleanEmail);
    if (!emailCheck.valid) {
      return { success: false, message: emailCheck.error || 'Please enter a valid email address.' };
    }
    const passCheck = validatePassword(password || '');
    if (!passCheck.valid) {
      return { success: false, message: passCheck.error || 'Password does not meet security rules.' };
    }
    const cleanName = (name || cleanEmail.split('@')[0]).trim();
    const shouldSave = options?.rememberMe !== false;

    if (!supabase) {
      if (!this.store.localAccounts) this.store.localAccounts = {};
      if (this.store.localAccounts[cleanEmail]) {
        return { success: false, message: 'An account with this email already exists. Please log in instead.' };
      }

      const newUserId = 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
      const newUser: User = {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        country: 'Cyprus',
        countryCode: 'CY',
        flag: '🏠',
        isHome: true,
        streakDays: 0,
        points: 0,
        awayUntil: null,
      };

      this.store.users.push(newUser);
      this.store.currentUser = newUser;
      this.store.localAccounts[cleanEmail] = {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        passwordHash: hashLocalPassword(cleanEmail, password!),
        setupMode: 'pending',
        createdAt: new Date().toISOString(),
      };
      this.store.householdSetupMode = 'pending';
      this.store.localSessionActive = true;
      this.store.localSession = {
        userId: newUserId,
        email: cleanEmail,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      if (shouldSave) {
        upsertSavedAccount({
          userId: newUserId,
          email: cleanEmail,
          name: cleanName,
          avatar: newUser.avatar,
          flag: newUser.flag,
          mode: 'local',
        });
      }
      this.save();
      return { success: true, message: 'Account created! Let’s set up your flat.' };
    }

    const emailRedirectTo = this.getAuthRedirectUrl();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password!,
      options: {
        data: { name: cleanName },
        emailRedirectTo,
      },
    });
    if (error) {
      return { success: false, message: this.formatSupabaseAuthError(error.message) };
    }
    this.store.localSessionActive = false;
    this.store.localSession = null;
    this.store.householdSetupMode = 'pending';

    if (!data.session) {
      this.save();
      return {
        success: true,
        requiresEmailVerification: true,
        message: 'Confirmation email sent! Check your inbox, tap the verification link, then sign in.',
      };
    }

    if (data.user) {
      const profile = await this.getCurrentUser();
      if (shouldSave) {
        upsertSavedAccount({
          userId: profile.id || data.user.id,
          email: profile.email || cleanEmail,
          name: profile.name || cleanName,
          avatar: profile.avatar,
          flag: profile.flag,
          mode: 'supabase',
          sessionTokens: {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          },
        });
      }
    }
    this.save();
    return { success: true, requiresEmailVerification: false, message: 'Account created! Welcome to Roomie.' };
  }

  public async signInWithSupabase(
    email: string,
    password?: string,
    options?: { rememberMe?: boolean }
  ): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const emailCheck = validateEmail(cleanEmail);
    if (!emailCheck.valid) {
      return { success: false, message: emailCheck.error || 'Please enter a valid email address.' };
    }
    const shouldSave = options?.rememberMe !== false;

    if (!supabase) {
      if (!this.store.localAccounts) this.store.localAccounts = {};
      let account = this.store.localAccounts[cleanEmail];

      // Upgrade any existing customized pre-localAccounts test user on sign-in
      if (
        !account &&
        password &&
        this.store.currentUser.email.toLowerCase() === cleanEmail &&
        cleanEmail !== 'kai.tanaka@student.emu.edu.tr'
      ) {
        const passCheck = validatePassword(password);
        if (!passCheck.valid) {
          return { success: false, message: passCheck.error || 'Please use a valid password.' };
        }
        account = {
          id: this.store.currentUser.id === 'u_curr' ? 'u_' + Date.now().toString(36) : this.store.currentUser.id,
          name: this.store.currentUser.name,
          email: cleanEmail,
          passwordHash: hashLocalPassword(cleanEmail, password),
          setupMode: 'pending',
          createdAt: new Date().toISOString(),
        };
        if (this.store.currentUser.id === 'u_curr') {
          this.store.currentUser = { ...this.store.currentUser, id: account.id };
          this.store.users.push(this.store.currentUser);
        }
        this.store.localAccounts[cleanEmail] = account;
      }

      if (!account) {
        return { success: false, message: 'No account found for this email. Check spelling or tap Get Started.' };
      }

      if (password && hashLocalPassword(cleanEmail, password) !== account.passwordHash) {
        return { success: false, message: 'Incorrect password. Please try again.' };
      }

      const existingProfile = this.store.users.find((u) => u.id === account.id);
      if (existingProfile) {
        this.store.currentUser = { ...existingProfile };
      }
      this.store.householdSetupMode = account.setupMode;
      this.store.localSessionActive = true;
      this.store.localSession = {
        userId: account.id,
        email: cleanEmail,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      if (shouldSave) {
        upsertSavedAccount({
          userId: account.id,
          email: cleanEmail,
          name: this.store.currentUser.name || account.name,
          avatar: this.store.currentUser.avatar,
          flag: this.store.currentUser.flag,
          mode: 'local',
        });
      }
      this.save();
      return { success: true, message: 'Welcome back!' };
    }

    if (password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        return { success: false, message: this.formatSupabaseAuthError(error.message) };
      }
      if (this.store.householdSetupMode === 'demo') {
        this.store.householdSetupMode = undefined;
      }
      this.store.localSessionActive = false;
      this.store.localSession = null;
      await supabase.auth.startAutoRefresh();
      const user = await this.getCurrentUser();
      await this.getHouseholds();
      if (shouldSave && data.session) {
        upsertSavedAccount({
          userId: user.id || data.user?.id || cleanEmail,
          email: user.email || cleanEmail,
          name: user.name,
          avatar: user.avatar,
          flag: user.flag,
          mode: 'supabase',
          sessionTokens: {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          },
        });
      }
      this.save();
      return { success: true, message: 'Welcome back!' };
    }
    // Passwordless OTP magic link
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: this.getAuthRedirectUrl() },
    });
    if (error) {
      return { success: false, message: this.formatSupabaseAuthError(error.message) };
    }
    return { success: true, message: 'Magic link sent to your email!' };
  }

  public async signOut(options?: { keepSavedLogin?: boolean }): Promise<void> {
    const keepSaved =
      !this.isDemoMode() &&
      (options?.keepSavedLogin ?? this.isCurrentUserLoginSaved());

    if (supabase && !this.isDemoMode()) {
      if (keepSaved) {
        await this.setCurrentUserLoginSaved(true);
        await supabase.auth.stopAutoRefresh();
        clearLocalSupabaseSessionStorage();
      } else {
        if (options?.keepSavedLogin === false) {
          removeSavedAccount(this.store.currentUser?.id || this.store.currentUser?.email || '');
          if (this.store.currentUser?.email) {
            removeSavedAccount(this.store.currentUser.email);
          }
        }
        await supabase.auth.signOut({ scope: 'local' });
      }
    } else if (!this.isDemoMode() && options?.keepSavedLogin === false) {
      removeSavedAccount(this.store.currentUser?.email || '');
    } else if (!this.isDemoMode() && keepSaved) {
      await this.setCurrentUserLoginSaved(true);
    }

    this.store.localSessionActive = false;
    this.store.localSession = null;
    if (this.store.householdSetupMode === 'demo') {
      this.store.householdSetupMode = undefined;
    }
    this.save();
  }

  // --- Users & Auth ---
  public async getCurrentUser(): Promise<User> {
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            const mapped = mapProfileToUser(profile);
            this.store.currentUser = mapped;
            return mapped;
          }
        }
      } catch {
        // fallback
      }
    }
    return { ...this.store.currentUser };
  }

  public async updateCurrentUser(updates: Partial<User>): Promise<User> {
    this.store.currentUser = { ...this.store.currentUser, ...updates };
    // sync in users list
    this.store.users = this.store.users.map(u => (u.id === this.store.currentUser.id ? this.store.currentUser : u));
    this.save();

    if (supabase && !this.isDemoMode()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({
            name: updates.name,
            avatar: updates.avatar,
            country: updates.country,
            country_code: updates.countryCode,
            flag: updates.flag,
            is_home: updates.isHome,
            away_until: updates.awayUntil,
            points: updates.points,
            streak_days: updates.streakDays,
          }).eq('id', user.id);
        }
      } catch (err) {
        console.warn('Profile sync error:', err);
      }
    }
    return this.store.currentUser;
  }

  public async toggleHomeStatus(): Promise<boolean> {
    const next = !this.store.currentUser.isHome;
    await this.updateCurrentUser({ isHome: next });
    return next;
  }

  public async setAwayMode(daysUntil: number | null): Promise<void> {
    const awayUntil = daysUntil ? new Date(Date.now() + daysUntil * 86400000).toISOString() : null;
    await this.updateCurrentUser({ awayUntil });
  }

  // --- Households & Memberships ---
  public async getHouseholds(): Promise<Household[]> {
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: memberships, error } = await supabase
            .from('memberships')
            .select('id, household_id, user_id, role, status, joined_at, households(*)')
            .eq('user_id', user.id)
            .eq('status', 'active');

          if (!error && Array.isArray(memberships)) {
            const liveHouseholds = memberships
              .map((m: any) => m.households)
              .filter(Boolean)
              .map(mapHousehold);

            this.store.households = liveHouseholds;
            this.store.memberships = [
              ...this.store.memberships.filter((m) => m.userId !== user.id),
              ...memberships.map((m: any) => ({
                id: m.id,
                userId: m.user_id,
                householdId: m.household_id,
                role: m.role as Membership['role'],
                status: m.status as Membership['status'],
                joinedAt: m.joined_at || new Date().toISOString(),
              })),
            ];

            if (liveHouseholds.length === 0) {
              this.store.activeHouseholdId = '';
              this.save();
              return [];
            }

            if (!this.store.activeHouseholdId || !liveHouseholds.some(h => h.id === this.store.activeHouseholdId)) {
              this.store.activeHouseholdId = liveHouseholds[0].id;
            }
            if (this.store.householdSetupMode === 'pending') {
              this.store.householdSetupMode = 'configured';
            }
            this.save();
            return liveHouseholds;
          }
        }
      } catch {
        // fallback
      }
    }
    return this.getScopedLocalHouseholds();
  }

  public async getActiveHousehold(): Promise<Household | null> {
    const scoped = this.getScopedLocalHouseholds();
    const found = scoped.find((h) => h.id === this.store.activeHouseholdId);
    return found || scoped[0] || null;
  }

  public async setActiveHousehold(householdId: string): Promise<Household | null> {
    this.store.activeHouseholdId = householdId;
    this.save();
    return this.getActiveHousehold();
  }

  private generateInviteCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  public async createHousehold(
    name: string,
    currency: 'TRY' | 'USD' | 'EUR',
    options?: { rotationInterval?: 'weekly' | 'monthly'; starterChores?: string[] }
  ): Promise<Household> {
    const id = 'h_' + Math.random().toString(36).substring(2, 9);
    const code = this.generateInviteCode();
    const rotationInterval = options?.rotationInterval ?? 'weekly';
    const newHousehold: Household = {
      id,
      name,
      currency,
      inviteCode: code,
      invitesEnabled: true,
      createdBy: this.store.currentUser.id,
      settings: {
        rotationInterval,
        rotatingAdmin: false,
        quietHours: '23:00 - 08:00',
      },
      createdAt: new Date().toISOString(),
    };

    const starterPresetMap: Record<string, { frequency: 'daily' | 'weekly'; effortLevel: 'light' | 'medium' | 'heavy'; description: string; iconName: string }> = {
      'Deep Clean Bathroom': { frequency: 'weekly', effortLevel: 'heavy', description: 'Clean shower, sink & toilet', iconName: 'Bath' },
      'Dishwasher & Sink': { frequency: 'daily', effortLevel: 'medium', description: 'Unload dishwasher & wipe sink', iconName: 'Sparkles' },
      'Take Out Trash': { frequency: 'daily', effortLevel: 'light', description: 'Empty kitchen and hall bins', iconName: 'Trash2' },
      'Kitchen Counters': { frequency: 'daily', effortLevel: 'light', description: 'Wipe stove, counters & dining table', iconName: 'Sparkles' },
      'Living Room Sweep & Mop': { frequency: 'weekly', effortLevel: 'medium', description: 'Vacuum rug and mop shared floor', iconName: 'Home' },
      'Cook House Dinner': { frequency: 'weekly', effortLevel: 'heavy', description: 'Shared flat dinner & cleanup', iconName: 'Utensils' },
      'Supermarket Supply Run': { frequency: 'weekly', effortLevel: 'light', description: 'Restock paper goods & cleaning basics', iconName: 'ShoppingBag' },
    };

    const selectedNames = options?.starterChores?.length
      ? options.starterChores
      : ['Deep Clean Bathroom', 'Dishwasher & Sink', 'Take Out Trash'];

    const buildStarterChores = (householdId: string): Chore[] =>
      selectedNames.map((choreName, idx) => {
        const preset = starterPresetMap[choreName] || {
          frequency: 'weekly' as const,
          effortLevel: 'medium' as const,
          description: 'Shared household task',
          iconName: 'Sparkles',
        };
        return {
          id: 'ch_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 6),
          householdId,
          name: choreName,
          frequency: preset.frequency,
          effortLevel: preset.effortLevel,
          active: true,
          description: preset.description,
          iconName: preset.iconName,
        };
      });

    let syncedChores = buildStarterChores(newHousehold.id);
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: createdH } = await supabase
            .from('households')
            .insert({
              name,
              currency,
              invite_code: code,
              created_by: user.id,
            })
            .select('*')
            .single();

          if (createdH) {
            newHousehold.id = createdH.id;
            newHousehold.createdBy = user.id;
            this.store.currentUser.id = user.id;
            await supabase.from('memberships').insert({
              household_id: createdH.id,
              user_id: user.id,
              role: 'admin',
              status: 'active',
            });
            const starterPayload = buildStarterChores(createdH.id).map((ch) => ({
              household_id: createdH.id,
              name: ch.name,
              frequency: ch.frequency,
              effort_level: ch.effortLevel,
              active: true,
              description: ch.description,
              icon_name: ch.iconName,
            }));
            const { data: insertedChores } = await supabase
              .from('chores')
              .insert(starterPayload)
              .select('*');
            syncedChores = insertedChores && insertedChores.length > 0
              ? insertedChores.map(mapChore)
              : buildStarterChores(createdH.id);
          }
        }
      } catch (err) {
        console.warn('Supabase household creation fallback:', err);
      }
    }

    this.store.households.push(newHousehold);
    this.store.activeHouseholdId = newHousehold.id;
    this.store.memberships.push({
      id: 'm_' + Math.random().toString(36).substring(2, 7),
      userId: this.store.currentUser.id,
      householdId: newHousehold.id,
      role: 'admin',
      status: 'active',
      joinedAt: new Date().toISOString(),
    });
    this.store.chores.push(...syncedChores);
    this.store.householdSetupMode = 'configured';
    this.syncAccountSetupMode('configured');
    this.save();
    return newHousehold;
  }

  public async refreshInviteCode(householdId?: string): Promise<string> {
    const hid = householdId || this.store.activeHouseholdId;
    const household = this.store.households.find(h => h.id === hid);
    if (!household) throw new Error('Apartment not found');
    const newCode = this.generateInviteCode();
    household.inviteCode = newCode;
    household.invitesEnabled = true;
    this.save();

    if (supabase && !this.isDemoMode()) {
      try {
        await supabase.from('households').update({ invite_code: newCode, invites_enabled: true }).eq('id', hid);
      } catch (err) {
        console.warn('Supabase refresh code error:', err);
      }
    }
    return newCode;
  }

  public async toggleInvites(householdId?: string, enabled?: boolean): Promise<boolean> {
    const hid = householdId || this.store.activeHouseholdId;
    const household = this.store.households.find(h => h.id === hid);
    if (!household) throw new Error('Apartment not found');
    household.invitesEnabled = enabled !== undefined ? enabled : !(household.invitesEnabled ?? true);
    this.save();

    if (supabase && !this.isDemoMode()) {
      try {
        await supabase.from('households').update({ invites_enabled: household.invitesEnabled }).eq('id', hid);
      } catch (err) {
        console.warn('Supabase toggle invites error:', err);
      }
    }
    return household.invitesEnabled;
  }

  public async joinHousehold(code: string): Promise<{ success: boolean; household?: Household; message: string }> {
    const formattedCode = code.trim().toUpperCase();
    if (supabase && !this.isDemoMode()) {
      try {
        // Attempt direct join via secure RPC
        const { data: directJoin, error: directJoinErr } = await (supabase.rpc as any)('join_household_by_code', {
          p_code: formattedCode,
        });

        if (!directJoinErr && directJoin && directJoin.success) {
          await this.getHouseholds();
          if (directJoin.household_id) {
            this.store.activeHouseholdId = directJoin.household_id;
          }
          this.store.householdSetupMode = 'configured';

          // Broadcast privacy alert to existing flatmates in store
          const otherMembers = this.store.memberships.filter(
            (m) => m.householdId === directJoin.household_id && m.status === 'active' && m.userId !== this.store.currentUser.id
          );
          otherMembers.forEach((m) => {
            this.store.notifications.unshift({
              id: 'notif_priv_' + Date.now() + '_' + m.userId,
              userId: m.userId,
              type: 'privacy_alert',
              title: '🛡️ Privacy Alert: New Flatmate Joined',
              body: `${this.store.currentUser.name} has joined the apartment. Review the active roster in Apartment settings.`,
              read: false,
              createdAt: new Date().toISOString(),
              linkTarget: { screen: 'apartment' },
            });
          });

          this.save();
          return {
            success: true,
            message: directJoin.message || `Welcome to ${directJoin.name}!`,
          };
        }

        // If direct join was not successful, check if household exists to submit request
        const { data: targetH } = await (supabase.rpc as any)('lookup_household_by_invite', {
          p_code: formattedCode,
        });

        if (targetH && targetH.length > 0) {
          const flat = targetH[0];
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error: reqErr } = await supabase.from('join_requests').insert({
              household_id: flat.id,
              user_id: user.id,
              user_name: this.store.currentUser.name || user.email?.split('@')[0] || 'Roomie',
              user_email: user.email || this.store.currentUser.email,
              user_country: this.store.currentUser.country,
              user_flag: this.store.currentUser.flag,
              user_avatar: this.store.currentUser.avatar,
              status: 'pending',
              votes: [],
            } as any);
            if (!reqErr) {
              return {
                success: true,
                household: mapHousehold(flat),
                message: 'Request submitted! Roomies will review before you enter.',
              };
            }
          }
        }
      } catch (err) {
        console.warn('Join household Supabase error:', err);
      }
    }

    const target = this.store.households.find(h => h.inviteCode.toUpperCase() === formattedCode);
    if (!target) {
      return { success: false, message: 'Invite code not found. Check with your roomies.' };
    }
    if (target.invitesEnabled === false) {
      return { success: false, message: 'Invites are currently turned off for this apartment.' };
    }
    // create join request
    const existingReq = this.store.joinRequests.find(r => r.householdId === target.id && r.userEmail === this.store.currentUser.email);
    if (!existingReq) {
      const newReqId = 'jr_' + Date.now();
      this.store.joinRequests.push({
        id: newReqId,
        householdId: target.id,
        userName: this.store.currentUser.name,
        userEmail: this.store.currentUser.email,
        userCountry: this.store.currentUser.country,
        userFlag: this.store.currentUser.flag,
        userAvatar: this.store.currentUser.avatar,
        createdAt: new Date().toISOString(),
        votes: [],
        status: 'pending',
      });

      // Broadcast join request to ALL active members so everyone can review and vote
      const flatMembers = this.store.memberships.filter(
        (m) => m.householdId === target.id && m.status === 'active'
      );
      flatMembers.forEach((m) => {
        this.store.notifications.unshift({
          id: 'notif_req_' + Date.now() + '_' + m.userId,
          userId: m.userId,
          type: 'household',
          title: '📋 Join Request: New Applicant',
          body: `${this.store.currentUser.name} wants to join ${target.name}. Cast your vote in Apartment settings.`,
          read: false,
          createdAt: new Date().toISOString(),
          linkTarget: { screen: 'apartment', id: newReqId },
        });
      });

      this.save();
    }
    return { success: true, household: target, message: 'Request submitted! Roomies must review before you enter.' };
  }

  public async getHouseholdMembers(householdId?: string): Promise<{ user: User; membership: Membership }[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: members } = await supabase
          .from('memberships')
          .select('id, user_id, household_id, role, status, joined_at, profiles(*)')
          .eq('household_id', hid)
          .eq('status', 'active');

        if (members && members.length > 0) {
          return members.map((m: any) => ({
            user: mapProfileToUser(m.profiles),
            membership: {
              id: m.id,
              userId: m.user_id,
              householdId: m.household_id,
              role: m.role as any,
              status: m.status as any,
              joinedAt: m.joined_at || new Date().toISOString(),
            },
          }));
        }
      } catch {
        // fallback
      }
    }
    const members = this.store.memberships.filter(m => m.householdId === hid && m.status === 'active');
    return members.map(m => {
      const u = this.store.users.find(user => user.id === m.userId) || this.store.currentUser;
      return { user: u, membership: m };
    });
  }

  public async getJoinRequests(householdId?: string): Promise<JoinRequest[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: requests } = await supabase
          .from('join_requests')
          .select('*')
          .eq('household_id', hid)
          .eq('status', 'pending');

        if (requests && requests.length > 0) {
          return requests.map((r: any) => ({
            id: r.id,
            householdId: r.household_id,
            userName: r.user_name,
            userEmail: r.user_email,
            userCountry: r.user_country || '',
            userFlag: r.user_flag || '🌍',
            userAvatar: r.user_avatar || '',
            createdAt: r.created_at || new Date().toISOString(),
            votes: (r.votes as any) || [],
            status: r.status as any,
          }));
        }
      } catch {
        // fallback
      }
    }
    return this.store.joinRequests.filter(r => r.householdId === hid && r.status === 'pending');
  }

  public async voteJoinRequest(requestId: string, vote: 'ok' | 'unsure'): Promise<void> {
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: req } = await supabase.from('join_requests').select('votes').eq('id', requestId).maybeSingle();
        const { data: { user } } = await supabase.auth.getUser();
        if (req && user) {
          const votes: any[] = Array.isArray(req.votes) ? [...(req.votes as any[])] : [];
          const existingIdx = votes.findIndex((v: any) => v && v.userId === user.id);
          if (existingIdx >= 0) {
            votes[existingIdx] = { ...votes[existingIdx], vote };
          } else {
            votes.push({ userId: user.id, vote });
          }
          await supabase.from('join_requests').update({ votes } as any).eq('id', requestId);
        }
      } catch (err) {
        console.warn('Supabase voteJoinRequest error:', err);
      }
    }

    const req = this.store.joinRequests.find(r => r.id === requestId);
    if (req) {
      const existingVote = req.votes.find(v => v.userId === this.store.currentUser.id);
      if (existingVote) {
        existingVote.vote = vote;
      } else {
        req.votes.push({ userId: this.store.currentUser.id, vote });
      }
      this.save();
    }
  }

  public async decideJoinRequest(requestId: string, approve: boolean): Promise<void> {
    if (supabase && !this.isDemoMode()) {
      try {
        if (approve) {
          await (supabase.rpc as any)('approve_join_request', { p_request_id: requestId });
        } else {
          await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', requestId);
        }
      } catch (err) {
        console.warn('Supabase decideJoinRequest error:', err);
      }
    }

    const req = this.store.joinRequests.find(r => r.id === requestId);
    if (req) {
      req.status = approve ? 'approved' : 'rejected';
      if (approve) {
        // create new user if not exists
        let user = this.store.users.find(u => u.email === req.userEmail);
        if (!user) {
          user = {
            id: 'u_' + Math.random().toString(36).substring(2, 7),
            name: req.userName,
            email: req.userEmail,
            avatar: req.userAvatar,
            country: req.userCountry,
            countryCode: 'XX',
            flag: req.userFlag,
            isHome: true,
            streakDays: 0,
            points: 0,
            awayUntil: null,
          };
          this.store.users.push(user);
        }
        this.store.memberships.push({
          id: 'm_' + Date.now(),
          userId: user.id,
          householdId: req.householdId,
          role: 'member',
          status: 'active',
          joinedAt: new Date().toISOString(),
        });
        // Mark pending join request notification as read
        this.store.notifications.forEach((n) => {
          if (n.type === 'household' && n.title.toLowerCase().includes('join request')) {
            n.read = true;
          }
        });
        // Add privacy alert notification to ALL active flatmates so everyone is aware
        const flatMembers = this.store.memberships.filter(
          (m) => m.householdId === req.householdId && m.status === 'active' && m.userId !== user.id
        );
        flatMembers.forEach((m) => {
          this.store.notifications.unshift({
            id: 'notif_priv_' + Date.now() + '_' + m.userId,
            userId: m.userId,
            type: 'privacy_alert',
            title: '🛡️ Privacy Alert: New Flatmate Joined',
            body: `${req.userName} has officially joined the apartment roster. Review all active members in Apartment settings.`,
            read: false,
            createdAt: new Date().toISOString(),
            linkTarget: { screen: 'apartment' },
          });
        });

        // add welcome & privacy message to chat
        this.addMessage(req.householdId, null, 'activity', `🛡️ Privacy Notice: ${req.userName} has joined the apartment roster.`, {
          screen: 'apartment',
        });
      }
      this.save();
    }
  }

  public async handoverAdmin(toUserId: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const curMembership = this.store.memberships.find(m => m.householdId === hid && m.userId === this.store.currentUser.id);
    const targetMembership = this.store.memberships.find(m => m.householdId === hid && m.userId === toUserId);
    if (curMembership && targetMembership) {
      curMembership.role = 'member';
      targetMembership.role = 'admin';
      const targetUser = this.store.users.find(u => u.id === toUserId);

      if (supabase && !this.isDemoMode() && isUuid(hid) && isUuid(toUserId) && isUuid(this.store.currentUser.id)) {
        const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        try {
          // Promote new admin FIRST so admin RLS stays satisfied before demoting self
          const { error: errPromote } = await supabase
            .from('memberships')
            .update({ role: 'admin' })
            .eq('household_id', hid)
            .eq('user_id', toUserId)
            .eq('status', 'active');
          if (errPromote) throw errPromote;

          const { error: errDemote } = await supabase
            .from('memberships')
            .update({ role: 'member' })
            .eq('household_id', hid)
            .eq('user_id', this.store.currentUser.id)
            .eq('status', 'active');
          if (errDemote) throw errDemote;

          const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
          debugLog.info('auth', 'handover_admin', `Handed admin role to ${targetUser?.name || toUserId}`, { householdId: hid, toUserId }, durationMs);
        } catch (err: any) {
          const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
          debugLog.warn('auth', 'handover_admin', `Supabase handover fallback: ${err?.message || 'error'}`, { householdId: hid, toUserId }, durationMs);
        }
      }

      this.addMessage(hid, null, 'activity', `Admin role handed over to ${targetUser?.name || 'roomie'}.`);
      this.save();
    }
  }

  public async leaveHousehold(householdId: string): Promise<{ success: boolean; message: string }> {
    const m = this.store.memberships.find(mb => mb.householdId === householdId && mb.userId === this.store.currentUser.id);

    if (supabase && !this.isDemoMode() && isUuid(householdId)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data, error } = await (supabase.rpc as any)('leave_household_self', { p_household_id: householdId });
        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          debugLog.error('auth', 'leave_household', `leave_household_self failed: ${error.message}`, { householdId }, durationMs);
          return { success: false, message: error.message || 'Could not leave household.' };
        }
        if (data && data.success === false) {
          debugLog.warn('auth', 'leave_household', data.message || 'Rejected leave', { householdId }, durationMs);
          return { success: false, message: data.message || 'Membership not found.' };
        }
        debugLog.info('auth', 'leave_household', `Left household ${householdId}`, { householdId }, durationMs);
      } catch (err: any) {
        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        debugLog.error('auth', 'leave_household', err?.message || 'Exception leaving household', { householdId }, durationMs);
        return { success: false, message: err?.message || 'Could not leave household.' };
      }
    }

    if (m) {
      m.status = 'left';
      if (m.role === 'admin') {
        const next = this.store.memberships.find(mb => mb.householdId === householdId && mb.userId !== this.store.currentUser.id && mb.status === 'active');
        if (next) next.role = 'admin';
      }

      // WhatsApp style: broadcast leave message in chat and notifications to remaining flatmates
      this.addMessage(householdId, null, 'activity', `👋 ${this.store.currentUser.name} left the apartment.`);
      const remainingMembers = this.store.memberships.filter(
        (mb) => mb.householdId === householdId && mb.status === 'active' && mb.userId !== this.store.currentUser.id
      );
      remainingMembers.forEach((mb) => {
        this.store.notifications.unshift({
          id: 'notif_left_' + Date.now() + '_' + mb.userId,
          userId: mb.userId,
          type: 'privacy_alert',
          title: '👋 Member Left the Flat',
          body: `${this.store.currentUser.name} has left the apartment.`,
          read: false,
          createdAt: new Date().toISOString(),
          linkTarget: { screen: 'apartment' },
        });
      });

      this.save();
      return { success: true, message: 'You have left the household.' };
    }
    if (!this.isDemoMode() && isUuid(householdId)) {
      return { success: true, message: 'You have left the household.' };
    }
    return { success: false, message: 'Membership not found.' };
  }

  public async removeHouseholdMember(householdId: string, targetUserId: string): Promise<{ success: boolean; message: string }> {
    const hid = householdId || this.store.activeHouseholdId;
    const curMembership = this.store.memberships.find(m => m.householdId === hid && m.userId === this.store.currentUser.id);
    if (curMembership && curMembership.role !== 'admin') {
      return { success: false, message: 'Only flat admins can remove members.' };
    }
    if (targetUserId === this.store.currentUser.id) {
      return { success: false, message: 'Admins cannot remove themselves. Use Leave instead.' };
    }

    if (supabase && !this.isDemoMode() && isUuid(hid) && isUuid(targetUserId)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data, error } = await (supabase.rpc as any)('remove_household_member', {
          p_household_id: hid,
          p_target_user_id: targetUserId,
        });
        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          debugLog.error('auth', 'remove_member', `remove_household_member failed: ${error.message}`, { hid, targetUserId }, durationMs);
          return { success: false, message: error.message || 'Could not remove member.' };
        }
        if (data && data.success === false) {
          return { success: false, message: data.message || 'Action rejected.' };
        }
      } catch (err: any) {
        debugLog.error('auth', 'remove_member', err?.message || 'Exception removing member', { hid, targetUserId });
        return { success: false, message: err?.message || 'Could not remove member.' };
      }
    }

    const targetUser = this.store.users.find(u => u.id === targetUserId);
    const targetMembership = this.store.memberships.find(m => m.householdId === hid && m.userId === targetUserId);
    if (targetMembership) {
      targetMembership.status = 'removed';
    }

    const adminName = this.store.currentUser.name || 'Admin';
    const targetName = targetUser?.name || 'A flatmate';

    // WhatsApp style chat announcement:
    this.addMessage(hid, null, 'activity', `🚪 ${adminName} removed ${targetName} from the apartment.`);

    // Broadcast privacy alerts to remaining flatmates
    const remainingMembers = this.store.memberships.filter(
      (m) => m.householdId === hid && m.status === 'active' && m.userId !== this.store.currentUser.id && m.userId !== targetUserId
    );
    remainingMembers.forEach((m) => {
      this.store.notifications.unshift({
        id: 'notif_rem_' + Date.now() + '_' + m.userId,
        userId: m.userId,
        type: 'privacy_alert',
        title: '🛡️ Member Removed from Flat',
        body: `${adminName} removed ${targetName} from the apartment.`,
        read: false,
        createdAt: new Date().toISOString(),
        linkTarget: { screen: 'apartment' },
      });
    });

    // Alert the removed user
    this.store.notifications.unshift({
      id: 'notif_revoked_' + Date.now() + '_' + targetUserId,
      userId: targetUserId,
      type: 'privacy_alert',
      title: '🛡️ Apartment Access Revoked',
      body: `You were removed from the apartment by ${adminName}.`,
      read: false,
      createdAt: new Date().toISOString(),
      linkTarget: { screen: 'setup' },
    });

    this.save();
    return { success: true, message: `${targetName} has been removed from the apartment.` };
  }

  // --- Expenses & Balances ---
  public async getExpenses(householdId?: string): Promise<Expense[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: expRows, error } = await supabase
          .from('expenses')
          .select('*, expense_shares(*)')
          .eq('household_id', hid)
          .order('created_at', { ascending: false });

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          debugLog.warn('expenses', 'fetch_expenses', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(expRows)) {
          const liveExpenses = expRows.map((e: any) => mapExpense(e, e.expense_shares || []));
          this.store.expenses = [
            ...this.store.expenses.filter((e) => e.householdId !== hid),
            ...liveExpenses,
          ];
          debugLog.info('expenses', 'fetch_expenses', `Loaded ${liveExpenses.length} expense(s)`, { householdId: hid, count: liveExpenses.length }, durationMs);
          return liveExpenses;
        }
      } catch (err: any) {
        debugLog.error('expenses', 'fetch_expenses', err?.message || 'Supabase getExpenses fallback', { householdId: hid });
      }
    }
    return this.store.expenses
      .filter(e => e.householdId === hid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async addExpense(
    title: string,
    amount: number,
    category: Expense['category'],
    participantUserIds: string[],
    receiptUrl?: string
  ): Promise<Expense> {
    const hid = this.store.activeHouseholdId;
    const useUuid = !this.isDemoMode() && isUuid(hid);
    const shareEach = Math.round((amount / participantUserIds.length) * 100) / 100;
    const newExpense: Expense = {
      id: makeEntityId('exp', useUuid),
      householdId: hid,
      paidBy: this.store.currentUser.id,
      title,
      amount,
      category,
      receiptUrl,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      shares: participantUserIds.map(uid => ({
        userId: uid,
        shareAmount: shareEach,
        response: uid === this.store.currentUser.id ? 'agreed' : 'pending',
      })),
      createdAt: new Date().toISOString(),
    };
    this.store.expenses.unshift(newExpense);

    this.dispatchRemoteMutation(
      hid,
      'expenses',
      'create_expense',
      { expense: newExpense },
      `Created expense "${title}" (₺${amount.toFixed(2)}) with ${participantUserIds.length} share(s)`,
      async () => {
        const sb = supabase!;
        const { error: expErr } = await sb.from('expenses').upsert(
          {
            ...(isUuid(newExpense.id) ? { id: newExpense.id } : {}),
            household_id: hid,
            paid_by: newExpense.paidBy,
            title: newExpense.title,
            amount: newExpense.amount,
            category: newExpense.category,
            receipt_url: newExpense.receiptUrl || null,
            date: newExpense.date,
            status: newExpense.status,
          },
          { onConflict: 'id' }
        );
        if (expErr) return { error: expErr };

        if (isUuid(newExpense.id) && newExpense.shares.length > 0) {
          const shareRows = newExpense.shares.map((s) => ({
            expense_id: newExpense.id,
            user_id: s.userId,
            share_amount: s.shareAmount,
            response: s.response,
          }));
          const { error: shareErr } = await sb.from('expense_shares').upsert(shareRows, {
            onConflict: 'expense_id,user_id',
          });
          return { error: shareErr };
        }
        return { error: null };
      }
    );

    this.addMessage(hid, null, 'activity', `${this.store.currentUser.name} logged an expense: ${title} (₺${amount.toFixed(2)})`, {
      screen: 'expenses',
      id: newExpense.id,
    });
    this.save();
    return newExpense;
  }

  public async respondToExpense(expenseId: string, response: 'agreed' | 'disputed', disputeReason?: string): Promise<Expense> {
    const exp = this.store.expenses.find(e => e.id === expenseId);
    if (!exp) throw new Error('Expense not found');
    const currentUserId = this.store.currentUser.id;
    const share = exp.shares.find(s => s.userId === currentUserId);
    if (share) {
      share.response = response;
      if (disputeReason) share.disputeReason = disputeReason;
    }

    // Update overall expense status first so remote update captures resolved status
    if (exp.shares.some(s => s.response === 'disputed')) {
      exp.status = 'disputed';
    } else if (exp.shares.every(s => s.response === 'agreed')) {
      exp.status = 'agreed';
    } else {
      exp.status = 'pending';
    }

    this.dispatchRemoteMutation(
      exp.householdId,
      'expenses',
      response === 'agreed' ? 'agree_expense' : 'dispute_expense',
      { expenseId, userId: currentUserId, response, disputeReason, nextStatus: exp.status },
      `Responded "${response}" on "${exp.title}" -> status ${exp.status}`,
      async () => {
        const sb = supabase!;
        const { error: shareErr } = await sb
          .from('expense_shares')
          .update({ response, dispute_reason: disputeReason || null })
          .eq('expense_id', expenseId)
          .eq('user_id', currentUserId);
        if (shareErr) return { error: shareErr };

        const { error: expErr } = await sb
          .from('expenses')
          .update({
            status: exp.status,
            dispute_reason: response === 'disputed' ? disputeReason || null : null,
          })
          .eq('id', expenseId);
        return { error: expErr };
      }
    );

    this.save();
    return exp;
  }

  public async editExpenseSplit(
    expenseId: string,
    adjustedShares: { userId: string; shareAmount: number }[]
  ): Promise<Expense> {
    const exp = this.store.expenses.find((e) => e.id === expenseId);
    if (!exp) throw new Error('Expense not found');
    exp.shares = adjustedShares.map((s) => ({
      userId: s.userId,
      shareAmount: s.shareAmount,
      response: 'agreed',
    }));
    exp.status = 'agreed';

    this.dispatchRemoteMutation(
      exp.householdId,
      'expenses',
      'edit_expense_split',
      { expenseId, shares: adjustedShares },
      `Adjusted split for "${exp.title}" (${adjustedShares.length} shares)`,
      async () => {
        const sb = supabase!;
        const { error: shareErr } = await sb.from('expense_shares').upsert(
          adjustedShares.map((s) => ({
            expense_id: expenseId,
            user_id: s.userId,
            share_amount: s.shareAmount,
            response: 'agreed' as const,
            dispute_reason: null,
          })),
          { onConflict: 'expense_id,user_id' }
        );
        if (shareErr) return { error: shareErr };
        return sb.from('expenses').update({ status: 'agreed', dispute_reason: null }).eq('id', expenseId);
      }
    );

    this.addMessage(
      exp.householdId,
      null,
      'activity',
      `Split adjusted for "${exp.title}". All shares resolved and agreed! 🤝`,
      { screen: 'expenses', id: exp.id }
    );
    this.save();
    return exp;
  }

  public async cancelExpense(expenseId: string): Promise<void> {
    const exp = this.store.expenses.find((e) => e.id === expenseId);
    if (exp) {
      exp.status = 'cancelled';
      this.dispatchRemoteMutation(
        exp.householdId,
        'expenses',
        'cancel_expense',
        { expenseId },
        `Cancelled expense "${exp.title}"`,
        async () => supabase!.from('expenses').update({ status: 'cancelled' }).eq('id', expenseId)
      );
      this.addMessage(
        exp.householdId,
        null,
        'activity',
        `Disputed purchase "${exp.title}" was cancelled by mutual agreement.`
      );
      this.save();
    }
  }

  public async remindRoomies(messageText?: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    this.addMessage(
      hid,
      null,
      'activity',
      messageText || `${this.store.currentUser.name} sent a friendly reminder to settle pending apartment shares.`,
      { screen: 'expenses' }
    );
    this.save();
  }

  public async getBalancesOverview(householdId?: string) {
    const hid = householdId || this.store.activeHouseholdId;
    const [expenses, settlements, members] = await Promise.all([
      this.getExpenses(hid),
      this.getSettlements(hid),
      this.getHouseholdMembers(hid),
    ]);
    const userIds = members.map(m => m.user.id);
    return calculateBalances(expenses, settlements, userIds);
  }

  public async markSettlementPaid(toUserId: string, amount: number): Promise<Settlement> {
    const hid = this.store.activeHouseholdId;
    const useUuid = !this.isDemoMode() && isUuid(hid);
    const newSettlement: Settlement = {
      id: makeEntityId('set', useUuid),
      householdId: hid,
      fromUser: this.store.currentUser.id,
      toUser: toUserId,
      amount,
      status: 'marked_paid',
      createdAt: new Date().toISOString(),
    };
    this.store.settlements.push(newSettlement);

    this.dispatchRemoteMutation(
      hid,
      'settlements',
      'create_settlement',
      { settlement: newSettlement },
      `Marked ₺${amount.toFixed(2)} paid to ${toUserId.slice(0, 8)}`,
      async () =>
        supabase!.from('settlements').upsert(
          {
            ...(isUuid(newSettlement.id) ? { id: newSettlement.id } : {}),
            household_id: hid,
            from_user: newSettlement.fromUser,
            to_user: newSettlement.toUser,
            amount: newSettlement.amount,
            status: 'marked_paid',
          },
          { onConflict: 'id' }
        )
    );

    const toUser = this.store.users.find(u => u.id === toUserId);
    this.addMessage(hid, null, 'activity', `${this.store.currentUser.name} marked ₺${amount.toFixed(2)} as paid to ${toUser?.name || 'roomie'}. Waiting for confirmation.`);
    this.save();
    return newSettlement;
  }

  public async confirmSettlement(settlementId: string): Promise<Settlement> {
    const set = this.store.settlements.find(s => s.id === settlementId);
    if (!set) throw new Error('Settlement not found');
    const confirmedAt = new Date().toISOString();
    set.status = 'confirmed';
    set.confirmedAt = confirmedAt;

    this.dispatchRemoteMutation(
      set.householdId,
      'settlements',
      'confirm_settlement',
      { settlementId, confirmedAt },
      `Confirmed settlement ₺${set.amount.toFixed(2)}`,
      async () =>
        supabase!.from('settlements').update({ status: 'confirmed', confirmed_at: confirmedAt }).eq('id', settlementId)
    );

    const fromUser = this.store.users.find(u => u.id === set.fromUser);
    this.addMessage(set.householdId, null, 'activity', `Payment of ₺${set.amount.toFixed(2)} from ${fromUser?.name || 'roomie'} confirmed settled.`);
    this.save();
    return set;
  }

  public async getSettlements(householdId?: string): Promise<Settlement[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: setRows, error } = await supabase
          .from('settlements')
          .select('*')
          .eq('household_id', hid);

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          debugLog.warn('settlements', 'fetch_settlements', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(setRows)) {
          const liveSets = setRows.map(mapSettlement);
          this.store.settlements = [
            ...this.store.settlements.filter((s) => s.householdId !== hid),
            ...liveSets,
          ];
          debugLog.info('settlements', 'fetch_settlements', `Loaded ${liveSets.length} settlement(s)`, { householdId: hid, count: liveSets.length }, durationMs);
          return liveSets;
        }
      } catch (err: any) {
        debugLog.error('settlements', 'fetch_settlements', err?.message || 'Supabase getSettlements fallback', { householdId: hid });
      }
    }
    return this.store.settlements.filter(s => s.householdId === hid);
  }

  // --- Chores & The Draft ---
  public async getChores(householdId?: string): Promise<Chore[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: choreRows, error } = await supabase
          .from('chores')
          .select('*')
          .eq('household_id', hid)
          .eq('active', true);

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          debugLog.warn('chores_draft', 'fetch_chores', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(choreRows)) {
          const liveChores = choreRows.map(mapChore);
          this.store.chores = [
            ...this.store.chores.filter((c) => c.householdId !== hid),
            ...liveChores,
          ];
          debugLog.info('chores_draft', 'fetch_chores', `Loaded ${liveChores.length} chore(s)`, { householdId: hid, count: liveChores.length }, durationMs);
          return liveChores;
        }
      } catch (err: any) {
        debugLog.error('chores_draft', 'fetch_chores', err?.message || 'Supabase getChores fallback', { householdId: hid });
      }
    }
    return this.store.chores.filter(c => c.householdId === hid);
  }

  public async addChore(name: string, frequency: 'daily' | 'weekly', effortLevel: 'light' | 'medium' | 'heavy', description: string): Promise<Chore> {
    const hid = this.store.activeHouseholdId;
    const iconName = effortLevel === 'heavy' ? 'Bath' : effortLevel === 'medium' ? 'Sparkles' : 'Trash2';
    let newChore: Chore = {
      id: makeEntityId('ch', !this.isDemoMode() && isUuid(hid)),
      householdId: hid,
      name,
      frequency,
      effortLevel,
      active: true,
      description,
      iconName,
    };

    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: inserted, error } = await supabase
          .from('chores')
          .insert({
            ...(isUuid(newChore.id) ? { id: newChore.id } : {}),
            household_id: hid,
            name,
            frequency,
            effort_level: effortLevel,
            active: true,
            description,
            icon_name: iconName,
          })
          .select('*')
          .single();
        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          debugLog.warn('chores_draft', 'add_chore', error.message, { householdId: hid, name }, durationMs);
        } else if (inserted) {
          newChore = mapChore(inserted);
          debugLog.info('chores_draft', 'add_chore', `Added chore "${name}"`, { householdId: hid, choreId: newChore.id }, durationMs);
        }
      } catch (err: any) {
        debugLog.error('chores_draft', 'add_chore', err?.message || 'Supabase addChore fallback', { householdId: hid });
      }
    }

    this.store.chores.push(newChore);
    this.save();
    return newChore;
  }

  public async getDraftRound(householdId?: string): Promise<DraftRound> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('draft_rounds')
          .select('*, draft_picks(*), chore_assignments(*)')
          .eq('household_id', hid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let roundRow: any = existing;
        if (!fetchErr && !roundRow) {
          const { data: created, error: createErr } = await supabase
            .from('draft_rounds')
            .insert({ household_id: hid, status: 'collecting' })
            .select('*, draft_picks(*), chore_assignments(*)')
            .single();
          if (createErr) {
            debugLog.warn('chores_draft', 'create_draft_round', createErr.message, { householdId: hid });
          }
          roundRow = created;
        }

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (fetchErr) {
          debugLog.warn('chores_draft', 'fetch_draft_round', fetchErr.message, { householdId: hid }, durationMs);
        } else if (roundRow) {
          const liveRound: DraftRound = {
            id: roundRow.id,
            householdId: roundRow.household_id,
            status: roundRow.status,
            createdAt: roundRow.created_at || new Date().toISOString(),
            revealedAt: roundRow.revealed_at || undefined,
            picks: (roundRow.draft_picks || []).map((p: any) => ({
              userId: p.user_id,
              choreId: p.chore_id,
              pickType: p.pick_type,
              targetUserId: p.target_user_id || undefined,
            })),
            assignments: (roundRow.chore_assignments || []).map((a: any) => ({
              choreId: a.chore_id,
              userId: a.user_id,
              scheduledDays: a.scheduled_days || ['Daily'],
              scheduledTime: a.scheduled_time || '18:00',
              completedToday: Boolean(a.completed_today),
              lastPhotoUrl: a.last_photo_url || undefined,
              kudos: Array.isArray(a.kudos) ? a.kudos : [],
            })),
          };
          this.store.draftRounds[hid] = liveRound;
          this.save();
          debugLog.info(
            'chores_draft',
            'fetch_draft_round',
            `Round ${liveRound.id.slice(0, 8)} (${liveRound.status}): ${liveRound.picks.length} picks, ${liveRound.assignments.length} assignments`,
            { householdId: hid, roundId: liveRound.id, status: liveRound.status },
            durationMs
          );
          return liveRound;
        }
      } catch (err: any) {
        debugLog.error('chores_draft', 'fetch_draft_round', err?.message || 'Supabase getDraftRound fallback', { householdId: hid });
      }
    }

    if (!this.store.draftRounds[hid]) {
      this.store.draftRounds[hid] = {
        id: makeEntityId('dr', !this.isDemoMode() && isUuid(hid)),
        householdId: hid,
        status: 'collecting',
        createdAt: new Date().toISOString(),
        picks: [],
        assignments: [],
      };
      this.save();
    }
    return this.store.draftRounds[hid];
  }

  public emitChoreDraftTransition(hid: string, state: UnifiedDraftState) {
    const event = getChoreStateEvent(state);
    this.addMessage(hid, null, 'activity', event.activityMessage, event.linkTarget);

    const useUuid = !this.isDemoMode() && isUuid(hid);
    const members = this.store.memberships.filter(m => m.householdId === hid && m.status === 'active');
    for (const m of members) {
      this.store.notifications = this.store.notifications.filter(
        n => !(n.userId === m.userId && n.type === 'chore' && n.linkTarget?.screen.startsWith('chore-'))
      );
      const notif: InAppNotification = {
        id: makeEntityId('notif_chore', useUuid),
        userId: m.userId,
        type: 'chore',
        title: event.title,
        body: event.body,
        read: false,
        createdAt: new Date().toISOString(),
        linkTarget: event.linkTarget,
      };
      this.store.notifications.unshift(notif);

      // Persist notification row only for the signed-in user (enforced by notifications RLS: user_id = auth.uid())
      if (useUuid && supabase && m.userId === this.store.currentUser.id && isUuid(notif.id)) {
        Promise.resolve(
          supabase.from('notifications').upsert(
            {
              id: notif.id,
              user_id: notif.userId,
              type: notif.type,
              title: notif.title,
              body: notif.body,
              read: false,
              link_target: (notif.linkTarget as any) || null,
            },
            { onConflict: 'id' }
          )
        ).catch(() => {});
      }
    }
  }

  public async openNewDraftRound(householdId?: string): Promise<DraftRound> {
    const hid = householdId || this.store.activeHouseholdId;
    const useUuid = !this.isDemoMode() && isUuid(hid);
    const newRound: DraftRound = {
      id: makeEntityId('dr', useUuid),
      householdId: hid,
      status: 'collecting',
      createdAt: new Date().toISOString(),
      picks: [],
      assignments: [],
    };
    this.store.draftRounds[hid] = newRound;

    this.dispatchRemoteMutation(
      hid,
      'chores_draft',
      'open_draft_round',
      { roundId: newRound.id, householdId: hid },
      `Opened new draft round ${newRound.id.slice(0, 8)}`,
      async () =>
        supabase!.from('draft_rounds').upsert(
          {
            ...(isUuid(newRound.id) ? { id: newRound.id } : {}),
            household_id: hid,
            status: 'collecting',
          },
          { onConflict: 'id' }
        )
    );

    this.emitChoreDraftTransition(hid, 'draft_open');
    this.save();
    return newRound;
  }

  public async submitDraftPicks(picks: DraftPick[]): Promise<DraftRound> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    const currentUserId = this.store.currentUser.id;
    round.picks = round.picks.filter(p => p.userId !== currentUserId);
    round.picks.push(...picks);

    const members = await this.getHouseholdMembers(hid);
    const activeMemberIds = members.map(m => m.user.id);
    const usersWithPicks = new Set(round.picks.map(p => p.userId));
    const allPicksIn = activeMemberIds.length > 0 && activeMemberIds.every(id => usersWithPicks.has(id));

    if (allPicksIn) {
      const chores = await this.getChores(hid);
      const { assignments } = matchChores(chores, round.picks, activeMemberIds);
      round.assignments = assignments;
      round.status = 'ready_to_reveal';
      this.emitChoreDraftTransition(hid, 'reveal_ready');
    } else {
      this.emitChoreDraftTransition(hid, 'waiting_others');
    }

    this.dispatchRemoteMutation(
      hid,
      'chores_draft',
      'submit_draft_picks',
      {
        roundId: round.id,
        userId: currentUserId,
        picks,
        status: round.status,
        assignments: round.status === 'ready_to_reveal' ? round.assignments : undefined,
      },
      `Submitted ${picks.length} pick(s) -> round ${round.status}`,
      async () => {
        const sb = supabase!;
        const { error: delErr } = await sb.from('draft_picks').delete().eq('round_id', round.id).eq('user_id', currentUserId);
        if (delErr) return { error: delErr };

        if (picks.length > 0) {
          const { error: pickErr } = await sb.from('draft_picks').upsert(
            picks.map((pk) => toDraftPickRow(round.id, pk)),
            { onConflict: 'round_id,user_id,chore_id' }
          );
          if (pickErr) return { error: pickErr };
        }

        if (round.status === 'ready_to_reveal' && round.assignments.length > 0) {
          const { error: assignErr } = await sb.from('chore_assignments').upsert(
            round.assignments.map((a) => toChoreAssignmentRow(round.id, a)),
            { onConflict: 'round_id,chore_id' }
          );
          if (assignErr) return { error: assignErr };
          return sb.from('draft_rounds').update({ status: 'ready_to_reveal' }).eq('id', round.id);
        }

        return { error: null };
      }
    );

    this.save();
    return round;
  }

  public async updateAssignments(assignments: ChoreAssignment[]): Promise<DraftRound> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    round.assignments = assignments;

    this.dispatchRemoteMutation(
      hid,
      'chores_draft',
      'update_assignments',
      { roundId: round.id, assignments },
      `Updated ${assignments.length} chore assignment schedule(s)`,
      async () =>
        supabase!.from('chore_assignments').upsert(
          assignments.map((a) => toChoreAssignmentRow(round.id, a)),
          { onConflict: 'round_id,chore_id' }
        )
    );

    this.save();
    return round;
  }

  public async markDraftRevealed(): Promise<DraftRound> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    const revealedAt = new Date().toISOString();
    round.status = 'revealed';
    round.revealedAt = revealedAt;

    this.dispatchRemoteMutation(
      hid,
      'chores_draft',
      'reveal_draft',
      { roundId: round.id, revealedAt },
      `Revealed draft round ${round.id.slice(0, 8)}`,
      async () =>
        supabase!.from('draft_rounds').update({ status: 'revealed', revealed_at: revealedAt }).eq('id', round.id)
    );

    this.emitChoreDraftTransition(hid, 'reveal_done');
    this.save();
    return round;
  }

  public async completeChore(choreId: string, photoUrl?: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    const assign = round.assignments.find(a => a.choreId === choreId && a.userId === this.store.currentUser.id);
    if (assign) {
      assign.completedToday = true;
      if (photoUrl) assign.lastPhotoUrl = photoUrl;
      this.store.currentUser.streakDays += 1;
      this.store.currentUser.points += 20;
      const chore = this.store.chores.find(c => c.id === choreId);
      const useUuid = !this.isDemoMode() && isUuid(hid);
      const logId = makeEntityId('clog', useUuid);

      this.dispatchRemoteMutation(
        hid,
        'chores_draft',
        'complete_chore',
        { roundId: round.id, householdId: hid, choreId, userId: this.store.currentUser.id, photoUrl, logId },
        `Completed "${chore?.name || choreId}"${photoUrl ? ' with photo proof' : ''}`,
        async () => {
          const sb = supabase!;
          let q = sb
            .from('chore_assignments')
            .update({ completed_today: true, last_photo_url: photoUrl || null })
            .eq('chore_id', choreId);
          if (isUuid(round.id)) q = q.eq('round_id', round.id);
          const { error: assignErr } = await q;
          if (assignErr) return { error: assignErr };

          if (isUuid(choreId) && isUuid(this.store.currentUser.id)) {
            return sb.from('chore_logs').upsert(
              {
                ...(isUuid(logId) ? { id: logId } : {}),
                household_id: hid,
                chore_id: choreId,
                user_id: this.store.currentUser.id,
                photo_url: photoUrl || null,
              },
              { onConflict: 'id' }
            );
          }
          return { error: null };
        }
      );

      this.addMessage(hid, null, 'activity', `${this.store.currentUser.name} completed ${chore?.name || 'chore'}. Send kudos?`, {
        screen: 'chores',
        id: choreId,
      });
      this.save();
    }
  }

  public async giveKudos(choreId: string, targetUserId: string, type: 'thanks' | 'great_job' | 'needs_look', note?: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    const assign = round.assignments.find(a => a.choreId === choreId && a.userId === targetUserId);
    if (assign) {
      assign.kudos.push({
        id: makeEntityId('k', !this.isDemoMode() && isUuid(hid)),
        fromUser: this.store.currentUser.id,
        type,
        note,
        createdAt: new Date().toISOString(),
      });
      if (type !== 'needs_look') {
        const target = this.store.users.find(u => u.id === targetUserId);
        if (target) target.points += 10;
      }

      this.dispatchRemoteMutation(
        hid,
        'chores_draft',
        'give_kudos',
        { roundId: round.id, choreId, kudos: assign.kudos },
        `Sent "${type}" kudos for chore ${choreId.slice(0, 8)}`,
        async () => {
          let q = supabase!.from('chore_assignments').update({ kudos: assign.kudos as any }).eq('chore_id', choreId);
          if (isUuid(round.id)) q = q.eq('round_id', round.id);
          return q;
        }
      );

      this.save();
    }
  }

  public async swapChore(choreId: string, toUserId: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    const assign = round.assignments.find(a => a.choreId === choreId && a.userId === this.store.currentUser.id);
    if (assign) {
      assign.userId = toUserId;
      const toUser = this.store.users.find(u => u.id === toUserId);
      const chore = this.store.chores.find(c => c.id === choreId);

      this.dispatchRemoteMutation(
        hid,
        'chores_draft',
        'swap_chore',
        { roundId: round.id, choreId, toUserId },
        `Swapped "${chore?.name || choreId}" -> ${toUser?.name || toUserId.slice(0, 8)}`,
        async () => {
          let q = supabase!.from('chore_assignments').update({ user_id: toUserId }).eq('chore_id', choreId);
          if (isUuid(round.id)) q = q.eq('round_id', round.id);
          return q;
        }
      );

      this.addMessage(hid, null, 'activity', `${this.store.currentUser.name} swapped "${chore?.name}" with ${toUser?.name}.`);
      this.save();
    }
  }

  // --- Duty Day & Timetable ---
  public async getDutySchedule(householdId?: string): Promise<DutySchedule> {
    const hid = householdId || this.store.activeHouseholdId;
    if (!this.store.dutySchedules) {
      this.store.dutySchedules = {};
    }

    const currentMonday = getMondayOfWeek();
    let schedule = this.store.dutySchedules[hid];

    if (!schedule || schedule.weekStartDate !== currentMonday) {
      const activeMembers = await this.getHouseholdMembers(hid);
      const roommates = activeMembers.map((m) => m.user);
      const chores = await this.getChores(hid);
      schedule = generateDutySchedule(hid, roommates, chores, currentMonday);
      this.store.dutySchedules[hid] = schedule;
      this.save();
    }

    return schedule;
  }

  public async reassignDutyDay(day: DayOfWeek, userId: string, householdId?: string): Promise<DutySchedule> {
    const hid = householdId || this.store.activeHouseholdId;
    const schedule = await this.getDutySchedule(hid);
    const updated = reassignDutyDayUtil(schedule, day, userId);
    this.store.dutySchedules![hid] = updated;

    const assignedUser = this.store.users.find((u) => u.id === userId);
    this.addMessage(
      hid,
      null,
      'activity',
      `📅 Duty schedule updated: ${assignedUser?.name || 'A flatmate'} is now assigned to ${day}.`,
      { screen: 'chores' }
    );

    this.save();
    return updated;
  }

  public async swapDutyDays(day1: DayOfWeek, day2: DayOfWeek, householdId?: string): Promise<DutySchedule> {
    const hid = householdId || this.store.activeHouseholdId;
    const schedule = await this.getDutySchedule(hid);
    const updated = swapDutyDaysUtil(schedule, day1, day2);
    this.store.dutySchedules![hid] = updated;

    this.addMessage(
      hid,
      null,
      'activity',
      `🔄 Duty days swapped between ${day1} and ${day2}.`,
      { screen: 'chores' }
    );

    this.save();
    return updated;
  }

  public async completeDutyDay(day: DayOfWeek, householdId?: string): Promise<void> {
    const hid = householdId || this.store.activeHouseholdId;
    const schedule = await this.getDutySchedule(hid);
    const entry = schedule.entries.find((e) => e.day === day);
    if (entry) {
      entry.completed = true;
      this.addMessage(
        hid,
        null,
        'activity',
        `✨ ${this.store.currentUser.name} completed today's apartment duty!`,
        { screen: 'chores' }
      );
      this.save();
    }
  }

  public async checkDutyDayReminder(): Promise<void> {
    const hid = this.store.activeHouseholdId;
    if (!hid) return;
    try {
      const schedule = await this.getDutySchedule(hid);
      const activeMembers = await this.getHouseholdMembers(hid);
      const roommates = activeMembers.map((m) => m.user);
      const todayDuty = getTodayDuty(schedule, roommates, this.store.currentUser.id);

      if (todayDuty && todayDuty.isMe && !todayDuty.entry.completed) {
        const todayDateStr = new Date().toISOString().split('T')[0];
        const alreadyNotified = this.store.notifications.some(
          (n) => n.userId === this.store.currentUser.id && n.title.includes('Duty Day') && n.createdAt.startsWith(todayDateStr)
        );

        if (!alreadyNotified) {
          const flat = this.store.households.find((h) => h.id === hid);
          this.store.notifications.unshift({
            id: 'notif_duty_' + Date.now(),
            userId: this.store.currentUser.id,
            type: 'chore',
            title: "☀️ Today is your Flat Duty Day!",
            body: `You are on duty today at ${flat?.name || 'the apartment'}. Tap to review and complete today's tasks.`,
            read: false,
            createdAt: new Date().toISOString(),
            linkTarget: { screen: 'chores' },
          });
          this.save();
        }
      }
    } catch {
      // ignore
    }
  }

  // --- Chat ---
  public async getMessages(householdId?: string): Promise<ChatMessage[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: msgRows, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('household_id', hid)
          .order('created_at', { ascending: true });

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          debugLog.warn('chat', 'fetch_messages', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(msgRows)) {
          const liveMsgs = msgRows.map(mapChatMessage);
          this.store.messages[hid] = liveMsgs;
          debugLog.info('chat', 'fetch_messages', `Loaded ${liveMsgs.length} message(s)`, { householdId: hid, count: liveMsgs.length }, durationMs);
          return liveMsgs;
        }
      } catch (err: any) {
        debugLog.error('chat', 'fetch_messages', err?.message || 'Supabase getMessages fallback', { householdId: hid });
      }
    }
    return this.store.messages[hid] || [];
  }

  public async sendMessage(body: string): Promise<ChatMessage> {
    const hid = this.store.activeHouseholdId;
    const msg = this.addMessage(hid, this.store.currentUser.id, 'text', body);
    this.save();

    this.dispatchRemoteMutation(
      hid,
      'chat',
      'send_message',
      { message: msg },
      `Sent message (${body.length} chars)`,
      async () =>
        supabase!.from('chat_messages').upsert(
          {
            ...(isUuid(msg.id) ? { id: msg.id } : {}),
            household_id: hid,
            sender_id: msg.senderId,
            type: msg.type,
            body: msg.body,
            link_target: (msg.linkTarget as any) || null,
            reactions: [],
          },
          { onConflict: 'id' }
        )
    );

    return msg;
  }

  public subscribeToHousehold(householdId: string, onUpdate: () => void): () => void {
    if (!supabase || this.isDemoMode() || !isUuid(householdId)) {
      debugLog.info('realtime', 'subscribe_skipped', this.isDemoMode() ? 'Demo mode isolated from Realtime' : 'Realtime inactive');
      return () => {};
    }
    const sb = supabase;
    try {
      const channel = sb
        .channel(`household_live_${householdId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', filter: `household_id=eq.${householdId}` },
          (payload: any) => {
            debugLog.info('realtime', 'pg_change', `${payload?.table || 'public'} ${payload?.eventType || '*'}`, {
              householdId,
              table: payload?.table,
              eventType: payload?.eventType,
            });
            onUpdate();
          }
        )
        .subscribe((status) => {
          const level = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'warn' : 'info';
          debugLog.log('realtime', level, 'channel_status', `Household channel -> ${status}`, {
            meta: { householdId, status },
          });
        });

      return () => {
        debugLog.info('realtime', 'unsubscribe', `Unsubscribed household ${householdId.slice(0, 8)}`);
        sb.removeChannel(channel);
      };
    } catch (err: any) {
      debugLog.error('realtime', 'subscribe_error', err?.message || 'Realtime subscription error', { householdId });
      return () => {};
    }
  }

  public addMessage(
    householdId: string,
    senderId: string | null,
    type: 'text' | 'activity',
    body: string,
    linkTarget?: { screen: string; id?: string }
  ): ChatMessage {
    if (!this.store.messages[householdId]) {
      this.store.messages[householdId] = [];
    }
    const useUuid = !this.isDemoMode() && isUuid(householdId);
    const msg: ChatMessage = {
      id: makeEntityId('msg', useUuid),
      householdId,
      senderId,
      type,
      body,
      linkTarget,
      createdAt: new Date().toISOString(),
      reactions: [],
    };
    this.store.messages[householdId].push(msg);

    if (type === 'activity') {
      this.dispatchRemoteMutation(
        householdId,
        'chat',
        'send_message',
        { message: msg },
        `Posted activity: ${body.slice(0, 48)}`,
        async () =>
          supabase!.from('chat_messages').upsert(
            {
              ...(isUuid(msg.id) ? { id: msg.id } : {}),
              household_id: householdId,
              sender_id: null,
              type: 'activity',
              body: msg.body,
              link_target: (msg.linkTarget as any) || null,
              reactions: [],
            },
            { onConflict: 'id' }
          )
      );
    }
    return msg;
  }

  public async addReaction(messageId: string, emoji: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const msgs = this.store.messages[hid] || [];
    const msg = msgs.find(m => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = [];
      const existing = msg.reactions.find(r => r.emoji === emoji);
      const myId = this.store.currentUser.id;
      if (existing) {
        if (existing.userIds.includes(myId)) {
          existing.userIds = existing.userIds.filter(id => id !== myId);
        } else {
          existing.userIds.push(myId);
        }
      } else {
        msg.reactions.push({ emoji, userIds: [myId] });
      }

      this.dispatchRemoteMutation(
        hid,
        'chat',
        'add_reaction',
        { messageId, reactions: msg.reactions },
        `Toggled reaction ${emoji} on message ${messageId.slice(0, 8)}`,
        async () =>
          supabase!.from('chat_messages').update({ reactions: msg.reactions as any }).eq('id', messageId)
      );

      this.save();
    }
  }

  // --- House Meetings & Agreements ---
  public async getMeetingTopics(householdId?: string): Promise<MeetingTopic[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: rows, error } = await supabase
          .from('meeting_topics')
          .select('*')
          .eq('household_id', hid)
          .order('created_at', { ascending: false });

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          debugLog.warn('governance', 'fetch_topics', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(rows)) {
          const liveTopics = rows.map(mapMeetingTopic);
          this.store.meetingTopics[hid] = liveTopics;
          debugLog.info('governance', 'fetch_topics', `Loaded ${liveTopics.length} topic(s)`, { householdId: hid, count: liveTopics.length }, durationMs);
          return liveTopics;
        }
      } catch (err: any) {
        debugLog.error('governance', 'fetch_topics', err?.message || 'Supabase getMeetingTopics fallback', { householdId: hid });
      }
    }
    return this.store.meetingTopics[hid] || [];
  }

  public async createMeetingTopic(title: string, description: string): Promise<MeetingTopic> {
    const hid = this.store.activeHouseholdId;
    if (!this.store.meetingTopics[hid]) this.store.meetingTopics[hid] = [];
    const useUuid = !this.isDemoMode() && isUuid(hid);
    const topic: MeetingTopic = {
      id: makeEntityId('mt', useUuid),
      householdId: hid,
      proposedBy: this.store.currentUser.id,
      title,
      description,
      status: 'open',
      votes: [{ userId: this.store.currentUser.id, vote: 'agree' }],
      comments: [],
    };
    this.store.meetingTopics[hid].unshift(topic);

    this.dispatchRemoteMutation(
      hid,
      'governance',
      'create_topic',
      { topic },
      `Proposed topic "${title}"`,
      async () =>
        supabase!.from('meeting_topics').upsert(
          {
            ...(isUuid(topic.id) ? { id: topic.id } : {}),
            household_id: hid,
            proposed_by: topic.proposedBy,
            title: topic.title,
            description: topic.description,
            status: topic.status,
            votes: topic.votes as any,
            comments: [],
          },
          { onConflict: 'id' }
        )
    );

    this.addMessage(hid, null, 'activity', `${this.store.currentUser.name} proposed a house topic: "${title}"`, {
      screen: 'meetings',
      id: topic.id,
    });
    this.save();
    return topic;
  }

  public async voteMeetingTopic(topicId: string, vote: 'agree' | 'disagree' | 'neutral'): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const topic = (this.store.meetingTopics[hid] || []).find(t => t.id === topicId);
    if (topic) {
      const existing = topic.votes.find(v => v.userId === this.store.currentUser.id);
      if (existing) {
        existing.vote = vote;
      } else {
        topic.votes.push({ userId: this.store.currentUser.id, vote });
      }
      const members = await this.getHouseholdMembers(hid);
      const agreeCount = topic.votes.filter(v => v.vote === 'agree').length;
      const becameAgreed = topic.status !== 'agreed' && members.length > 0 && agreeCount >= Math.ceil(members.length * 0.75);
      if (becameAgreed) {
        topic.status = 'agreed';
        await this.addAgreement(topic.title, 'Agreed in House Meeting');
      }

      this.dispatchRemoteMutation(
        hid,
        'governance',
        'vote_topic',
        { topicId, votes: topic.votes, status: topic.status },
        `Voted "${vote}" on "${topic.title}" -> status ${topic.status}`,
        async () =>
          supabase!
            .from('meeting_topics')
            .update({ votes: topic.votes as any, status: topic.status })
            .eq('id', topicId)
      );

      this.save();
    }
  }

  public async voteTopic(topicId: string, vote: 'agree' | 'disagree' | 'neutral'): Promise<void> {
    return this.voteMeetingTopic(topicId, vote);
  }

  public async addCommentToTopic(topicId: string, text: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const topic = (this.store.meetingTopics[hid] || []).find(t => t.id === topicId);
    if (topic) {
      topic.comments.push({
        id: makeEntityId('c', !this.isDemoMode() && isUuid(hid)),
        userId: this.store.currentUser.id,
        text,
        createdAt: new Date().toISOString(),
      });

      this.dispatchRemoteMutation(
        hid,
        'governance',
        'add_comment',
        { topicId, comments: topic.comments },
        `Added comment on "${topic.title}"`,
        async () =>
          supabase!.from('meeting_topics').update({ comments: topic.comments as any }).eq('id', topicId)
      );

      this.save();
    }
  }

  public async getAgreements(householdId?: string): Promise<HouseAgreement[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: rows, error } = await supabase
          .from('house_agreements')
          .select('*')
          .eq('household_id', hid)
          .order('agreed_at', { ascending: false });

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          debugLog.warn('governance', 'fetch_agreements', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(rows)) {
          const liveAgreements = rows.map(mapAgreement);
          this.store.agreements[hid] = liveAgreements;
          debugLog.info('governance', 'fetch_agreements', `Loaded ${liveAgreements.length} agreement(s)`, { householdId: hid, count: liveAgreements.length }, durationMs);
          return liveAgreements;
        }
      } catch (err: any) {
        debugLog.error('governance', 'fetch_agreements', err?.message || 'Supabase getAgreements fallback', { householdId: hid });
      }
    }
    return this.store.agreements[hid] || [];
  }

  public async addAgreement(text: string, category: string): Promise<HouseAgreement> {
    const hid = this.store.activeHouseholdId;
    if (!this.store.agreements[hid]) this.store.agreements[hid] = [];
    const useUuid = !this.isDemoMode() && isUuid(hid);
    const agr: HouseAgreement = {
      id: makeEntityId('agr', useUuid),
      householdId: hid,
      text,
      category,
      agreedAt: new Date().toISOString(),
    };
    this.store.agreements[hid].push(agr);

    this.dispatchRemoteMutation(
      hid,
      'governance',
      'add_agreement',
      { agreement: agr },
      `Recorded agreement "${text.slice(0, 48)}"`,
      async () =>
        supabase!.from('house_agreements').upsert(
          {
            ...(isUuid(agr.id) ? { id: agr.id } : {}),
            household_id: hid,
            text: agr.text,
            category: agr.category,
            agreed_at: agr.agreedAt,
          },
          { onConflict: 'id' }
        )
    );

    this.save();
    return agr;
  }

  // --- Notifications ---
  public async getNotifications(): Promise<InAppNotification[]> {
    const currentUserId = this.store.currentUser.id;
    if (supabase && !this.isDemoMode() && isUuid(currentUserId)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: rows, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(60);

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          debugLog.warn('notifications', 'fetch_notifications', error.message, { code: error.code }, durationMs);
        } else if (Array.isArray(rows)) {
          const live = rows.map(mapNotification);
          this.store.notifications = [
            ...this.store.notifications.filter((n) => n.userId !== currentUserId),
            ...live,
          ];
          debugLog.info('notifications', 'fetch_notifications', `Loaded ${live.length} notification(s)`, { count: live.length }, durationMs);
        }
      } catch (err: any) {
        debugLog.error('notifications', 'fetch_notifications', err?.message || 'Supabase getNotifications fallback');
      }
    }

    const pendingRequests = this.store.joinRequests.filter(r => r.status === 'pending');
    // Unresolved join requests must remain unread per spec
    if (pendingRequests.length > 0) {
      this.store.notifications.forEach(n => {
        if (n.type === 'household' && n.title.toLowerCase().includes('join request')) {
          n.read = false;
        }
      });
    }

    return [...this.store.notifications]
      .filter((n) => n.userId === currentUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async markNotificationRead(id: string): Promise<void> {
    const n = this.store.notifications.find(item => item.id === id);
    if (n) {
      const isUnresolvedJoin =
        n.type === 'household' &&
        n.title.toLowerCase().includes('join request') &&
        this.store.joinRequests.some(r => r.status === 'pending');
      if (!isUnresolvedJoin) {
        n.read = true;
        if (isUuid(id)) {
          this.dispatchRemoteMutation(
            this.store.activeHouseholdId,
            'notifications',
            'mark_notification_read',
            { id },
            `Marked notification ${id.slice(0, 8)} read`,
            async () => supabase!.from('notifications').update({ read: true }).eq('id', id)
          );
        }
        this.save();
      }
    }
  }

  public async markAllNotificationsRead(): Promise<void> {
    const hasPendingJoin = this.store.joinRequests.some(r => r.status === 'pending');
    const markedUuidIds: string[] = [];
    this.store.notifications.forEach(n => {
      if (n.userId === this.store.currentUser.id) {
        if (n.type === 'household' && n.title.toLowerCase().includes('join request') && hasPendingJoin) {
          n.read = false;
        } else {
          n.read = true;
          if (isUuid(n.id)) markedUuidIds.push(n.id);
        }
      }
    });
    if (markedUuidIds.length > 0) {
      this.dispatchRemoteMutation(
        this.store.activeHouseholdId,
        'notifications',
        'mark_all_notifications_read',
        { ids: markedUuidIds },
        `Marked ${markedUuidIds.length} notification(s) read`,
        async () => supabase!.from('notifications').update({ read: true }).in('id', markedUuidIds)
      );
    }
    this.save();
  }

  public getActiveHouseholdId(): string {
    return this.store.activeHouseholdId;
  }

  // --- Diagnostics & Debug Layer Probe ---
  public async pingSupabaseHealth(): Promise<{
    configured: boolean;
    demoMode: boolean;
    authenticated: boolean;
    activeHouseholdId: string;
    latencyMs: number;
    checks: { name: string; ok: boolean; detail: string; ms: number }[];
  }> {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const hid = this.store.activeHouseholdId;
    const demoMode = this.isDemoMode();
    if (!supabase || !isSupabaseConfigured) {
      debugLog.warn('auth', 'health_probe', 'Supabase client not configured');
      return {
        configured: false,
        demoMode,
        authenticated: false,
        activeHouseholdId: hid,
        latencyMs: 0,
        checks: [{ name: 'supabase_env', ok: false, detail: 'Missing VITE_SUPABASE_URL/ANON_KEY', ms: 0 }],
      };
    }

    const checks: { name: string; ok: boolean; detail: string; ms: number }[] = [];
    const { data: sessData } = await supabase.auth.getSession();
    const authenticated = Boolean(sessData?.session?.user);
    checks.push({
      name: 'auth_session',
      ok: authenticated,
      detail: authenticated ? `uid:${sessData.session!.user.id.slice(0, 8)}` : 'Signed out',
      ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0),
    });

    const tables = ['households', 'expenses', 'settlements', 'chores', 'draft_rounds', 'meeting_topics', 'chat_messages', 'notifications'] as const;
    for (const table of tables) {
      const s = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const { error } = await (supabase.from(table) as any).select('id', { count: 'exact', head: true }).limit(1);
      const ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - s);
      checks.push({
        name: `rls_${table}`,
        ok: !error,
        detail: error ? error.message : 'RLS reachable',
        ms,
      });
    }

    const totalMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    const failed = checks.filter((c) => !c.ok).length;
    debugLog.log('auth', failed > 0 ? 'warn' : 'info', 'health_probe', `Probe complete: ${checks.length - failed}/${checks.length} checks ok`, {
      durationMs: totalMs,
      meta: { demoMode, authenticated, householdId: hid, failed },
    });

    return {
      configured: true,
      demoMode,
      authenticated,
      activeHouseholdId: hid,
      latencyMs: totalMs,
      checks,
    };
  }

  // --- Profile ---
  public async updateUserProfile(updates: Partial<User>): Promise<User> {
    this.store.currentUser = { ...this.store.currentUser, ...updates };
    const idx = this.store.users.findIndex(u => u.id === this.store.currentUser.id);
    if (idx >= 0) {
      this.store.users[idx] = { ...this.store.users[idx], ...updates };
    }
    this.save();
    return this.store.currentUser;
  }

  // --- Settings ---
  public async getSettings(): Promise<UserSettings> {
    return { ...this.store.settings };
  }

  public async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    this.store.settings = { ...this.store.settings, ...updates };
    this.save();
    return this.store.settings;
  }

  // --- Export & Delete Data ---
  public exportData(): string {
    return JSON.stringify(this.store, null, 2);
  }
}

export const api = new ApiService();
