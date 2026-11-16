import test from 'node:test';
import assert from 'node:assert/strict';
import { ShoppingApi } from './shopping.api';
import { getInitialStore, AppStore } from './shared';
import { containsIdentityDocument } from '../../features/members/components/ApartmentInfoCard';

function createMockShoppingApi() {
  const store: AppStore = getInitialStore();
  const api = new ShoppingApi({
    store,
    save: (s) => {
      if (s) Object.assign(store, s);
    },
    isDemoMode: () => true,
    dispatchRemoteMutation: () => {},
  });
  return { api, store };
}

test('shopping: addShoppingItem adds item to store and validates length caps', async () => {
  const { api, store } = createMockShoppingApi();
  const householdId = store.activeHouseholdId;

  // Rejects empty title
  const emptyRes = await api.addShoppingItem({
    title: '   ',
    householdId,
  });
  assert.equal(emptyRes.success, false);
  assert.equal(emptyRes.error, 'Item title cannot be empty.');

  // Rejects overlong title (>80 chars)
  const overlongRes = await api.addShoppingItem({
    title: 'A'.repeat(81),
    householdId,
  });
  assert.equal(overlongRes.success, false);
  assert.ok(overlongRes.error?.includes('80 characters'));

  // Successfully adds valid item
  const validRes = await api.addShoppingItem({
    title: 'Oat Milk Barista Edition',
    category: 'groceries',
    quantityLabel: '2 cartons',
    isLow: true,
    householdId,
  });
  assert.equal(validRes.success, true);
  assert.ok(validRes.item);
  assert.equal(validRes.item.title, 'Oat Milk Barista Edition');
  assert.equal(validRes.item.category, 'groceries');
  assert.equal(validRes.item.quantityLabel, '2 cartons');
  assert.equal(validRes.item.isLow, true);
  assert.equal(validRes.item.status, 'needed');
  assert.equal(validRes.item.addedBy, store.currentUser.id);

  const items = await api.getShoppingItems(householdId);
  assert.ok(items.some((i) => i.id === validRes.item?.id));
});

test('shopping: toggleShoppingItemStatus transitions between needed, in_cart, and bought', async () => {
  const { api, store } = createMockShoppingApi();
  const householdId = store.activeHouseholdId;

  const added = await api.addShoppingItem({
    title: 'Dish Soap',
    category: 'cleaning',
    householdId,
  });
  assert.ok(added.item);
  const itemId = added.item.id;

  // Toggle to in_cart
  const inCartRes = await api.toggleShoppingItemStatus(itemId, 'in_cart', householdId);
  assert.equal(inCartRes.success, true);
  assert.equal(inCartRes.item?.status, 'in_cart');
  assert.equal(inCartRes.item?.claimedBy, store.currentUser.id);

  // Toggle back to needed
  const neededRes = await api.toggleShoppingItemStatus(itemId, 'needed', householdId);
  assert.equal(neededRes.success, true);
  assert.equal(neededRes.item?.status, 'needed');
  assert.equal(neededRes.item?.claimedBy, null);
});

test('shopping: convertCartToExpense marks items as bought in bulk', async () => {
  const { api, store } = createMockShoppingApi();
  const householdId = store.activeHouseholdId;

  const item1 = await api.addShoppingItem({ title: 'Bread', householdId });
  const item2 = await api.addShoppingItem({ title: 'Eggs', householdId });

  assert.ok(item1.item && item2.item);

  const convertRes = await api.convertCartToExpense([item1.item.id, item2.item.id], householdId);
  assert.equal(convertRes.success, true);

  const items = await api.getShoppingItems(householdId);
  const updated1 = items.find((i) => i.id === item1.item?.id);
  const updated2 = items.find((i) => i.id === item2.item?.id);
  assert.equal(updated1?.status, 'bought');
  assert.equal(updated2?.status, 'bought');
});

