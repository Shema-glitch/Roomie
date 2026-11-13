/**
 * Shared API Infrastructure: Store Types, Seed Data, Mappers & Dispatcher
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
} from '../../types';
import { getChoreDraftState, getChoreStateEvent } from '../../utils/stateTable';
import { outbox, OutboxActionType } from '../outbox';
import { debugLog, DebugModule } from '../../utils/debugLog';
import { supabase } from '../supabase';

export const STORAGE_KEY = 'roomie_prototype_v3_store';

export interface AppStore {
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

export function createDomainLogger(domainTag: string, defaultModule: DebugModule) {
  return {
    info: (action: string, summary: string, meta?: Record<string, unknown>, durationMs?: number) => {
      debugLog.info(defaultModule, action, `[${domainTag}] ${summary}`, meta, durationMs);
    },
    warn: (action: string, summary: string, meta?: Record<string, unknown>, durationMs?: number) => {
      console.warn(`[${domainTag}] ${summary}`, meta);
      debugLog.warn(defaultModule, action, `[${domainTag}] ${summary}`, meta, durationMs);
    },
    error: (action: string, summary: string, meta?: Record<string, unknown>, durationMs?: number) => {
      console.error(`[${domainTag}] ${summary}`, meta);
      debugLog.error(defaultModule, action, `[${domainTag}] ${summary}`, meta, durationMs);
    },
  };
}

export function isUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export function makeEntityId(prefix: string, useUuid: boolean): string {
  if (useUuid && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function getInitialStore(): AppStore {
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

export function mapProfileToUser(p: any): User {
  return {
    id: p.id,
    name: p.name || 'Roomie',
    email: p.email || '',
    avatar: p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    country: p.country || 'Cyprus',
    countryCode: p.country_code || 'CY',
    flag: p.flag || '🏠',
    isHome: p.is_home !== undefined ? p.is_home : true,
    streakDays: p.streak_days || 0,
    points: p.points || 0,
    awayUntil: p.away_until || null,
  };
}

export function mapHousehold(h: any): Household {
  return {
    id: h.id,
    name: h.name,
    currency: h.currency || 'TRY',
    inviteCode: h.invite_code,
    invitesEnabled: h.invites_enabled !== undefined ? h.invites_enabled : true,
    createdBy: h.created_by,
    settings: {
      rotationInterval: h.settings?.rotationInterval || 'weekly',
      rotatingAdmin: Boolean(h.settings?.rotatingAdmin),
      quietHours: h.settings?.quietHours || '23:00 - 08:00',
    },
    createdAt: h.created_at,
  };
}

export function mapExpense(e: any, shares: any[] = []): Expense {
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

export function mapSettlement(s: any): Settlement {
  return {
    id: s.id,
    householdId: s.household_id,
    fromUser: s.from_user,
    toUser: s.to_user,
    amount: Number(s.amount),
    status: s.status,
    createdAt: s.created_at,
    confirmedAt: s.confirmed_at || undefined,
  };
}

export function mapChore(c: any): Chore {
  return {
    id: c.id,
    householdId: c.household_id,
    name: c.name,
    frequency: c.frequency,
    effortLevel: c.effort_level,
    active: c.active !== undefined ? c.active : true,
    description: c.description || '',
    iconName: c.icon_name || 'Sparkles',
  };
}

export function mapMeetingTopic(t: any): MeetingTopic {
  return {
    id: t.id,
    householdId: t.household_id,
    proposedBy: t.proposed_by,
    title: t.title,
    description: t.description || '',
    status: t.status,
    votes: (t.votes as any) || [],
    comments: (t.comments as any) || [],
  };
}

export function mapAgreement(a: any): HouseAgreement {
  return {
    id: a.id,
    householdId: a.household_id,
    text: a.text,
    category: a.category || 'General',
    agreedAt: a.agreed_at || a.created_at || new Date().toISOString(),
  };
}

export function mapNotification(n: any): InAppNotification {
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

export function toDraftPickRow(roundId: string, pk: DraftPick) {
  return {
    round_id: roundId,
    user_id: pk.userId,
    chore_id: pk.choreId,
    pick_type: pk.pickType,
    target_user_id: pk.targetUserId || null,
  };
}

export function toChoreAssignmentRow(roundId: string, a: ChoreAssignment) {
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

export function mapChatMessage(m: any): ChatMessage {
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

export function loadStore(): AppStore {
  if (typeof window === 'undefined') return getInitialStore();
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.currentUser && parsed.households) {
        if (!parsed.meetingTopics) parsed.meetingTopics = {};
        if (!parsed.agreements) parsed.agreements = {};
        if (!parsed.messages) parsed.messages = {};
        if (!parsed.draftRounds) parsed.draftRounds = {};
        if (!parsed.notifications) parsed.notifications = [];
        if (!parsed.dutySchedules) parsed.dutySchedules = {};
        if (!parsed.settings) parsed.settings = getInitialStore().settings;
        return parsed;
      }
    }
  } catch {
    // quota or parse issue -> fall back to seed
  }
  return getInitialStore();
}

export function saveStore(store: AppStore): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // quota limit
    }
  }
}

export function getDebugModuleForOutboxType(type: OutboxActionType): DebugModule {
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

export function dispatchRemoteMutation<T>(
  isDemoMode: boolean,
  householdId: string,
  module: DebugModule,
  outboxType: OutboxActionType,
  payload: T,
  summary: string,
  remoteExec: () => Promise<{ error: any } | void>
): void {
  if (isDemoMode || !isUuid(householdId)) return;
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
