import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { ApiService, getDebugModuleForOutboxType, getInitialStore } from './index';
import { outbox, OutboxActionType } from '../outbox';
import { getSavedAccounts, upsertSavedAccount, removeSavedAccount } from '../../utils/savedAccounts';

const ALL_NEW_AND_REPAIRED_OUTBOX_TYPES: OutboxActionType[] = [
  'schedule_cultural_dinner',
  'toggle_dinner_rsvp',
  'update_dietary_preferences',
  'add_shopping_item',
  'toggle_shopping_item',
  'delete_shopping_item',
  'trigger_supermarket_ping',
  'update_apartment_info',
  'save_duty_schedule',
  'award_favor_tokens',
  'submit_feedback',
  'send_expense_reminder',
];

describe('Core Reliability & Persistence (Part 1)', () => {
  beforeEach(() => {
    outbox.clear();
  });

  it('routes all 12 new & repaired OutboxActionType values through domain telemetry', () => {
    for (const type of ALL_NEW_AND_REPAIRED_OUTBOX_TYPES) {
      const mod = getDebugModuleForOutboxType(type);
      assert.ok(mod.length > 0, `Expected debug module for ${type}`);
    }
    assert.equal(getDebugModuleForOutboxType('save_duty_schedule'), 'chores_draft');
    assert.equal(getDebugModuleForOutboxType('send_expense_reminder'), 'expenses');
    assert.equal(getDebugModuleForOutboxType('award_favor_tokens'), 'social');
    assert.equal(getDebugModuleForOutboxType('update_apartment_info'), 'auth');
  });

  it('validates feedback input and handles demo feedback submissions safely', async () => {
    const svc = new ApiService();
    svc.markDemoMode(true);

    const emptyRes = await svc.submitFeedback({
      category: 'problem',
      rating: null,
      message: '   ',
    });
    assert.equal(emptyRes.success, false);

    const okRes = await svc.submitFeedback({
      category: 'feature',
      rating: 5,
      message: 'Love the weekly chore draft!',
    });
    assert.equal(okRes.success, true);
    assert.equal(okRes.persistedRemote, false);
  });

  it('persists duty schedule mutations cleanly and updates active entries', async () => {
    const svc = new ApiService();
    svc.markDemoMode(true);
    const schedule = await svc.getDutySchedule('h_main');
    assert.equal(schedule.entries.length, 7);

    const monday = schedule.entries.find((e) => e.day === 'monday');
    const tuesday = schedule.entries.find((e) => e.day === 'tuesday');
    assert.ok(monday && tuesday);

    const swapped = await svc.swapDutyDays('monday', 'tuesday', 'h_main');
    assert.equal(
      swapped.entries.find((e) => e.day === 'monday')?.assignedUserId,
      tuesday.assignedUserId
    );

    const reassigned = await svc.reassignDutyDay('monday', 'u_amina', 'h_main');
    assert.equal(
      reassigned.entries.find((e) => e.day === 'monday')?.assignedUserId,
      'u_amina'
    );
  });

  it('creates roomie reminder notifications alongside chat activity when reminding roomies', async () => {
    const svc = new ApiService();
    svc.markDemoMode(true);
    const initialNotifCount = svc.store.notifications.length;

    await svc.remindRoomies('Please check the groceries split');
    assert.ok(svc.store.notifications.length > initialNotifCount);
    const latest = svc.store.notifications[0];
    assert.equal(latest.type, 'expense');
    assert.equal(latest.body, 'Please check the groceries split');
  });

  it('resets store cleanly on demo deleteAccount and clears real account session state', async () => {
    const svc = new ApiService();
    svc.markDemoMode(true);
    svc.store.currentUser.name = 'Modified Name';

    const demoRes = await svc.deleteAccount();
    assert.equal(demoRes.success, true);
    assert.equal(demoRes.mode, 'demo');
    assert.equal(svc.store.currentUser.name, getInitialStore().currentUser.name);

    // Simulate an active non-demo local account session
    const email = 'temp.delete.test@roomie.app';
    svc.store.householdSetupMode = 'configured';
    svc.store.localSessionActive = true;
    svc.store.currentUser = {
      ...svc.store.currentUser,
      id: 'local_del_1',
      email,
    };
    svc.store.localAccounts = {
      [email]: {
        id: 'local_del_1',
        name: 'Temp Delete User',
        email,
        passwordHash: 'hash',
        setupMode: 'configured',
        createdAt: new Date().toISOString(),
      },
    };
    upsertSavedAccount({
      userId: 'local_del_1',
      email,
      name: 'Temp Delete User',
      avatar: '',
      mode: 'local',
    });

    const accountRes = await svc.deleteAccount();
    assert.equal(accountRes.success, true);
    assert.equal(accountRes.mode, 'account');
    assert.equal(svc.store.localSessionActive, false);
    assert.equal(svc.store.localAccounts?.[email], undefined);
    assert.equal(
      getSavedAccounts().some((a) => a.email === email),
      false
    );
    removeSavedAccount(email);
  });
});
