# Roomie: Build Spec

Draft v1 · October 23, 2026 · App name: Roomie. Visual style lives in the separate Roomie Design and Branding doc.

## 1. Overview

A web app (PWA) that helps international students living together run their apartment peacefully. Each apartment is a private **household** (like a small server or room) where roommates share expenses, divide chores through a fun draft-and-reveal game, chat, and give each other kudos. The tone is warm and family-like, and fairness is the main value.

**Problems it solves**

- Money: one roommate pays for groceries or house items and the others don't reimburse fairly or on time.
- Chores: cooking and cleaning get divided unfairly, or arguments start about who does what.
- Habits: unwritten rules (like cleaning the bathroom after use) never get discussed.

**Target users:** international university students sharing apartments, starting with students in Northern Cyprus (TRNC).

## 2. Design Principles

1. **Fairness first.** No roommate has more power than another over daily life.
2. **Admin is a doorkeeper, not a boss.** The admin only handles joining and the invite code.
3. **Warm tone.** Messages say "Thanks for cleaning the bathroom" rather than "Task completed."
4. **Fun, not homework.** Gamified moments (the reveal, streaks, kudos) keep people using it.
5. **Simple first.** Fewer features that work well beat many that don't.
6. **Private by default.** Only household members see household data.

## 3. Accounts and Households

- One user account per person (email or Google sign-in).
- A user can belong to **several households** (students move apartments) and switch between them.
- A household has a name, a currency (TRY, USD, EUR, chosen at creation), and an invite code with a QR version.
- No wifi-based joining. A PWA cannot read the wifi network, and it would let neighbors or guests in.

### Joining

1. The new person enters the code or scans the QR and submits a join request.
2. All members see the request and can tap "OK" or "Not sure."
3. The admin approves or rejects. The admin's tap makes it official; the house's opinions are visible to everyone.

### Optional "I'm home" status

A manual toggle that shows who is home. Automatic detection is out of scope for version 1.

## 4. Admin Rules

**Admin powers (only these):** approve or reject join requests, refresh or disable the invite code, and start a household-wide admin vote if needed.

**Admin has no extra power over** expenses, chores, ratings, chat, or house rules.

**Changing the admin**

- Any member can propose a new admin. It takes effect when all other members agree (or a majority in households of five or more).
- An admin who wants to leave must hand over the role first, or the remaining members vote.
- If the admin goes inactive for 30 days, the longest-standing member becomes admin automatically, and everyone is notified.
- Optional household setting: rotating admin each semester.

**Leaving a household**

- The app shows unsettled balances before the person can leave and asks them to clear or acknowledge them.
- Their chores return to the pool for the next draft.
- Their past expenses and messages stay for the remaining members. Their personal details are hidden after they leave.

## 5. Module: Shared Expenses

### Flow

1. A roommate logs a purchase: title, amount, date, category (groceries, household items, utilities, other), a receipt photo, and who it's shared with.
2. The chosen roommates see it and tap **Agree** or **Dispute**. A dispute requires a short reason, such as "I don't use this" or "price looks wrong."
3. On dispute, the buyer can edit the split, remove someone from it, or cancel the expense. The people involved can also settle it in chat.
4. Agreed expenses update the balances. Each person sees who owes whom.
5. When someone pays back, they mark it as paid, and the other person confirms receipt. Both steps are needed for it to count as settled.

### Rules

- Purchases are shared only after agreement. Nobody can force a charge on another roommate.
- Splits: equal by default, or custom amounts or percentages.
- A personal-expense tracker (private to each user) lets each person record their own spending without sharing it.
- Balances are simplified where possible (if A owes B and B owes C, show the shortest set of payments).
- Receipt photos are compressed before upload and visible only to household members.

### Screens

- Balances overview (the main screen: who owes whom)
- Add expense
- Expense detail (receipt, split, agree/dispute, comments)
- Settle up
- History with filters by person, month, and category

## 6. Module: Chore Draft and Reveal

This replaces timetable import. People schedule themselves.

### Flow

