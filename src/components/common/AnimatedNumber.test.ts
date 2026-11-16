import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { interpolateCounterValue } from './AnimatedNumber';

describe('interpolateCounterValue (AnimatedNumber 60fps easing)', () => {
  it('returns the exact start value at progress 0', () => {
    assert.equal(interpolateCounterValue(5, 10, 0), 5);
  });

  it('returns the exact target value at progress 1', () => {
    assert.equal(interpolateCounterValue(5, 10, 1), 10);
  });

  it('applies cubic ease-out deceleration so midpoint progress (>0.5) is over halfway to target', () => {
    const mid = interpolateCounterValue(0, 100, 0.5);
    // 1 - (1 - 0.5)^3 = 0.875 => 87.5
    assert.ok(Math.abs(mid - 87.5) < 0.0001);
  });

  it('smoothly interpolates decreasing values (e.g. spending Favor Tokens)', () => {
    const mid = interpolateCounterValue(10, 2, 0.5);
    assert.ok(mid < 6);
    assert.ok(mid > 2);
    assert.equal(interpolateCounterValue(10, 2, 1), 2);
  });
});
