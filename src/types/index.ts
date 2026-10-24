/**
 * Roomie TypeScript Domain Types
 * Matching Roomie Build Spec Section 10
 */

export type UserRole = 'admin' | 'member';
export type MembershipStatus = 'pending' | 'active' | 'left';
export type CurrencyCode = 'TRY' | 'USD' | 'EUR';
export type EffortLevel = 'light' | 'medium' | 'heavy';
export type ChoreFrequency = 'daily' | 'weekly';
export type ExpenseCategory = 'groceries' | 'household' | 'utilities' | 'other';
export type ExpenseStatus = 'pending' | 'agreed' | 'disputed' | 'cancelled';
export type ShareResponse = 'pending' | 'agreed' | 'disputed';
export type SettlementStatus = 'marked_paid' | 'confirmed';
export type DraftStatus = 'collecting' | 'ready_to_reveal' | 'revealed';
export type PickType = 'want' | 'avoid' | 'suggest_for';
export type KudosType = 'thanks' | 'great_job' | 'needs_look';
export type MascotState = 'idle' | 'cheering' | 'celebrating' | 'sleepy' | 'thinking' | 'calm';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  country: string;
  countryCode: string;
  flag: string;
  isHome: boolean;
  streakDays: number;
  points: number;
  awayUntil: string | null; // "I'm away" mode date ISO or null
}

export interface Household {
  id: string;
  name: string;
  currency: CurrencyCode;
  inviteCode: string;
  createdBy: string;
  settings: {
    rotationInterval: 'weekly' | 'monthly';
    rotatingAdmin: boolean;
    quietHours: string;
  };
  createdAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  householdId: string;
  role: UserRole;
  status: MembershipStatus;
  joinedAt: string;
}

export interface JoinRequest {
  id: string;
  householdId: string;
  userName: string;
  userEmail: string;
  userCountry: string;
  userFlag: string;
  userAvatar: string;
  createdAt: string;
  votes: {
    userId: string;
    vote: 'ok' | 'unsure';
  }[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface ExpenseShare {
  userId: string;
  shareAmount: number;
  response: ShareResponse;
  disputeReason?: string;
}

export interface Expense {
  id: string;
  householdId: string;
  paidBy: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  receiptUrl?: string;
  date: string;
  status: ExpenseStatus;
  shares: ExpenseShare[];
  createdAt: string;
}

export interface Settlement {
  id: string;
  householdId: string;
  fromUser: string;
  toUser: string;
  amount: number;
  status: SettlementStatus;
  createdAt: string;
  confirmedAt?: string;
}

export interface PersonalExpense {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
}

export interface Chore {
  id: string;
  householdId: string;
  name: string;
  frequency: ChoreFrequency;
  effortLevel: EffortLevel;
  active: boolean;
  description: string;
  iconName: string;
}

export interface DraftPick {
  userId: string;
  choreId: string;
  pickType: PickType;
  targetUserId?: string;
}

export interface KudosItem {
  id: string;
  fromUser: string;
  type: KudosType;
  note?: string;
  createdAt: string;
}

export interface ChoreAssignment {
  choreId: string;
  userId: string;
  scheduledDays: string[]; // e.g. ['Mon', 'Thu']
  scheduledTime: string;   // e.g. '19:00'
  completedToday: boolean;
  lastPhotoUrl?: string;
  kudos: KudosItem[];
}

export interface DraftRound {
  id: string;
  householdId: string;
  status: DraftStatus;
  createdAt: string;
  revealedAt?: string;
  picks: DraftPick[];
  assignments: ChoreAssignment[];
}

export interface ChatMessage {
  id: string;
  householdId: string;
  senderId: string | null; // null for system activity
  type: 'text' | 'activity';
  body: string;
  linkTarget?: {
    screen: string;
    id?: string;
  };
  createdAt: string;
  reactions?: {
    emoji: string;
    userIds: string[];
  }[];
}

export interface MeetingTopic {
  id: string;
  householdId: string;
  proposedBy: string;
  title: string;
  description: string;
  status: 'open' | 'agreed' | 'archived';
  votes: {
    userId: string;
    vote: 'agree' | 'disagree' | 'neutral';
  }[];
  comments: {
    id: string;
    userId: string;
    text: string;
    createdAt: string;
  }[];
}

export interface HouseAgreement {
  id: string;
  householdId: string;
  text: string;
  category: string;
  agreedAt: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  type: 'chore' | 'expense' | 'household' | 'chat';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  linkTarget?: {
    screen: string;
    id?: string;
  };
}

export interface UserSettings {
  language: 'en' | 'tr' | 'fr' | 'ar';
  soundEnabled: boolean;
  reducedMotion: boolean;
  pushNotifications: boolean;
  reminderEarly30Min: boolean;
}
