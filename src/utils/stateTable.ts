import { DraftRound, Expense, ChoreAssignment, EffortLevel, User } from '../types';

export type UnifiedDraftState = 'draft_open' | 'waiting_others' | 'reveal_ready' | 'reveal_done';

export type UnifiedExpenseState =
  | 'needs-my-answer'
  | 'waiting-roomies'
  | 'agreed'
  | 'disputed'
  | 'cancelled';

export const CHORE_REWARD_POINTS: Record<EffortLevel, number> = {
  light: 10,
  medium: 20,
  heavy: 30,
};

export interface ChoreDraftStateInfo {
  state: UnifiedDraftState;
  badgeLabel: string;
  bannerTitle: string;
  bannerSubtitle: string;
  actionLabel: string;
}

export interface ChoreStateEvent {
  state: UnifiedDraftState;
  title: string;
  body: string;
  activityMessage: string;
  linkTarget: { screen: string; id?: string };
}

/**
 * Single-source generator for notifications and chat/feed activity events
 * based on unified chore draft state transitions.
 */
export function getChoreStateEvent(state: UnifiedDraftState): ChoreStateEvent {
  switch (state) {
    case 'draft_open':
      return {
        state,
        title: 'Weekly Chore Picks',
        body: 'Rank the chores you prefer before Sunday.',
        activityMessage: 'Weekly Chore Picks are open! Rank the chores you prefer before Sunday.',
        linkTarget: { screen: 'chore-draft' },
      };
    case 'waiting_others':
      return {
        state,
        title: 'Chore Picks Submitted',
        body: 'Your secret wishes are locked in. Waiting for the rest of the flat.',
        activityMessage: 'Submitted secret chore picks. Waiting for roomies.',
        linkTarget: { screen: 'chore-waiting' },
      };
    case 'reveal_ready':
      return {
        state,
        title: 'Chore Reveal Ready!',
        body: 'All roomies submitted secret picks. Start the reveal ceremony!',
        activityMessage: 'All picks are in for Sunday Chore Draft! Reveal is ready to view.',
        linkTarget: { screen: 'chore-reveal' },
      };
    case 'reveal_done':
    default:
      return {
        state,
        title: 'Weekly Chores Active',
        body: 'The Chore Reveal is complete. Check your new weekly schedule.',
        activityMessage: 'The Chore Reveal is complete. Check your new weekly schedule.',
        linkTarget: { screen: 'chores' },
      };
  }
}

/**
 * Returns single-source draft state across Banner, Notifications, Feed, and Chat
 */
export function getChoreDraftState(
  round: DraftRound | null | undefined,
  currentUserId: string
): ChoreDraftStateInfo {
  if (!round || round.status === 'revealed') {
    return {
      state: 'reveal_done',
      badgeLabel: 'Active Rotation',
      bannerTitle: 'Weekly Chores Active',
      bannerSubtitle: 'Fair assignments are active. Check off tasks when completed.',
      actionLabel: 'View Schedule',
    };
  }

  if (round.status === 'ready_to_reveal') {
    return {
      state: 'reveal_ready',
      badgeLabel: 'All picks in',
      bannerTitle: 'Chore reveal ready!',
      bannerSubtitle: 'All roomies submitted secret picks. Start the reveal ceremony!',
      actionLabel: 'Reveal assignments!',
    };
  }

  // Collecting phase: check if current user has submitted picks
  const hasMyPicks = round.picks.some((p) => p.userId === currentUserId);
  if (hasMyPicks) {
    return {
      state: 'waiting_others',
      badgeLabel: 'Picks Submitted',
      bannerTitle: 'Picks Submitted! Waiting for Roomies',
      bannerSubtitle: 'Your secret wishes are locked in. Waiting for the rest of the flat.',
      actionLabel: 'Edit My Picks',
    };
  }

  return {
    state: 'draft_open',
    badgeLabel: 'Draft Open',
    bannerTitle: 'Weekly Chore Picks',
    bannerSubtitle: 'Rank the chores you prefer before Sunday.',
    actionLabel: 'Choose My Chores',
  };
}

/**
 * Categorizes an expense based on the current user's perspective
 */
export function getExpenseCategoryState(
  exp: Expense,
  currentUserId: string
): UnifiedExpenseState {
  if (exp.status === 'cancelled') return 'cancelled';
  if (exp.status === 'disputed') return 'disputed';
  if (exp.status === 'agreed') return 'agreed';

  const myShare = exp.shares.find((s) => s.userId === currentUserId);

  // Paid by someone else and waiting for MY agreement
  if (exp.paidBy !== currentUserId && myShare && myShare.response === 'pending') {
    return 'needs-my-answer';
  }

  // Either paid by me or I already agreed, but other roomies are still pending
  return 'waiting-roomies';
}

