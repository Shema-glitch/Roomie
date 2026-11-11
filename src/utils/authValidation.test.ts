import assert from 'node:assert/strict';
import test from 'node:test';
import { hashLocalPassword, validateEmail, validatePassword } from './authValidation';

test('validateEmail accepts standard and university addresses', () => {
  assert.equal(validateEmail('amina@emu.edu.tr').valid, true);
  assert.equal(validateEmail('Alex.Smith@gmail.com').valid, true);
});

test('validateEmail rejects malformed or placeholder emails', () => {
  assert.equal(validateEmail('').valid, false);
  assert.equal(validateEmail('notanemail').valid, false);
  assert.equal(validateEmail('user@domain').valid, false);
  assert.equal(validateEmail('user@example.com').valid, false);
});

test('validatePassword enforces length, upper, lower, and number rules', () => {
  assert.equal(validatePassword('short').valid, false);
  assert.equal(validatePassword('alllowercase1').valid, false);
  assert.equal(validatePassword('NoNumbersHere').valid, false);
  assert.equal(validatePassword('Roomie2026').valid, true);
});

test('hashLocalPassword is deterministic and differs across passwords', () => {
  const h1 = hashLocalPassword('A@b.com', 'Roomie2026');
  const h2 = hashLocalPassword('a@b.com', 'Roomie2026');
  const h3 = hashLocalPassword('a@b.com', 'Different1');
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});
