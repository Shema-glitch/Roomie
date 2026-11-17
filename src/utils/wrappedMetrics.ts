/**
 * Roomie Monthly Recap Metrics Engine
 * Computes flat recap metrics strictly from actual household state
 * with zero monetary figures, debt balances, or private IDs.
 */

import {
  User,
  ChoreAssignment,
  Chore,
  Expense,
  WeeklyAward,
  HouseholdVibeSummary,
  CulturalDinner,
  RoomieWrappedMetrics,
} from '../types';

export interface WrappedMetricsInput {
  householdId?: string;
  roommates: User[];
  assignments?: ChoreAssignment[];
  chores?: Chore[];
  expenses?: Expense[];
  awards?: WeeklyAward[];
  culturalDinners?: CulturalDinner[];
  vibeSummary?: HouseholdVibeSummary;
}

const MS_PER_DAY = 86_400_000;

export function computeRoomieWrappedMetrics(
  input: WrappedMetricsInput
): RoomieWrappedMetrics {
  const {
    roommates = [],
    assignments = [],
    expenses = [],
    awards = [],
    culturalDinners = [],
    vibeSummary,
  } = input;

  // 1. Real chores completed & verified member streak days
  const completedTodayCount = assignments.filter((a) => a.completedToday).length;
  const totalMemberStreakDays = roommates.reduce(
    (sum, r) => sum + Math.max(0, r.streakDays || 0),
    0
  );
  const totalChoresTogether = completedTodayCount + totalMemberStreakDays;

  // 2. Real dispute-free streak in days (0 when no activity yet)
  const activeExpenses = expenses.filter((e) => e.status !== 'cancelled');
  const disputedExpenses = activeExpenses.filter((e) => e.status === 'disputed');
  let disputeFreeStreakDays = 0;

  if (activeExpenses.length > 0) {
    const timestamps = activeExpenses
      .map((e) => Date.parse(e.createdAt || e.date))
      .filter((ts) => Number.isFinite(ts));

    if (disputedExpenses.length === 0) {
      const earliestMs = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
      disputeFreeStreakDays = Math.max(1, Math.floor((Date.now() - earliestMs) / MS_PER_DAY));
    } else {
      const disputedTimestamps = disputedExpenses
        .map((e) => Date.parse(e.createdAt || e.date))
        .filter((ts) => Number.isFinite(ts));
      const latestDisputeMs =
        disputedTimestamps.length > 0 ? Math.max(...disputedTimestamps) : Date.now();
      disputeFreeStreakDays = Math.max(0, Math.floor((Date.now() - latestDisputeMs) / MS_PER_DAY));
    }
  } else if (roommates.length > 0) {
    disputeFreeStreakDays = roommates.reduce(
      (max, r) => Math.max(max, Math.max(0, r.streakDays || 0)),
      0
    );
  }

  // 3. Real kudos & most appreciated flatmate
  const kudosCounts: Record<string, number> = {};
  roommates.forEach((r) => {
    kudosCounts[r.id] = 0;
  });

  let totalKudosExchanged = 0;
  assignments.forEach((a) => {
    if (a.kudos && a.kudos.length > 0) {
      kudosCounts[a.userId] = (kudosCounts[a.userId] || 0) + a.kudos.length;
      totalKudosExchanged += a.kudos.length;
    }
  });

  let mostAppreciatedId: string | undefined;
  let maxKudos = 0;
  Object.entries(kudosCounts).forEach(([userId, count]) => {
    if (count > maxKudos) {
      maxKudos = count;
      mostAppreciatedId = userId;
    }
  });

  if (!mostAppreciatedId) {
    const highestStreakUser = [...roommates]
      .filter((r) => (r.streakDays || 0) > 0)
      .sort((a, b) => (b.streakDays || 0) - (a.streakDays || 0))[0];
    mostAppreciatedId = highestStreakUser?.id;
  }

  const mostAppreciatedUser = roommates.find((r) => r.id === mostAppreciatedId);
  const mostAppreciatedFlatmateName =
    mostAppreciatedUser?.name.split(' ')[0] || 'No kudos yet';

  // 4. Real Dinner Night host & count
  const dinnersCount = culturalDinners.length;
  const hostCounts: Record<string, number> = {};
  culturalDinners.forEach((d) => {
    hostCounts[d.hostUserId] = (hostCounts[d.hostUserId] || 0) + 1;
  });

  let topChefUserId: string | undefined;
  let maxDinners = 0;
  Object.entries(hostCounts).forEach(([hostId, count]) => {
    if (count > maxDinners) {
      maxDinners = count;
      topChefUserId = hostId;
    }
  });

  const topChefUser = roommates.find((r) => r.id === topChefUserId);
  const topChefName = topChefUser?.name.split(' ')[0] || 'No dinners yet';

  // 5. Real Flat Harmony Score (0 when the flat is brand new with zero activity)
  const hasVibe = Boolean(vibeSummary?.revealed && typeof vibeSummary.averageScore === 'number');
  const hasExpenses = activeExpenses.length > 0;
  const hasChores = assignments.length > 0 || totalChoresTogether > 0;

  let flatHarmonyScore = 0;
  if (hasVibe || hasExpenses || hasChores) {
    let earned = 0;
    let maxPossible = 0;

    if (hasVibe) {
      earned += Math.round(((vibeSummary?.averageScore || 0) / 5) * 40);
      maxPossible += 40;
    }
    if (hasExpenses) {
      const cleanScore = Math.max(0, 30 - disputedExpenses.length * 10);
      earned += cleanScore;
      maxPossible += 30;
    }
    if (hasChores) {
      const choreRatio =
        assignments.length > 0
          ? completedTodayCount / assignments.length
          : Math.min(1, totalChoresTogether / 7);
      earned += Math.round(choreRatio * 20) + 10;
      maxPossible += 30;
    }

    flatHarmonyScore =
      maxPossible > 0 ? Math.min(100, Math.round((earned / maxPossible) * 100)) : 0;
  }

  // 6. Top award title from real weekly shoutouts
  const topAward = awards[0];
  const topAwardTitle = topAward ? topAward.title : 'Steady Roomies';

  return {
    totalChoresTogether,
    disputeFreeStreakDays,
    mostAppreciatedFlatmateId: mostAppreciatedId,
    mostAppreciatedFlatmateName,
    totalKudosExchanged,
    topChefUserId,
    topChefName,
    culturalDinnersHosted: dinnersCount,
    flatHarmonyScore,
    topAwardTitle,
  };
}
