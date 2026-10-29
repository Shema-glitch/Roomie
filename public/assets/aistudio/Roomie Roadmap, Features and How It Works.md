# Roomie: Roadmap, Features and How It Works

For the Antigravity agent · Draft v1 · October 29, 2026 · Companion to the Build Spec, Design and Branding doc, and Data Handling and Offline Spec

## 1. Read This First

This is the full list of what Roomie is meant to solve, the features that make it worth loving, and how each one works. It is a roadmap, not a task to build in one go.

**Working rules for the agent**

1. Read `docs/PROJECT_STATE.md` first. Do not re-read the whole codebase each session.
2. Build one feature at a time, in the phase order below. Phase 1 must be solid before Phase 2 starts.
3. For every feature: data model, a method in the data layer (`api.ts`), UI built only from the shared components and the type scale (Design doc sections 14 to 18), unit tests for the logic, a commit, and an update to `PROJECT_STATE.md`.
4. All data goes through the data layer, so the real backend and offline sync can replace it later.
5. Do not add a dependency larger than about 20 KB gzipped without asking. Keep the first-screen JavaScript under about 200 KB gzipped and lazy-load screens.
6. Interface words are "Apartment" and "Roomies". Sentence case. Minimum text size 14px.
7. Roomie never moves real money. It tracks, reminds, and records.
8. Nothing in the app may shame a person. Celebrate, nudge gently, never rank people against each other.
9. If a feature is unclear or too large, stop and ask instead of guessing.

## 2. What Roomie Saves and Fixes

Students from different countries often share an apartment with people they just met, in a place where the language, the rules, and the money all feel unfamiliar. These are the problems Roomie is built to remove.

| Problem in real life | Roomie's answer |
| --- | --- |
| One person pays for groceries and others forget to pay back | Agreement-first expenses with receipts, simple balances, and confirmed settlement |
| Awkward conversations about money | The app asks, reminds, and records, so nobody has to chase anyone |
| Unfair or unclear chores, and resentment | Secret draft, balanced matching, and an animated reveal |
| Nobody notices who did the work | Done button, kudos, streaks, and weekly awards |
| Unwritten rules cause fights (noise, guests, cleaning) | House meetings, votes, and a saved apartment agreement |
| Rent and bills split unfairly or paid late | Recurring bills with split rules and reminders |
| Forgotten shopping and double-buying | Shared shopping list with "I'm going shopping" pings |
| Losing a deposit over damage that was already there | Move-in snapshot with dated photos everyone confirms |
| Repairs reported by voice and forgotten | Landlord and maintenance log |
| New roomies don't know how the apartment works | Welcome tour and an apartment info card |
| Language and cultural differences | Multiple languages, right-to-left support, cultural dinner nights, food notes |
| Loneliness and tension in a new country | Kudos, who's home, shared rituals, and a weekly vibe check |
| Bad internet and costly data | Offline-first, small downloads, compressed photos |
| Moving out messily | Admin handover, balances settled first, clean exit |

## 3. The Five Pillars

1. **Money:** fair cost sharing.
2. **Chores:** fair division of work.
3. **House rules:** agreeing on shared habits.
4. **Connection:** kindness, communication, and fun.
5. **Belonging:** fair joining, leading, and leaving.

Underneath all five: fast, offline-capable, and respectful of slow, expensive internet.

## 4. Phase Plan

### Phase 0: Stabilize (now)

- Chore state read from one source everywhere (Home, Notifications, Chat, Chores).
- Suggest-for picks wired into matching as a small tie-break only, never overriding an "avoid" pick.
- Delete orphan screens, lazy-load screens, replace Recharts with a small SVG donut.
- Finish the mobile layout (360px and 390px).
- Keep `docs/PROJECT_STATE.md` current.

### Phase 1: The core loop works for real (first ship to one apartment)

- **Real accounts and backend** (Supabase recommended) behind the existing data layer, with row-level security per apartment.
- **Join by code or QR** with a real camera scan, plus "Share on WhatsApp" and a refresh or disable code option.
- **Offline basics:** local database, service worker, outbox for adding expenses, messages, and marking chores done. Photos compress on the phone and upload in the background.
- **Push notifications** for the chore reminder, a new expense that needs an answer, and the reveal. In-app list as a fallback. Onboarding includes "Add to Home Screen".
- **Receipt photos** stored privately, thumbnails in lists.
- **Weekly rhythm:** the draft opens on a day the apartment chooses, and the reveal is a shared moment.
- **Done when:** one real apartment uses it for two weeks, and nothing is lost after going offline and reconnecting.

### Phase 2: The loves-it features (what makes people open it daily)