1. **Build the chore list.** Default chores (cooking, dishes, bathroom, trash, sweeping, mopping, groceries run) plus custom ones. Each chore has a frequency (daily, weekly) and an effort level (light, medium, heavy).
2. **Secret picks.** Each roommate privately selects chores they want, chores they'd rather avoid, and optionally chores they think each other roommate should take. Picks stay hidden until the reveal.
3. **Matching.** The app assigns chores to balance total effort across people, honoring wishes where possible.
   - If two people want the same chore, the one who got fewer of their wishes last round wins.
   - Unwanted chores are spread evenly.
   - Effort totals should end up within a small margin for every person.
4. **Reveal.** When everyone has submitted, a "Reveal" button appears. Everyone sees an animated sequence showing each person's chores, one roommate at a time.
5. **Self-scheduling.** Each person picks days and times for their assigned chores. Reminders use those times.
6. **Rotation.** The draft repeats weekly or monthly (household setting), and there is a "keep the same chores" option.

### Swaps and flexibility

- A person can offer a chore to a roommate, who accepts or declines.
- "I'm away" mode (exams, travel, illness) pauses a person's chores and redistributes them temporarily.

### Reminders

- Time-based push notifications at the time the person chose, plus an optional 30-minute early reminder.
- Each reminder can be dismissed or snoozed.
- No background location tracking in version 1.

## 7. Module: Chat

- One group chat per household (channels can be added later).
- Text, emoji, and reactions. No voice, video, or file sharing in version 1.
- **Activity messages** appear automatically: new expense, expense agreed or disputed, balance settled, chores revealed, chore completed, new member request, admin change.
- Tapping an activity message opens the related screen.
- Realtime delivery and unread counts.

## 8. Module: Chore Completion, Kudos, and Ratings

- When someone finishes a chore, they tap **Done**, optionally with a photo.
- Roommates can respond with: **Thanks**, **Great job**, or **Needs another look** (with a short note).
- Kudos earn points and streaks. A streak counts consecutive chores completed on time.
- A weekly summary shows each person's streak and kudos received. Negative feedback is private between the two people, and only positive recognition is shown to the house.
- Points can feed back into the draft as a tie-break bonus.

## 9. Module: House Meetings

- Anyone can propose a topic (noise, guests, cleaning standards, quiet hours).
- Members add comments and vote on options.
- Accepted outcomes can be saved as **House Agreements** and pinned in a Rules page.
- Optional monthly prompt: "Anything the house should talk about?"

## 10. Data Model

**users**: id, name, email, avatar, created\_at

**households**: id, name, currency, invite\_code, created\_by, settings (rotation, rotating\_admin), created\_at

**memberships**: id, user\_id, household\_id, role (admin or member), status (pending, active, left), joined\_at, left\_at

**join\_votes**: id, membership\_id, voter\_id, vote (ok or unsure)

**expenses**: id, household\_id, paid\_by, title, amount, category, receipt\_url, date, status (pending, agreed, disputed, cancelled), created\_at

**expense\_shares**: id, expense\_id, user\_id, share\_amount, response (pending, agreed, disputed), dispute\_reason

**settlements**: id, household\_id, from\_user, to\_user, amount, status (marked\_paid, confirmed), created\_at, confirmed\_at

**personal\_expenses**: id, user\_id, title, amount, category, receipt\_url, date (private to the user)

**chores**: id, household\_id, name, frequency, effort\_level, active

**draft\_rounds**: id, household\_id, status (collecting, revealed), created\_at, revealed\_at

**draft\_picks**: id, round\_id, user\_id, chore\_id, pick\_type (want, avoid, suggest\_for), target\_user\_id

**chore\_assignments**: id, round\_id, chore\_id, user\_id, scheduled\_days, scheduled\_time

**chore\_logs**: id, assignment\_id, completed\_at, photo\_url, on\_time

**kudos**: id, chore\_log\_id, from\_user, type (thanks, great\_job, needs\_look), note

**messages**: id, household\_id, sender\_id (null for system), type (text or activity), body, link\_target, created\_at

**meeting\_topics**: id, household\_id, proposed\_by, title, description, status

**meeting\_votes**: id, topic\_id, user\_id, vote or comment

**agreements**: id, household\_id, text, agreed\_at

**notifications**: id, user\_id, type, payload, read\_at

