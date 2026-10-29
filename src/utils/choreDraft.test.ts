import test from 'node:test';
import assert from 'node:assert/strict';
import { getChoreDraftState, getChoreStateEvent } from './stateTable';
import { DraftRound } from '../types';

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
  assert.equal(draftState.bannerTitle, 'Sunday Chore Draft is Open! 📋');
  assert.equal(draftState.actionLabel, 'Submit Secret Picks');

  const event = getChoreStateEvent('draft_open');
  assert.equal(event.title, 'Sunday Chore Draft is Open! 📋');
  assert.match(event.activityMessage, /Sunday Chore Draft is open/);
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
  assert.equal(draftState.bannerTitle, 'Picks Submitted! Waiting for Roomies ⏳');
  assert.equal(draftState.actionLabel, 'Edit My Picks');

  const event = getChoreStateEvent('waiting_others');
  assert.equal(event.title, 'Chore Picks Submitted ⏳');
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
  assert.equal(draftState.bannerTitle, 'Chore reveal ready! 🎭');
  assert.equal(draftState.actionLabel, 'Reveal assignments!');

  const event = getChoreStateEvent('reveal_ready');
  assert.equal(event.title, 'Chore Reveal Ready! 🎭');
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
  assert.equal(draftState.bannerTitle, 'Weekly Chores Active ✨');
  assert.equal(draftState.actionLabel, 'View Schedule');

  const event = getChoreStateEvent('reveal_done');
  assert.equal(event.title, 'Weekly Chores Active ✨');
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
