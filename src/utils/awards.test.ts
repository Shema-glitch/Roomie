import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateWeeklyAwards, AWARD_BADGE_DEFINITIONS } from './awards';
import { User, ChoreAssignment } from '../types';

describe('weekly awards engine ("everyone wins")', () => {
  const mockUsers: User[] = [
    {
      id: 'u1',
      name: 'Kai',
      email: 'kai@example.com',
      avatar: '',
      country: 'Japan',
      countryCode: 'JP',
      flag: '🇯🇵',
      isHome: true,
      streakDays: 10,
      points: 100,
      awayUntil: null,
    },
    {
      id: 'u2',
      name: 'Amina',
      email: 'amina@example.com',
      avatar: '',
      country: 'Morocco',
      countryCode: 'MA',
      flag: '🇲🇦',
      isHome: true,
      streakDays: 3,
      points: 80,
      awayUntil: null,
    },
    {
      id: 'u3',
      name: 'Lucas',
      email: 'lucas@example.com',
      avatar: '',
      country: 'Germany',
      countryCode: 'DE',
      flag: '🇩🇪',
      isHome: true,
      streakDays: 4,
      points: 70,
      awayUntil: null,
    },
  ];

  it('guarantees every single flatmate receives an award (no one left out)', () => {
    const awards = evaluateWeeklyAwards({
      householdId: 'h1',
      users: mockUsers,
    });

    assert.strictEqual(awards.length, 3);
    const recipientIds = awards.map((a) => a.recipientUserId);
    assert.deepStrictEqual(recipientIds.sort(), ['u1', 'u2', 'u3'].sort());
  });

  it('awards streak master to high streak users and assigns positive reasons', () => {
    const assignments: ChoreAssignment[] = [
      {
        choreId: 'ch_kitchen',
        userId: 'u2',
        scheduledDays: ['Mon'],
        scheduledTime: '20:00',
        completedToday: true,
        kudos: [],
      },
      {
        choreId: 'ch_trash',
        userId: 'u3',
        scheduledDays: ['Tue'],
        scheduledTime: '21:00',
        completedToday: true,
        kudos: [],
      },
    ];

    const awards = evaluateWeeklyAwards({
      householdId: 'h1',
      users: mockUsers,
      assignments,
    });

    const kaiAward = awards.find((a) => a.recipientUserId === 'u1');
    const aminaAward = awards.find((a) => a.recipientUserId === 'u2');
    const lucasAward = awards.find((a) => a.recipientUserId === 'u3');

    assert.strictEqual(kaiAward?.badgeId, 'streak_master');
    assert.strictEqual(aminaAward?.badgeId, 'kitchen_hero');
    assert.strictEqual(lucasAward?.badgeId, 'bin_boss');

    // All awards have valid non-empty reasons and emojis
    for (const award of awards) {
      assert.ok(award.reason.length > 5);
      assert.ok(award.icon.length > 0);
      assert.ok(AWARD_BADGE_DEFINITIONS[award.badgeId]);
    }
  });

  it('returns empty array when users array is empty', () => {
    const awards = evaluateWeeklyAwards({
      householdId: 'h1',
      users: [],
    });
    assert.deepStrictEqual(awards, []);
  });
});
