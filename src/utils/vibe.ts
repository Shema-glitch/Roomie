/**
 * Roomie Phase 2: Anonymous Household Vibe Check Engine
 * Upholds strict k-anonymity (min 3 roommates) to protect honest roommate trust.
 */

import { VibeRating, WeeklyVibeCheck, HouseholdVibeSummary } from '../types';

export interface VibeMeta {
  rating: VibeRating;
  score: number;
  label: string;
  emoji: string;
  description: string;
  colorScheme: 'amber' | 'emerald' | 'sky' | 'indigo' | 'rose';
}

export const VIBE_DEFINITIONS: Record<VibeRating, VibeMeta> = {
  fire: {
    rating: 'fire',
    score: 5,
    label: 'On Fire',
    emoji: '🔥',
    description: 'Energized, motivated, and feeling fantastic!',
    colorScheme: 'rose',
  },
  chill: {
    rating: 'chill',
    score: 4,
    label: 'Super Chill',
    emoji: '😎',
    description: 'Smooth sailing, relaxed, and happy at home.',
    colorScheme: 'emerald',
  },
  meh: {
    rating: 'meh',
    score: 3,
    label: 'Just Okay',
    emoji: '😐',
    description: 'Neutral and taking things day by day.',
    colorScheme: 'sky',
  },
  stressed: {
    rating: 'stressed',
    score: 2,
    label: 'A Bit Stressed',
    emoji: '😩',
    description: 'Exam pressure or busy routine, need extra quiet.',
    colorScheme: 'amber',
  },
  down: {
    rating: 'down',
    score: 1,
    label: 'Feeling Low',
    emoji: '🌧️',
    description: 'Tired and running on low battery.',
    colorScheme: 'indigo',
  },
};

export const VIBE_RATINGS_LIST: VibeRating[] = ['fire', 'chill', 'meh', 'stressed', 'down'];

export function getVibeRatingFromScore(score: number): VibeRating {
  if (score >= 4.5) return 'fire';
  if (score >= 3.5) return 'chill';
  if (score >= 2.5) return 'meh';
  if (score >= 1.8) return 'stressed';
  return 'down';
}

/**
 * Calculates household aggregate vibe while enforcing strict k-anonymity.
 * Never reveals individual scores; hides average completely if responses < minRequired.
 */
export function calculateHouseholdVibe(
  householdId: string,
  weekKey: string,
  submissions: WeeklyVibeCheck[],
  minRequired = 3
): HouseholdVibeSummary {
  const matching = submissions.filter((s) => s.householdId === householdId && s.weekKey === weekKey);
  const count = matching.length;

  if (count < minRequired) {
    return {
      householdId,
      weekKey,
      submissionCount: count,
      revealed: false,
      minRequired,
    };
  }

  const sum = matching.reduce((acc, curr) => acc + curr.score, 0);
  const averageScore = Math.round((sum / count) * 10) / 10;
  const dominantMood = getVibeRatingFromScore(averageScore);

  return {
    householdId,
    weekKey,
    submissionCount: count,
    revealed: true,
    minRequired,
    averageScore,
    dominantMood,
  };
}

/**
 * Creates an anonymous vibe submission object.
 * Explicitly excludes user IDs to maintain total privacy.
 */
export function createAnonymousVibeCheck(
  householdId: string,
  weekKey: string,
  rating: VibeRating
): WeeklyVibeCheck {
  const meta = VIBE_DEFINITIONS[rating];
  return {
    id: `vibe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    householdId,
    weekKey,
    score: meta.score,
    rating,
    createdAt: new Date().toISOString(),
  };
}

export function getCurrentWeekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}
