import { User, Chore, DayOfWeek, DutyDayEntry, DutySchedule } from '../types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DAY_DISPLAY_NAMES: Record<DayOfWeek, { short: string; full: string }> = {
  monday: { short: 'Mon', full: 'Monday' },
  tuesday: { short: 'Tue', full: 'Tuesday' },
  wednesday: { short: 'Wed', full: 'Wednesday' },
  thursday: { short: 'Thu', full: 'Thursday' },
  friday: { short: 'Fri', full: 'Friday' },
  saturday: { short: 'Sat', full: 'Saturday' },
  sunday: { short: 'Sun', full: 'Sunday' },
};

/**
 * Returns the DayOfWeek for a given date.
 */
export function getDayOfWeekFromDate(d: Date = new Date()): DayOfWeek {
  const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday, ...
  const map: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[dayIndex];
}

/**
 * Returns Monday's ISO date string (YYYY-MM-DD) for the week of the given date.
 */
export function getMondayOfWeek(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  date.setDate(diff);
  return date.toISOString().split('T')[0];
}

/**
 * Generate a fair 7-day weekly duty timetable for the apartment.
 * Distributes days of the week across available flatmates with weekend rotation.
 */
export function generateDutySchedule(
  householdId: string,
  roommates: User[],
  chores: Chore[] = [],
  weekStartDate: string = getMondayOfWeek()
): DutySchedule {
  if (!roommates || roommates.length === 0) {
    return {
      householdId,
      weekStartDate,
      entries: DAYS_OF_WEEK.map((day) => ({
        day,
        assignedUserId: '',
        choreIds: [],
      })),
    };
  }

  // Active roommates (filter out those on away mode if there are other members)
  const availableRoommates = roommates.filter((r) => r.isHome && (!r.awayUntil || new Date(r.awayUntil) <= new Date()));
  const pool = availableRoommates.length > 0 ? availableRoommates : roommates;

  // Derive a deterministic week offset from the week start date for weekend fairness
  const weekNumber = Math.floor(new Date(weekStartDate).getTime() / (7 * 24 * 60 * 60 * 1000));
  const rotationOffset = Math.abs(weekNumber) % pool.length;

  // Pick common daily duty chores (e.g. mopping, wiping, kitchen, trash)
  const defaultDutyChores = chores.length > 0
    ? chores.slice(0, Math.min(3, chores.length)).map((c) => c.id)
    : [];

  const entries: DutyDayEntry[] = DAYS_OF_WEEK.map((day, idx) => {
    const userIndex = (idx + rotationOffset) % pool.length;
    const assignedUser = pool[userIndex];
    return {
      day,
      assignedUserId: assignedUser.id,
      choreIds: defaultDutyChores,
      notes: day === 'sunday' ? 'Weekly apartment deep wipe & trash reset' : undefined,
      completed: false,
    };
  });

  return {
    householdId,
    weekStartDate,
    entries,
  };
}

/**
 * Admin reassigns a specific day to a new flatmate.
 */
export function reassignDutyDay(
  schedule: DutySchedule,
  day: DayOfWeek,
  newUserId: string
): DutySchedule {
  return {
    ...schedule,
    entries: schedule.entries.map((entry) =>
      entry.day === day ? { ...entry, assignedUserId: newUserId } : entry
    ),
  };
}

/**
 * Swaps assigned flatmates between two days (e.g. Wednesday <-> Friday).
 */
export function swapDutyDays(
  schedule: DutySchedule,
  day1: DayOfWeek,
  day2: DayOfWeek
): DutySchedule {
  const entry1 = schedule.entries.find((e) => e.day === day1);
  const entry2 = schedule.entries.find((e) => e.day === day2);
  if (!entry1 || !entry2) return schedule;

  const user1 = entry1.assignedUserId;
  const user2 = entry2.assignedUserId;

  return {
    ...schedule,
    entries: schedule.entries.map((entry) => {
      if (entry.day === day1) return { ...entry, assignedUserId: user2 };
      if (entry.day === day2) return { ...entry, assignedUserId: user1 };
      return entry;
    }),
  };
}

/**
 * Returns today's duty captain details.
 */
export function getTodayDuty(
  schedule: DutySchedule | null | undefined,
  roommates: User[],
  currentUserId: string,
  now: Date = new Date()
): { entry: DutyDayEntry; user: User | null; isMe: boolean; day: DayOfWeek } | null {
  if (!schedule || !schedule.entries || schedule.entries.length === 0) return null;

  const todayDay = getDayOfWeekFromDate(now);
  const todayEntry = schedule.entries.find((e) => e.day === todayDay);
  if (!todayEntry) return null;

  const assignedUser = roommates.find((r) => r.id === todayEntry.assignedUserId) || null;
  return {
    entry: todayEntry,
    user: assignedUser,
    isMe: todayEntry.assignedUserId === currentUserId,
    day: todayDay,
  };
}