/**
 * Checks if a chore assignment is due today.
 * Daily chores are always due today. Weekly chores check scheduled day.
 */
export function isAssignmentDueToday(
  assignment: ChoreAssignment,
  todayDay: string = 'Daily'
): boolean {
  if (!assignment.scheduledDays || assignment.scheduledDays.length === 0) return true;
  if (assignment.scheduledDays.includes('Daily')) return true;
  return assignment.scheduledDays.some(
    (d) => d.toLowerCase() === todayDay.toLowerCase() || d.toLowerCase() === 'sun'
  );
}

/**
 * Returns symbol for a currency code (default: TRY ₺)
 */
export function getCurrencySymbol(currency?: string): string {
  switch (currency?.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'TRY':
    default:
      return '₺';
  }
}

const intlTwoDecimals = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intlNoDecimals = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats a numeric amount using Intl.NumberFormat with fixed 2-decimal precision
 * (no currency symbol prefix).
 */
export function formatDecimalCurrency(amount: number | undefined | null): string {
  const num = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return intlTwoDecimals.format(num);
}

/**
 * Currency formatter with configurable currency symbol and Intl.NumberFormat separators
 */
export function formatCurrency(
  amount: number | undefined | null,
  currency: string = 'TRY',
  forceDecimals: boolean = false
): string {
  const num = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  const sym = getCurrencySymbol(currency);
  const hasFractions = num % 1 !== 0;
  const formatter = forceDecimals || hasFractions ? intlTwoDecimals : intlNoDecimals;
  return sym + formatter.format(num);
}

/**
 * Legacy TRY currency formatter (e.g. ₺4,820 or ₺780.00)
 */
export function formatCurrencyTRY(amount: number | undefined | null, forceDecimals: boolean = false): string {
  return formatCurrency(amount, 'TRY', forceDecimals);
}

/**
 * Step-accurate progress percentage for Weekly Picks flow (e.g. Step 1 of 4 -> 25%).
 */
export function calculateDraftProgressPercent(
  currentIndex: number,
  totalChores: number,
  isSummary: boolean = false
): number {
  if (isSummary) return 100;
  if (totalChores <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((currentIndex + 1) / totalChores) * 100)));
}

export interface PendingExpensesSummary {
  pendingCount: number;
  disputedCount: number;
  totalPendingAmount: number;
  hasUnsettledActivity: boolean;
  statusText: string | null;
}

/**
 * Summarizes unapproved (pending or disputed) apartment expenses so UI never
 * conflates "₺0.00 owed so far" with "all expenses settled".
 */
export function summarizePendingExpenses(
  expenses: Expense[],
  roommates: User[],
  currentUserId: string,
  currencySymbol: string
): PendingExpensesSummary {
  const pendingExpenses = expenses.filter((e) => e.status === 'pending');
  const disputedExpenses = expenses.filter((e) => e.status === 'disputed');
  const pendingCount = pendingExpenses.length;
  const disputedCount = disputedExpenses.length;
  const totalPendingAmount = pendingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const hasUnsettledActivity = pendingCount > 0 || disputedCount > 0;

  if (!hasUnsettledActivity) {
    return {
      pendingCount: 0,
      disputedCount: 0,
      totalPendingAmount: 0,
      hasUnsettledActivity: false,
      statusText: null,
    };
  }

  let statusText: string;
  if (pendingCount === 1) {
    const exp = pendingExpenses[0];
    const formattedAmt = `${currencySymbol}${formatDecimalCurrency(exp.amount)}`;
    const pendingShareUserIds = exp.shares
      .filter((s) => s.response === 'pending')
      .map((s) => s.userId);
    const needsMyApproval =
      exp.paidBy !== currentUserId && pendingShareUserIds.includes(currentUserId);

    if (needsMyApproval) {
      statusText = `1 expense awaiting your approval (${formattedAmt})`;
    } else if (pendingShareUserIds.length === 1) {
      const target = roommates.find((r) => r.id === pendingShareUserIds[0]);
      const firstName = target?.name.split(' ')[0] || 'Roomie';
      statusText = `1 expense awaiting ${firstName}'s approval (${formattedAmt})`;
    } else {
      statusText = `1 expense awaiting roomies' approval (${formattedAmt})`;
    }
  } else if (pendingCount > 1) {
    const formattedTotal = `${currencySymbol}${formatDecimalCurrency(totalPendingAmount)}`;
    statusText = `${pendingCount} expenses awaiting approval (${formattedTotal})`;
  } else {
    statusText =
      disputedCount === 1
        ? '1 disputed expense needs resolution'
        : `${disputedCount} disputed expenses need resolution`;
  }

  return {
    pendingCount,
    disputedCount,
    totalPendingAmount,
    hasUnsettledActivity: true,
    statusText,
  };
}

/**
 * Helper for clean pluralization without awkward string grammar
 */
export function formatPlural(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