See section 5 for details.

- Roomie Wrapped (monthly and semester recap)
- Weekly awards where everyone wins
- Weekly vibe check
- Favor tokens
- Apartment challenges
- Cultural dinner nights
- Shareable cards

### Phase 3: Real-life apartment tools

See section 6 for details.

- Rent and recurring bills
- Shared shopping list
- Move-in snapshot
- Landlord and maintenance log
- Guest heads-up
- Exam mode and quiet hours
- Apartment info card and welcome tour
- Apartment agreement PDF

### Phase 4: Growth

- A public landing page with a waitlist (structure like a simple marketing page: one headline, one button, alternating text and illustration).
- Invite loops between apartments (when someone moves, their account moves with them).
- More languages.
- Optional: Capacitor wrapper for the app stores, roommate and housing matching (later, with safety design), and partnerships.

## 5. Phase 2: The Features People Will Love

**Roomie Wrapped**

- *What it does:* a monthly and end-of-semester recap, like a music year-in-review, for the whole apartment and for each person.
- *How it works:* computed from data the app already has: chores done, longest streak, kudos given and received, who cooked most, fastest settler, most thanked, number of expenses logged, a "calm month" stat (zero disputes). Shown as swipeable animated story cards with the mascot.
- *Privacy:* amounts are hidden by default. Each person chooses which of their own highlights can be shared.

**Weekly awards where everyone wins**

- *What it does:* a positive award each week, such as Kitchen Hero, Bin Boss, Peacemaker, Night Chef, Early Bird.
- *How it works:* kudos and completed chores feed the nominations, and the system rotates so every roomie wins over time. Never a ranking or a loser list.

**Weekly vibe check**

- *What it does:* a one-tap "how was the apartment this week?" check-in to catch tension early.
- *How it works:* five simple faces, once a week. Only the apartment average is shown, and only when at least three roomies have answered. Individual answers are never shown. A low average gently suggests a house meeting topic.

**Favor tokens**

- *What it does:* a social currency, never real money. A streak or a kind act earns a token, and tokens can be spent on things like skipping one chore (the app finds a swap), choosing the movie, or picking the dinner.
- *How it works:* a simple ledger per apartment, a cap per person, and a roomie must accept a favor request. Abuse limits prevent hoarding.

**Apartment challenges**

- *What it does:* cooperative goals, not competitions. Example: "Sparkling Sunday: finish every chore on time for four weeks."
- *How it works:* shared progress bar, and when reached, a celebration, a mascot outfit or theme, and a suggestion to celebrate together (for example, cook a meal together).

**Cultural dinner nights**

- *What it does:* rotates a night where one roomie cooks a dish from their country and shares it. This builds the friendships the app is really for.
- *How it works:* a rotation or sign-up, a dish note and photo, everyone says "I'll be there", and thanks go to the cook. Optional food notes per person (for example vegetarian, halal, allergies), visible to roomies only and controlled by the user.

**Shareable cards**

- *What it does:* lets people post a fun recap to their story or send it on WhatsApp.
- *How it works:* generated on the phone as an image (canvas) and sent through the device share sheet. Shows stats and the mascot, never money amounts or private data unless chosen.

## 6. Phase 3: Real-Life Apartment Tools

**Rent and recurring bills**

- Templates for rent, internet, and utilities with due dates and a monthly repeat.
- Split rules: equal, by room, or custom percentages. Rent is often unequal.
- Reminders go to the roomie who owes, and the collector confirms receipt. The app never takes payment, but can copy the payment details and amount for easy transfer.

**Shared shopping list**

- Anyone adds items. "I'm going shopping" notifies the apartment so people can add last-minute needs.
- After shopping, one tap turns bought items into an expense with a receipt.
- Optional "running low" flag for shared items.

**Move-in snapshot**

- Each room and shared area gets dated photos and notes about the condition on move-in. Every roomie confirms.
- Can be exported as a PDF. This helps protect deposits at move-out.

**Landlord and maintenance log**

- A contact card for the landlord or agent.
- Issue reports with photos, who reported it, the date, and a status (reported, told landlord, fixed).
- A shared place to keep a copy of the lease. A warning tells users not to upload passports or visa documents.

**Guest heads-up**

- One tap: "Guest tonight" with times. Roomies respond with a thumbs up or "let's talk".
- Works together with the guest rules in the apartment agreement.

**Exam mode and quiet hours**

- The apartment agrees (by vote) to a quiet period. Non-urgent notifications pause, the mascot adjusts, and chores can lighten if the group chooses.

**Apartment info card and welcome tour**

