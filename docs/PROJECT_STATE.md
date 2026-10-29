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
- **Missing**:
  - Client-side image compression before upload (currently uses object URLs / sample URLs).

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
- **Partial**:
  - Web Push Notifications / Service Worker background push (simulated in-app).

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

- Total unit tests: **13 / 13 passing** (`npm test`).
  - 4 balance and debt simplification tests (`balances.test.ts`, `logic.test.ts`).
  - 5 chore draft state transition tests (`choreDraft.test.ts`).
  - 4 chore draft matching and `suggest_for` constraint tests (`logic.test.ts`).
