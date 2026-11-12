import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDutySchedule,
  reassignDutyDay,
  swapDutyDays,
  getTodayDuty,
  getDayOfWeekFromDate,
  getMondayOfWeek,
  DAYS_OF_WEEK,
} from './dutyRotation';
import { User, Chore } from '../types';

const mockRoommates: User[] = [
  { id: 'u_1', name: 'Alice', email: 'alice@flat.com', country: 'TR', countryCode: 'TR', flag: '🇹🇷', isHome: true, streakDays: 2, points: 50, awayUntil: null, avatar: '' },
  { id: 'u_2', name: 'Bob', email: 'bob@flat.com', country: 'DE', countryCode: 'DE', flag: '🇩🇪', isHome: true, streakDays: 4, points: 70, awayUntil: null, avatar: '' },
  { id: 'u_3', name: 'Charlie', email: 'charlie@flat.com', country: 'MA', countryCode: 'MA', flag: '🇲🇦', isHome: true, streakDays: 1, points: 20, awayUntil: null, avatar: '' },
];

const mockChores: Chore[] = [
  { id: 'c_mop', householdId: 'h_1', name: 'Mop Common Floor', frequency: 'daily', effortLevel: 'medium', active: true, description: 'Mop floor', iconName: 'sparkles' },
  { id: 'c_trash', householdId: 'h_1', name: 'Take Out Trash & Recycling', frequency: 'daily', effortLevel: 'light', active: true, description: 'Bins', iconName: 'trash' },
  { id: 'c_dishes', householdId: 'h_1', name: 'Wipe Kitchen Counters & Sink', frequency: 'daily', effortLevel: 'light', active: true, description: 'Kitchen', iconName: 'utensils' },
];

test('generateDutySchedule distributes 7 days across flatmates fairly', () => {
  const schedule = generateDutySchedule('h_1', mockRoommates, mockChores, '2026-11-09');

  assert.equal(schedule.householdId, 'h_1');
  assert.equal(schedule.entries.length, 7);

  // Every day is represented
  const scheduledDays = schedule.entries.map((e) => e.day);
  assert.deepEqual(scheduledDays, DAYS_OF_WEEK);

  // Every entry has an assigned flatmate from the pool
  schedule.entries.forEach((entry) => {
    assert.ok(mockRoommates.some((r) => r.id === entry.assignedUserId), `Entry ${entry.day} must be assigned to a flatmate`);
    assert.ok(entry.choreIds.length > 0, `Entry ${entry.day} must have duty chores assigned`);
  });
});

test('generateDutySchedule respects away flatmates when others are available', () => {
  const roommatesWithAway: User[] = [
    { ...mockRoommates[0], isHome: false, awayUntil: '2026-12-01T00:00:00.000Z' }, // Alice is away
    mockRoommates[1], // Bob
    mockRoommates[2], // Charlie
  ];

  const schedule = generateDutySchedule('h_1', roommatesWithAway, mockChores, '2026-11-09');

  // Alice should NOT be assigned any duty day while away
  const aliceEntries = schedule.entries.filter((e) => e.assignedUserId === 'u_1');
  assert.equal(aliceEntries.length, 0, 'Away flatmate Alice should not be assigned duty days');
});

test('reassignDutyDay allows admin to change assigned flatmate for a day', () => {
  const schedule = generateDutySchedule('h_1', mockRoommates, mockChores, '2026-11-09');
  const updated = reassignDutyDay(schedule, 'friday', 'u_3');

  const fridayEntry = updated.entries.find((e) => e.day === 'friday');
  assert.equal(fridayEntry?.assignedUserId, 'u_3');
});

test('swapDutyDays swaps assignments between two days cleanly', () => {
  const schedule = generateDutySchedule('h_1', mockRoommates, mockChores, '2026-11-09');
  const monUser = schedule.entries.find((e) => e.day === 'monday')?.assignedUserId;
  const friUser = schedule.entries.find((e) => e.day === 'friday')?.assignedUserId;

  const swapped = swapDutyDays(schedule, 'monday', 'friday');

  assert.equal(swapped.entries.find((e) => e.day === 'monday')?.assignedUserId, friUser);
  assert.equal(swapped.entries.find((e) => e.day === 'friday')?.assignedUserId, monUser);
});

test('getTodayDuty identifies flat captain and whether it is current user', () => {
  const schedule = generateDutySchedule('h_1', mockRoommates, mockChores, '2026-11-09');
  const fridayDate = new Date('2026-11-13T12:00:00Z'); // Friday

  const duty = getTodayDuty(schedule, mockRoommates, 'u_1', fridayDate);
  assert.ok(duty);
  assert.equal(duty.day, 'friday');
  assert.ok(duty.user);
  assert.equal(typeof duty.isMe, 'boolean');
});