- Wi-Fi name and password (visible to members only), trash day, landlord contact, emergency numbers, and the address in English and the local language to show to drivers and delivery people.
- New roomies see a short welcome tour: the house rules, how chores and money work, and who's who.

**Apartment agreement PDF**

- Built automatically from the saved rules, chore system, and money rules, with a record that every roomie agreed. Printable. Shown to new roomies when they join.

## 7. How It Is Made

**Stack (current):** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons, Motion for animation, and a mock backend (`api.ts` with local storage). Tests run with `npm test`. Version control is in git, with a commit after every feature.

**Backend plan:** Supabase (Postgres, auth, realtime, storage) with row-level security so only active members of an apartment can read or write its data. The mock data layer is replaced method by method.

**Data additions (each table has the standard sync fields from the offline spec: id, created\_at, updated\_at, deleted\_at, version):**

| Table | Purpose |
| --- | --- |
| recurring\_bills | Rent and bills, with due day and split rule |
| shopping\_items | Shared list with status and added\_by |
| move\_in\_snapshots, snapshot\_photos, snapshot\_confirmations | Dated condition records |
| maintenance\_issues | Reported repairs with status and photos |
| guest\_notices, guest\_responses | Heads-up and replies |
| vibe\_pulses | Weekly answers, stored privately and shown only as an average |
| awards | Weekly awards, rotating so everyone wins |
| favor\_tokens, favor\_requests | Social token ledger |
| challenges, challenge\_progress | Cooperative goals |
| dinner\_nights | Cultural dinner rotation |
| apartment\_info | Wi-Fi, trash day, landlord, addresses |
| agreement\_versions | Generated agreement with approvals |
| recap\_snapshots | Saved monthly and semester recap data |

**Offline and speed:** as in the Data Handling and Offline Spec: local database, service worker, outbox, cursor-based sync, compressed photos, and no polling. New features must work offline except where they need others' input (the reveal, approvals).

**PWA extras (where the device supports them):** install prompt, home-screen shortcuts ("Log expense", "Pick wishes"), and sharing a receipt photo straight into the app from the camera or gallery.

**Notifications:** time-based and event-based, capped (at most one reminder and one gentle follow-up per chore), always dismissible, and never mentioning another roomie's failure.

**Languages:** English, Turkish, French, Arabic (right-to-left) first, and more later. All text goes through one translation file.

**Privacy and safety:** private by default, delete account and export data, clear local data on sign out, and no location tracking. Food notes, vibe answers, and documents are user-controlled and never shown outside the apartment.

## 8. Why People Will Come Back (Without Dark Patterns)

The aim is an app that feels as good to open as a short-video app, but leaves people feeling better, not drained.

- **A weekly ritual:** the draft and the reveal create an event people look forward to.
- **Small rewards:** kudos, streaks, awards, mascot reactions, and unlockable themes.
- **Social warmth:** thanks, shared dinners, and challenges that need everyone.
- **Fresh moments:** Wrapped and shareable cards give people something to show.
- **Short sessions:** every common task takes under 30 seconds.

**What we will not do:** guilt-tripping notifications, public rankings, endless feeds, streaks that punish illness or exams (away mode and freezes protect them), or anything that pressures people to spend money.

## 9. What Is Out of Scope for Now

- Moving real money or payment processing
- Paid plans and ads
- Roommate and housing matching (later, with verification and safety design)
- Automatic location or "I'm home" detection
- AI features that cost money per use (chat translation, receipt scanning), unless added later with cost limits
- A native app rewrite

## 10. How We Know It Works

Use privacy-friendly, simple counts and a short survey.

- Apartments that complete the weekly reveal
- Expenses logged per apartment per week
- Median time from an expense to a confirmed settlement
- Chores completed on time
- Share of roomies active weekly, and retention at 4 and 8 weeks
- Recap cards shared
- A short monthly survey: "Do you argue less about money and chores?" and "Would you recommend Roomie?"

## 11. Suggested Order for the Agent

1. Finish Phase 0 and commit.
2. Phase 1 in this order: backend and accounts, join flow with real QR, offline basics, notifications, photo pipeline, weekly rhythm.
3. Test in one real apartment for two weeks and fix what breaks.
4. Phase 2 in this order: awards, Wrapped, vibe check, shareable cards, favor tokens, challenges, dinner nights.
5. Phase 3 in this order: shopping list, rent and bills, move-in snapshot, maintenance log, info card and welcome tour, guest heads-up, exam mode, agreement PDF.
6. Phase 4 growth items.

After each feature: tests pass, build is clean, bundle size is checked, `PROJECT_STATE.md` is updated, and a commit is made.