All household tables are protected by row-level security so only active members can read or write them.

## 11. Suggested Tech Stack

- **Frontend:** React or Next.js as a PWA (installable, push notifications), mobile-first layout, with Framer Motion or similar for the reveal animation.
- **Backend:** Supabase (Postgres, auth, realtime, storage) or Firebase. Supabase suits the relational data here.
- **Auth:** Google sign-in plus email.
- **Storage:** receipt and chore photos in private buckets, with signed URLs.
- **Notifications:** web push, with an in-app notification list as a fallback.
- **Hosting:** Vercel or Netlify.

## 12. Privacy and Security

- Row-level security on every household table.
- Receipts and photos are private to household members.
- Left members' personal data is hidden but expense records remain for accuracy.
- Users can delete their account and export their household data.
- Invite codes can be refreshed or disabled at any time.

## 13. MVP Scope

**Version 1 (build first)**

- Accounts, households, invite code and QR, join requests with house opinions and admin approval
- Admin handover and leaving flow
- Shared expenses with receipts, agree/dispute, balances, settlement
- Chore draft, reveal animation, self-scheduling, time-based reminders
- Group chat with activity messages
- Done, kudos, and streaks

**Version 2**

- House meetings and agreements
- Swaps and "I'm away" mode
- Personal expense tracker
- Rotating admin option
- Multi-currency display

**Later**

- Native Android app with "I'm home" detection
- Timetable import
- Channels in chat
- Monthly summaries and reports

## 14. Suggested Build Order for the Coding Agent

1. Project setup, auth, database schema, and row-level security
2. Households, invite code and QR, join requests, admin handover
3. Chat with realtime messages and activity feed
4. Expenses, receipts, agree/dispute, balances, settlements
5. Chore list, secret picks, matching logic, reveal animation
6. Scheduling and reminders (push notifications)
7. Done, kudos, and streaks
8. Polish: onboarding, empty states, warm microcopy, accessibility
9. Testing with one real apartment, then fixes

## 15. Open Questions

- Final logo and wordmark
- Whether to support languages besides English (many students speak other first languages)
- How to handle a household with a single remaining member
- Whether the matching should consider a simple "busy hours" input later

## 16. Additional Decisions and Gaps

These items were added after the first draft. Decide each one before or during the build.

**Money**

- Roomie does not move money. It only tracks who owes whom. People pay each other in cash or by bank transfer, then mark the payment as paid, and the receiver confirms. State this clearly in the app and in the terms.
- Currency: one currency per household. The amount is frozen at the moment it is logged. Because the Turkish lira can lose value quickly, show a note on long-unpaid debts and encourage settling monthly. Currency conversion is out of scope for version 1.

**Notifications**

- Web push on iPhone only works when the PWA is installed to the home screen. Onboarding includes an "Add to Home Screen" step with simple instructions for iPhone and Android.
- The in-app notification list and chat activity feed must work fully even when push is off.

**Onboarding**

1. Sign in.
2. Create a household or join with a code or QR.
3. Add or confirm roommates.
4. Pick starter chores from the default list.
5. Install to home screen and allow notifications.
6. First chore draft, ending with the reveal.

Every empty screen has a clear next action and a short Roomie message.

**Accounts and data**

- Users can delete their account and export their household data.
- Leaving a household requires settling or acknowledging balances first.
- If only one member remains, the household stays active. That member can invite new people and becomes admin automatically.
- Terms and a privacy notice are required before any launch beyond the first apartment.

**Backend decision**

- Not yet chosen (Supabase or Firebase). Decide before the data layer is built. The relational data model in section 10 fits Supabase naturally.

**Build approach for Google AI Studio, then Antigravity**

1. Build the frontend first with fake data: home, balances, chore picks, the chore reveal, and chat. Tune the Roomie look at this stage.
2. Add the real backend in the order of section 14.
3. Give the tool one screen or feature per prompt, and paste only the relevant section of this spec and the design doc each time.
4. Move the code and both docs to Antigravity later, and wire the backend there if the first tool cannot.

**Test plan**

- Run version 1 in one real apartment for two weeks, then note which features get skipped, which cause confusion, and what roommates ask for.
