import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRoomieWrappedMetrics } from './wrappedMetrics';
import { User, ChoreAssignment, Expense, CulturalDinner, WeeklyAward } from '../types';

const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Kai Tanaka',
    email: 'kai@example.com',
    avatar: '',
    country: 'Japan',
    countryCode: 'JP',
    flag: '🇯🇵',
    isHome: true,
    streakDays: 14,
    points: 100,
    awayUntil: null,
  },
  {
    id: 'u2',
    name: 'Amina Mansour',
    email: 'amina@example.com',
    avatar: '',
    country: 'Morocco',
    countryCode: 'MA',
    flag: '🇲🇦',
    isHome: true,
    streakDays: 20,
    points: 150,
    awayUntil: null,
  },
];

const mockAssignments: ChoreAssignment[] = [
  {
    choreId: 'c1',
    userId: 'u2',
    scheduledDays: ['monday'],
    scheduledTime: '19:00',
    completedToday: true,
    kudos: [
      { id: 'k1', fromUser: 'u1', type: 'thanks', createdAt: '2026-11-10T10:00:00Z' },
      { id: 'k2', fromUser: 'u1', type: 'great_job', createdAt: '2026-11-11T10:00:00Z' },
    ],
  },
  {
    choreId: 'c2',
    userId: 'u1',
    scheduledDays: ['tuesday'],
    scheduledTime: '20:00',
    completedToday: false,
    kudos: [
      { id: 'k3', fromUser: 'u2', type: 'thanks', createdAt: '2026-11-12T10:00:00Z' },
    ],
  },
];

const mockExpenses: Expense[] = [
  {
    id: 'e1',
    householdId: 'h1',
    paidBy: 'u1',
    title: 'Groceries',
    amount: 500,
    category: 'groceries',
    date: '2026-11-01',
    status: 'agreed',
    shares: [],
    createdAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'e2',
    householdId: 'h1',
    paidBy: 'u2',
    title: 'Cleaning supplies',
    amount: 150,
    category: 'household',
    date: '2026-11-05',
    status: 'agreed',
    shares: [],
    createdAt: '2026-11-05T10:00:00Z',
  },
];

const mockDinners: CulturalDinner[] = [
  {
    id: 'd1',
    householdId: 'h1',
    hostUserId: 'u1',
    dishTitle: 'Katsu Curry',
    cuisineTag: 'Japanese',
    scheduledDate: '2026-11-20',
    dietaryTags: ['halal'],
    rsvpUserIds: ['u1', 'u2'],
    status: 'completed',
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
  },
];

const mockAwards: WeeklyAward[] = [
  {
    id: 'aw1',
    householdId: 'h1',
    weekLabel: 'Week Recap',
    badgeId: 'kitchen_hero',
    title: 'Kitchen Master',
    icon: 'cooking',
    recipientUserId: 'u1',
    recipientName: 'Kai',
    reason: 'Prepared delicious dinner',
    colorScheme: 'amber',
    awardedAt: '2026-11-15T18:00:00Z',
  },
];

test('computeRoomieWrappedMetrics calculates positive social milestones', () => {
  const metrics = computeRoomieWrappedMetrics({
    householdId: 'h1',
    roommates: mockUsers,
    assignments: mockAssignments,
    expenses: mockExpenses,
    culturalDinners: mockDinners,
    awards: mockAwards,
  });

  assert.ok(metrics.totalChoresTogether > 0, 'Total chores must be positive');
  assert.ok(metrics.disputeFreeStreakDays >= 30, 'Dispute-free streak must be at least 30 days');
  assert.equal(metrics.mostAppreciatedFlatmateName, 'Amina', 'Amina received 2 kudos vs Kai 1');
  assert.equal(metrics.topChefName, 'Kai', 'Kai hosted the dinner');
  assert.ok(metrics.flatHarmonyScore >= 50 && metrics.flatHarmonyScore <= 100, 'Harmony score between 50 and 100');
});

test('computeRoomieWrappedMetrics strictly enforces zero monetary values', () => {
  const metrics = computeRoomieWrappedMetrics({
    householdId: 'h1',
    roommates: mockUsers,
    expenses: mockExpenses,
  });

  const stringified = JSON.stringify(metrics);
  // Guarantee no currency keywords or values like 'TRY', '₺', '$', 'amount'
  assert.equal(stringified.includes('TRY'), false);
  assert.equal(stringified.includes('₺'), false);
  assert.equal(stringified.includes('$'), false);
  assert.equal(stringified.includes('amount'), false);
});

test('computeRoomieWrappedMetrics handles empty state gracefully', () => {
  const metrics = computeRoomieWrappedMetrics({
    roommates: [],
  });

  assert.ok(metrics.totalChoresTogether > 0);
  assert.ok(metrics.flatHarmonyScore >= 50);
  assert.equal(typeof metrics.mostAppreciatedFlatmateName, 'string');
});
