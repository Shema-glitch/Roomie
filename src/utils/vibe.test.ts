import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateHouseholdVibe,
  createAnonymousVibeCheck,
  getVibeRatingFromScore,
  getCurrentWeekKey,
  VIBE_DEFINITIONS,
} from './vibe';
import { WeeklyVibeCheck } from '../types';

describe('anonymous household vibe check engine', () => {
  const currentWeek = '2026-W46';

  it('hides apartment aggregate if fewer than 3 flatmates submit (k-anonymity protection)', () => {
    const submissions: WeeklyVibeCheck[] = [
      createAnonymousVibeCheck('h1', currentWeek, 'fire'),
      createAnonymousVibeCheck('h1', currentWeek, 'chill'),
    ];

    const result = calculateHouseholdVibe('h1', currentWeek, submissions, 3);
    assert.strictEqual(result.revealed, false);
    assert.strictEqual(result.submissionCount, 2);
    assert.strictEqual(result.averageScore, undefined);
    assert.strictEqual(result.dominantMood, undefined);
  });

  it('reveals average score and dominant mood once threshold of 3 is reached', () => {
    const submissions: WeeklyVibeCheck[] = [
      createAnonymousVibeCheck('h1', currentWeek, 'fire'), // 5
      createAnonymousVibeCheck('h1', currentWeek, 'chill'), // 4
      createAnonymousVibeCheck('h1', currentWeek, 'chill'), // 4
    ];

    const result = calculateHouseholdVibe('h1', currentWeek, submissions, 3);
    assert.strictEqual(result.revealed, true);
    assert.strictEqual(result.submissionCount, 3);
    // (5 + 4 + 4) / 3 = 4.333 -> 4.3
    assert.strictEqual(result.averageScore, 4.3);
    assert.strictEqual(result.dominantMood, 'chill');
  });

  it('does NOT contain user ID in anonymous submission payload', () => {
    const check = createAnonymousVibeCheck('h1', currentWeek, 'fire');
    assert.strictEqual((check as any).userId, undefined);
    assert.strictEqual(check.score, 5);
    assert.strictEqual(check.rating, 'fire');
  });

  it('maps scores accurately to moods', () => {
    assert.strictEqual(getVibeRatingFromScore(4.8), 'fire');
    assert.strictEqual(getVibeRatingFromScore(4.0), 'chill');
    assert.strictEqual(getVibeRatingFromScore(3.0), 'meh');
    assert.strictEqual(getVibeRatingFromScore(2.1), 'stressed');
    assert.strictEqual(getVibeRatingFromScore(1.2), 'down');
  });

  it('computes ISO week key consistently', () => {
    const weekKey = getCurrentWeekKey(new Date('2026-11-16T12:00:00Z'));
    assert.ok(weekKey.startsWith('2026-W'));
  });
});
