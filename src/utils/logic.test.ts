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

test('suggest_for acts as tie-break when effort is equal on non-heavy chores', () => {
  const roommates = ['user_1', 'user_2'];
  const chore: Chore = {
    id: 'c_sweep',
    householdId: 'h1',
    name: 'Sweeping',
    frequency: 'weekly',
    effortLevel: 'medium',
    active: true,
    description: 'Sweep hallway and kitchen',
    iconName: 'Sparkles',
  };

  // user_1 suggests user_2 for sweeping; neither marked want or avoid
  const picks: DraftPick[] = [
    { userId: 'user_1', choreId: 'c_sweep', pickType: 'suggest_for', targetUserId: 'user_2' },
  ];

  const result = matchChores([chore], picks, roommates);
  const sweepAssign = result.assignments.find((a) => a.choreId === 'c_sweep');
  // user_2 was suggested and efforts are equal -> user_2 receives the chore
  assert.equal(sweepAssign?.userId, 'user_2');
});

test('suggest_for NEVER overrides an avoid pick', () => {
  const roommates = ['user_1', 'user_2'];
  const chore: Chore = {
    id: 'c_sweep',
    householdId: 'h1',
    name: 'Sweeping',
    frequency: 'weekly',
    effortLevel: 'medium',
    active: true,
    description: 'Sweep hallway and kitchen',
    iconName: 'Sparkles',
  };

  // user_1 suggests user_2 for sweeping, BUT user_2 explicitly avoids sweeping
  const picks: DraftPick[] = [
    { userId: 'user_1', choreId: 'c_sweep', pickType: 'suggest_for', targetUserId: 'user_2' },
    { userId: 'user_2', choreId: 'c_sweep', pickType: 'avoid' },
  ];

  const result = matchChores([chore], picks, roommates);
  const sweepAssign = result.assignments.find((a) => a.choreId === 'c_sweep');
  // Avoid must strictly take precedence over suggestion
  assert.equal(sweepAssign?.userId, 'user_1');
});

test('suggest_for cannot be used to push heavy chores onto other roommates', () => {
  const roommates = ['user_1', 'user_2'];
  const chore: Chore = {
    id: 'c_deep_kitchen',
    householdId: 'h1',
    name: 'Deep Clean Kitchen',
    frequency: 'weekly',
    effortLevel: 'heavy',
    active: true,
    description: 'Scrub stove, oven, counters and fridge',
    iconName: 'Utensils',
  };

  // user_1 suggests user_2 for heavy chore; user_2 has not consented/wanted it
  const picks: DraftPick[] = [
    { userId: 'user_1', choreId: 'c_deep_kitchen', pickType: 'suggest_for', targetUserId: 'user_2' },
  ];

  const result = matchChores([chore], picks, roommates);
  const assign = result.assignments.find((a) => a.choreId === 'c_deep_kitchen');
  // Suggestion is ignored for heavy chores to prevent pushing heavy work onto others
  assert.equal(assign?.userId, 'user_1');
});

test('suggest_for cannot push chores onto roommates who already have higher effort', () => {
  const roommates = ['user_1', 'user_2'];
  const chores: Chore[] = [
    {
      id: 'c_mop',
      householdId: 'h1',
      name: 'Mopping',
      frequency: 'weekly',
      effortLevel: 'medium',
      active: true,
      description: 'Mop floor',
      iconName: 'Sparkles',
    },
    {
      id: 'c_trash',
      householdId: 'h1',
      name: 'Trash',
      frequency: 'weekly',
      effortLevel: 'light',
      active: true,
      description: 'Take out bins',
      iconName: 'Trash2',
    },
  ];

  // user_2 wants mopping (takes on 2 effort points)
  // user_1 suggests user_2 also take trash (light chore)
  const picks: DraftPick[] = [
    { userId: 'user_2', choreId: 'c_mop', pickType: 'want' },
    { userId: 'user_1', choreId: 'c_trash', pickType: 'suggest_for', targetUserId: 'user_2' },
  ];

  const result = matchChores(chores, picks, roommates);
  const trashAssign = result.assignments.find((a) => a.choreId === 'c_trash');
  // user_1 has 0 effort points and user_2 has 2; effort fairness overrides suggestion
  assert.equal(trashAssign?.userId, 'user_1');
});
