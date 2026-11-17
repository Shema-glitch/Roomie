import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TenantTransitionApi } from './tenantTransition.api';
import { getInitialStore, AppStore } from './shared';

describe('TenantTransitionApi', () => {
  let store: AppStore;
  let api: TenantTransitionApi;

  beforeEach(() => {
    store = getInitialStore();
    api = new TenantTransitionApi({
      store,
      save: (s) => {
        if (s) store = s;
      },
      isDemoMode: () => true,
      dispatchRemoteMutation: () => {},
    });
  });

  describe('Move-Out Inspections & Deposit Settlement', () => {
    it('returns seeded move-out inspections for h_main', async () => {
      const inspections = await api.getMoveOutInspections('h_main');
      assert.ok(inspections.length >= 1);
      const livingRoom = inspections.find((i) => i.roomName === 'Living Room');
      assert.ok(livingRoom);
      assert.equal(livingRoom.depositPaidAmount, 300);
      assert.equal(livingRoom.depositRefundAmount, 300);
      assert.equal(livingRoom.status, 'pending_review');
    });

    it('adds a move-out inspection and auto-calculates deposit refund amount', async () => {
      const inspection = await api.addMoveOutInspection({
        householdId: 'h_main',
        userId: 'u_curr',
        moveInSnapshotId: 'snap_kitchen',
        roomName: 'Kitchen',
        conditionNote: 'Leaving room clean, all appliances degreased and oven wiped down. Refrigerator crisper crack remains unchanged from move-in baseline.',
        photoUrls: ['https://example.com/kitchen-out.jpg'],
        isDamageReported: true,
        damageDeductionAmount: 30,
        depositPaidAmount: 250,
      });

      assert.ok(inspection.id);
      assert.equal(inspection.roomName, 'Kitchen');
      assert.equal(inspection.depositPaidAmount, 250);
      assert.equal(inspection.damageDeductionAmount, 30);
      assert.equal(inspection.depositRefundAmount, 220); // 250 - 30
      assert.equal(inspection.status, 'pending_review');
      assert.deepEqual(inspection.confirmedByUserIds, ['u_curr']);

      const inspections = await api.getMoveOutInspections('h_main');
      assert.ok(inspections.some((i) => i.id === inspection.id));
    });

    it('blocks identity document references client-side for tenant privacy', async () => {
      await assert.rejects(
        () =>
          api.addMoveOutInspection({
            householdId: 'h_main',
            userId: 'u_curr',
            roomName: 'Bedroom 1',
            conditionNote: 'Here is my passport number U1234567 attached for deposit refund',
            photoUrls: [],
            depositPaidAmount: 300,
          }),
        /prohibited identity document references/
      );

      await assert.rejects(
        () =>
          api.addMoveOutInspection({
            householdId: 'h_main',
            userId: 'u_curr',
            roomName: 'National ID Card scan',
            conditionNote: 'Clean room condition',
            photoUrls: [],
            depositPaidAmount: 300,
          }),
        /prohibited identity document references/
      );
    });

    it('confirms move-out inspection and transitions to agreed when flatmates confirm', async () => {
      const inspections = await api.getMoveOutInspections('h_main');
      const target = inspections[0];

      // Amina confirms Lucas's inspection
      const confirmed = await api.confirmMoveOutInspection(target.id, 'u_amina');
      assert.equal(confirmed, true);

      const updated = (await api.getMoveOutInspections('h_main')).find((i) => i.id === target.id);
      assert.ok(updated);
      assert.ok(updated.confirmedByUserIds.includes('u_amina'));
      assert.equal(updated.status, 'agreed');
    });

    it('settles deposit refund and creates a linked settlement expense', async () => {
      const inspections = await api.getMoveOutInspections('h_main');
      const target = inspections[0];

      const initialExpenseCount = store.expenses.length;
      const res = await api.settleDepositRefund(target.id, 'u_curr');

      assert.equal(res.success, true);
      assert.ok(res.expenseId);

      const updated = (await api.getMoveOutInspections('h_main')).find((i) => i.id === target.id);
      assert.ok(updated);
      assert.equal(updated.status, 'settled');
      assert.equal(updated.settlementExpenseId, res.expenseId);

      // Verify created expense
      assert.equal(store.expenses.length, initialExpenseCount + 1);
      const refundExpense = store.expenses.find((e) => e.id === res.expenseId);
      assert.ok(refundExpense);
      assert.equal(refundExpense.amount, target.depositRefundAmount);
      assert.equal(refundExpense.paidBy, 'u_curr');
      assert.ok(refundExpense.title.includes('Deposit Refund'));
    });
  });

  describe('Portable Tenant Reputation Passport', () => {
    it('calculates reputation passport with streak, awards and harmony score', async () => {
      const passport = await api.getTenantPassport('u_curr');

      assert.equal(passport.userId, 'u_curr');
      assert.ok(passport.userName);
      assert.ok(passport.totalChoresCompleted >= 1);
      assert.ok(passport.choreStreakDays >= 0);
      assert.ok(passport.harmonyScore >= 50 && passport.harmonyScore <= 100);
      assert.ok(passport.topAwards.length >= 1);
      assert.ok(passport.tenancyCount >= 1);
      assert.ok(passport.verifiedSince);
    });

    it('works for flatmates and handles unawarded users gracefully', async () => {
      const passport = await api.getTenantPassport('u_lucas');

      assert.equal(passport.userId, 'u_lucas');
      assert.ok(passport.topAwards.includes('Reliable Flatmate') || passport.topAwards.length > 0);
      assert.ok(passport.harmonyScore >= 50);
    });

    it('returns real zero metrics for brand new users with no completed chores or streaks', async () => {
      store.users.push({
        id: 'u_fresh',
        name: 'Fresh Roomie',
        email: 'fresh@roomie.app',
        avatar: '',
        country: 'Cyprus',
        countryCode: 'CY',
        flag: '',
        isHome: true,
        streakDays: 0,
        points: 0,
        awayUntil: null,
      });
      const passport = await api.getTenantPassport('u_fresh');

      assert.equal(passport.totalChoresCompleted, 0);
      assert.equal(passport.choreStreakDays, 0);
      assert.equal(passport.tenancyCount, 0);
      assert.equal(passport.harmonyScore, 0);
    });
  });
});
