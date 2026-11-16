import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from './api';

function installMockLocalStorage() {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = mockStorage;
}

test('privacy alerts: approving a join request broadcasts privacy_alert notifications to all active flatmates', async () => {
  installMockLocalStorage();

  const store = (api as any).store;
  store.activeHouseholdId = 'h_test_1';
  store.households = [
    {
      id: 'h_test_1',
      name: 'Sunflower Flat',
      inviteCode: 'SUNFLWR1',
      invitesEnabled: true,
      currency: 'EUR',
      createdAt: new Date().toISOString(),
    },
  ];

  store.users = [
    { id: 'u_admin', name: 'Admin Alice', email: 'alice@flat.com', country: '', countryCode: 'XX', flag: '🌟', isHome: true, streakDays: 0, points: 0, awayUntil: null, avatar: '' },
    { id: 'u_roomie', name: 'Bob Roomie', email: 'bob@flat.com', country: '', countryCode: 'XX', flag: '🌟', isHome: true, streakDays: 0, points: 0, awayUntil: null, avatar: '' },
  ];

  store.currentUser = store.users[0];

  store.memberships = [
    { id: 'm_1', userId: 'u_admin', householdId: 'h_test_1', role: 'admin', status: 'active', joinedAt: new Date().toISOString() },
    { id: 'm_2', userId: 'u_roomie', householdId: 'h_test_1', role: 'member', status: 'active', joinedAt: new Date().toISOString() },
  ];

  store.notifications = [];
  store.joinRequests = [
    {
      id: 'jr_test_1',
      householdId: 'h_test_1',
      userName: 'Charlie Newbie',
      userEmail: 'charlie@newbie.com',
      userCountry: '',
      userFlag: '🌟',
      userAvatar: '',
      createdAt: new Date().toISOString(),
      votes: [],
      status: 'pending',
    },
  ];

  // Admin approves Charlie
  await api.decideJoinRequest('jr_test_1', true);

  // Verify Charlie is now in memberships
  const charlieMembership = store.memberships.find((m: any) => m.householdId === 'h_test_1' && m.status === 'active' && m.userId !== 'u_admin' && m.userId !== 'u_roomie');
  assert.ok(charlieMembership, 'Charlie membership should be active');

  // Verify privacy alerts were dispatched to existing flatmates (both admin Alice and roomie Bob)
  const privacyAlerts = store.notifications.filter((n: any) => n.type === 'privacy_alert');
  assert.equal(privacyAlerts.length, 2, 'Should have created privacy alerts for both existing flatmates');

  const bobAlert = privacyAlerts.find((n: any) => n.userId === 'u_roomie');
  assert.ok(bobAlert, 'Bob must receive privacy alert');
  assert.equal(bobAlert.title, '🛡️ Privacy Alert: New Flatmate Joined');
  assert.match(bobAlert.body, /Charlie Newbie has officially joined/);
  assert.deepEqual(bobAlert.linkTarget, { screen: 'apartment' });
});

test('privacy alerts: submitting join request alerts all active members to review and vote', async () => {
  installMockLocalStorage();

  const store = (api as any).store;
  store.activeHouseholdId = 'h_test_2';
  store.households = [
    {
      id: 'h_test_2',
      name: 'Orchid House',
      inviteCode: 'ORCHID99',
      invitesEnabled: true,
      currency: 'USD',
      createdAt: new Date().toISOString(),
    },
  ];

  store.users = [
    { id: 'u_host', name: 'Host Hannah', email: 'hannah@orchid.com', country: '', countryCode: 'XX', flag: '🌟', isHome: true, streakDays: 0, points: 0, awayUntil: null, avatar: '' },
    { id: 'u_applicant', name: 'David Applicant', email: 'david@applicant.com', country: '', countryCode: 'XX', flag: '🌟', isHome: true, streakDays: 0, points: 0, awayUntil: null, avatar: '' },
  ];

  store.memberships = [
    { id: 'm_host', userId: 'u_host', householdId: 'h_test_2', role: 'admin', status: 'active', joinedAt: new Date().toISOString() },
  ];

  store.notifications = [];
  store.joinRequests = [];

  // David submits invite code to join Orchid House
  store.currentUser = store.users[1];
  const res = await api.joinHousehold('ORCHID99');
  assert.equal(res.success, true);

  // Verify Host Hannah received a join request notification with voting link
  const reqNotif = store.notifications.find((n: any) => n.userId === 'u_host');
  assert.ok(reqNotif, 'Host Hannah must receive join request notification');
  assert.equal(reqNotif.type, 'household');
  assert.match(reqNotif.title, /Join Request: New Applicant/);
  assert.match(reqNotif.body, /David Applicant wants to join/);
});

