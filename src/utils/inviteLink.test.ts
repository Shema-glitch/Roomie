import test from 'node:test';
import assert from 'node:assert/strict';
import { extractInviteCodeFromInput, buildInviteUrl } from './inviteLink';

test('extractInviteCodeFromInput parses HTTPS invite URLs cleanly', () => {
  assert.equal(
    extractInviteCodeFromInput('https://roomie.app/?code=cyp-7492'),
    'CYP-7492'
  );
  assert.equal(
    extractInviteCodeFromInput('https://localhost:3000/?join=ab12cd34&ref=qr'),
    'AB12CD34'
  );
});

test('extractInviteCodeFromInput parses native roomie:// deep links and bare codes', () => {
  assert.equal(
    extractInviteCodeFromInput('roomie://join?code=room1234'),
    'ROOM1234'
  );
  assert.equal(
    extractInviteCodeFromInput('roomie://join/xy89zw12'),
    'XY89ZW12'
  );
  assert.equal(
    extractInviteCodeFromInput('  cyp-7492  '),
    'CYP-7492'
  );
});

test('extractInviteCodeFromInput rejects empty or arbitrary non-code strings', () => {
  assert.equal(extractInviteCodeFromInput(''), null);
  assert.equal(extractInviteCodeFromInput('hello world with spaces'), null);
});

test('buildInviteUrl generates a normalized HTTPS invite URL', () => {
  const url = buildInviteUrl('  ab12cd34 ');
  assert.match(url, /^https?:\/\/.+\/\?code=AB12CD34$/);
});
