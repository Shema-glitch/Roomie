# Roomie — Project State & Gap Analysis

> **Notice for future sessions:** Read this document first before inspecting the codebase. Update this file at the conclusion of every development iteration or feature pass.

---

## 1. Project Overview & Specifications Baseline

- **App Name**: Roomie
- **Target Audience**: International university students sharing apartments (starting in Northern Cyprus / TRNC, with multi-currency TRY/USD/EUR and multicultural accommodation).
- **Core Value**: Radical fairness, warm tone, peer-to-peer harmony, and zero power asymmetry.
- **Reference Specifications**:
  - `Roomie Build Spec (v1)`
  - `Roomie Design and Branding Doc (v1)`
  - `Data and Offline Spec`
  - `Roomie Roadmap, Features and How It Works (docs/ROADMAP.md)`

---

## 2. Module-by-Module Status

### 2.1 Accounts, Households & Governance (Spec Section 3 & 4)
- **Status: Mostly Done / Partial**
- **Done**:
  - Multi-household switching architecture (`HouseholdSwitcherModal.tsx`).
  - Household creation with currency choices (`TRY`, `USD`, `EUR`) and invite codes (`CreateHouseholdFlowModal.tsx`).
  - Invite QR code generation & display (`ShowQRModal.tsx`).
  - Join request flow: requests require member votes (`OK` / `Not sure`) and admin final approval (`JoinRequestReviewModal.tsx`).
  - Strict isolation: pending join requests do **not** enter the member roster, presence list, or expense split calculations until explicitly approved.
  - Admin handover flow and leave household checks.
- **Partial**:
  - 30-day inactivity automatic admin handover logic (not scheduled/automated in background).
  - Leaving household confirms balance clearance, but archive/anonymization of past data is simulated in-memory only.
- **Missing**:
  - Real Google / OAuth sign-in integration (currently simulated via quick login/email entry).

---

