import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getChoreDraftState,
  getChoreStateEvent,
  calculateDraftProgressPercent,
  summarizePendingExpenses,
  formatDecimalCurrency,
} from './stateTable';
import { DraftRound, Expense, User } from '../types';

test('chore draft state transition: draft_open when collecting and user has no picks', () => {
  const round: DraftRound = {
    id: 'round_1',
    householdId: 'h1',
    status: 'collecting',
    createdAt: '2026-10-29T10:00:00Z',
    picks: [
      { userId: 'roomie_2', choreId: 'c1', pickType: 'want' },
    ],
    assignments: [],
  };

  const draftState = getChoreDraftState(round, 'user_1');
  assert.equal(draftState.state, 'draft_open');
  assert.equal(draftState.badgeLabel, 'Draft Open');
  assert.equal(draftState.bannerTitle, 'Weekly Chore Picks');
  assert.equal(draftState.actionLabel, 'Choose My Chores');

  const event = getChoreStateEvent('draft_open');
  assert.equal(event.title, 'Weekly Chore Picks');
  assert.match(event.activityMessage, /Weekly Chore Picks are open/);
  assert.equal(event.linkTarget.screen, 'chore-draft');
});

test('chore draft state transition: waiting_others when collecting and user has submitted picks', () => {
  const round: DraftRound = {
    id: 'round_1',
    householdId: 'h1',
    status: 'collecting',
    createdAt: '2026-10-29T10:00:00Z',
    picks: [
      { userId: 'user_1', choreId: 'c1', pickType: 'want' },
    ],
    assignments: [],
  };

  const draftState = getChoreDraftState(round, 'user_1');
  assert.equal(draftState.state, 'waiting_others');
  assert.equal(draftState.badgeLabel, 'Picks Submitted');
  assert.equal(draftState.bannerTitle, 'Picks Submitted! Waiting for Roomies');
  assert.equal(draftState.actionLabel, 'Edit My Picks');

  const event = getChoreStateEvent('waiting_others');
  assert.equal(event.title, 'Chore Picks Submitted');
  assert.match(event.activityMessage, /Submitted secret chore picks/);
  assert.equal(event.linkTarget.screen, 'chore-waiting');
});

test('chore draft state transition: reveal_ready when all picks are in', () => {
  const round: DraftRound = {
    id: 'round_1',
    householdId: 'h1',
    status: 'ready_to_reveal',
    createdAt: '2026-10-29T10:00:00Z',
    picks: [
      { userId: 'user_1', choreId: 'c1', pickType: 'want' },
      { userId: 'user_2', choreId: 'c2', pickType: 'want' },
    ],
    assignments: [],
  };

  const draftState = getChoreDraftState(round, 'user_1');
  assert.equal(draftState.state, 'reveal_ready');
  assert.equal(draftState.badgeLabel, 'All picks in');
  assert.equal(draftState.bannerTitle, 'Chore reveal ready!');
  assert.equal(draftState.actionLabel, 'Reveal assignments!');

  const event = getChoreStateEvent('reveal_ready');
  assert.equal(event.title, 'Chore Reveal Ready!');
  assert.match(event.activityMessage, /All picks are in for Sunday Chore Draft/);
  assert.equal(event.linkTarget.screen, 'chore-reveal');
});

test('chore draft state transition: reveal_done when round is revealed', () => {
  const round: DraftRound = {
    id: 'round_1',
    householdId: 'h1',
    status: 'revealed',
    createdAt: '2026-10-29T10:00:00Z',
    revealedAt: '2026-10-29T12:00:00Z',
    picks: [],
    assignments: [],
  };

  const draftState = getChoreDraftState(round, 'user_1');
  assert.equal(draftState.state, 'reveal_done');
  assert.equal(draftState.badgeLabel, 'Active Rotation');
  assert.equal(draftState.bannerTitle, 'Weekly Chores Active');
  assert.equal(draftState.actionLabel, 'View Schedule');

  const event = getChoreStateEvent('reveal_done');
  assert.equal(event.title, 'Weekly Chores Active');
  assert.match(event.activityMessage, /The Chore Reveal is complete/);
  assert.equal(event.linkTarget.screen, 'chores');
});

test('chore draft state fallback: handles null or undefined round gracefully', () => {
  const draftStateNull = getChoreDraftState(null, 'user_1');
  assert.equal(draftStateNull.state, 'reveal_done');
  assert.equal(draftStateNull.badgeLabel, 'Active Rotation');

  const draftStateUndefined = getChoreDraftState(undefined, 'user_1');
  assert.equal(draftStateUndefined.state, 'reveal_done');
});

test('calculateDraftProgressPercent matches step progress cleanly (Step 1 of 4 -> 25%)', () => {
  assert.equal(calculateDraftProgressPercent(0, 4, false), 25);
  assert.equal(calculateDraftProgressPercent(1, 4, false), 50);
  assert.equal(calculateDraftProgressPercent(2, 4, false), 75);
  assert.equal(calculateDraftProgressPercent(3, 4, false), 100);
  assert.equal(calculateDraftProgressPercent(0, 4, true), 100);
  assert.equal(calculateDraftProgressPercent(0, 0, false), 0);
});

test('summarizePendingExpenses separates settled balances from pending approvals', () => {
  const roomies: User[] = [
    { id: 'u1', name: 'Charmant', email: 'c@flat.com', avatar: '', country: 'CY', countryCode: 'CY', flag: 'CY', isHome: true, streakDays: 0, points: 0, awayUntil: null },
    { id: 'u2', name: 'Hany Keny', email: 'h@flat.com', avatar: '', country: 'CY', countryCode: 'CY', flag: 'CY', isHome: true, streakDays: 0, points: 0, awayUntil: null },
  ];
  const pendingExp: Expense = {
    id: 'exp_1',
    householdId: 'h1',
    paidBy: 'u1',
    title: 'Water',
    amount: 65,
    category: 'utilities',
    date: '2026-11-19',
    status: 'pending',
    createdAt: '2026-11-19T10:00:00Z',
    shares: [
      { userId: 'u1', shareAmount: 32.5, response: 'agreed' },
      { userId: 'u2', shareAmount: 32.5, response: 'pending' },
    ],
  };

  const single = summarizePendingExpenses([pendingExp], roomies, 'u1', '₺');
  assert.equal(single.hasUnsettledActivity, true);
  assert.equal(single.pendingCount, 1);
  assert.equal(single.statusText, "1 expense awaiting Hany's approval (₺65.00)");

  const needMine = summarizePendingExpenses([pendingExp], roomies, 'u2', '₺');
  assert.equal(needMine.statusText, '1 expense awaiting your approval (₺65.00)');

  const cleared = summarizePendingExpenses([], roomies, 'u1', '₺');
  assert.equal(cleared.hasUnsettledActivity, false);
  assert.equal(cleared.statusText, null);
});

test('formatDecimalCurrency formats with Intl.NumberFormat 2 decimals', () => {
  assert.equal(formatDecimalCurrency(65), '65.00');
  assert.equal(formatDecimalCurrency(1234.5), '1,234.50');
  assert.equal(formatDecimalCurrency(0), '0.00');
});
