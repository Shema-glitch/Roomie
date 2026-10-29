import { Chore, ChoreAssignment, DraftPick, EffortLevel } from '../types';

export const EFFORT_POINTS: Record<EffortLevel, number> = {
  light: 1,
  medium: 2,
  heavy: 3,
};

export interface MatchingResult {
  assignments: ChoreAssignment[];
  effortDistribution: Record<string, number>;
}

/**
 * Fair chore draft matching algorithm:
 * - Balances total effort score across active roommates
 * - Satisfies "want" picks where feasible
 * - Respects "avoid" picks where possible
 * - Fallbacks distribute remaining chores to the least-burdened roommate
 */
export function matchChores(
  chores: Chore[],
  picks: DraftPick[],
  roommateIds: string[],
  previousAssignments: ChoreAssignment[] = []
): MatchingResult {
  const activeChores = chores.filter(c => c.active);
  const efforts: Record<string, number> = {};
  roommateIds.forEach(id => {
    efforts[id] = 0;
  });

  const assignments: ChoreAssignment[] = [];
  const assignedChoreIds = new Set<string>();

  // Helper to get picks for a chore
  const getPicksForChore = (choreId: string) => {
    const wants = picks.filter(p => p.choreId === choreId && p.pickType === 'want').map(p => p.userId);
    const avoids = new Set(picks.filter(p => p.choreId === choreId && p.pickType === 'avoid').map(p => p.userId));
    return { wants, avoids };
  };

  // Sort chores by effort (heavy first, so high-effort chores are placed fairly first)
  const sortedChores = [...activeChores].sort(
    (a, b) => EFFORT_POINTS[b.effortLevel] - EFFORT_POINTS[a.effortLevel]
  );

  // Default day suggestions based on frequency
  const getDefaultDays = (chore: Chore, index: number): string[] => {
    if (chore.frequency === 'daily') {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }
    const daySets = [
      ['Mon', 'Thu'],
      ['Tue', 'Fri'],
      ['Wed', 'Sat'],
      ['Sun'],
    ];
    return daySets[index % daySets.length];
  };

  for (let i = 0; i < sortedChores.length; i++) {
    const chore = sortedChores[i];
    const { wants, avoids } = getPicksForChore(chore.id);
    const points = EFFORT_POINTS[chore.effortLevel];

    let chosenUser: string | null = null;

    // 1. If someone wants it and doesn't already have significantly higher effort
    if (wants.length > 0) {
      // Pick the person who wants it with lowest current effort
      wants.sort((a, b) => (efforts[a] || 0) - (efforts[b] || 0));
      chosenUser = wants[0];
    }

    // 2. If no one specifically wanted it, pick the roommate with lowest effort who hasn't avoided it
    if (!chosenUser) {
      const candidates = roommateIds.filter(id => !avoids.has(id));
      if (candidates.length > 0) {
        candidates.sort((a, b) => (efforts[a] || 0) - (efforts[b] || 0));
        chosenUser = candidates[0];
      }
    }

    // 3. Fallback: distribute to the roommate with the lowest total effort overall
    if (!chosenUser) {
      const allSorted = [...roommateIds].sort((a, b) => (efforts[a] || 0) - (efforts[b] || 0));
      chosenUser = allSorted[0];
    }

    efforts[chosenUser] += points;
    assignedChoreIds.add(chore.id);

    assignments.push({
      choreId: chore.id,
      userId: chosenUser,
      scheduledDays: getDefaultDays(chore, i),
      scheduledTime: chore.name.toLowerCase().includes('cooking') ? '19:30' : '18:00',
      completedToday: false,
      kudos: [],
    });
  }

  return {
    assignments,
    effortDistribution: efforts,
  };
}
