import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  canAffordSwap,
  createChoreSwapRequest,
  resolveChoreSwapRequest,
  applyTokenTransactions,
  INITIAL_FAVOR_TOKENS,
} from './tokens';

describe('favor tokens & chore swap engine', () => {
  it('correctly checks affordability against token balance', () => {
    assert.strictEqual(canAffordSwap(5, 1), true);
    assert.strictEqual(canAffordSwap(1, 1), true);
    assert.strictEqual(canAffordSwap(0, 1), false);
    assert.strictEqual(canAffordSwap(1, 2), false);
  });

  it('creates a well-formed pending swap request', () => {
    const swap = createChoreSwapRequest({
      householdId: 'h1',
      requesterUserId: 'u_kai',
      targetUserId: 'u_lucas',
      requesterChoreName: 'Clean Bathroom',
      targetChoreName: 'Take Out Trash',
      tokenCost: 2,
      note: 'Need to study for midterms tonight!',
    });

    assert.strictEqual(swap.status, 'pending');
    assert.strictEqual(swap.requesterUserId, 'u_kai');
    assert.strictEqual(swap.targetUserId, 'u_lucas');
    assert.strictEqual(swap.tokenCost, 2);
    assert.strictEqual(swap.note, 'Need to study for midterms tonight!');
  });

  it('accepting swap transfers tokens from requester to target via transactions', () => {
    const swap = createChoreSwapRequest({
      householdId: 'h1',
      requesterUserId: 'u_kai',
      targetUserId: 'u_lucas',
      requesterChoreName: 'Kitchen Counters',
      targetChoreName: 'Dishwasher',
      tokenCost: 1,
    });

    const result = resolveChoreSwapRequest(swap, 'accept');
    assert.strictEqual(result.updatedRequest.status, 'accepted');
    assert.strictEqual(result.transferred, true);
    assert.strictEqual(result.transactions.length, 2);

    const spendTx = result.transactions.find((tx) => tx.type === 'spend');
    const earnTx = result.transactions.find((tx) => tx.type === 'earn');

    assert.strictEqual(spendTx?.userId, 'u_kai');
    assert.strictEqual(spendTx?.amount, 1);
    assert.strictEqual(earnTx?.userId, 'u_lucas');
    assert.strictEqual(earnTx?.amount, 1);

    // Apply transactions to user balances
    const kaiNewBalance = applyTokenTransactions(INITIAL_FAVOR_TOKENS, result.transactions, 'u_kai');
    const lucasNewBalance = applyTokenTransactions(INITIAL_FAVOR_TOKENS, result.transactions, 'u_lucas');

    assert.strictEqual(kaiNewBalance, INITIAL_FAVOR_TOKENS - 1);
    assert.strictEqual(lucasNewBalance, INITIAL_FAVOR_TOKENS + 1);
  });

  it('declining swap moves zero tokens', () => {
    const swap = createChoreSwapRequest({
      householdId: 'h1',
      requesterUserId: 'u_kai',
      targetUserId: 'u_lucas',
      requesterChoreName: 'Mop Living Room',
      targetChoreName: 'Take Out Trash',
      tokenCost: 1,
    });

    const result = resolveChoreSwapRequest(swap, 'decline');
    assert.strictEqual(result.updatedRequest.status, 'declined');
    assert.strictEqual(result.transferred, false);
    assert.strictEqual(result.transactions.length, 0);
  });
});