test('privacy alerts (WhatsApp style): admin removing a member posts chat announcement and alerts all mates', async () => {
  installMockLocalStorage();

  const store = (api as any).store;
  store.activeHouseholdId = 'h_test_3';
  store.households = [
    {
      id: 'h_test_3',
      name: 'Maple House',
      inviteCode: 'MAPLE123',
      invitesEnabled: true,
      currency: 'GBP',
      createdAt: new Date().toISOString(),
    },
  ];

  store.users = [
    { id: 'u_admin3', name: 'Admin Adam', email: 'adam@maple.com', country: '', countryCode: 'XX', flag: '🌟', isHome: true, streakDays: 0, points: 0, awayUntil: null, avatar: '' },
    { id: 'u_mate', name: 'Emma Mate', email: 'emma@maple.com', country: '', countryCode: 'XX', flag: '🌟', isHome: true, streakDays: 0, points: 0, awayUntil: null, avatar: '' },
    { id: 'u_bad', name: 'Bad Guy', email: 'bad@maple.com', country: '', countryCode: 'XX', flag: '🌟', isHome: true, streakDays: 0, points: 0, awayUntil: null, avatar: '' },
  ];

  store.currentUser = store.users[0]; // Admin Adam

  store.memberships = [
    { id: 'm_a3', userId: 'u_admin3', householdId: 'h_test_3', role: 'admin', status: 'active', joinedAt: new Date().toISOString() },
    { id: 'm_e3', userId: 'u_mate', householdId: 'h_test_3', role: 'member', status: 'active', joinedAt: new Date().toISOString() },
    { id: 'm_b3', userId: 'u_bad', householdId: 'h_test_3', role: 'member', status: 'active', joinedAt: new Date().toISOString() },
  ];

  store.notifications = [];
  store.chatMessages = [];

  // Admin Adam removes Bad Guy
  const res = await api.removeHouseholdMember('h_test_3', 'u_bad');
  assert.equal(res.success, true);

  // Check Bad Guy's status was changed to 'removed'
  const badMembership = store.memberships.find((m: any) => m.userId === 'u_bad');
  assert.equal(badMembership?.status, 'removed');

  // Verify WhatsApp-style announcement in flat chat
  const chatMsgs = store.messages['h_test_3'] || [];
  const removeChat = chatMsgs.find((c: any) => c.body.includes('removed Bad Guy'));
  assert.ok(removeChat, 'Must post WhatsApp-style chat announcement that admin removed the member');

  // Verify Emma Mate received notification
  const emmaAlert = store.notifications.find((n: any) => n.userId === 'u_mate');
  assert.ok(emmaAlert, 'Emma Mate must receive notification about the removal');
  assert.equal(emmaAlert.title, '🛡️ Member Removed from Flat');
  assert.match(emmaAlert.body, /Admin Adam removed Bad Guy/);

  // Verify removed user was notified that access was revoked
  const badAlert = store.notifications.find((n: any) => n.userId === 'u_bad');
  assert.ok(badAlert, 'Removed user must be notified of access revocation');
  assert.equal(badAlert.title, '🛡️ Apartment Access Revoked');
});

test('privacy alerts (WhatsApp style): member leaving flat posts chat announcement and alerts remaining flatmates', async () => {
  installMockLocalStorage();

  const store = (api as any).store;
  store.activeHouseholdId = 'h_test_4';
  store.households = [
    {
      id: 'h_test_4',
      name: 'Cedar Court',
      inviteCode: 'CEDAR456',
      invitesEnabled: true,
      currency: 'EUR',
      createdAt: new Date().toISOString(),
    },
  ];

  store.users = [
    { id: 'u_host4', name: 'Host Holly', email: 'holly@cedar.com', country: '', countryCode: 'XX', flag: '🌟', isHome: true, streakDays: 0, points: 0, awayUntil: null, avatar: '' },
    { id: 'u_leaver', name: 'Leo Leaver', email: 'leo@cedar.com', country: '', countryCode: 'XX', flag: '🌟', isHome: true, streakDays: 0, points: 0, awayUntil: null, avatar: '' },
  ];

  store.currentUser = store.users[1]; // Leo Leaver

  store.memberships = [
    { id: 'm_h4', userId: 'u_host4', householdId: 'h_test_4', role: 'admin', status: 'active', joinedAt: new Date().toISOString() },
    { id: 'm_l4', userId: 'u_leaver', householdId: 'h_test_4', role: 'member', status: 'active', joinedAt: new Date().toISOString() },
  ];

  store.notifications = [];
  store.chatMessages = [];

  // Leo leaves
  const res = await api.leaveHousehold('h_test_4');
  assert.equal(res.success, true);

  // Verify WhatsApp-style announcement in flat chat
  const chatMsgs = store.messages['h_test_4'] || [];
  const leaveChat = chatMsgs.find((c: any) => c.body.includes('Leo Leaver left the apartment'));
  assert.ok(leaveChat, 'Must post WhatsApp-style chat announcement that member left');

  // Verify Host Holly received leave notification
  const hollyAlert = store.notifications.find((n: any) => n.userId === 'u_host4');
  assert.ok(hollyAlert, 'Host Holly must receive notification of member departure');
  assert.equal(hollyAlert.title, '👋 Member Left the Flat');
  assert.match(hollyAlert.body, /Leo Leaver has left/);
});
