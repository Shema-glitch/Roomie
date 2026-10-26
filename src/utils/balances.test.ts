import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBalances } from './balances';
import { Expense, Settlement } from '../types';

test('calculates net balances accurately with equal split', () => {
  const users = ['u1', 'u2', 'u3'];
  const expenses: Expense[] = [
    {
      id: 'e1',
      householdId: 'h1',
      paidBy: 'u1',
      title: 'Groceries',
      amount: 300,
      category: 'groceries',
      date: '2026-10-25',
      status: 'agreed',
      createdAt: '2026-10-25T10:00:00Z',
      shares: [
        { userId: 'u1', shareAmount: 100, response: 'agreed' },
        { userId: 'u2', shareAmount: 100, response: 'agreed' },
        { userId: 'u3', shareAmount: 100, response: 'agreed' },
      ],
    },
  ];

  const result = calculateBalances(expenses, [], users);
  assert.equal(result.userSummaries['u1'], 200);
  assert.equal(result.userSummaries['u2'], -100);
  assert.equal(result.userSummaries['u3'], -100);

  assert.equal(result.simplifiedDebts.length, 2);
  const u2Debt = result.simplifiedDebts.find((d) => d.fromUserId === 'u2');
  assert.ok(u2Debt);
  assert.equal(u2Debt?.toUserId, 'u1');
  assert.equal(u2Debt?.amount, 100);
});

test('handles direct settlement deduction', () => {
  const users = ['u1', 'u2'];
  const expenses: Expense[] = [
    {
      id: 'e1',
      householdId: 'h1',
      paidBy: 'u1',
      title: 'Internet',
      amount: 100,
      category: 'utilities',
      date: '2026-10-25',
      status: 'agreed',
      createdAt: '2026-10-25T10:00:00Z',
      shares: [
        { userId: 'u1', shareAmount: 50, response: 'agreed' },
        { userId: 'u2', shareAmount: 50, response: 'agreed' },
      ],
    },
  ];

  const settlements: Settlement[] = [
    {
      id: 's1',
      householdId: 'h1',
      fromUser: 'u2',
      toUser: 'u1',
      amount: 50,
      status: 'confirmed',
      createdAt: '2026-10-25T12:00:00Z',
    },
  ];

  const result = calculateBalances(expenses, settlements, users);
  assert.equal(result.userSummaries['u1'], 0);
  assert.equal(result.userSummaries['u2'], 0);
  assert.equal(result.simplifiedDebts.length, 0);
});
