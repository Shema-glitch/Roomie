/**
 * Roomie TypeScript Domain Types
 * Matching Roomie Build Spec Section 10
 */

export type UserRole = 'admin' | 'member';
export type MembershipStatus = 'pending' | 'active' | 'left' | 'removed';
export type CurrencyCode = 'TRY' | 'USD' | 'EUR';
export type EffortLevel = 'light' | 'medium' | 'heavy';
export type ChoreFrequency = 'daily' | 'weekly';
export type ExpenseCategory = 'groceries' | 'household' | 'utilities' | 'rent' | 'other';
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
  favorTokens?: number;
  awayUntil: string | null; // "I'm away" mode date ISO or null
  dietaryTags?: DietaryTag[];
}

export interface Household {
  id: string;
  name: string;
  currency: CurrencyCode;
  inviteCode: string;
  invitesEnabled?: boolean;
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
  disputeReason?: string;
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
  type: 'chore' | 'expense' | 'household' | 'chat' | 'privacy_alert';
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
  hapticsEnabled?: boolean;
  reducedMotion: boolean;
  pushNotifications: boolean;
  reminderEarly30Min: boolean;
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DutyDayEntry {
  day: DayOfWeek;
  assignedUserId: string;
  choreIds: string[];
  notes?: string;
  completed?: boolean;
}

export interface DutySchedule {
  householdId: string;
  weekStartDate: string;
  entries: DutyDayEntry[];
}

// -------------------------------------------------------------
// Social & Rituals Domain Types (Weekly Awards, Vibe Pulse, Favor Tokens)
// -------------------------------------------------------------

export type AwardBadgeId =
  | 'kitchen_hero'
  | 'bin_boss'
  | 'night_chef'
  | 'peacemaker'
  | 'streak_master'
  | 'early_bird'
  | 'the_dependable'
  | 'cheerleader';

export interface WeeklyAward {
  id: string;
  householdId: string;
  weekLabel: string;
  badgeId: AwardBadgeId;
  title: string;
  icon: string;
  recipientUserId: string;
  recipientName: string;
  reason: string;
  colorScheme: 'amber' | 'emerald' | 'purple' | 'sky' | 'rose' | 'indigo';
  awardedAt: string;
}

export type VibeRating = 'fire' | 'chill' | 'meh' | 'stressed' | 'down';

export interface WeeklyVibeCheck {
  id: string;
  householdId: string;
  weekKey: string;
  score: number; // 1 (down) to 5 (fire)
  rating: VibeRating;
  createdAt: string;
}

export interface HouseholdVibeSummary {
  householdId: string;
  weekKey: string;
  submissionCount: number;
  revealed: boolean; // strictly requires >= 3 submissions to protect roommate privacy
  minRequired: number;
  averageScore?: number;
  dominantMood?: VibeRating;
}

export interface FavorTokenTransaction {
  id: string;
  householdId: string;
  userId: string;
  type: 'earn' | 'spend';
  amount: number;
  reason:
    | 'streak_milestone'
    | 'weekly_award'
    | 'chore_pickup'
    | 'chore_swap'
    | 'roommate_favor'
    | 'gift';
  note?: string;
  createdAt: string;
}

export interface ChoreSwapRequest {
  id: string;
  householdId: string;
  requesterUserId: string;
  targetUserId: string;
  requesterChoreName: string;
  targetChoreName: string;
  tokenCost: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  note?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// Beta Labs Domain Types (Cultural Dinners & Roomie Wrapped)
// -------------------------------------------------------------

export type DietaryTag =
  | 'halal'
  | 'vegetarian'
  | 'vegan'
  | 'nut_free'
  | 'gluten_free'
  | 'dairy_free';

export interface DietaryBadgeInfo {
  id: DietaryTag;
  label: string;
  color: string;
}

export const DIETARY_BADGES: readonly DietaryBadgeInfo[] = [
  { id: 'halal', label: 'Halal', color: '#10B981' },
  { id: 'vegetarian', label: 'Vegetarian', color: '#34D399' },
  { id: 'vegan', label: 'Vegan', color: '#059669' },
  { id: 'nut_free', label: 'Nut-Free', color: '#F59E0B' },
  { id: 'gluten_free', label: 'Gluten-Free', color: '#6366F1' },
  { id: 'dairy_free', label: 'Dairy-Free', color: '#3B82F6' },
];

export interface CulturalDinner {
  id: string;
  householdId: string;
  hostUserId: string;
  dishTitle: string;
  cuisineTag: string;
  scheduledDate: string; // YYYY-MM-DD
  dietaryTags: DietaryTag[];
  rsvpUserIds: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface RoomieWrappedMetrics {
  totalChoresTogether: number;
  disputeFreeStreakDays: number;
  mostAppreciatedFlatmateId?: string;
  mostAppreciatedFlatmateName?: string;
  totalKudosExchanged: number;
  topChefUserId?: string;
  topChefName?: string;
  culturalDinnersHosted: number;
  flatHarmonyScore: number;
  topAwardTitle?: string;
}