test('shopping: deleteShoppingItem removes item from household list', async () => {
  const { api, store } = createMockShoppingApi();
  const householdId = store.activeHouseholdId;

  const added = await api.addShoppingItem({
    title: 'Sponges',
    householdId,
  });
  assert.ok(added.item);

  const deleteRes = await api.deleteShoppingItem(added.item.id, householdId);
  assert.equal(deleteRes.success, true);

  const items = await api.getShoppingItems(householdId);
  assert.ok(!items.some((i) => i.id === added.item?.id));
});

test('shopping: triggerSupermarketPing broadcasts chat activity and flatmate notifications', async () => {
  const { api, store } = createMockShoppingApi();
  const householdId = store.activeHouseholdId;

  const pingRes = await api.triggerSupermarketPing(householdId);
  assert.equal(pingRes.success, true);
  assert.ok(pingRes.messageId);

  // Chat activity message posted
  const messages = store.messages[householdId] || [];
  const activityMsg = messages.find((m) => m.id === pingRes.messageId);
  assert.ok(activityMsg);
  assert.equal(activityMsg.type, 'activity');
  assert.ok(activityMsg.body.includes('heading to the supermarket'));

  // In-app notifications sent to other flatmates
  const notifs = store.notifications.filter((n) => n.title.includes('Supermarket Run'));
  assert.ok(notifs.length > 0);
  assert.ok(notifs.every((n) => n.userId !== store.currentUser.id));
});

test('apartment info card: rejects identity documents and updates flat utilities', async () => {
  const { api, store } = createMockShoppingApi();
  const householdId = store.activeHouseholdId;

  // Identity document prohibition check
  const badRes = await api.updateHouseholdInfoCard({
    householdId,
    emergencyNote: 'Passport number: 12345678 in top drawer',
  });
  assert.equal(badRes.success, false);
  assert.ok(badRes.error?.includes('strictly prohibited'));

  // Valid update
  const goodRes = await api.updateHouseholdInfoCard({
    householdId,
    wifiSsid: 'RoomieFlat_Fast',
    wifiPassword: 'SecretPassword99!',
    trashSchedule: 'Mondays & Thursdays 09:00',
    deliveryAddress: 'Main St 10, Apt 3',
    emergencyNote: 'Main water valve behind bathroom cabinet',
  });
  assert.equal(goodRes.success, true);
  assert.ok(goodRes.card);
  assert.equal(goodRes.card.wifiSsid, 'RoomieFlat_Fast');
  assert.equal(goodRes.card.wifiPassword, 'SecretPassword99!');
  assert.equal(goodRes.card.trashSchedule, 'Mondays & Thursdays 09:00');

  // Verify retrieval
  const card = await api.getHouseholdInfoCard(householdId);
  assert.ok(card);
  assert.equal(card.wifiSsid, 'RoomieFlat_Fast');
});

test('apartment info card: containsIdentityDocument detects sensitive document patterns client-side', () => {
  // Positive detections (prohibited patterns matching Postgres check constraint)
  assert.equal(containsIdentityDocument('My passport number is U1234567'), true);
  assert.equal(containsIdentityDocument('National ID: 99482710'), true);
  assert.equal(containsIdentityDocument('national_id 12345'), true);
  assert.equal(containsIdentityDocument('Student visa num: TRNC-2026'), true);
  assert.equal(containsIdentityDocument('SSN 000-12-3456'), true);
  assert.equal(containsIdentityDocument('Social security card in desk'), true);

  // Negative detections (safe standard apartment notes & addresses)
  assert.equal(containsIdentityDocument('Bedreddin Demirel Cad. No 44, Daire 4B'), false);
  assert.equal(containsIdentityDocument('Tuesdays & Fridays 08:00 at front gate'), false);
  assert.equal(containsIdentityDocument('Main water shutoff valve behind kitchen sink'), false);
  assert.equal(containsIdentityDocument('Superintendent Mehmet: +90 533 888 1234'), false);
});
