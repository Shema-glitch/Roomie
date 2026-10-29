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
} from '../types';
import { calculateBalances } from '../utils/balances';
import { matchChores } from '../utils/matching';
import { getChoreDraftState, getChoreStateEvent, UnifiedDraftState } from '../utils/stateTable';
import { outbox } from './outbox';
import { supabase, isSupabaseConfigured } from './supabase';

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
  settings: UserSettings;
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
      name: 'Apartment 4B Lefkoşa',
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
        body: 'Hey roomies! Welcome to Apartment 4B! Who is cooking dinner tonight? 🥘',
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
      body: 'Tariq Al-Mansoor (Egypt 🇪🇬) wants to join Apartment 4B.',
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
    settings,
  };
}

class ApiService {
  private store: AppStore;

  constructor() {
    this.store = this.load();
  }

  private load(): AppStore {
    if (typeof window === 'undefined') return getInitialStore();
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
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

  // --- Users & Auth ---
  public async getCurrentUser(): Promise<User> {
    return { ...this.store.currentUser };
  }

  public async updateCurrentUser(updates: Partial<User>): Promise<User> {
    this.store.currentUser = { ...this.store.currentUser, ...updates };
    // sync in users list
    this.store.users = this.store.users.map(u => (u.id === this.store.currentUser.id ? this.store.currentUser : u));
    this.save();
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
    return [...this.store.households];
  }

  public async getActiveHousehold(): Promise<Household> {
    const found = this.store.households.find(h => h.id === this.store.activeHouseholdId);
    return found || this.store.households[0];
  }

  public async setActiveHousehold(householdId: string): Promise<Household> {
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

  public async createHousehold(name: string, currency: 'TRY' | 'USD' | 'EUR'): Promise<Household> {
    const id = 'h_' + Math.random().toString(36).substring(2, 9);
    const code = this.generateInviteCode();
    const newHousehold: Household = {
      id,
      name,
      currency,
      inviteCode: code,
      invitesEnabled: true,
      createdBy: this.store.currentUser.id,
      settings: {
        rotationInterval: 'weekly',
        rotatingAdmin: false,
        quietHours: '23:00 - 08:00',
      },
      createdAt: new Date().toISOString(),
    };
    this.store.households.push(newHousehold);
    this.store.activeHouseholdId = id;
    this.store.memberships.push({
      id: 'm_' + Math.random().toString(36).substring(2, 7),
      userId: this.store.currentUser.id,
      householdId: id,
      role: 'admin',
      status: 'active',
      joinedAt: new Date().toISOString(),
    });
    // add default chores
    this.store.chores.push(
      { id: 'ch_' + Math.random(), householdId: id, name: 'Bathroom Scrub', frequency: 'weekly', effortLevel: 'heavy', active: true, description: 'Clean shower & toilet', iconName: 'Bath' },
      { id: 'ch_' + Math.random(), householdId: id, name: 'Dishes & Sink', frequency: 'daily', effortLevel: 'medium', active: true, description: 'Unload dishwasher & wipe sink', iconName: 'Sparkles' },
      { id: 'ch_' + Math.random(), householdId: id, name: 'Take Out Trash', frequency: 'daily', effortLevel: 'light', active: true, description: 'Empty kitchen and hall bins', iconName: 'Trash2' }
    );
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
    return newCode;
  }

  public async toggleInvites(householdId?: string, enabled?: boolean): Promise<boolean> {
    const hid = householdId || this.store.activeHouseholdId;
    const household = this.store.households.find(h => h.id === hid);
    if (!household) throw new Error('Apartment not found');
    household.invitesEnabled = enabled !== undefined ? enabled : !(household.invitesEnabled ?? true);
    this.save();
    return household.invitesEnabled;
  }

  public async joinHousehold(code: string): Promise<{ success: boolean; household?: Household; message: string }> {
    const target = this.store.households.find(h => h.inviteCode.toUpperCase() === code.trim().toUpperCase());
    if (!target) {
      return { success: false, message: 'Invite code not found. Check with your roomies.' };
    }
    if (target.invitesEnabled === false) {
      return { success: false, message: 'Invites are currently turned off for this apartment.' };
    }
    // create join request
    const existingReq = this.store.joinRequests.find(r => r.householdId === target.id && r.userEmail === this.store.currentUser.email);
    if (!existingReq) {
      this.store.joinRequests.push({
        id: 'jr_' + Date.now(),
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
      this.save();
    }
    return { success: true, household: target, message: 'Request submitted! Roomies must review before you enter.' };
  }

  public async getHouseholdMembers(householdId?: string): Promise<{ user: User; membership: Membership }[]> {
    const hid = householdId || this.store.activeHouseholdId;
    const members = this.store.memberships.filter(m => m.householdId === hid && m.status === 'active');
    return members.map(m => {
      const u = this.store.users.find(user => user.id === m.userId) || this.store.currentUser;
      return { user: u, membership: m };
    });
  }

  public async getJoinRequests(householdId?: string): Promise<JoinRequest[]> {
    const hid = householdId || this.store.activeHouseholdId;
    return this.store.joinRequests.filter(r => r.householdId === hid);
  }

  public async voteJoinRequest(requestId: string, vote: 'ok' | 'unsure'): Promise<void> {
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
        // Add new member notification
        this.store.notifications.unshift({
          id: 'notif_' + Date.now(),
          userId: this.store.currentUser.id,
          type: 'household',
          title: 'Roomie approved',
          body: `${req.userName} has officially joined Apartment 4B as an active member.`,
          read: false,
          createdAt: new Date().toISOString(),
          linkTarget: { screen: 'apartment' },
        });
        // add welcome message to chat
        this.addMessage(req.householdId, null, 'activity', `${req.userName} has joined the apartment! Say hello! 👋`, {
          screen: 'apartment',
        });
      } else {
        // Mark pending join request notification as read
        this.store.notifications.forEach((n) => {
          if (n.type === 'household' && n.title.toLowerCase().includes('join request')) {
            n.read = true;
          }
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
      this.addMessage(hid, null, 'activity', `Admin role handed over to ${targetUser?.name || 'roomie'}.`);
      this.save();
    }
  }

  public async leaveHousehold(householdId: string): Promise<{ success: boolean; message: string }> {
    const members = await this.getHouseholdMembers(householdId);
    const m = this.store.memberships.find(mb => mb.householdId === householdId && mb.userId === this.store.currentUser.id);
    if (m) {
      m.status = 'left';
      // if user was admin and other members exist, promote the next member
      if (m.role === 'admin') {
        const next = this.store.memberships.find(mb => mb.householdId === householdId && mb.userId !== this.store.currentUser.id && mb.status === 'active');
        if (next) next.role = 'admin';
      }
      this.save();
      return { success: true, message: 'You have left the household.' };
    }
    return { success: false, message: 'Membership not found.' };
  }

  // --- Expenses & Balances ---
  public async getExpenses(householdId?: string): Promise<Expense[]> {
    const hid = householdId || this.store.activeHouseholdId;
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
    const shareEach = Math.round((amount / participantUserIds.length) * 100) / 100;
    const newExpense: Expense = {
      id: 'exp_' + Date.now(),
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
    const action = outbox.enqueue(hid, 'create_expense', { expense: newExpense });
    if (supabase) {
      const sb = supabase;
      Promise.resolve(
        sb.from('expenses').insert({
          household_id: hid,
          paid_by: this.store.currentUser.id,
          title: newExpense.title,
          amount: newExpense.amount,
          category: newExpense.category,
          receipt_url: newExpense.receiptUrl,
          date: newExpense.date,
          status: newExpense.status,
        })
      )
        .then(({ error }) => {
          if (!error) outbox.markSuccess(action.id);
          else outbox.markFailed(action.id, error.message);
        })
        .catch((err: any) => outbox.markFailed(action.id, err?.message || 'Network error'));
    }

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
    const share = exp.shares.find(s => s.userId === this.store.currentUser.id);
    if (share) {
      share.response = response;
      if (disputeReason) share.disputeReason = disputeReason;
    }

    const action = outbox.enqueue(
      exp.householdId,
      response === 'agreed' ? 'agree_expense' : 'dispute_expense',
      { expenseId, response, disputeReason }
    );
    if (supabase) {
      const sb = supabase;
      Promise.resolve(
        sb.from('expense_shares')
          .update({ response, dispute_reason: disputeReason || null })
          .eq('expense_id', expenseId)
          .eq('user_id', this.store.currentUser.id)
      )
        .then(({ error }) => {
          if (!error) outbox.markSuccess(action.id);
          else outbox.markFailed(action.id, error.message);
        })
        .catch((err: any) => outbox.markFailed(action.id, err?.message || 'Network error'));
    }
    // Update overall expense status
    if (exp.shares.some(s => s.response === 'disputed')) {
      exp.status = 'disputed';
    } else if (exp.shares.every(s => s.response === 'agreed')) {
      exp.status = 'agreed';
    }
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
    const expenses = await this.getExpenses(hid);
    const settlements = this.store.settlements.filter(s => s.householdId === hid);
    const members = await this.getHouseholdMembers(hid);
    const userIds = members.map(m => m.user.id);
    return calculateBalances(expenses, settlements, userIds);
  }

  public async markSettlementPaid(toUserId: string, amount: number): Promise<Settlement> {
    const hid = this.store.activeHouseholdId;
    const newSettlement: Settlement = {
      id: 'set_' + Date.now(),
      householdId: hid,
      fromUser: this.store.currentUser.id,
      toUser: toUserId,
      amount,
      status: 'marked_paid',
      createdAt: new Date().toISOString(),
    };
    this.store.settlements.push(newSettlement);
    const toUser = this.store.users.find(u => u.id === toUserId);
    this.addMessage(hid, null, 'activity', `${this.store.currentUser.name} marked ₺${amount.toFixed(2)} as paid to ${toUser?.name || 'roomie'}. Waiting for confirmation.`);
    this.save();
    return newSettlement;
  }

  public async confirmSettlement(settlementId: string): Promise<Settlement> {
    const set = this.store.settlements.find(s => s.id === settlementId);
    if (!set) throw new Error('Settlement not found');
    set.status = 'confirmed';
    set.confirmedAt = new Date().toISOString();
    const fromUser = this.store.users.find(u => u.id === set.fromUser);
    this.addMessage(set.householdId, null, 'activity', `Payment of ₺${set.amount.toFixed(2)} from ${fromUser?.name || 'roomie'} confirmed settled.`);
    this.save();
    return set;
  }

  public async getSettlements(householdId?: string): Promise<Settlement[]> {
    const hid = householdId || this.store.activeHouseholdId;
    return this.store.settlements.filter(s => s.householdId === hid);
  }

  // --- Chores & The Draft ---
  public async getChores(householdId?: string): Promise<Chore[]> {
    const hid = householdId || this.store.activeHouseholdId;
    return this.store.chores.filter(c => c.householdId === hid);
  }

  public async addChore(name: string, frequency: 'daily' | 'weekly', effortLevel: 'light' | 'medium' | 'heavy', description: string): Promise<Chore> {
    const hid = this.store.activeHouseholdId;
    const newChore: Chore = {
      id: 'ch_' + Date.now(),
      householdId: hid,
      name,
      frequency,
      effortLevel,
      active: true,
      description,
      iconName: effortLevel === 'heavy' ? 'Bath' : effortLevel === 'medium' ? 'Sparkles' : 'Trash2',
    };
    this.store.chores.push(newChore);
    this.save();
    return newChore;
  }

  public async getDraftRound(householdId?: string): Promise<DraftRound> {
    const hid = householdId || this.store.activeHouseholdId;
    if (!this.store.draftRounds[hid]) {
      this.store.draftRounds[hid] = {
        id: 'dr_' + Date.now(),
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

    const members = this.store.memberships.filter(m => m.householdId === hid && m.status === 'active');
    for (const m of members) {
      this.store.notifications = this.store.notifications.filter(
        n => !(n.userId === m.userId && n.type === 'chore' && n.linkTarget?.screen.startsWith('chore-'))
      );
      this.store.notifications.unshift({
        id: 'notif_chore_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId: m.userId,
        type: 'chore',
        title: event.title,
        body: event.body,
        read: false,
        createdAt: new Date().toISOString(),
        linkTarget: event.linkTarget,
      });
    }
  }

  public async openNewDraftRound(householdId?: string): Promise<DraftRound> {
    const hid = householdId || this.store.activeHouseholdId;
    const newRound: DraftRound = {
      id: 'dr_' + Date.now(),
      householdId: hid,
      status: 'collecting',
      createdAt: new Date().toISOString(),
      picks: [],
      assignments: [],
    };
    this.store.draftRounds[hid] = newRound;
    this.emitChoreDraftTransition(hid, 'draft_open');
    this.save();
    return newRound;
  }

  public async submitDraftPicks(picks: DraftPick[]): Promise<DraftRound> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    // remove existing picks from this user
    round.picks = round.picks.filter(p => p.userId !== this.store.currentUser.id);
    round.picks.push(...picks);

    // Check if ready to reveal (simulate all roommates participating)
    const members = await this.getHouseholdMembers(hid);
    const activeMemberIds = members.map(m => m.user.id);
    const usersWithPicks = new Set(round.picks.map(p => p.userId));
    const allPicksIn = activeMemberIds.every(id => usersWithPicks.has(id));

    if (allPicksIn) {
      // Compute assignments using fair matching algorithm
      const chores = await this.getChores(hid);
      const { assignments } = matchChores(chores, round.picks, activeMemberIds);
      round.assignments = assignments;
      round.status = 'ready_to_reveal';
      this.emitChoreDraftTransition(hid, 'reveal_ready');
    } else {
      this.emitChoreDraftTransition(hid, 'waiting_others');
    }

    this.save();
    return round;
  }

  public async updateAssignments(assignments: ChoreAssignment[]): Promise<DraftRound> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    round.assignments = assignments;
    this.save();
    return round;
  }

  public async markDraftRevealed(): Promise<DraftRound> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    round.status = 'revealed';
    round.revealedAt = new Date().toISOString();
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
      // Increment user streak and points
      this.store.currentUser.streakDays += 1;
      this.store.currentUser.points += 20;
      const chore = this.store.chores.find(c => c.id === choreId);

      const action = outbox.enqueue(hid, 'complete_chore', { choreId, photoUrl });
      if (supabase) {
        const sb = supabase;
        Promise.resolve(
          sb.from('chore_assignments')
            .update({ completed_today: true, last_photo_url: photoUrl || null })
            .eq('chore_id', choreId)
        )
          .then(({ error }) => {
            if (!error) outbox.markSuccess(action.id);
            else outbox.markFailed(action.id, error.message);
          })
          .catch((err: any) => outbox.markFailed(action.id, err?.message || 'Network error'));
      }

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
        id: 'k_' + Date.now(),
        fromUser: this.store.currentUser.id,
        type,
        note,
        createdAt: new Date().toISOString(),
      });
      // award target points if positive
      if (type !== 'needs_look') {
        const target = this.store.users.find(u => u.id === targetUserId);
        if (target) target.points += 10;
      }
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
      this.addMessage(hid, null, 'activity', `${this.store.currentUser.name} swapped "${chore?.name}" with ${toUser?.name}.`);
      this.save();
    }
  }

  // --- Chat ---
  public async getMessages(householdId?: string): Promise<ChatMessage[]> {
    const hid = householdId || this.store.activeHouseholdId;
    return this.store.messages[hid] || [];
  }

  public async sendMessage(body: string): Promise<ChatMessage> {
    const hid = this.store.activeHouseholdId;
    const msg = this.addMessage(hid, this.store.currentUser.id, 'text', body);
    this.save();

    const action = outbox.enqueue(hid, 'send_message', { message: msg });
    if (supabase) {
      const sb = supabase;
      Promise.resolve(
        sb.from('chat_messages').insert({
          household_id: hid,
          sender_id: msg.senderId,
          type: msg.type,
          body: msg.body,
          link_target: msg.linkTarget as any,
        })
      )
        .then(({ error }) => {
          if (!error) outbox.markSuccess(action.id);
          else outbox.markFailed(action.id, error.message);
        })
        .catch((err: any) => outbox.markFailed(action.id, err?.message || 'Network error'));
    }

    return msg;
  }

  public subscribeToHousehold(householdId: string, onUpdate: () => void): () => void {
    if (!supabase) return () => {};
    const sb = supabase;
    try {
      const channel = sb
        .channel(`household_live_${householdId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', filter: `household_id=eq.${householdId}` },
          () => {
            onUpdate();
          }
        )
        .subscribe();

      return () => {
        sb.removeChannel(channel);
      };
    } catch {
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
    const msg: ChatMessage = {
      id: 'msg_' + Date.now() + Math.random().toString(36).substring(2, 5),
      householdId,
      senderId,
      type,
      body,
      linkTarget,
      createdAt: new Date().toISOString(),
      reactions: [],
    };
    this.store.messages[householdId].push(msg);
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
      this.save();
    }
  }

  // --- House Meetings & Agreements ---
  public async getMeetingTopics(householdId?: string): Promise<MeetingTopic[]> {
    const hid = householdId || this.store.activeHouseholdId;
    return this.store.meetingTopics[hid] || [];
  }

  public async createMeetingTopic(title: string, description: string): Promise<MeetingTopic> {
    const hid = this.store.activeHouseholdId;
    if (!this.store.meetingTopics[hid]) this.store.meetingTopics[hid] = [];
    const topic: MeetingTopic = {
      id: 'mt_' + Date.now(),
      householdId: hid,
      proposedBy: this.store.currentUser.id,
      title,
      description,
      status: 'open',
      votes: [{ userId: this.store.currentUser.id, vote: 'agree' }],
      comments: [],
    };
    this.store.meetingTopics[hid].push(topic);
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
      // If all members agreed, mark as agreed and add to House Agreements
      const members = await this.getHouseholdMembers(hid);
      const agreeCount = topic.votes.filter(v => v.vote === 'agree').length;
      if (agreeCount >= Math.ceil(members.length * 0.75)) {
        topic.status = 'agreed';
        await this.addAgreement(topic.title, 'Agreed in House Meeting');
      }
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
        id: 'c_' + Date.now(),
        userId: this.store.currentUser.id,
        text,
        createdAt: new Date().toISOString(),
      });
      this.save();
    }
  }

  public async getAgreements(householdId?: string): Promise<HouseAgreement[]> {
    const hid = householdId || this.store.activeHouseholdId;
    return this.store.agreements[hid] || [];
  }

  public async addAgreement(text: string, category: string): Promise<HouseAgreement> {
    const hid = this.store.activeHouseholdId;
    if (!this.store.agreements[hid]) this.store.agreements[hid] = [];
    const agr: HouseAgreement = {
      id: 'agr_' + Date.now(),
      householdId: hid,
      text,
      category,
      agreedAt: new Date().toISOString(),
    };
    this.store.agreements[hid].push(agr);
    this.save();
    return agr;
  }

  // --- Notifications ---
  public async getNotifications(): Promise<InAppNotification[]> {
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
      .filter((n) => n.userId === this.store.currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async markNotificationRead(id: string): Promise<void> {
    const n = this.store.notifications.find(item => item.id === id);
    if (n) {
      // If this is an unresolved join request notification, keep it unread
      const isUnresolvedJoin =
        n.type === 'household' &&
        n.title.toLowerCase().includes('join request') &&
        this.store.joinRequests.some(r => r.status === 'pending');
      if (!isUnresolvedJoin) {
        n.read = true;
        this.save();
      }
    }
  }

  public async markAllNotificationsRead(): Promise<void> {
    const hasPendingJoin = this.store.joinRequests.some(r => r.status === 'pending');
    this.store.notifications.forEach(n => {
      if (n.userId === this.store.currentUser.id) {
        if (n.type === 'household' && n.title.toLowerCase().includes('join request') && hasPendingJoin) {
          n.read = false;
        } else {
          n.read = true;
        }
      }
    });
    this.save();
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
