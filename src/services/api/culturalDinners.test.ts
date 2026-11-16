import test from 'node:test';
import assert from 'node:assert/strict';
import { SocialApi } from './social.api';
import { getInitialStore, AppStore } from './shared';
import { DietaryTag } from '../../types';

function createMockSocialApi() {
  const store: AppStore = getInitialStore();
  const api = new SocialApi({
    store,
    save: (s) => {
      if (s) Object.assign(store, s);
    },
    isDemoMode: () => true,
    dispatchRemoteMutation: () => {},
  });
  return { api, store };
}

test('cultural dinners: scheduleCulturalDinner creates dinner and auto-rsvps host', async () => {
  const { api, store } = createMockSocialApi();
  const currentUserId = store.currentUser.id;

  const res = await api.scheduleCulturalDinner({
    dishTitle: 'Authentic Moroccan Tagine',
    cuisineTag: 'Moroccan',
    scheduledDate: '2026-11-25',
    dietaryTags: ['halal', 'dairy_free'],
    householdId: 'h_main',
  });

  assert.equal(res.success, true);
  assert.ok(res.dinner);
  assert.equal(res.dinner.dishTitle, 'Authentic Moroccan Tagine');
  assert.equal(res.dinner.cuisineTag, 'Moroccan');
  assert.deepEqual(res.dinner.dietaryTags, ['halal', 'dairy_free']);
  assert.deepEqual(res.dinner.rsvpUserIds, [currentUserId], 'Host should be automatically in RSVP list');

  const dinners = await api.getCulturalDinners('h_main');
  assert.ok(dinners.some((d) => d.dishTitle === 'Authentic Moroccan Tagine'));
});

test('cultural dinners: validates length caps and rejects empty titles', async () => {
  const { api } = createMockSocialApi();

  const emptyRes = await api.scheduleCulturalDinner({
    dishTitle: '   ',
    cuisineTag: 'Italian',
    scheduledDate: '2026-11-26',
  });
  assert.equal(emptyRes.success, false);
  assert.equal(emptyRes.error, 'Dish title cannot be empty.');

  const overlongTitle = 'A'.repeat(101);
  const overlongRes = await api.scheduleCulturalDinner({
    dishTitle: overlongTitle,
    cuisineTag: 'Italian',
    scheduledDate: '2026-11-26',
  });
  assert.equal(overlongRes.success, false);
  assert.equal(overlongRes.error, 'Dish title cannot exceed 100 characters.');

  const overlongCuisine = 'C'.repeat(41);
  const overlongCuisineRes = await api.scheduleCulturalDinner({
    dishTitle: 'Pizza',
    cuisineTag: overlongCuisine,
    scheduledDate: '2026-11-26',
  });
  assert.equal(overlongCuisineRes.success, false);
  assert.equal(overlongCuisineRes.error, 'Cuisine tag cannot exceed 40 characters.');
});

test('cultural dinners: toggleDinnerRsvp toggles attendance in and out', async () => {
  const { api } = createMockSocialApi();

  const scheduleRes = await api.scheduleCulturalDinner({
    dishTitle: 'Turkish Manti',
    cuisineTag: 'Turkish',
    scheduledDate: '2026-11-27',
  });
  const dinnerId = scheduleRes.dinner!.id;

  // Currently host is attending. Toggling should remove host.
  const rsvpOff = await api.toggleDinnerRsvp(dinnerId, 'h_main');
  assert.equal(rsvpOff.success, true);
  assert.equal(rsvpOff.isAttending, false);
  assert.equal(rsvpOff.rsvpUserIds.length, 0);

  // Toggling again should add host back.
  const rsvpOn = await api.toggleDinnerRsvp(dinnerId, 'h_main');
  assert.equal(rsvpOn.success, true);
  assert.equal(rsvpOn.isAttending, true);
  assert.equal(rsvpOn.rsvpUserIds.length, 1);
});

test('cultural dinners: updateUserDietaryPreferences updates user dietary profile', async () => {
  const { api, store } = createMockSocialApi();
  const newTags: DietaryTag[] = ['vegan', 'nut_free', 'gluten_free'];

  const updatedUser = await api.updateUserDietaryPreferences(newTags);
  assert.deepEqual(updatedUser.dietaryTags, newTags);
  assert.deepEqual(store.currentUser.dietaryTags, newTags);
});
