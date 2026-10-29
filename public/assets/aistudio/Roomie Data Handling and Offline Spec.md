# Roomie: Data Handling and Offline Spec

Companion to the Roomie Build Spec and Design and Branding doc · Draft v1 · October 23, 2026

This spec tells the coding agent how Roomie stores, loads, and syncs data so it stays fast on slow, expensive internet. It is used after the UI prototype is polished. The screens must not change much: all of this lives in the data layer that the prototype already isolates behind one service (for example `api.getExpenses()`).

## 1. Why This Matters

Typical connections for the first users are about 10 Mbps down and 1 Mbps up, and data is costly. Roomie must feel instant, work without signal, and never waste bandwidth.

**Goals**

1. Every screen opens instantly from data stored on the phone.
2. Core actions work offline and sync automatically when the connection returns.
3. Uploads (especially receipt photos) never block the user.
4. Transfers are small: only changes, compressed images, no polling.
5. Nothing is ever duplicated or lost, even after retries.

## 2. Principles

- **Local first.** Screens read from the local database, never directly from the network.
- **Optimistic.** An action shows its result immediately and syncs afterward.
- **Honest.** Anything not yet synced is visibly marked, and failures say what happens next.
- **Small.** Ask the server only for what changed since the last sync.
- **Safe.** Retrying an action can never create duplicates.

## 3. Approaches and Recommended Default

The coding agent should implement the recommended default first. The alternatives are listed so the choice can be revisited.

| Decision | Recommended default | Alternatives | Notes |
| --- | --- | --- | --- |
| Local storage | IndexedDB through a small wrapper such as Dexie | localStorage (too small and slow for this), a sync library with its own local DB | IndexedDB handles structured data and blobs |
| Sync method | Hand-built outbox plus "changes since cursor" pull | A sync library (for example PowerSync or RxDB) | Hand-built stays simple for a small app; consider a library if sync rules grow. Verify current Supabase support before adopting one |
| App caching | Service worker with Workbox: cache-first for the app shell, stale-while-revalidate for static assets | Hand-written service worker | Gives instant loads after the first visit |
| Server data fetching | Fetch only changed rows (updated\_at greater than last cursor) | Full refetch, polling | Saves the most data |
| Realtime | One realtime channel per active household for chat and activity | Polling | Reconnect automatically and fall back to a pull after reconnecting |
| Images | Compress on the phone, then upload in the background | Upload originals | Upload speed is the bottleneck |

The plan assumes Supabase as the backend (not yet confirmed). If Firebase is chosen instead, keep the same local-first design and swap the server calls.

## 4. Local Database

Stores, one per entity: households, memberships, expenses, expense\_shares, settlements, chores, draft\_rounds, chore\_assignments, chore\_logs, kudos, messages, meeting\_topics, agreements, notifications, plus two internal stores:

- **outbox:** actions waiting to be sent.
- **sync\_state:** the last sync cursor per household and per table.

Cached data is scoped by household. Only the households the user belongs to are stored.

## 5. Record Fields for Safe Syncing

Every synced table gets these fields in addition to its normal ones.

| Field | Purpose |
| --- | --- |
| id | A unique ID (UUID) created on the phone, so retries never duplicate |
| created\_at | When the action happened on the user's device |
| updated\_at | Set by the server on every change; used as the sync cursor |
| deleted\_at | Soft delete, so deletions sync to other phones |
| version | Increases on every edit; used to detect conflicts |
| sync\_status | Local only: synced, pending, failed |

## 6. The Outbox

1. The user acts (for example, adds an expense).
2. The app writes the record to the local database and adds an entry to the outbox, in one step.
3. The screen updates immediately with a small "waiting to sync" marker on the item.
4. A sync worker sends outbox entries in order whenever the app is online.
5. On success, the marker disappears. On a temporary failure, it retries with increasing delays. On a permanent failure (for example, permission denied), it shows the user what to do.
6. The server accepts each action by its ID and ignores one it already has, so retries are safe.

The sync worker also runs when the app opens, when the phone comes back online, and when the app returns to the foreground.

## 7. Pulling Changes

1. Ask the server for rows changed after the stored cursor, for the user's households, in small pages.
2. Merge them into the local database.
3. Update the cursor.

On first login, download only recent data (for example, the last 60 days of messages and expenses) and fetch older history on request.

## 8. Conflict Rules

Conflicts are rare in a household app, so keep the rules simple.

