/**
 * Roomie Phase 2: Weekly Awards Engine ("Everyone Wins")
 * Pure positive reinforcement - no toxic loser rankings or public shame boards.
 */

import { User, WeeklyAward, AwardBadgeId, ChoreAssignment, KudosItem, Expense } from '../types';

export interface AwardBadgeMeta {
  id: AwardBadgeId;
  title: string;
  icon: string;
  defaultReason: string;
  colorScheme: WeeklyAward['colorScheme'];
}

export const AWARD_BADGE_DEFINITIONS: Record<AwardBadgeId, AwardBadgeMeta> = {
  kitchen_hero: {
    id: 'kitchen_hero',
    title: 'Kitchen Hero',
    icon: '🍳',
    defaultReason: 'Kept the kitchen counters and cooking station sparkling clean!',
    colorScheme: 'amber',
  },
  bin_boss: {
    id: 'bin_boss',
    title: 'Bin Boss',
    icon: '🗑️',
    defaultReason: 'Never let the bins overflow and kept the flat fresh!',
    colorScheme: 'emerald',
  },
  night_chef: {
    id: 'night_chef',
    title: 'Night Chef',
    icon: '🍜',
    defaultReason: 'Shared meals and brought everyone together over great food.',
    colorScheme: 'rose',
  },
  peacemaker: {
    id: 'peacemaker',
    title: 'The Peacemaker',
    icon: '🕊️',
    defaultReason: 'Kept house harmony alive and found compromises everyone loved.',
    colorScheme: 'sky',
  },
  streak_master: {
    id: 'streak_master',
    title: 'Streak Master',
    icon: '⚡',
    defaultReason: 'Showed up day after day with an unstoppable completion streak!',
    colorScheme: 'purple',
  },
  early_bird: {
    id: 'early_bird',
    title: 'Early Bird',
    icon: '🌅',
    defaultReason: 'Tackled chores early in the day so the flat stayed stress-free.',
    colorScheme: 'amber',
  },
  the_dependable: {
    id: 'the_dependable',
    title: 'The Dependable',
    icon: '🛡️',
    defaultReason: 'Quietly reliable, always doing their part to keep the flat running.',
    colorScheme: 'indigo',
  },
  cheerleader: {
    id: 'cheerleader',
    title: 'Flat Cheerleader',
    icon: '✨',
    defaultReason: 'Lifted roommates’ spirits with kudos and encouraging vibes.',
    colorScheme: 'purple',
  },
};

export interface EvaluateAwardsParams {
  householdId: string;
  weekLabel?: string;
  users: User[];
  assignments?: ChoreAssignment[];
  kudos?: KudosItem[];
  expenses?: Expense[];
}

/**
 * Evaluates weekly awards ensuring EVERY active roommate wins a badge.
 * Zero-shame guarantee: no negative ranking, no bottom tier.
 */
export function evaluateWeeklyAwards(params: EvaluateAwardsParams): WeeklyAward[] {
  const {
    householdId,
    weekLabel = 'This Week',
    users,
    assignments = [],
    kudos = [],
    expenses = [],
  } = params;

  if (!users || users.length === 0) return [];

  const assignedBadges = new Set<AwardBadgeId>();
  const awards: WeeklyAward[] = [];

  // 1. Calculate per-user candidate badges
  for (const user of users) {
    const userAssignments = assignments.filter((a) => a.userId === user.id);
    const completedAssignments = userAssignments.filter((a) => a.completedToday);
    const userKudosSent = kudos.filter((k) => k.fromUser === user.id);
    const userExpenses = expenses.filter((e) => e.paidBy === user.id);

    let chosenBadge: AwardBadgeId = 'the_dependable';
    let customReason: string | undefined;

    // Check specific achievements prioritizing unassigned badges
    const hasBinChore = userAssignments.some((a) => a.choreId.toLowerCase().includes('trash') || a.choreId.toLowerCase().includes('bin'));
    const hasKitchenChore = userAssignments.some(
      (a) => a.choreId.toLowerCase().includes('kitchen') || a.choreId.toLowerCase().includes('dish')
    );
    const hasCookChore = userAssignments.some((a) => a.choreId.toLowerCase().includes('cook'));

    if (user.streakDays >= 7 && !assignedBadges.has('streak_master')) {
      chosenBadge = 'streak_master';
      customReason = `Crushed an amazing ${user.streakDays}-day streak without missing a beat!`;
    } else if (hasKitchenChore && completedAssignments.length > 0 && !assignedBadges.has('kitchen_hero')) {
      chosenBadge = 'kitchen_hero';
      customReason = 'Spotless counters and empty dish racks all week long!';
    } else if (hasBinChore && completedAssignments.length > 0 && !assignedBadges.has('bin_boss')) {
      chosenBadge = 'bin_boss';
      customReason = 'Bags taken out like clockwork before trash day!';
    } else if ((hasCookChore || userExpenses.length >= 2) && !assignedBadges.has('night_chef')) {
      chosenBadge = 'night_chef';
      customReason = 'Kept flatmates fed and common supplies fully stocked!';
    } else if (userKudosSent.length >= 2 && !assignedBadges.has('cheerleader')) {
      chosenBadge = 'cheerleader';
      customReason = `Sent ${userKudosSent.length} kudos to keep flat spirits sky high!`;
    } else if (!assignedBadges.has('peacemaker')) {
      chosenBadge = 'peacemaker';
    } else if (!assignedBadges.has('early_bird')) {
      chosenBadge = 'early_bird';
    } else {
      chosenBadge = 'the_dependable';
    }

    assignedBadges.add(chosenBadge);
    const meta = AWARD_BADGE_DEFINITIONS[chosenBadge];

    awards.push({
      id: `awd_${user.id}_${Date.now()}`,
      householdId,
      weekLabel,
      badgeId: chosenBadge,
      title: meta.title,
      icon: meta.icon,
      recipientUserId: user.id,
      recipientName: user.name,
      reason: customReason || meta.defaultReason,
      colorScheme: meta.colorScheme,
      awardedAt: new Date().toISOString(),
    });
  }

  return awards;
}
