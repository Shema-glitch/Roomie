import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBalances } from './balances';
import { matchChores, EFFORT_POINTS } from './matching';
import { Expense, Settlement, Chore, DraftPick } from '../types';

test('calculateBalances correctly determines net balances and simplifies debts', () => {
  const users = ['user_amina', 'user_lucas', 'user_yasmin'];

  // Amina pays 300 TRY for groceries shared equally by all 3 (100 each)
  const expenses: Expense[] = [
    {
      id: 'exp1',
      householdId: 'h1',
      paidBy: 'user_amina',
      title: 'Groceries',
      amount: 300,
      category: 'groceries',
      date: '2026-10-20',
      status: 'agreed',
      shares: [
        { userId: 'user_amina', shareAmount: 100, response: 'agreed' },
        { userId: 'user_lucas', shareAmount: 100, response: 'agreed' },
        { userId: 'user_yasmin', shareAmount: 100, response: 'agreed' },
      ],
      createdAt: '2026-10-20T10:00:00Z',
    },
  ];

  // Lucas pays 100 TRY directly to Amina via settlement
  const settlements: Settlement[] = [
    {
      id: 'set1',
      householdId: 'h1',
      fromUser: 'user_lucas',
      toUser: 'user_amina',
      amount: 100,
      status: 'confirmed',
      createdAt: '2026-10-21T10:00:00Z',
      confirmedAt: '2026-10-21T12:00:00Z',
    },
  ];

  const result = calculateBalances(expenses, settlements, users);

  // Amina was owed 200, received 100 -> net +100
  // Lucas owed 100, paid 100 -> net 0
  // Yasmin owes 100 -> net -100
  assert.equal(Math.round(result.userSummaries['user_amina']), 100);
  assert.equal(Math.round(result.userSummaries['user_lucas']), 0);
  assert.equal(Math.round(result.userSummaries['user_yasmin']), -100);

  // Simplified debt should show Yasmin owes Amina 100
  assert.equal(result.simplifiedDebts.length, 1);
  assert.equal(result.simplifiedDebts[0].fromUserId, 'user_yasmin');
  assert.equal(result.simplifiedDebts[0].toUserId, 'user_amina');
  assert.equal(result.simplifiedDebts[0].amount, 100);
});

test('matchChores balances effort points and respects wishes', () => {
  const roommates = ['user_1', 'user_2'];
  const chores: Chore[] = [
    {
      id: 'c_cooking',
      householdId: 'h1',
      name: 'Cooking Dinner',
      frequency: 'daily',
      effortLevel: 'heavy',
      active: true,
      description: 'Cook dinner for the apartment',
      iconName: 'Utensils',
    },
    {
      id: 'c_dishes',
      householdId: 'h1',
      name: 'Dishwasher & Sink',
      frequency: 'daily',
      effortLevel: 'medium',
      active: true,
      description: 'Clean pots and unload dishwasher',
      iconName: 'Sparkles',
    },
    {
      id: 'c_trash',
      householdId: 'h1',
      name: 'Take Out Trash',
      frequency: 'weekly',
      effortLevel: 'light',
      active: true,
      description: 'Empty bins and replace bags',
      iconName: 'Trash2',
    },
  ];

  // user_1 wants cooking, user_2 avoids cooking but wants dishes
  const picks: DraftPick[] = [
    { userId: 'user_1', choreId: 'c_cooking', pickType: 'want' },
    { userId: 'user_2', choreId: 'c_cooking', pickType: 'avoid' },
    { userId: 'user_2', choreId: 'c_dishes', pickType: 'want' },
  ];

  const result = matchChores(chores, picks, roommates);

  assert.equal(result.assignments.length, 3);

  // user_1 wanted cooking -> should get it
  const cookingAssign = result.assignments.find(a => a.choreId === 'c_cooking');
  assert.equal(cookingAssign?.userId, 'user_1');

  // user_2 wanted dishes -> should get it
  const dishesAssign = result.assignments.find(a => a.choreId === 'c_dishes');
  assert.equal(dishesAssign?.userId, 'user_2');

  // user_1 now has 3 effort points, user_2 has 2. The trash (1 point) should go to user_2 to balance effort to 3 & 3!
  const trashAssign = result.assignments.find(a => a.choreId === 'c_trash');
  assert.equal(trashAssign?.userId, 'user_2');

  assert.equal(result.effortDistribution['user_1'], 3);
  assert.equal(result.effortDistribution['user_2'], 3);
});