- **Balances** are always calculated from expenses and settlements, never stored as an editable number.
- **Two edits to the same expense:** the later server timestamp wins, and the other editor is notified.
- **Agree/dispute:** each person's response is its own record, so these never overwrite each other.
- **Chat messages:** append-only, ordered by server time.
- **Chore draft picks:** each person's picks are their own record. Only the reveal needs everyone's picks, so the reveal button needs a connection and says so when offline.
- **Deleted items:** deletions win over edits made offline, and the editor is told.

## 9. Receipt and Photo Pipeline

1. The user picks or takes a photo.
2. The app resizes it on the phone (about 1200 px on the long edge) and compresses it to JPEG or WebP.
3. It generates a small thumbnail (about 200 px).
4. Both are saved locally and shown immediately.
5. The upload runs in the background, one at a time, with retry. It resumes after a lost connection and never blocks the screen.
6. Lists load thumbnails. The full image downloads only when opened, and is then cached.
7. Optional setting: "Upload photos on wifi only."

## 10. Fast Loading

- Split the code by screen so the first load includes only what the first screen needs.
- Avoid heavy libraries. Prefer small ones, and check bundle size when adding any.
- Subset and self-host fonts, using only the weights the design needs.
- Keep animations light (CSS, small Lottie or Rive files). Load the reveal animation in advance after the first screen is ready.
- Show skeleton placeholders while local data loads.
- Never poll. Use the realtime channel and the sync worker.
- Keep requests batched and compressed.
- Use a server region close to Cyprus (a European region).

**Starting budgets (adjust after measuring)**

| Item | Target |
| --- | --- |
| First-screen JavaScript | Under about 200 KB compressed |
| App open after first visit | Under 1 second to usable content |
| Receipt photo | Under about 300 KB |
| List thumbnail | Under about 20 KB |
| Incremental sync | A few KB when nothing changed much |

## 11. What Works Offline

| Works offline | Needs a connection |
| --- | --- |
| Viewing all cached screens | Creating or joining a household |
| Adding expenses and receipts | Chore reveal |
| Agreeing or disputing | Admin approval of join requests |
| Marking chores done | Account deletion |
| Sending kudos | Sign in (first time) |
| Writing chat messages | Downloading older history |
| Editing own schedule |  |

When offline, show a small banner. When back online, show "Synced" briefly, with no heavy messages.

## 12. Security and Privacy on the Device

- Cached data belongs to the signed-in user. Clear all local data on sign out and after leaving a household.
- Receipts and photos are never stored in public locations.
- Server rules (row-level security) remain the real protection. Local data is a convenience copy, never trusted by the server.
- Keep auth tokens in a secure place appropriate to the platform, and refresh them quietly.

## 13. Settings and Visibility

- Sync status indicator: synced, syncing, offline, needs attention.
- A "Sync now" button in settings.
- "Photos on wifi only" and "Low data mode" (thumbnails only, no auto-downloads).
- A "Storage" screen showing cached size, with a clear-cache button.

## 14. Testing

- Use browser developer tools to throttle the network to the real speeds (about 10 Mbps down and 1 Mbps up) and to go fully offline.
- Scenarios: add an expense offline and reconnect; edit the same expense from two phones; kill the app during an upload; lose connection mid-sync; sign out with pending actions.
- Check that retries never duplicate records.
- Measure first load and app-open time against the budgets above.

## 15. Build Order for the Coding Agent

1. Confirm all screens talk only to the data service, with no direct fake data inside screens.
2. Add the local database and move the data service to read from it.
3. Add the service worker and app caching.
4. Add the outbox and optimistic updates, with sync markers on items.
5. Connect the real backend and the cursor-based pull.
6. Add realtime for chat and activity.
7. Add the photo pipeline.
8. Add the offline banner, sync indicator, and settings.
9. Run the test scenarios and tune against the budgets.

## 16. Acceptance Criteria

- With airplane mode on, the app opens and the user can add an expense, send a message, and mark a chore done.
- After reconnecting, everything syncs with no duplicates and no lost items.
- A receipt photo uploads in the background without blocking any screen.
- The app opens from cache in about a second on repeat visits.
- Signing out removes all local household data.

## 17. Open Decisions

- Backend: Supabase or Firebase
- Hand-built sync or a sync library
- How much history to download on first login
- Whether to wrap the PWA later with a native shell and how that affects storage
