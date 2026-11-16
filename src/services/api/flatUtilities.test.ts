import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FlatUtilitiesApi } from './flatUtilities.api';
import { getInitialStore, AppStore } from './shared';

describe('FlatUtilitiesApi', () => {
  let store: AppStore;
  let api: FlatUtilitiesApi;

  beforeEach(() => {
    store = getInitialStore();
    api = new FlatUtilitiesApi({
      store,
      save: (s) => {
        if (s) store = s;
      },
      isDemoMode: () => true,
      dispatchRemoteMutation: () => {},
    });
  });

  describe('Recurring Rent & Bills', () => {
    it('returns seeded recurring bills for h_main', async () => {
      const bills = await api.getRecurringBills('h_main');
      assert.ok(bills.length >= 3);
      assert.ok(bills.some((b) => b.category === 'rent'));
      assert.ok(bills.some((b) => b.category === 'wifi'));
      assert.ok(bills.some((b) => b.category === 'utilities'));
    });

    it('adds a new recurring bill template with validation', async () => {
      const newBill = await api.addRecurringBill({
        householdId: 'h_main',
        title: 'Building Maintenance & Elevator Fee',
        category: 'other',
        amount: 350,
        dueDay: 10,
        paidByUserId: 'u_curr',
      });

      assert.ok(newBill.id);
      assert.equal(newBill.title, 'Building Maintenance & Elevator Fee');
      assert.equal(newBill.amount, 350);
      assert.equal(newBill.dueDay, 10);
      assert.equal(newBill.splitRule, 'equal');

      const bills = await api.getRecurringBills('h_main');
      assert.ok(bills.some((b) => b.id === newBill.id));
    });

    it('rejects invalid recurring bill inputs', async () => {
      await assert.rejects(
        () =>
          api.addRecurringBill({
            householdId: 'h_main',
            title: '',
            category: 'rent',
            amount: 1000,
            dueDay: 5,
            paidByUserId: 'u_curr',
          }),
        /Bill title is required/
      );

      await assert.rejects(
        () =>
          api.addRecurringBill({
            householdId: 'h_main',
            title: 'Valid Title',
            category: 'rent',
            amount: 0,
            dueDay: 5,
            paidByUserId: 'u_curr',
          }),
        /Bill amount must be greater than zero/
      );

      await assert.rejects(
        () =>
          api.addRecurringBill({
            householdId: 'h_main',
            title: 'Valid Title',
            category: 'rent',
            amount: 500,
            dueDay: 32,
            paidByUserId: 'u_curr',
          }),
        /Due day must be between 1 and 31/
      );
    });

    it('logs recurring bill into an active expense and updates cycle', async () => {
      const bills = await api.getRecurringBills('h_main');
      const wifiBill = bills.find((b) => b.category === 'wifi');
      assert.ok(wifiBill);

      const expense = await api.logRecurringBillExpense(wifiBill.id);
      assert.ok(expense);
      assert.equal(expense.amount, wifiBill.amount);
      assert.equal(expense.category, 'utilities');
      assert.ok(expense.shares.length > 0);

      // Verify the recurring bill's lastGeneratedCycle was updated
      const nowCycle = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      assert.equal(wifiBill.lastGeneratedCycle, nowCycle);

      // Verify the expense was added to store.expenses
      assert.ok(store.expenses.some((e) => e.id === expense.id));
    });

    it('updates and deletes recurring bills', async () => {
      const bills = await api.getRecurringBills('h_main');
      const bill = bills[0];

      const updated = await api.updateRecurringBill(bill.id, {
        amount: 13000,
        dueDay: 2,
      });
      assert.equal(updated?.amount, 13000);
      assert.equal(updated?.dueDay, 2);

      const deleted = await api.deleteRecurringBill(bill.id);
      assert.equal(deleted, true);

      const remaining = await api.getRecurringBills('h_main');
      assert.ok(!remaining.some((b) => b.id === bill.id));
    });
  });

  describe('Move-In Condition Snapshots', () => {
    it('returns seeded move-in snapshots', async () => {
      const snapshots = await api.getMoveInSnapshots('h_main');
      assert.ok(snapshots.length >= 2);
      assert.ok(snapshots.some((s) => s.roomName === 'Living Room'));
    });

    it('creates a new move-in snapshot with creator confirmation', async () => {
      const snap = await api.addMoveInSnapshot({
        householdId: 'h_main',
        roomName: 'Balcony & AC Units',
        conditionNote: 'AC condenser clean, railing paint intact with no rust.',
        photoUrls: ['https://example.com/balcony.jpg'],
        createdBy: 'u_curr',
      });

      assert.ok(snap.id);
      assert.equal(snap.roomName, 'Balcony & AC Units');
      assert.ok(snap.confirmedByUserIds.includes('u_curr'));

      const all = await api.getMoveInSnapshots('h_main');
      assert.ok(all.some((s) => s.id === snap.id));
    });

    it('blocks identity documents from condition notes and room names', async () => {
      await assert.rejects(
        () =>
          api.addMoveInSnapshot({
            householdId: 'h_main',
            roomName: 'Bedroom 1',
            conditionNote: 'Passport copy attached for lease registration: A12345678',
          }),
        /prohibited identity document references/
      );

      await assert.rejects(
        () =>
          api.addMoveInSnapshot({
            householdId: 'h_main',
            roomName: 'Driver License room',
            conditionNote: 'Normal desk condition',
          }),
        /prohibited identity document references/
      );
    });

    it('allows flatmates to co-confirm snapshots', async () => {
      const snapshots = await api.getMoveInSnapshots('h_main');
      const kitchenSnap = snapshots.find((s) => s.roomName === 'Kitchen');
      assert.ok(kitchenSnap);

      assert.equal(kitchenSnap.confirmedByUserIds.includes('u_lucas'), false);
      const confirmed = await api.confirmMoveInSnapshot(kitchenSnap.id, 'u_lucas');
      assert.ok(confirmed?.confirmedByUserIds.includes('u_lucas'));
    });
  });

  describe('Landlord & Maintenance Hub', () => {
    it('returns seeded landlord profile', async () => {
      const profile = await api.getLandlordProfile('h_main');
      assert.ok(profile);
      assert.equal(profile.landlordName, 'Kemal Özkan');
      assert.ok(profile.phoneOrWhatsapp.includes('+90'));
    });

    it('updates landlord profile with validation and privacy guards', async () => {
      const updated = await api.updateLandlordProfile({
        householdId: 'h_main',
        landlordName: 'Kemal Özkan & Son Properties',
        roleLabel: 'Building Management Office',
        phoneOrWhatsapp: '+90 533 888 9999',
        emergencyNote: 'Available 24/7 on WhatsApp for major water/electrical issues.',
        updatedBy: 'u_curr',
      });

      assert.equal(updated.landlordName, 'Kemal Özkan & Son Properties');
      assert.equal(updated.roleLabel, 'Building Management Office');
      assert.ok((updated.version || 0) > 1);

      await assert.rejects(
        () =>
          api.updateLandlordProfile({
            householdId: 'h_main',
            landlordName: 'Landlord with National ID 123456',
            roleLabel: 'Landlord',
            phoneOrWhatsapp: '+90 533 000 0000',
          }),
        /prohibited identity document references/
      );
    });

    it('handles maintenance issues reporting and status progression', async () => {
      const issues = await api.getMaintenanceIssues('h_main');
      assert.ok(issues.length >= 1);

      const newIssue = await api.reportMaintenanceIssue({
        householdId: 'h_main',
        title: 'Bathroom sink faucet dripping',
        description: 'Cold tap is slowly leaking around the valve base.',
        reportedBy: 'u_curr',
      });

      assert.ok(newIssue.id);
      assert.equal(newIssue.status, 'reported');

      const transitioned = await api.updateMaintenanceIssueStatus(newIssue.id, 'notified_landlord');
      assert.equal(transitioned?.status, 'notified_landlord');

      const fixed = await api.updateMaintenanceIssueStatus(newIssue.id, 'fixed');
      assert.equal(fixed?.status, 'fixed');
    });

    it('blocks identity documents from maintenance issue description', async () => {
      await assert.rejects(
        () =>
          api.reportMaintenanceIssue({
            householdId: 'h_main',
            title: 'Plumber visit',
            description: 'Plumber asked for my SSN or passport: 998811',
          }),
        /prohibited identity document references/
      );
    });
  });
});
