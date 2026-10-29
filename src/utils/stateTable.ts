import { DraftRound, Expense, ChoreAssignment, EffortLevel } from '../types';

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

/**
 * Returns single-source draft state across Banner, Notifications, Feed, and Chat
 */
export function getChoreDraftState(
  round: DraftRound | null | undefined,
  currentUserId: string
): {
  state: UnifiedDraftState;
  badgeLabel: string;
  bannerTitle: string;
  bannerSubtitle: string;
  actionLabel: string;
} {
  if (!round || round.status === 'revealed') {
    return {
      state: 'reveal_done',
      badgeLabel: 'Active Rotation',
      bannerTitle: 'Weekly Chores Active ✨',
      bannerSubtitle: 'Fair assignments are active. Check off tasks when completed.',
      actionLabel: 'View Schedule',
    };
  }

  if (round.status === 'ready_to_reveal') {
    return {
      state: 'reveal_ready',
      badgeLabel: 'All picks in',
      bannerTitle: 'Chore reveal ready! 🎭',
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
      bannerTitle: 'Picks Submitted! Waiting for Roomies ⏳',
      bannerSubtitle: 'Your secret wishes are locked in. Waiting for the rest of the flat.',
      actionLabel: 'Edit My Picks',
    };
  }

  return {
    state: 'draft_open',
    badgeLabel: 'Draft Open',
    bannerTitle: 'Sunday Chore Draft is Open! 📋',
    bannerSubtitle: 'Pick chores you love, avoid chores you dislike before Sunday reveal.',
    actionLabel: 'Submit Secret Picks',
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
 * Currency formatter with Turkish Lira symbol and comma separators (e.g. ₺4,820 or ₺780.00)
 */
export function formatCurrencyTRY(amount: number | undefined | null, forceDecimals: boolean = false): string {
  const num = amount ?? 0;
  const hasFractions = num % 1 !== 0;
  return '₺' + num.toLocaleString('en-US', {
    minimumFractionDigits: forceDecimals || hasFractions ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Helper for clean pluralization without awkward string grammar
 */
export function formatPlural(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