### 2.2 Shared Expenses, Splits & Settlements (Spec Section 5)
- **Status: Done**
- **Done**:
  - Add expense with photo receipt attachment, categories (`groceries`, `household`, `utilities`, `rent`, `other`), and split modes (`AddExpenseFlowModal.tsx`).
  - Agreement workflow: roommates must actively **Agree** or **Dispute** (with mandatory reason).
  - Categorization strictly follows user perspective:
    - `"Needs your agreement"` **never** shows expenses paid by the current user.
    - Expenses paid by the user show under `"Waiting for roomies"`.
  - Balances & Debt Simplification: [`calculateBalances`](file:///Users/herbertniwe/Downloads/Roomie-main/src/utils/balances.ts) counts **only** `agreed` expenses and `confirmed` settlements. Non-agreed and disputed expenses do not alter debts.
  - Action button dynamics:
    - When owed money (`myNet > 0.05`), the primary buttons are `"Remind"` and `"Confirm payment"`.
    - `"Settle up"` is exclusively displayed when the user owes money (`myNet < -0.05`).
  - Two-step settlement verification (`marked_paid` by payer, followed by `confirmed` by receiver).
  - Visual category spending analytics chart via lightweight zero-dependency custom SVG donut chart (`SpendingBreakdownChart.tsx`). Recharts removed.
- **Partial**:
  - Personal expense tracking (private log) data structure exists in domain types, but lacks a dedicated personal-only UI view separate from household expenses.
- **Done**:
  - Client-side image compression pipeline (`src/utils/photoPipeline.ts`) auto-compresses receipts and chore proof to web-ready JPEG under 150-300 KB before uploading to Supabase Storage.

---

### 2.3 Chores & The Secret Draft (Spec Section 6)
- **Status: Done**
- **Done**:
  - Default chore list with frequencies (`daily`, `weekly`) and effort weighting (`light` = 1, `medium` = 2, `heavy` = 3).
  - Secret Draft Screen (`SecretDraftScreen.tsx`): private selection of `want`, `avoid`, and `suggest_for` (suggest for another roommate).
  - **Draft Matching Algorithm** ([`matching.ts`](file:///Users/herbertniwe/Downloads/Roomie-main/src/utils/matching.ts)):
    - Balances effort points evenly across roommates.
    - Honors `want` picks.
    - Strictly honors `avoid` picks.
    - **`suggest_for` picks**: integrated as a small tie-breaker only when candidate effort is equal. Never overrides `avoid` picks, and cannot be used to push `heavy` chores onto other roommates.
  - **Single Chore State**: `getChoreDraftState()` in [`stateTable.ts`](file:///Users/herbertniwe/Downloads/Roomie-main/src/utils/stateTable.ts) is the single source of truth across all components (`HomeScreen`, `NotificationsModal`, `ChatScreen`, and chore banner). Notifications and activity messages are generated deterministically from state transitions (`draft_open`, `waiting_others`, `reveal_ready`, `reveal_done`).
  - Chore Reveal Ceremony (`ChoreRevealScreen.tsx`): animated step-by-step presentation of assigned chores with confetti and sound effects.
  - Chore swap workflow between roommates (`ChoreSwapModal.tsx`).
  - "I'm away" mode to pause chores for exams/travel (`AwayModeModal.tsx`).
  - Equal streak display without numbered leaderboards; top streak marked with a `"Streak star"` chip.

---

### 2.4 Chore Completion, Proof, Kudos & Streaks (Spec Section 8)
- **Status: Done**
- **Done**:
  - "Done" modal with completion note and photo upload proof (`DoneFlowModal.tsx`).
  - Kudos exchange (`thanks`, `great_job`, `needs_look` with notes).
  - Streak tracking: consecutive on-time completion counter, gamified mascot celebration.
  - Respects quiet feedback: `needs_look` constructive feedback kept discreet.

---

### 2.5 Apartment Screen, Meetings & Rules (Spec Section 9)
- **Status: Done**
- **Done**:
  - All house governance consolidated into [`ApartmentScreen.tsx`](file:///Users/herbertniwe/Downloads/Roomie-main/src/features/members/ApartmentScreen.tsx).
  - Meeting topic proposals, quiet comments, and voting (`agree`, `disagree`, `neutral`).
  - **Voting UI equality**: Agree and Disagree buttons share identical neutral styling, and vote counts remain hidden until the user casts their vote.
  - House Agreements / Flat rules library.
  - Deleted legacy orphan components `MeetingsScreen.tsx` and `MembersScreen.tsx`.

---

### 2.6 Feed, Presence & Mascot (Design & Branding Doc)
- **Status: Done**
- **Done**:
  - Home feed with quick actions, chore draft state card, today's due chores, balance summary, and recent activity.
  - Interactive companion mascot (`MascotView.tsx`) with expressive animated states (`idle`, `cheering`, `celebrating`, `sleepy`, `thinking`, `calm`).
  - Manual "Who's Home" presence toggling.
  - Design tokens matching brand palette (Warm Coral `#FF6B4A`, Soft Teal `#19B5A5`, Sunny Amber `#FFC93C`, Deep Ink `#1F2430`, Light Clay surface `#F7F8FB`).

---

### 2.7 Activity Messages & In-App Chat (Spec Section 7)
- **Status: Done**
- **Done**:
  - Household group chat thread with emoji reactions.
  - Pinned single-source chore draft banner pill inside chat.
  - Automated activity messages emitted on events (chore completion, expense logged, settlement confirmed, draft state transitions).
  - Interactive activity message cards linking directly to relevant domain modals/tabs.

---

### 2.8 Notifications & Offline Handling (Data & Offline Spec)
- **Status: Mostly Done**
- **Done**:
  - In-app notification center sorted strictly **newest first** ([`api.ts`](file:///Users/herbertniwe/Downloads/Roomie-main/src/services/api.ts) & [`NotificationsModal.tsx`](file:///Users/herbertniwe/Downloads/Roomie-main/src/features/notifications/NotificationsModal.tsx)).
  - Single-source chore draft alert banner pinned inside NotificationsModal.
  - Offline banner and manual synchronization status indicator (`OfflineBanner.tsx`, `SyncStatusPanel.tsx`).
  - Audio synthesizer with zero external assets (`sound.ts`), user toggleable.
  - Accessibility: `reducedMotion` toggle and full RTL layout support for Arabic (`ar`).
- **Done**:
  - Service worker background push listener & notification click focus (`public/sw.js`) and PWA installation prompt (`window.deferredPrompt`).

---

## 3. Specific Audit Findings (11-Point Verification)

| Item | Status | File Path & Details |
|---|---|---|
| **1. Pending join requests isolated** | **Fixed** | [`src/services/api.ts:809-816`](file:///Users/herbertniwe/Downloads/Roomie-main/src/services/api.ts#L809-L816). Pending requests remain in `joinRequests` with `status: 'pending'` and are excluded from `getHouseholdMembers` until admin approves. |
| **2. "Needs your agreement" excludes self-paid expenses** | **Fixed** | [`src/features/expenses/ExpensesScreen.tsx:140-155`](file:///Users/herbertniwe/Downloads/Roomie-main/src/features/expenses/ExpensesScreen.tsx#L140-L155) & [`src/utils/stateTable.ts:83-92`](file:///Users/herbertniwe/Downloads/Roomie-main/src/utils/stateTable.ts#L83-L92). Self-paid expenses strictly route to `"Waiting for roomies"`. |
| **3. Balances count only agreed & confirmed** | **Fixed** | [`src/utils/balances.ts:54-88`](file:///Users/herbertniwe/Downloads/Roomie-main/src/utils/balances.ts#L54-L88). Evaluates `exp.status === 'agreed'` and `set.status === 'confirmed'` exclusively. |
| **4. Owed money actions ("Remind" / "Confirm payment")** | **Fixed** | [`src/features/expenses/ExpensesScreen.tsx:454-482`](file:///Users/herbertniwe/Downloads/Roomie-main/src/features/expenses/ExpensesScreen.tsx#L454-L482) & [`src/features/feed/HomeScreen.tsx:306-324`](file:///Users/herbertniwe/Downloads/Roomie-main/src/features/feed/HomeScreen.tsx#L306-L324). Shows "Remind" and "Confirm payment"; "Settle up" is only shown when the user owes money. |
| **5. Unified chore draft state across components** | **Fixed** | [`src/utils/stateTable.ts`](file:///Users/herbertniwe/Downloads/Roomie-main/src/utils/stateTable.ts) (`getChoreDraftState` & `getChoreStateEvent`). Consumed across `HomeScreen.tsx`, `NotificationsModal.tsx`, `ChatScreen.tsx`, and `ChoresScreen.tsx`. Events and notifications generated from state transitions. Verified by unit tests. |
| **6. No numbered leaderboard; equal cards with "Streak star"** | **Fixed** | [`src/features/chores/ChoresScreen.tsx:493-555`](file:///Users/herbertniwe/Downloads/Roomie-main/src/features/chores/ChoresScreen.tsx#L493-L555). Cards are unnumbered; highest streak gets a "Streak star" badge. |
| **7. Meeting Agree/Disagree styled the same, counts hidden until vote** | **Fixed** | [`src/features/members/ApartmentScreen.tsx:445-474`](file:///Users/herbertniwe/Downloads/Roomie-main/src/features/members/ApartmentScreen.tsx#L445-L474). Neutral identical buttons; counts render conditionally via `${myVote ? ... : ''}`. |
| **8. Notifications sorted newest first** | **Fixed** | [`src/services/api.ts:1374`](file:///Users/herbertniwe/Downloads/Roomie-main/src/services/api.ts#L1374) & [`src/features/notifications/NotificationsModal.tsx:37`](file:///Users/herbertniwe/Downloads/Roomie-main/src/features/notifications/NotificationsModal.tsx#L37). Explicit date descending sort. |
| **9. Draft supports "suggest for others"** | **Fixed** | [`src/utils/matching.ts:37-90`](file:///Users/herbertniwe/Downloads/Roomie-main/src/utils/matching.ts#L37-L90). Integrated as a tie-breaker when effort is equal. Never overrides `avoid` picks and cannot push `heavy` chores onto others. Verified by unit tests. |
| **10. MeetingsScreen status** | **Deleted** | Orphan files `MeetingsScreen.tsx` and `MembersScreen.tsx` deleted. All functionality lives in `ApartmentScreen.tsx`. |
| **11. Production Bundle Size & Optimization** | **Optimized** | Initial first-screen JavaScript payload reduced to **~99 kB gzip** (Main shell: 90.77 kB gzip + HomeScreen: 4.19 kB gzip + shared components ~4 kB gzip). Recharts replaced with custom SVG donut chart (uninstalled). Motion dependency uninstalled. Lazy loading via `React.lazy` and `Suspense` skeletons applied to all screens and modals. |

---

## 4. Test Suite Summary

- Total unit tests: **28 / 28 passing** (`npm test`).
  - 2 outbox queue idempotency, telemetry, and retry tests (`src/services/outbox.test.ts`).
  - 3 per-module debug logger, redaction, and latency instrumentation tests (`src/utils/debugLog.test.ts`).
  - 4 auth validation & hashing tests (`src/utils/authValidation.test.ts`).
  - 1 saved quick-login token storage test (`src/utils/savedAccounts.test.ts`).
  - 4 invite link / deep-link tests (`src/utils/inviteLink.test.ts`).
  - 1 navigation stack LIFO test (`src/utils/navigationStack.test.ts`).
  - 4 balance and debt simplification tests (`src/utils/balances.test.ts`, `src/logic.test.ts`).
  - 5 chore draft state transition tests (`src/utils/choreDraft.test.ts`).
  - 4 chore draft matching and `suggest_for` constraint tests (`src/logic.test.ts`).

---

## 5. Live Supabase Backend & Realtime Integration (Phase 1 — Complete)

- **Supabase Connected**: Live project `Roomie` (`ebiyvhodxrliiwdzonzu`, `https://ebiyvhodxrliiwdzonzu.supabase.co`) configured in `.env.local` (gitignored).
- **Database Schema & RPCs**: All core & Phase 1–3 tables deployed to remote PostgreSQL with RLS enabled (`is_household_member` helper + atomic `join_household_by_code`, `lookup_household_by_invite`, `approve_join_request`, `leave_household_self` RPCs with `REVOKE ... FROM PUBLIC, anon`).
- **Storage Buckets & Policies**: `receipts`, `chore-proof`, `snapshots` (private, household-folder/owner RLS) and `avatars` (public read, owner manage) deployed with 8 verified `storage.objects` policies.
- **Realtime Publication**: `supabase_realtime` publication active across live household tables with channel health telemetry.
- **Full Bi-Directional Phase 1 Sync + Offline Outbox**:
  - **Expenses & Settlements**: `expenses` + `expense_shares` (`addExpense`, `respondToExpense`, `editExpenseSplit`, `cancelExpense`) and `settlements` (`markSettlementPaid`, `confirmSettlement`) sync via deterministic UUIDs and idempotent `outbox.ts` replay.
  - **Secret Chore Draft & Rituals**: `draft_rounds`, `draft_picks`, `chore_assignments`, and `chore_logs` (`openNewDraftRound`, `submitDraftPicks`, `updateAssignments`, `markDraftRevealed`, `completeChore`, `giveKudos`, `swapChore`) sync end-to-end across devices.
  - **Governance, Chat, Notifications & Membership**: `meeting_topics`, `house_agreements`, `chat_messages` (including emoji `reactions` and live activity entries), `notifications` (RLS owner-scoped reads/read-marks), `handoverAdmin`, and `leaveHousehold` (`leave_household_self` RPC) all persist to Supabase.
- **Saved Quick Logins & Auth UX**: Instagram/Facebook-style multi-account quick sign-in cards (`src/utils/savedAccounts.ts`) using custom storage key `roomie_sb_auth_token` + clear inline diagnostics for invalid credentials, unconfirmed email, and auth email rate limits.
- **QR Invite System + Cross-Browser Scanner Fallback**: Real `qrcode` web/deep-link invites (`src/utils/inviteLink.ts`) + native `BarcodeDetector` with lazy-loaded `jsqr` (`47.51 kB` gzip async chunk) camera fallback in `JoinHouseholdFlowModal.tsx`.
- **Per-Module Debug Layer & Inspector UI**: Structured secret-redacting telemetry (`src/utils/debugLog.ts`) across all 11 modules (`auth`, `expenses`, `settlements`, `chores_draft`, `governance`, `chat`, `notifications`, `qr_scanner`, `storage`, `outbox`, `realtime`), exposed via lazy-loaded `DebugInspectorModal.tsx` (`2.68 kB` gzip) from `SyncStatusPanel` & `ProfileSettingsModal`.
- **Bundle Budget**: Initial first-screen JavaScript: **167.67 kB gzip** (safely under `< 200 kB` budget).
---

## 6. Duolingo-Inspired Tactile UI & Copy Polish (`feature/duolingo-design-system`)

- **Tactile Sticker Buttons**:
  - `Button.tsx` standardized on uppercase tracking (`0.05em`), 14px–16px rounded corners, 2px borders, and 4px tactile drop-shelves (`0 4px 0`) with bouncy active press physics (`active:translate-y-[2px]`).
- **Storybook Paper Surfaces**:
  - `Card.tsx` elevated with 2px thick solid borders (`border-2 border-[#E6E8EE]`) and `rounded-[24px]` radius.
- **Uncluttered Welcome & Auth Experience**:
  - Removed confusing marketing badges ("TRNC student friendly", "Multi-currency TRY/EUR/USD", etc.) from the first screen.
  - Duolingo-style hero: expressive animated Mascot + punchy headline (*"The joyful way to share a home."*).
  - Two prominent tactile CTAs: **`GET STARTED`** (coral fill) and **`I ALREADY HAVE AN ACCOUNT`** (white sticker).
  - Streamlined `LOG IN` / `CREATE ACCOUNT` segmented toggle with password reveal and 1-tap magic link.
- **Removed Hardcoded Mock Copy Across the App**:
  - Replaced hardcoded "Apartment 4B Lefkoşa" in loading screen, chat header, join flow preview, and join request modal with dynamic household names and professional instructions.



---

## 7. Comprehensive UX Audit & Usability Fixes (Completed)

- **Navigation Deep-Linking**:
  - Wired `selectedExpenseId` state from `App.tsx` through `HomeScreen`, `ChatScreen`, `NotificationsModal`, and `ExpensesScreen`.
  - Notifications and activity feed items for expenses now automatically open and focus the specific expense detail modal instead of landing on a generic expenses tab.
- **Multi-Currency System-Wide Dynamism**:
  - Implemented `getCurrencySymbol(currency?: string)` and `formatCurrency(amount, currency, forceDecimals)` in `stateTable.ts`.
  - Converted all hardcoded `₺` symbols across `ExpensesScreen`, `HomeScreen`, `ApartmentScreen`, `EditSplitModal`, `AddExpenseFlowModal`, `SettleUpFlowModal`, and `ExpenseDetailModal` to render the household's configured currency (`TRY`, `USD`, or `EUR`).
  - Updated activity feed regex to recognize `$`, `€`, and `₺` automatically.
- **Dispute Flow Usability**:
  - Expense card "Dispute" button now prompts the user with `DisputeReasonModal` so they can state the actual dispute reason before submission, replacing silent default reason submission.
- **Dynamic Split Exclusions**:
  - Replaced hardcoded mock text ("Quick exclude Lucas (₺0)" and lactose logic) in `EditSplitModal` with dynamic presets derived from disputing roommates and equal splits.
- **Apartment Agreements Creation**:
  - Added an "Add rule" button and category modal to `ApartmentScreen` under the rules sub-tab, enabling roomies to add flat agreements directly from the UI.
- **Mobile Viewport & Bottom Navigation Harmony**:
  - Replaced fixed page padding with mobile bottom navigation clearance (`pt-5 pb-24 md:py-8`) across all tab screens.
  - Optimized `ChatScreen.tsx` with `flex flex-col h-full` and `App.tsx` chat viewport containment (`h-[calc(100dvh-64px)] pb-20`), fixing mobile input bar placement above the bottom nav without double-scroll containers.
- **Orphan File Removal**:
  - Deleted legacy duplicate modals: `AddExpenseModal.tsx`, `SettleUpModal.tsx`, `DoneActionModal.tsx`, `CreateHouseholdModal.tsx`, and `JoinHouseholdModal.tsx`.
- **Bundle & Test Verification**:
  - All **15 / 15 unit tests passing**.
  - Production build in **1.00s**, initial JavaScript gzip bundle at **~103.4 kB** (budget: < 200 kB).


---

## 8. Phase 2: The Features People Love (Completed & Verified ✅)

Branch: `feature/phase-2-love-it-features`
Baseline Tag: `v1.0.0-phase1`

- **Weekly Awards (Everyone Wins)**:
  - Evaluation Engine: `src/utils/awards.ts` dynamically evaluates weekly awards without negative or loser rankings, handling 0 chores, 1–2 roommates, and ties deterministically.
  - Zero-Shame Guarantee: Every single active roommate is assigned a humorous, positive badge (*Kitchen Hero*, *Bin Boss*, *Night Chef*, *Peacemaker*, *Streak Master*, *Early Bird*, *The Dependable*, *Flat Cheerleader*) rendered with pre-registered offline `fluent-emoji-flat` vector SVGs (`src/utils/registerIcons.ts`).
  - UI Component: `src/features/feed/components/WeeklyAwardsSection.tsx` features a hero card for the current user's honor, flatmate honor cards, unclipped confetti particle burst, and the distinct `awardCelebrate` C-Major triad arpeggio + double-pulse haptic fanfare.
  - Unit tests: `src/utils/awards.test.ts` (6 tests).

- **Anonymous Household Vibe Check**:
  - Evaluation Engine: `src/utils/vibe.ts` calculates apartment average vibe on a 1–5 scale.
  - Strict k-Anonymity Protection: Submissions are strictly unlinked from user IDs (`submit_anonymous_vibe` Postgres RPC and RLS `COUNT >= 3` guard). Aggregate scores and dominant moods are concealed until $\ge 3$ roommates submit.
  - UI Components: `VibeCheckWidget.tsx` on the home feed displays unlock status or privacy lock; `VibeCheckModal.tsx` provides 5 expressive vector emotion cards with `tokenClink` selection feedback and empathetic `vibeSubmit` F-Major dyad swell (or gentle descending tone for low/stressed moods).
  - Unit tests: `src/utils/vibe.test.ts` (5 tests).

- **Favor Tokens & Chore Swaps (`MAX_FAVOR_TOKENS = 10` Anti-Hoarding Cap)**:
  - Ledger Engine: `src/utils/tokens.ts` & `src/services/api/social.api.ts` manage non-financial social currency balances, swap proposals (`proposeChoreSwap`), atomic resolutions (`resolveChoreSwap`), and `MAX_FAVOR_TOKENS = 10` anti-hoarding cap (automatically converting excess streak/award/swap tokens into celebratory flatmate kudos).
  - Offline Outbox & Telemetry: Mutations (`submit_vibe_pulse`, `propose_chore_swap`, `resolve_chore_swap`) are wired into `src/services/outbox.ts` and tracked under the `'social'` module in `src/utils/debugLog.ts` (12 total tracked modules).
  - Database Migration: `supabase/migrations/20261116043000_social_vibe_tokens_and_swaps.sql` defines `vibe_pulses`, `favor_tokens`, and `chore_swap_requests` with RLS policies and atomic row-locked RPCs (`submit_anonymous_vibe`, `resolve_chore_swap`).
  - UI Integration: Vector coin pill in `AppHeaderAndNav.tsx` and `ProfileSettingsModal.tsx`; `ChoreSwapModal.tsx` and `HomeScreen.tsx` inbound trade cards wired with `tokenClink`, `swapAccept`, and `softReject` audio/haptic signatures.
  - Unit tests: `src/utils/tokens.test.ts` (6 tests).

- **Distinct Sensory Engine & Preferences Toggles**:
  - Synthesized Web Audio (`src/services/sound.ts` exporting `isSoundEnabled`/`setSoundEnabled`) and Capacitor Haptics with Web Vibration fallback (`src/utils/haptics.ts` exporting `isHapticsEnabled`/`setHapticsEnabled`) provide 5 distinct Phase 2 signatures (`awardCelebrate`, `vibeSubmit`, `tokenClink`, `swapAccept`, `softReject`) plus `notificationPing`.
  - Wired tactile Duolingo-style toggle switches (`SpeakerHigh`/`SpeakerSlash` and `Vibrate` in `@phosphor-icons/react` `duotone` weight) into `ProfileSettingsModal.tsx` with live preview on toggle-on.
  - Unit tests: `src/utils/haptics.test.ts` (3 tests).

- **Quality, Bundle Budget & Zero-Slop Verification**:
  - **63 / 63 unit tests passing** (`npm test` across 8 suites).
  - **0 TypeScript errors** (`npm run lint`), zero `as any`, zero `@ts-ignore`, zero `console.log`.
  - **Initial JS Bundle**: **142.17 kB gzipped** (`dist/assets/index-*.js`), strictly under the `< 200 KB` gzipped budget with `React.lazy` code-splitting across all secondary screens and modals and zero external animation libraries.
  - Standalone Android APK built and stream-installed onto device (`TECNO_CLA5`).

---

## 9. 60fps GPU Rendering & Local-First Instant-Load Optimization

- **Instant Local-First Snapshot Cache** (`src/services/localCache.ts`):
  - Saves per-household snapshots (`roomie_snapshot_${householdId}`) in `localStorage` and mirrors asynchronously into `IndexedDB` (`roomie_snapshots_db`) whenever household state syncs.
  - Hydrates initial app state synchronously on boot in `useRoomieAppState.ts` and `HomeScreen.tsx` so `HomeScreen` renders with real household data in **0ms** (zero loading spinner when cached) while refreshing silently from Supabase + Realtime in the background.
  - Updates the snapshot immediately on every optimistic mutation (`saveStore` hook + `loadData` sync).
  - Verified by `src/services/localCache.test.ts` (2 tests).
- **Idle Chunk Prefetching** (`src/components/common/AppTabRouter.tsx`):
  - Uses `requestIdleCallback` (with a `1000ms` `setTimeout` fallback) after `HomeScreen` mounts to prefetch the lazy chunks for `ChoresScreen`, `ExpensesScreen`, `ApartmentScreen`, and `ChatScreen` so tab switches complete in a single frame (`< 16ms`).
- **Android WebView 60fps GPU Polish**:
  - Removed all `backdrop-blur-*` overlays across `AppHeaderAndNav.tsx`, `Modal.tsx`, `AppModals.tsx`, `VibeCheckModal.tsx`, `SecretDraftScreen.tsx`, and `SplashScreen.tsx`, replacing them with lightweight GPU-friendly tinted surfaces (`bg-slate-900/60` and `bg-[#F7F8FB]/95`).
  - Upgraded tactile button presses (`.btn-tactile`), mascot animations (`MascotView.tsx`), and celebration confetti particles (`WeeklyAwardsSection.tsx`) to animate exclusively via GPU-composited `transform` (`translate3d` / `scale`) and `opacity`.
  - Added `.contain-content` (`contain: content;`) layout/paint isolation to repeating feed (`ActivityTimelineSection.tsx`, `DailyFocusSection.tsx`, `WeeklyAwardsSection.tsx`), chore (`ChoreAssignmentList.tsx`), notification (`NotificationsModal.tsx`), and chat (`ChatScreen.tsx`) list cards.

---

## 10. Visual Motion & Micro-Interactions (60fps Spring Physics & Living Action Arcs)

- **Spring Physics & Stagger Tokens** (`src/index.css`, `Button.tsx`, `ActionCard.tsx`):
  - Added `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` and `--stagger-step: 40ms` tokens.
  - Upgraded `.btn-tactile` (`0.05s` active press-down compression `translate3d(0, 2px, 0) scale(0.975)` + `0.24s var(--ease-spring)` rebound) and `.card-interactive` (hover lift + active compression + spring rebound).
  - Added `.stagger-item` (`animation-delay: calc(var(--stagger-index, 0) * 40ms)`) across chore rows (`ChoreAssignmentList.tsx`), expense cards (`ExpensesScreen.tsx`), feed activity cards (`ActivityTimelineSection.tsx`), weekly honors (`WeeklyAwardsSection.tsx`), and vibe emotion cards (`VibeCheckModal.tsx`).
- **Living Action Arcs (3-Beat Feedback)**:
  - **Chore Completion** (`ChoreAssignmentList.tsx` & `DoneFlowModal.tsx`): Renders an animated SVG checkmark draw (`stroke-dashoffset` via `.animate-check-draw`), a celebration highlight pulse on the card (`ring-2 ring-[#3DBE6D]/60 bg-[#EBF9F0]`), and a floating `+1 Streak · +20 pts` / `+1 Token` badge (`.animate-float-badge`) before settling into completed state.
  - **Animated Counters** (`src/components/common/AnimatedNumber.tsx`): Smoothly rolls Favor Token balances (`AppHeaderAndNav.tsx`, `ChoreSwapModal.tsx`, `ProfileSettingsModal.tsx`), streak days/points (`HomeScreen.tsx`, `DoneFlowModal.tsx`), and currency totals (`DailyFocusSection.tsx`, `BalanceOverviewSection.tsx`) over `300ms` via `requestAnimationFrame` cubic ease-out interpolation with a `.animate-number-pop` scale-pop pulse. Verified by `src/components/common/AnimatedNumber.test.ts` (4 tests).
  - **Mascot Live Reactions** (`MascotView.tsx` & `HomeScreen.tsx`): Triggers reactive mascot expressions (`celebrating`, `cheering`, `calm` with `.animate-calm-nod`) in direct response to Vibe Check submissions, chore completions, presence toggles, and swap resolutions.
- **Spatial Continuity & Sliding Indicators**:
  - Animated segmented control active pills with smooth GPU `translate3d(X%, 0, 0)` spring glides across Auth (`SignInForm.tsx` Password vs Magic Link), Chores (`ChoresScreen.tsx` My tasks vs All chores), Apartment (`ApartmentScreen.tsx` Roomies vs Rules & Meetings), Expenses (`ExpensesScreen.tsx` All vs Pending vs Agreed), and Profile Settings (`ProfileSettingsModal.tsx` Profile vs Preferences vs Account).
  - Added touch-drag dismissal (`onTouchStart`/`onTouchMove`/`onTouchEnd` driving `translate3d(0, Ypx, 0)` with `90px` dismiss threshold and `--ease-spring` snap-back) to mobile bottom-sheet modals (`Modal.tsx` and `VibeCheckModal.tsx`).
  - Strictly respects `reducedMotion` (`document.documentElement.classList.contains('reduce-motion')` and `@media (prefers-reduced-motion: reduce)`) across all new keyframes, counters, and transitions.

### Multi-Agent UI & UX Audit Resolutions (Commit `e1864b9`):
- **Deferred Chore Reassignment Until Consent**: Eliminated premature task transfer from the offer action; chore duty is now only reassigned when the recipient explicitly accepts the swap.
- **Inbound Trade Alerts**: Surfaced pending swap requests directly onto `HomeScreen.tsx` via a dedicated `ActionCard` with 1-tap Accept / Decline buttons.
- **Empathetic Mood Audio**: `VibeCheckModal` plays soft, reassuring chimes (`sound.playCalmNotice`) for `stressed` or `down` states, preserving party fanfare only for high-energy ratings.
- **Small-Flat Privacy Adaptation**: `VibeCheckWidget` automatically adapts when household members $< 3$, informing flatmates that k-anonymity requires 3+ roommates to protect privacy.
- **Ballot-Stuffing Receipt**: Prevented duplicate voting by recording weekly submission state in localStorage (`roomie_vibe_submitted_${weekKey}`).
- **Tactile Token & Border Polish**: Aligned line borders to canonical `#E6E8EE` and button drop shelves to `#D94E30`, with `reducedMotion` guardrails on particle bursts.

---

## 11. Database/Cloud Hardening & Phase 2B Beta Sprint (Branch `feature/hardening-and-phase2b-beta`)

- **Supabase Database Hardening** (`supabase/migrations/`):
  - Remote Supabase project (`ebiyvhodxrliiwdzonzu`) updated with `20261116043000_social_vibe_tokens_and_swaps.sql` and `20261116063000_query_indexes_and_payload_guards.sql`.
  - Added composite indexes `(household_id, created_at DESC)` and `(household_id, week_key)` on high-frequency tables (`vibe_pulses`, `favor_tokens`, `chore_swap_requests`, `chore_logs`, `expenses`, `chat_messages`) preventing sequential table scans.
  - Added database-level `CHECK` constraints guarding payload lengths: `body <= 1000`, `note <= 280`, `reason <= 280`.
  - Hardened `submit_anonymous_vibe` and `resolve_chore_swap` RPCs with rate/duplicate checks and row locks.
- **Windowed Queries & Delta Merging** (`src/services/api/`):
  - Replaced unbounded table fetches with explicit column lists and `.limit()` windows:
    - `getMessages` in `chat.api.ts`: explicit columns, `.order('created_at', { ascending: false }).limit(50)`, delta-merged with cached history.
    - `getExpenses` and `getSettlements` in `expenses.api.ts`: limits 60 and 50 with explicit column selections.
    - `getChores` in `chores.api.ts`: `.limit(100)` with explicit column selections.
    - `getSwapRequests` in `social.api.ts`: `.limit(30)` with explicit column selections.
- **Storage Egress Reduction & Deduplication** (`src/utils/photoPipeline.ts` & `src/services/supabase.ts`):
  - Configured Supabase Storage uploads with `cacheControl: '31536000'` (1 year immutable cache).
  - Added client-side SHA-256 blob hashing via `crypto.subtle.digest('SHA-256', ...)`. Re-uploading an identical compressed image reuses the cached signed URL without hitting the network or increasing storage billing.
- **Outbox Circuit Breaker & Quarantine** (`src/services/outbox.ts` & `DebugInspectorModal.tsx`):
  - Hardened outbox engine with `MAX_OUTBOX_RETRIES = 5` and bounded exponential backoff (`Math.min(60000, 1000 * 2^(retry - 1))`).
  - Items failing 5 times enter `'quarantined'` status, halting endless retry loops that drain mobile battery and backend bandwidth.
  - Added Quarantine card to `DebugInspectorModal.tsx` with "Retry All" and "Discard" actions.
- **Phase 2B Beta Feature Flags & Scaffolding** (`src/config/featureFlags.ts`):
  - Built typed, storage-persisted feature flag system (`culturalDinnersBeta`, `roomieWrappedBeta`).
  - Added **Beta Labs 🧪** section to `ProfileSettingsModal.tsx` with Duolingo-styled tactile toggle switches.
  - Scaffolded `CulturalDinnerCard.tsx` on `HomeScreen.tsx` (cultural dinner rotation, host badges, dietary flags).
  - Scaffolded lazy-loaded `RoomieWrappedModal.tsx` (`2.04 kB gzipped`) summarizing semester milestones and accolades.
- **Zero-Slop Verification**:
  - Initial JS bundle: **145.28 kB gzipped** (well below the 200 kB budget).
  - Zero temporary scripts, zero phase-numbered files/types, zero `as any`, zero `@ts-ignore`, zero raw `console.log`.
  - 67 / 67 unit tests pass across 9 test suites. TypeScript compilation (`tsc --noEmit`) passes with 0 errors.

---

## 12. Interactive Cultural Dinners & Live Roomie Wrapped (Branch `feature/interactive-dinners-and-wrapped`)

- **Interactive Cultural Dinners & Dietary Profile Sync**:
  - **Database Migration** (`supabase/migrations/20261116090000_cultural_dinners.sql`):
    - Created `cultural_dinners` table (`id`, `household_id`, `host_user_id`, `dish_title`, `cuisine_tag`, `scheduled_date`, `dietary_tags text[]`, `rsvp_user_ids uuid[]`, `status`, `created_at`, `updated_at`) with composite index `(household_id, scheduled_date DESC)`, `CHECK` length caps (`dish_title <= 100`, `cuisine_tag <= 40`), and multi-tenant RLS (`is_household_member(household_id)`).
    - Added `dietary_tags text[]` to `public.profiles` for persistent user dietary badge preferences.
    - Added atomic `toggle_cultural_dinner_rsvp` RPC with row locking. Applied cleanly to remote Supabase (`ebiyvhodxrliiwdzonzu`).
  - **Data Layer & Offline Outbox** (`src/services/api/social.api.ts`, `outbox.ts`, `localCache.ts`):
    - Added windowed queries (`getCulturalDinners` fetching latest 15 dinners with explicit column selection and delta merging).
    - Idempotent mutations (`scheduleCulturalDinner`, `toggleDinnerRsvp`, `updateUserDietaryPreferences`) routed through `outbox.ts` with instant `localCache.ts` snapshot updates.
  - **Interactive UI** ([`CulturalDinnerCard.tsx`](file:///c:/Users/HP/Documents/github/Roomie/src/features/feed/components/CulturalDinnerCard.tsx) & [`CulturalDinnerModal.tsx`](file:///c:/Users/HP/Documents/github/Roomie/src/features/feed/components/CulturalDinnerModal.tsx)):
    - Complete roommate hosting flow: dish title, cuisine origin, date picker, and dietary badge toggles (`Halal`, `Vegetarian`, `Vegan`, `Nut-Free`, `Gluten-Free`, `Dairy-Free`).
    - Flatmates dietary needs overview: hosts view all flatmates' dietary badges before cooking to prevent food allergies or non-halal preparation.
    - Instant 1-tap **"I'm In" (RSVP)** with distinct audio/haptic feedback (`tokenClink`, `swapAccept`, `awardCelebrate`) and mascot live reactions (`cheering`).
- **Live Roomie Wrapped & Zero-Financial Canvas Share Card**:
  - **Metrics Engine** ([`src/utils/wrappedMetrics.ts`](file:///c:/Users/HP/Documents/github/Roomie/src/utils/wrappedMetrics.ts) & [`src/utils/wrappedMetrics.test.ts`](file:///c:/Users/HP/Documents/github/Roomie/src/utils/wrappedMetrics.test.ts)):
    - Computes monthly and semester recap metrics strictly from existing state (`chore_logs`, `expenses`, `kudos`, `cultural_dinners`, `awards`) with **strictly zero monetary figures, balances, or private IDs**.
    - Measures team chores completed together, longest dispute-free streak in days, most-appreciated flatmate via kudos, top dinner chef, and flat harmony score (0-100%).
  - **Zero-Dependency HTML5 `<canvas>` Story Exporter** ([`src/utils/shareCardCanvas.ts`](file:///c:/Users/HP/Documents/github/Roomie/src/utils/shareCardCanvas.ts)):
    - Offscreen `<canvas>` generating a crisp 1080x1920 (9:16 story aspect ratio) branded card in Roomie's warm coral, fresh teal, gold, and slate palette.
    - Integrates native Web Share API (`navigator.share({ files })` on Android WebView/Capacitor) with automatic PNG download fallback.
  - **Interactive Recap Deck** ([`src/features/feed/components/RoomieWrappedModal.tsx`](file:///c:/Users/HP/Documents/github/Roomie/src/features/feed/components/RoomieWrappedModal.tsx)):
    - 4-slide swipeable story deck with progress segments, spring physics transitions, and 1-tap **"Share Story Card"** button.
- **Zero-Slop Verification**:
  - Initial JS bundle: **147.67 kB gzipped** (well below the 200 KB budget).
  - Lazy modal chunks: `CulturalDinnerModal` is **2.72 kB gzipped**, `RoomieWrappedModal` is **4.59 kB gzipped**.
  - 74 / 74 unit tests pass across 9 test suites. `tsc --noEmit` passes with 0 errors.
  - Zero raw Unicode emojis in JSX: all badges render via pre-registered `fluent-emoji-flat` icons and `@phosphor-icons/react`.


---

## 13. Phase 3 Flat Utilities & Shared Shopping List (Branch `feature/flat-utilities-and-shopping`)

- **Default Beta Labs Toggles ON (`src/config/featureFlags.ts`)**:
  - Set `culturalDinnersBeta` and `roomieWrappedBeta` default to `true` (ON) for fresh installs while preserving existing `localStorage` user overrides.
  - Non-intrusive `BETA` badges remain visible in UI cards to signal experimental status.

- **Phase 3 Pillar A: Shared Shopping List & Supermarket Ping**:
  - **Database Migrations** (`supabase/migrations/20261116120000_shopping_and_apartment_info.sql` & `20261116121000_shopping_columns_alignment.sql`):
    - Multi-tenant `shopping_items` table (`id`, `household_id`, `title`, `category`, `quantity_label`, `is_low`, `status`, `added_by`, `claimed_by`, `created_at`, `updated_at`, `deleted_at`, `version`).
    - Enforced `CHECK (char_length(title) BETWEEN 1 AND 80)`, `CHECK (char_length(quantity_label) <= 30)`, categories (`groceries`, `household`, `cleaning`, `pantry`, `other`), status (`needed`, `in_cart`, `purchased`).
    - Composite index `idx_shopping_items_household_status` on `(household_id, status, created_at DESC) WHERE deleted_at IS NULL`.
    - Applied and verified against remote Supabase (`ebiyvhodxrliiwdzonzu`).
  - **Data Layer & Offline Outbox** (`src/services/api/shopping.api.ts`, `outbox.ts`, `localCache.ts`):
    - Windowed query `getShoppingItems` fetching latest 60 active items with explicit column projections and local-first snapshot hydration.
    - Full mutation suite: `addShoppingItem`, `toggleShoppingItemStatus`, `deleteShoppingItem`, `triggerSupermarketPing`, and `convertCartToExpense`.
    - `triggerSupermarketPing` broadcasts chat activity and sends in-app notifications to all flatmates.
  - **Tactile UI** ([`ShoppingListCard.tsx`](file:///c:/Users/HP/Documents/github/Roomie/src/features/shopping/ShoppingListCard.tsx) & [`ShoppingListModal.tsx`](file:///c:/Users/HP/Documents/github/Roomie/src/features/shopping/ShoppingListModal.tsx)):
    - Feed card on `HomeScreen.tsx` showing running-low count, top items, and 1-tap "Going to Supermarket" broadcast button.
    - Lazy-loaded checklist modal with category filter pills, low-stock highlight chips, add item form, and "Convert to Expense" batch checkout button.

- **Phase 3 Pillar B: Members-Only Apartment Info & Wi-Fi Card**:
  - **Database Migration** (`supabase/migrations/20261116120000_shopping_and_apartment_info.sql`):
    - Created `household_info_cards` table (`household_id` PK, `wifi_ssid`, `wifi_password`, `trash_schedule`, `delivery_address`, `emergency_note`, `updated_by`, `updated_at`, `version`).
    - RLS enforced: viewable, insertable, updatable strictly by active household members.
    - Strict security check: `CHECK (no_identity_documents)` rejecting passport and national ID numbers.
  - **Tactile UI** ([`ApartmentInfoCard.tsx`](file:///c:/Users/HP/Documents/github/Roomie/src/features/members/components/ApartmentInfoCard.tsx)):
    - Embedded in [`ApartmentScreen.tsx`](file:///c:/Users/HP/Documents/github/Roomie/src/features/members/ApartmentScreen.tsx) with masked Wi-Fi password, eye reveal toggle, and 1-tap clipboard copy buttons with haptic feedback and toast confirmation.
    - Trash collection schedule, delivery address, and emergency note (e.g., water shutoff valve).
    - Inline edit modal with client-side identity document prohibition validator.

- **Zero-Slop Verification**:
  - Initial JS bundle: **151.50 kB gzipped** (well below the 200 kB budget).
  - Lazy modal chunks: `ShoppingListModal` is **2.09 kB gzipped**.
  - 80 / 80 unit tests pass across 9 test suites (`npm test`). `tsc --noEmit` passes with 0 errors.
  - Zero raw Unicode emojis in JSX, zero temporary files, zero `as any`, zero `@ts-ignore`, zero raw `console.log`.
  - Git boundary maintained: branched off `feature/interactive-dinners-and-wrapped` into `feature/flat-utilities-and-shopping`. Remote push restricted strictly to feature branch.

---

## 14. Phase 3 Real-Life Flat Tools: Recurring Bills, Snapshots, Landlord Hub & PDF Exporter (Branch `feature/flat-bills-snapshot-landlord`)

- **Database Migration (`supabase/migrations/20261116150000_recurring_bills_snapshots_and_landlord.sql`)**:
  - `recurring_bills` (`id`, `household_id`, `title <= 80`, `category`, `amount > 0`, `currency`, `due_day [1-31]`, `split_rule`, `custom_splits`, `paid_by_user_id`, `active`, `last_generated_cycle`, `version`, `created_at`, `updated_at`, `deleted_at`).
  - `move_in_snapshots` (`id`, `household_id`, `room_name <= 60`, `condition_note <= 400`, `photo_urls text[]`, `created_by`, `confirmed_by_user_ids uuid[]`, `version`, `created_at`, `updated_at`, `deleted_at`, `CONSTRAINT no_identity_documents`).
  - `landlord_profiles` (`household_id` PK, `landlord_name <= 80`, `role_label <= 40`, `phone_or_whatsapp <= 50`, `emergency_note <= 300`, `updated_by`, `updated_at`, `version`, `CONSTRAINT no_identity_documents`).
  - `maintenance_issues` (`id`, `household_id`, `title <= 100`, `description <= 500`, `status`, `photo_urls text[]`, `reported_by`, `version`, `created_at`, `updated_at`, `deleted_at`, `CONSTRAINT no_identity_documents`).
  - Multi-tenant RLS policies and composite indexes `idx_recurring_bills_household_active`, `idx_move_in_snapshots_household`, `idx_maintenance_issues_household_status`. Applied cleanly to remote Supabase (`ebiyvhodxrliiwdzonzu`).
- **Data Layer & Outbox Synchronization (`src/services/api/flatUtilities.api.ts`, `outbox.ts`, `localCache.ts`)**:
  - Full windowed queries with explicit projections, delta merging, and offline outbox queuing for all mutations (`add_recurring_bill`, `update_recurring_bill`, `delete_recurring_bill`, `log_recurring_bill_expense`, `add_move_in_snapshot`, `confirm_move_in_snapshot`, `update_landlord_profile`, `report_maintenance_issue`, `update_maintenance_issue_status`).
  - 1-tap "Log for Current Month" converts recurring bills into active shared expenses with automatic split allocations across flatmates.
- **Privacy Guardrails (`src/utils/privacyGuards.ts`)**:
  - Client-side validation enforcing `assertNoIdentityDocument` across all forms (notes, room names, landlord notes, maintenance descriptions) before any network or database payload dispatch.
- **Zero-Dependency PDF & Agreement Exporter (`src/utils/pdfExporter.ts`)**:
  - Lightweight (< 4 KB) CSS `@media print` styled document generator for House Agreements and Move-In Condition Snapshots with `window.print()`, HTML Blob download, and Web Share API fallback.
- **Tactile UI & Modal Polish**:
  - `RecurringBillsSection.tsx` & `AddRecurringBillModal.tsx` embedded in `ExpensesScreen.tsx`.
  - `LandlordHubCard.tsx`, `MoveInSnapshotModal.tsx`, `MaintenanceIssueModal.tsx`, and `ExportAgreementPdfModal.tsx` embedded in `ApartmentScreen.tsx`.
  - `document.execCommand('copy')` clipboard fallbacks ensuring 100% Android WebView reliability.
- **Zero-Slop Verification**:
  - Initial JS bundle: **156.29 kB gzipped** (well under 200 KB threshold).
  - Test Suite: **102 / 102 unit tests passing** across 15 suites. `tsc --noEmit` passes with 0 errors.
  - Zero raw Unicode emojis in JSX, zero root scratch scripts, zero `as any`, zero `@ts-ignore`, zero raw `console.log`.
  - Physical device verification: Installed and verified on Tecno Camon 30S (`TECNO_CLA5`).

---

## 15. Canonical Portal Modals & 5-Zone Home Bento Architecture (Branch `feature/home-bento-and-modal-polish`)

- **Canonical Portal Modals (`src/components/common/Modal.tsx`)**:
  - Refactored `Modal.tsx` to render exclusively through `createPortal(..., document.body)` with `fixed inset-0 z-50` scrim, completely preventing header and bottom navigation bar overlap/slicing across the dimmed scrim.
  - Automatic body scroll lock (`overflow: hidden` on `document.body` with previous style restoration on unmount).
  - Mobile bottom sheet anchored to viewport (`fixed inset-x-0 bottom-0 sm:static max-h-[88dvh] rounded-t-[28px] pb-safe`) with drag-to-dismiss handle, scrollable body, and optional sticky footer CTA.
  - Converted custom modals across Phase 2/3 (`VibeCheckModal.tsx`, `AddRecurringBillModal.tsx`, `MoveInSnapshotModal.tsx`, `MaintenanceIssueModal.tsx`, `ExportAgreementPdfModal.tsx`) to route strictly through `<Modal>`.
- **5-Zone Progressive-Disclosure Home Screen (`src/features/feed/HomeScreen.tsx`)**:
  - **Zone 1 (Hero & Inline Presence)**: Hero card with mascot, streak/token counters, 1-tap presence toggle pill, and compact flatmate presence avatars (`1 of N at home`) in footer. Standalone duplicate presence card eliminated on mobile.
  - **Zone 2 (Contextual Action Spotlight)**: Urgent swap offer and join request cards paired with a single focused spotlight (Sunday Chore Draft when active, Today's Chore / Duty Captain when due, or calm "All chores done" state). Duplicate picks action removed from Quick Actions.
  - **Zone 3 (2x2 Apartment Pulse Bento Grid)**: `ApartmentPulseGrid.tsx` rendering 4 tactile bento tiles (`grid-cols-2 gap-3`):
    - *Money Tile*: Net balance with status chip (`Owed` / `Due` / `Settled`) navigating to Expenses tab.
    - *Shopping Tile*: Item count, low-stock badge, 1-tap broadcast supermarket ping, and list opener.
    - *Vibe Pulse Tile*: Unlocked flat average mood or private pulse status opening Vibe Check modal.
    - *Cultural Dinner Tile*: Scheduled dinner dish, cuisine, and RSVP counter opening Cultural Dinner modal.
  - **Zone 4 (Compact Flat Celebrations)**: `WeeklyAwardsSection.tsx` focused on current user honor + `Celebrate` button, with flatmate honors in a horizontal swipe strip (`overflow-x-auto`) and Roomie Wrapped story pill trigger.
  - **Zone 5 (Lightweight Recent Activity)**: `ActivityTimelineSection.tsx` showing the 3 most recent flat events with "Open Chat" button, removing heavy filter tabs.
- **Header & Emoji Polish**:
  - Widened apartment switcher pill in `AppHeaderAndNav.tsx` (`max-w-[215px] sm:max-w-[260px] md:max-w-none`) ensuring long names like `Selin Court B Blok` render cleanly without truncation.
  - Purged raw inline Unicode emojis across `stateTable.ts`, `HomeScreen.tsx`, `WeeklyAwardsSection.tsx`, and `ChatScreen.tsx`, routing chat reactions through pre-registered `fluent-emoji-flat` vector SVGs.
- **Zero-Slop Verification**:
  - Initial JS bundle: **154.78 kB gzipped** (reduced by 1.51 kB from previous sprint, well below 200 KB budget).
  - Test Suite: **102 / 102 unit tests passing** across 15 suites. `tsc --noEmit` passes with 0 errors.
  - Zero raw Unicode emojis in JSX, zero `as any`, zero `@ts-ignore`, zero raw `console.log`.
  - Git boundary maintained: branched off `feature/flat-bills-snapshot-landlord` into `feature/home-bento-and-modal-polish`. Untouched `main`.

---

## 16. UI Bento & Modal Bottom-Sheet Discipline Sprint (Branch `feature/ui-bento-and-modal-discipline`)

- **Native Bottom-Sheet Geometric Discipline (`src/components/common/Modal.tsx`)**:
  - Enforced docked native mobile bottom sheet geometry: `fixed inset-x-0 bottom-0 sm:static w-full ${maxWidthClass} rounded-t-[28px] rounded-b-none sm:rounded-3xl bg-white border-2 border-[#E6E8EE] sm:border-b-4 shadow-2xl overflow-hidden max-h-[88dvh] sm:max-h-[90dvh] pb-safe sm:pb-0`.
  - Added explicit `rounded-b-none` so viewport-anchored bottom sheets never clip or reveal unpainted corners on curved mobile displays.
  - Retained tactile drag-to-dismiss handle (`w-10 h-1.5 rounded-full bg-[#CBD5E1]`), spring physics dismiss, automatic `document.body` scroll lock (`overflow: hidden`), and Escape / native Android back button handling via `useBackHandler`.
- **Unified Canonical Modal Layer Across All Features**:
  - Standardized `ShoppingListModal.tsx`, `ChoreSwapModal.tsx`, `RoomieWrappedModal.tsx`, and `VibeCheckModal.tsx` on the canonical `Modal.tsx` component hierarchy with sticky bottom CTA footers via `footer={...}` prop.
  - `ShoppingListModal.tsx`: Extracted "Convert Cart to Expense" into a full-width sticky footer CTA when cart items are present, keeping item checklist tall and scrollable.
  - `ChoreSwapModal.tsx`: Moved `Cancel` and `Offer (-X Tokens)` actions into sticky footer prop for consistent thumb reach.
  - `RoomieWrappedModal.tsx`: Moved `Back` and `Next Milestone` navigation into sticky footer prop.
- **Header, Version Bump & Emoji Purge**:
  - `AppHeaderAndNav.tsx`: Apartment switcher text container widened to `max-w-[215px] sm:max-w-[260px] md:max-w-none`, resolving premature ellipsis truncation for multiline apartment titles (`Selin Court B Blok`).
  - `ProfileSettingsModal.tsx`: Updated footer version string from `Roomie v1.0.0-phase1` to `Roomie v2.1.0-beta`.
  - Purged remaining raw Unicode emojis from copy strings and JSX across `ProfileSettingsModal.tsx` (`🔥` replaced with registered `fluent-emoji-flat:fire` vector icon, raw toast/button emojis sanitized).
- **Preferences Tab & Beta Labs Responsive Bento Polish (`ProfileSettingsModal.tsx`)**:
  - Resolved text-pushing-switch bug by introducing a unified `SettingsRowToggle` component with strict `shrink-0` and unified 3D tactile styling (`w-12 h-7 rounded-full border-2 border-b-3 active:translate-y-[1px]`).
  - Added `min-w-0 flex-1` across all preference rows so text wraps cleanly and never crowds or squeezes toggle switches on narrow viewports.
  - Re-architected Beta Labs into a high-craft Bento container (`bg-[#FAF5FF] border-2 border-b-4 border-[#E9D5FF]`) with an integrated `<Flask weight="fill" />` icon, clean `Preview` tag, concise feature copy, and nested white tactile cards.
  - Enhanced Language selector with responsive flex wrap to prevent overflow on mobile.
- **Native Android Haptic Engine (`src/utils/haptics.ts`, `AndroidManifest.xml`)**:
  - Integrated `@capacitor/haptics` natively with Capacitor Android bridge (`Capacitor.isPluginAvailable('Haptics')`).
  - Added `<uses-permission android:name="android.permission.VIBRATE" />` to `AndroidManifest.xml` so Android OS permits vibration calls.
  - Linked immediate tactile haptic ticks (`haptics.tokenClink()` / `haptics.awardCelebrate()`) directly to all switch toggles.
- **Zero-Slop Verification**:
  - Initial JS bundle: **154.78 kB gzipped** (well below the 200 KB threshold).
  - Test Suite: **102 / 102 unit tests passing** across 15 suites. `tsc --noEmit` passes with 0 errors.
  - Zero raw Unicode emojis in JSX, zero `as any`, zero `@ts-ignore`, zero raw `console.log`.
  - Git boundary maintained: on `feature/ui-bento-and-modal-discipline`. Untouched `main`.

---

## 17. Tomorrow's Sprint Blueprint & Strategic Architecture Plan

> **State Checkpoint**: Physical device update confirmed on Tecno Camon 30S (`TECNO_CLA5`). All UI responsiveness, bottom-sheet discipline, Beta Labs Bento polish, and native `@capacitor/haptics` vibration signatures are live and verified.

### Strategic Priorities for Next Session ("What We're Cooking Tomorrow")

1. **Sprint Track 1 — Tenant Transition & Deposit Protection Loop (Phase 4A)**:
   - **Move-Out Condition Comparison**:
     - Build `MoveOutSnapshotModal.tsx` that renders a side-by-side room comparison of move-in condition photos against current move-out condition photos.
     - Prevents landlord/deposit disputes by generating an automated before/after condition delta report.
   - **Deposit Return & Balance Clearance Calculator**:
     - Calculates bilateral deposit deductions, remaining utility obligations, and settlement status before member departure.
     - Links into `leave_household_self` Postgres RPC to ensure zero stranded balances.
   - **Portable Flatmate Reputation**:
     - Allows departing tenants to export/carry forward their chore streak, honorary badges (Kitchen Hero, Streak Master), and positive karma to their next flat without losing identity.

2. **Sprint Track 2 — Real Cloud Supabase Auth & Live Multi-Device Sync (Phase 4B)**:
   - Upgrade from local seeded user switching to real Supabase Auth (Email OTP / Magic Link).
   - Verify real-time Postgres subscription updates across two physical phones simultaneously in the same apartment room.

3. **Sprint Track 3 — Complete i18n Dictionary & Arabic RTL Typography (Phase 4C)**:
   - Centralize remaining hardcoded strings into lightweight locale dictionaries (`en`, `tr`, `fr`, `ar`).
   - Audit Arabic RTL text layout, icon flipping, and font line-heights on Android WebViews.

## 18. Phase 4A: Tenant Transition & Deposit Protection Loop (Branch `feature/tenant-transition-and-deposit-return`)

- **Database Migration (`supabase/migrations/20261117010000_tenant_transition_and_move_out.sql`)**:
  - Successfully applied to remote Supabase (`ebiyvhodxrliiwdzonzu`).
  - Created `public.move_out_inspections` table with composite indexes on `(household_id, created_at DESC)` and `(user_id, created_at DESC)`.
  - Added privacy constraint `move_out_no_id_docs` preventing passport and ID document strings.
  - Implemented atomic `confirm_move_out_inspection` RPC with `SECURITY DEFINER` and multi-tenant RLS policies.
- **Tenant Transition Domain API (`src/services/api/tenantTransition.api.ts`)**:
  - `getMoveOutInspections(householdId)`: Windowed Supabase queries with explicit column projections, offline fallback, and store caching.
  - `addMoveOutInspection(params)`: Client-side privacy guard validation (`assertNoIdentityDocument`), automatic deposit refund computation (`depositPaidAmount - damageDeductionAmount`), and outbox queued mutation.
  - `confirmMoveOutInspection(inspectionId, userId)`: Multi-member condition sign-off, automatically transitioning status to `'agreed'` once verified.
  - `settleDepositRefund(inspectionId, adminPayerUserId)`: Seamlessly generates an agreed flat expense for the refund amount, linking `settlement_expense_id` and setting status to `'settled'`.
  - `getTenantPassport(userId)`: Calculates the user's portable Flatmate Reputation Passport with consecutive chore streak days, completed chores, peer honors, and a calibrated 0–100 Harmony Score.
- **Move-Out Condition Comparison & Dispute Defense (`MoveOutSnapshotModal.tsx`)**:
  - Rendered through canonical `<Modal>` portal (`maxWidth="xl"`) with view/file tabs.
  - **Side-by-Side Room Comparison**: Automatically matches and displays original move-in baseline photos/notes directly opposite move-out photos/notes.
  - **Deposit Return Calculator**: Real-time breakdown of security deposit, damage deductions, and net refund due.
  - **Flatmate Verification & Settle Up CTAs**: One-tap co-tenant confirmation buttons and deposit refund expense logging.
  - Integrated into `LandlordHubCard.tsx` under Apartment Condition tools.
- **Official Print / PDF Certificate Exporter (`src/utils/pdfExporter.ts`)**:
  - `generateMoveOutCertificateHtml()` & `exportMoveOutCertificate()`: Zero-dependency print-ready document with timestamped proof, side-by-side room condition delta, deposit breakdown table, and signature sign-off blocks.
- **Portable Flatmate Reputation Passport (`TenantPassportModal.tsx`)**:
  - Rendered through canonical `<Modal>` portal (`maxWidth="md"`).
  - Displays user avatar, verified country, join tenure, Harmony Score gauge, chore streak, total chores, and peer awards.
  - One-tap "Copy Summary" (with `navigator.clipboard` + `document.execCommand('copy')` WebView fallback) and Web Share API.
  - Wired into `ProfileSettingsModal.tsx` in the Profile tab right under streaks.
- **Zero-Slop Verification**:
  - Initial JS bundle: **156.77 kB gzipped** (well below the 200 KB threshold).
  - Test Suite: **100% unit tests passing** (including `tenantTransition.test.ts` and `pdfExporter.test.ts`).
  - `npx tsc --noEmit` passes with 0 errors.
  - Zero raw Unicode emojis in JSX, zero `as any`, zero `@ts-ignore`, zero raw `console.log`.
  - Git boundary maintained: strictly on `feature/tenant-transition-and-deposit-return`, untouched `main`.

---

## 19. UX De-Bloat, Visual Consistency & Canonical Overlay Primitives (Branch `feature/ux-debloat-and-native-polish`)

- **Purged Lecture Banners & Private Shield Pill**:
  - Removed the permanent 4-line green `Apartment Privacy Shield Active` banner and gray admin rule box from `ApartmentHeaderCard.tsx`. Replaced them with a compact tappable `Private` shield pill next to the currency badge that opens a brief `CenterDialog` on demand.
  - Removed the permanent `Strict Privacy Rule` warning banner from the read-only `ApartmentInfoCard.tsx` view, rendering privacy notices only inside the Edit modal.
- **Streamlined `ApartmentScreen.tsx`, `ApartmentHeaderCard.tsx`, `ShowQRModal.tsx`, and `ApartmentInfoCard.tsx`**:
  - Collapsed 6 header buttons + bottom `Leave this apartment` button into **2 primary header buttons** (`Invite Roomie` and `Requests` with amber count badge when pending requests > 0) plus a top-right `•••` (`Apartment Settings`) `BottomSheet` housing `Handover Admin`, `Switch Flat`, `Flat Guide`, and `Leave This Apartment`.
  - Moved the 1-tap `Copy Invite Code` button directly below the QR code in `ShowQRModal.tsx`.
  - Renamed the second mobile tab in `ApartmentScreen.tsx` to `Flat Info & Rules`.
  - Consolidated `ApartmentInfoCard.tsx` (Wi-Fi, Delivery Address, Trash & Recycling Schedule, Emergency & Superintendent) into a single cohesive white `Apartment Info` card (`rounded-[24px] border-2 border-[#E5E9F0] bg-white`) with clean tinted inner rows and `whitespace-nowrap` title alignment.
- **WhatsApp-Style Whisper Chat Pills & Deduplicated Empty States**:
  - Redesigned system activity rows in `ChatScreen.tsx` into centered WhatsApp-style micro-pills (`rounded-full bg-[#EEF1F6] text-[11px] font-medium text-[#64748B]`), removing left icons and `View` links.
  - Deduplicated member-join activity events across `households.api.ts` and `supabase/migrations/20261117234500_clean_whisper_system_messages.sql` into one concise `[Name] joined [Apartment]` notice and purged raw Unicode emojis from system messages and alerts.
  - Hidden the redundant `"No confirmed expenses yet"` card and `Spending by category` card in `ExpensesScreen.tsx` and `BalanceOverviewSection.tsx` when `expenses.length === 0`, and initialized `breakdownExpanded` to `false` so collapsed state clearly shows `Expand`.
  - Condensed the tall `"Going on vacation?"` Away Mode card out of `ChoresSidebar.tsx` into a sleek 1-line utility pill row at the bottom of `ChoresScreen.tsx`.
- **Storybook Surface & Tactile Action Row Standardization**:
  - Replaced undefined wireframe `border-border` / `bg-surface` classes in `RecurringBillsSection.tsx` and `LandlordHubCard.tsx` with canonical soft Storybook styling (`rounded-[24px] border-2 border-[#E5E9F0] bg-white` and `#F7F8FB` / `#E6E8EE` inner containers).
  - Styled `Move-In Baseline`, `Move-Out & Deposit`, and `Export Agreement` in `LandlordHubCard.tsx` as tactile secondary rows with Phosphor `duotone` icons (`Camera`, `ShieldCheck`, `FilePdf`) and `CaretRight` chevrons.
  - Brand-aligned `TenantPassportModal.tsx` (`ReputationPassportModal.tsx`) `Share Passport` CTA to brand coral (`#FF6B4A`) and added a top-right amber `Chip` pill on `HomeScreen.tsx`'s Sunday Chore Draft card matching `ChoresScreen.tsx`.
- **Canonical 3-Primitive Overlay System (`src/components/ui/overlays/`)**:
  - Exported `BottomSheet` (`z-50`, flush docked bottom sheet), `CenterDialog` (`z-[60]`, centered spring confirmation/info card), and `FullScreenStory` (`z-[70]`, `100dvh` showcase/ceremony wrapper).
  - Migrated `ProfileSettingsModal`, `NotificationsModal`, `TenantPassportModal` / `ReputationPassportModal`, `ShoppingListModal`, `LeaveApartmentModal`, `RemoveMemberModal`, and `AppShowcase` onto these primitives.
- **Verification**:
  - `npm run lint` (`tsc --noEmit`): 0 errors.
  - `npm test`: **110 / 110 passing** across 18 suites.
  - `npm run build`: succeeded, initial JS entry bundle **158.92 kB gzipped** (< 200 KB threshold).

---

## 20. Human Roommate Vocabulary & Top-Navigation Polish (Branch `feature/polish-home-and-topnav`)

- **Home Hero, Spotlight & Bento Grid (`HomeScreen.tsx`, `stateTable.ts`, `ApartmentPulseGrid.tsx`, `WeeklyAwardsSection.tsx`, `ActivityTimelineSection.tsx`)**:
  - Updated Hero subtitle to `"Your flat at a glance."`, removed trailing bullet separators next to presence status and removed `"Live presence status"`.
  - Updated open chore draft copy in `stateTable.ts` (`draft_open`) to `"Weekly Chore Picks"` / `"Rank the chores you prefer before Sunday."` / `"Choose My Chores"`.
  - Renamed Bento section heading to `"Flat Overview"` (removing `"Real-time flat status"`), Tile 3 to `"House Mood"` / `"Flat Check-in"` / `"Tap to check in"`, and Tile 4 to `"Dinner Night"` with a clean `"BETA"` pill.
  - Renamed `WeeklyAwardsSection.tsx` to `"Weekly Shoutouts"` (`"Little wins around the flat"`), purged `Sparkle` subtitle decoration, pinned `Celebrate` cleanly in the top-right header, removed duplicate badge pills above `myAward.title`, and renamed wrapped recap to `"Monthly Flat Recap"` with a `"BETA"` badge.
  - Added `formatActivityBody` in `ActivityTimelineSection.tsx` to strip raw emojis / `Privacy Notice:` prefixes and render `[Name] joined [Apartment]`.
- **Top-Navigation Sheets & Modal Focus Hygiene (`SyncStatusPanel.tsx`, `Modal.tsx`, `CenterDialog.tsx`, `NotificationsModal.tsx`, `ProfileSettingsModal.tsx`, `TenantPassportModal.tsx`)**:
  - Removed `"Open Phase 1 Debug Layer"` and `"Simulate mode"` (`Go offline` / `Trigger alert`) developer controls from `SyncStatusPanel.tsx`, keeping debug access strictly inside the 5-tap version footer Easter egg in `ProfileSettingsModal.tsx`.
  - Blurred active header trigger buttons via `document.activeElement.blur()` in `Modal.tsx` and `CenterDialog.tsx` on open.
  - Humanized join alerts in `NotificationsModal.tsx` (`"[Name] joined the flat"` / `"Say hi or check everyone in [Apartment]."` / `"View Roomies"`) and removed the `"Privacy Notice"` badge.
  - Renamed `"Flatmate Reputation Passport"` to `"Roomie Track Record"` (`"Your chore streak, shoutouts & flat history"`), removed `"Portable"` chip and trailing bullet dot before Favor Tokens in `ProfileSettingsModal.tsx`.
- **Verification**:
  - `npm run lint` (`tsc --noEmit`): 0 errors.
  - `npm test`: **110 / 110 passing** across 18 suites.
  - `npm run build`: succeeded, initial JS entry bundle **158.80 kB gzipped** (< 200 KB threshold).

---

## 21. Universal UI Geometry, Pill Discipline & Button Alignment (Branch `feature/universal-ui-geometry-and-copy`)

- **Circular Icon Buttons & Bottom-Sheet Geometry (`AppHeaderAndNav.tsx`, `Modal.tsx`, `CenterDialog.tsx`, `ApartmentHeaderCard.tsx`, `LandlordHubCard.tsx`)**:
  - Standardized circular icon triggers (Cloud Sync, Notifications Bell, Profile Avatar trigger, modal close buttons, Apartment `•••` overflow trigger, Landlord phone copy button) onto `w-10 h-10 shrink-0 aspect-square rounded-full p-0 flex items-center justify-center`.
  - Updated `Modal.tsx` bottom sheet height geometry (`h-auto max-h-[85dvh] pb-6 sm:pb-0` with `min-h-0 flex-1` scroll area) so sheets dock flush and size naturally to content without dead whitespace.
- **Notifications & Profile Alignment (`NotificationsModal.tsx`, `ProfileSettingsModal.tsx`)**:
  - Aligned notification timestamps on the left and action CTAs (`View Roomies`, `Snooze 30m`, etc.) on the right of a single footer row (`flex items-center justify-between`).
  - Placed `Edit` beside the display name in `ProfileSettingsModal.tsx` so the user email spans full card width cleanly without premature truncation.
- **Home Hero, Bento Grid, Shoutouts & Merged Recent Activity (`HomeScreen.tsx`, `ApartmentPulseGrid.tsx`, `WeeklyAwardsSection.tsx`, `ActivityTimelineSection.tsx`)**:
  - Centered the Hero `MascotView` vertically with comfortable top clearance (`pt-2 self-center`).
  - Upgraded Bento Grid top-left icon contrast (`w-9 h-9 rounded-xl`), enforced uniform footer baselines (`items-stretch` + `h-full`), removed noisy uppercase pills (`ANONYMOUS` / `Groceries`), and softened `Beta` tags.
  - Flattened double-nested borders inside `WeeklyAwardsSection.tsx` and softened `Monthly Flat Recap` with a subtle `Beta` tag.
  - Merged `ActivityTimelineSection.tsx` activity items into a single white card (`rounded-[24px] border-2 border-[#E5E9F0] bg-white divide-y divide-[#EEF1F6]`) with `32px` icons and 2-line wrapping (`line-clamp-2`).
- **Money & Apartment Button Non-Wrapping (`ExpensesScreen.tsx`, `RecurringBillsSection.tsx`, `ApartmentInfoCard.tsx`)**:
  - Updated `ExpensesScreen.tsx` subtitle to `"Split groceries, bills & rent cleanly"` and added `whitespace-nowrap shrink-0` to `+ Add Template` and `Edit` header action buttons.
- **Verification**:
  - `npm run lint` (`tsc --noEmit`): 0 errors.
  - `npm test`: **110 / 110 passing** across 18 suites.
  - `npm run build`: succeeded, initial JS entry bundle **158.78 kB gzipped** (< 200 KB threshold).

---

