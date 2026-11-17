import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSystemActivityText, buildChatTimeline } from './chatActivity';
import { ChatMessage } from '../../types';

test('normalizeSystemActivityText strips raw emojis and privacy prefixes cleanly', () => {
  assert.equal(
    normalizeSystemActivityText('🛡️ Privacy Notice: Hany keny has joined the apartment roster.'),
    'Hany keny joined the flat'
  );
  assert.equal(
    normalizeSystemActivityText('Hany keny was approved and joined Selin Court B Blok'),
    'Hany keny joined the flat'
  );
  assert.equal(
    normalizeSystemActivityText('👋 Leo left the apartment. 🛒'),
    'Leo left the apartment.'
  );
});

test('buildChatTimeline deduplicates repeated member-join and consecutive identical whisper events', () => {
  const msgs: ChatMessage[] = [
    {
      id: 'm1',
      householdId: 'h1',
      senderId: null,
      type: 'activity',
      body: '🛡️ Privacy Notice: Hany keny has joined the apartment roster.',
      createdAt: '2026-11-18T10:00:00Z',
    },
    {
      id: 'm2',
      householdId: 'h1',
      senderId: null,
      type: 'activity',
      body: 'Hany keny joined Selin Court B Blok',
      createdAt: '2026-11-18T10:00:05Z',
    },
    {
      id: 'm3',
      householdId: 'h1',
      senderId: 'u1',
      type: 'text',
      body: 'Hey!',
      createdAt: '2026-11-18T10:01:00Z',
    },
    {
      id: 'm4',
      householdId: 'h1',
      senderId: null,
      type: 'activity',
      body: 'Charmant is heading to the supermarket! 🛒',
      createdAt: '2026-11-18T10:02:00Z',
    },
    {
      id: 'm5',
      householdId: 'h1',
      senderId: null,
      type: 'activity',
      body: 'Charmant is heading to the supermarket!',
      createdAt: '2026-11-18T10:02:04Z',
    },
  ];

  const timeline = buildChatTimeline(msgs);
  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].displayBody, 'Hany keny joined the flat');
  assert.equal(timeline[1].kind, 'message');
  assert.equal(timeline[1].displayBody, 'Hey!');
  assert.equal(timeline[2].displayBody, 'Charmant is heading to the supermarket!');
});
