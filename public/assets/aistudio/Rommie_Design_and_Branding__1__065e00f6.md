# Roomie: Design and Branding

Companion to the Roomie Build Spec · Draft v1 · October 23, 2026

This document covers how Roomie looks, moves, and sounds. It is kept separate from the build spec so the visual direction can be iterated on without touching the product requirements. The coding agent should read it alongside the build spec and use the tokens in section 10 as the single source of styling.

## 1. Goal

Roomie should feel like a friendly game the household plays together, not a utility app. The style is inspired by playful learning and habit apps (chunky buttons, bright colors, a caring mascot, celebration moments), but it must have its own identity. Do not copy another brand's colors, mascot, typeface, or sounds.

## 2. Brand Personality

- **Warm:** like a good housemate or an older sibling.
- **Playful:** celebrates small wins, never takes itself too seriously.
- **Fair:** the tone never takes sides between roommates.
- **Encouraging, never shaming:** nudges, not scolding.

**Voice examples**

- Good: "Kitchen's sparkling. Thanks, Amina!"
- Good: "Dishes are waiting. Want to do them now or later?"
- Avoid: "You failed to complete your task."
- Avoid: "Everyone is waiting on you."

## 3. The Mascot

A small, round, expressive character named Roomie. Final artwork is still to be designed. Keep it simple enough to animate in a few frames (a good fit for Lottie or Rive animation).

**Required states**

- **Idle:** gentle blink and small bounce on the home screen.
- **Cheering:** after a chore is done or a streak grows.
- **Celebrating:** big moment, used for the chore reveal and a fully settled balance.
- **Sleepy:** a chore is overdue, shown softly and without blame.
- **Thinking:** while the chore matching runs.
- **Calm and caring:** used on money and dispute screens, with no bouncing and no jokes.

The mascot appears in empty states, onboarding, reminders, and celebrations. It should never appear on the receipt or balance detail itself.

## 4. Color

These are starting values. Adjust by eye, but keep the roles.

| Role | Suggested value | Use |
| --- | --- | --- |
| Primary | #FF6B4A (coral) | Main buttons, highlights |
| Primary dark | #D94E30 | Button bottom edge, pressed state |
| Secondary | #19B5A5 (teal) | Chores, positive actions |
| Reward | #FFC93C (sunny yellow) | Kudos, streaks, points |
| Info | #5B5BD6 (indigo) | Chat, links, info |
| Success | #3DBE6D | Settled, done |
| Error | #E5484D | Disputes, warnings (use sparingly) |
| Ink | #1F2430 | Main text |
| Muted | #6B7280 | Secondary text |
| Line | #E6E8EE | Borders, dividers |
| Background | #F7F8FB | App background |
| Surface | #FFFFFF | Cards |

Small text must meet a contrast ratio of at least 4.5:1. White text on bright coral or teal may not pass at small sizes, so use the dark variants or larger bold text and check each combination. Dark mode should be planned but can follow version 1.

## 5. Typography

- **Headings and buttons:** a rounded, friendly font such as Nunito (bold) or Baloo 2, both free on Google Fonts.
- **Body:** Nunito regular, or a clean sans such as Inter for dense screens.
- Sizes and roles are fixed by the Type Scale in section 14. No other sizes are allowed.
- Sentence case everywhere, with no all-caps except tiny labels.

## 6. Shapes and Components

- **Buttons:** large, rounded (about 16px radius), with a solid darker bottom edge (about 4px) that flattens when pressed, giving a tactile 3D feel. One primary button per screen.
- **Cards:** white surface, 20px radius, thin border, soft shadow.
- **Chips and badges:** fully rounded pills for categories, streaks, and roles.
- **Progress and streak:** thick rounded bars and a flame or star icon in the reward color.
- **Icons:** one consistent rounded outline or filled set. Avoid mixing styles.
- **Spacing:** use an 8px grid. Give content room, with one clear action per screen.

## 7. Motion and Feedback

- Quick, springy transitions (150 to 250 ms). Nothing slow on routine screens.
- **Chore reveal:** the most important animation in the app.
  1. Everyone taps "Reveal" and a short countdown plays.
  2. Cards flip or slide in one roommate at a time, each with their avatar and chores.
  3. Roomie reacts (cheering or a playful look for heavy chores).
  4. A final summary card shows the whole week.
- **Small celebrations:** confetti or sparkle on a completed chore, a new streak day, kudos received, and a settled balance.
- **Haptics:** a light tap on button press and a stronger one on celebrations (where the device supports it).
- **Sound:** short, soft, optional, and off by default or easy to mute. Create original sounds.
- Respect the device's reduced-motion setting and replace big animations with simple fades.

## 8. Playful vs Calm Screens

| Playful (full style) | Calm (same colors, quiet motion) |
| --- | --- |
| Home and household feed | Balances overview |
| Chore draft and picks | Expense detail and receipts |
| Chore reveal | Dispute and settle up |
| Done, kudos, streaks | Join requests and admin handover |
| Onboarding | Leaving a household |
| Empty states | House rules and agreements |

On calm screens the mascot is small or absent, buttons keep their shape but have no bounce, and the copy stays clear and neutral.

## 9. Notifications and Microcopy

- Reminders are friendly and specific: "Time for the bathroom. Roomie's cheering you on."
- Never mention other roommates' failures in a notification. Overdue chores are only shown inside the app, softly.
- Cap reminders (for example, one reminder and one gentle follow-up per chore) so the app doesn't feel naggy.
- Every reminder has a clear dismiss and snooze action.
- Money notifications are plain: "Amina added a receipt. Take a look when you can."
- Empty states encourage action: "No chores yet. Pick some and let the draft begin."

## 10. Design Tokens for the Coding Agent

Implement the colors, fonts, spacing, radius, and shadow values above as a single theme file (CSS variables or a Tailwind config) and use only those tokens in components. Do not hard-code colors in screens. Build a small shared component library first (Button, Card, Chip, Avatar, ProgressBar, Toast, Modal, MascotView) and reuse it everywhere. This keeps iteration quick: changing a token should restyle the whole app.

## 11. Accessibility

- Text contrast of at least 4.5:1, with larger text at 3:1.
- Tap targets at least 44px.
- Never use color alone to show status (add icons or labels).
- Support screen readers with proper labels, and give every animated element a non-animated fallback.
- Allow text scaling without broken layouts.

## 12. Assets to Produce

- App icon and wordmark
- Mascot artwork and the six animation states
- Icon set
- Reveal animation
- Confetti and sparkle effects
- Sound set (optional)
- Onboarding illustrations (three to four screens)

## 13. Open Decisions

- Final mascot design and species or shape
- Final primary color (coral is a placeholder)
- Dark mode in version 1 or later
- Whether to include sound at launch

## 14. Type Scale (Required)

Every piece of text in the app uses exactly one of these roles. No custom sizes, weights, or colors outside them. Define the scale once in the theme file.

| Role | Size | Weight and font | Color |
| --- | --- | --- | --- |
| Big number | 32px | Rounded display font, bold | Ink or status color |
| Title | 24px | Rounded display font, bold | Ink |
| Section heading | 18px | Rounded display font, bold | Ink |
| Body | 16px | Regular | Ink |
| Secondary | 14px | Regular | Muted gray |
| Label | 14px | Semibold, uppercase, slight letter spacing | Muted gray |

**Rules**

- The minimum text size is 14px everywhere, including captions, timestamps, and helper text.
- Bold is only for Title, Section heading, Label, Big number, and buttons.
- Semantic colors (green, red, amber) are only for statuses and amounts, never for labels or section names.
- Red is only for decline, dispute, delete, and errors. A neutral count such as "0 not sure" is never red.
- Every screen has one Title or Section heading at the top, labels for groups, body text for content, and secondary text for details. No more than four distinct text styles on any screen.
- Do not repeat information in text. If an avatar shows a country badge, do not write the country code again. If a screen already says something, do not explain it a second time.
- Button text is a single line and is never wrapped. Keep labels short ("Approve", not "Approve Roommate").
- Sentence case everywhere, apart from the uppercase Label role.

## 15. Component Rules (Required)

Screens may only use these shared components. No screen defines its own one-off button, card, or heading style.

**Buttons (three types)**

- **Primary:** coral, tactile bottom edge. One per screen, for the main action.
- **Secondary:** white fill, 2px border, tactile bottom edge, ink text. For every equal-level choice (for example "Create new apartment" and "Join with code or QR", "Settle up", "Show QR", "Open schedule", "Opinion: OK"). Destructive actions such as Decline use the Secondary style with red text.
- **Tertiary:** small text button in muted ink, for low-importance actions (Swap, I'm away, Cancel).
- Bare colored text links with arrows or chevrons are not allowed. Module colors appear only as icon tile colors and small accents.

**Cards (four types)**

- **Hero:** gradient tint with the mascot. One per screen, at the top.
- **Action:** for anything that needs a response (join requests, today's chore, balance, an expense waiting for an answer). Tinted background and border in the item's color, solid icon tile, a readable one-line prompt, and the action buttons right on the card.
- **Info:** flat white, 1px border, not tappable.
- **List row:** used in lists and the feed, with the same radius, padding, and icon tile size everywhere.

**Icon tiles:** solid colored tiles with a white icon (teal for chores, coral for money, indigo for chat and people, green for success). No faint outline-only icons in circles.

**Modals and sheets:** the same Card and Button types. The selected option has a coral tint, a coral border, and a check mark. Unselected options use the Info card style.

**Other rules**

- Focus: replace the browser's default black outline with a soft coral focus ring, shown for keyboard use only.
- Tap targets are at least 44px.
- Text contrast is at least 4.5:1.
- Words in the interface: "Apartment" and "Roomies". Do not mix in Flat, Household, Flatmates, or Roommates. ("Household" remains the technical name for the data in the build spec.)

## 16. Golden Reference: The Switch Apartment Sheet

The Switch Household sheet in the first prototype is the benchmark for the visual style of the whole app.

**What it does right**

- One strong color moment: the selected row has a tinted fill, a colored border, a solid icon tile, and a check mark.
- Clear hierarchy: a large rounded title, a quiet subtitle, and small muted details.
- Depth: it floats above a blurred background with large rounded corners and generous padding.
- A tactile button, so it looks pressable.

**What to avoid (seen on the first Home screen)**

- Identical flat white cards with hairline borders, so nothing leads
- Thin text links with arrows and chevrons instead of buttons
- Faint icons and tiny captions
- Cards that look the same whether or not they need a decision
- Red used for something that is not an error

**Home screen treatment**

- **Join request:** an indigo-tinted Action card with a solid icon tile and OK and Not sure buttons directly on the card.
- **Today's chore:** a teal-tinted Action card with a solid teal tile and a Done button.
- **Balance:** a green-tinted Action card with a Big number and a Settle up button.
- **Feed items:** solid tiles colored by type (teal for chores, coral for money, indigo for chat), with the action on the card (for example a Give kudos button) instead of a chevron.
- **Roomies:** an avatar row with a colored status ring and readable names.

**Example: the join request modal under these rules**

1. Title: "Join request". Secondary: the apartment name.
2. Applicant: name as a Section heading, email as Secondary, country written once.
3. Label: "Roomies' opinions", with neutral count chips and two equal Secondary opinion buttons.
4. Label: "Admin decision", one line of Secondary text, then Approve as the Primary button and Decline as Secondary with red text.

## 17. Audit Additions

These rules were added after reviewing the first full desktop prototype. They extend sections 14 to 16.

**Type scale addition**

| Role | Size | Weight and font | Color |
| --- | --- | --- | --- |
| Card title | 16px | Rounded display font, semibold | Ink |

Use Card title for the name of an item inside a card (a chore, an expense, a roomie). Section heading (18px) is for the heading above a group of cards. Nothing below 14px, including meta lines such as "4 roomies sharing equally", tab labels, and subtitles.

**Buttons per card and per screen**

- An Action card may have one solid button in its own color. Every other button is Secondary or Tertiary.
- No more than three solid buttons should be visible in one screen section.
- Rare or risky actions (Away mode, Leave apartment, Delete account) use quiet Secondary or Tertiary buttons, never loud solid cards. Delete account lives in a separate danger area.

**Selection controls (only these)**

- **Top navigation:** the pill for the current main screen.
- **Segmented control:** switches between views of the same content inside a screen.
- **Filter chips:** filter a list. Do not group a list by status and also offer status chips; choose one.

**Color roles**

| Color | Role |
| --- | --- |
| Coral | Primary action and the Money module |
| Teal | Chores and positive progress |
| Indigo | People, chat, and join requests |
| Yellow | Rewards only (streaks, kudos, points) |
| Green | Success and positive amounts |
| Red | Destructive actions and errors only |

Charts use their own palette and never reuse the reward yellow for ordinary categories. All toggles use one color when on.

**Writing rules**

- Sentence case for buttons and headings ("Log expense", "Set away mode", "Settle up"). The only uppercase text is the Label role.
- One name per action: "Log expense" everywhere, never also "Add expense".
- One name per thing: Apartment and Roomies, never Household, Roommates, or Flatmates in the interface.
- Apartment code is written one way: CYP-7492 (no # and no "Apartment:" prefix).
- Correct plurals ("1 transfer", "3 votes") and no "You (YOU)".
- Never truncate the apartment name when there is room for it.

**Chat**

- System events in chat are compact one-line notices with a small icon, not large cards. Large event cards belong on the Home feed only.
- Message bubbles never touch the scrollbar or container edge.
- Event buttons match the event: "View schedule", "Review receipt", "Review request", "Give kudos".

**One source of truth**

All screens read from a single seed dataset and state table (join request states, expense states, chore draft states). A person, expense, or chore cannot be in two states at once on different screens. Only agreed expenses count toward balances.

**Votes and ranking**

- Agree and Disagree buttons are styled identically, and counts stay hidden until the person has voted.
- No numbered rankings. Show equal cards with a positive "Streak star" badge for the longest streak.

## 18. Icon Dictionary

Use one icon family (for example Lucide) at one stroke weight. One icon per concept, never reused for a different meaning. Module tiles are solid colored with a white icon.

| Concept | Icon |
| --- | --- |
| Chores | Clipboard with check |
| Secret draft / picks | Shuffle |
| Chore reveal | Sparkles (only for the reveal moment) |
| Join / invite a person | User with plus |
| Roomies / people | Users |
| Expense / receipt | Receipt |
| Balance | Wallet |
| Settle / payment | Banknote with arrow |
| Chat | Message bubble |
| Kudos | Heart |
| Streak | Flame |
| Admin | Shield |
| Away mode | Plane |
| Notifications | Bell |
| Settings | Gear |
| Rules and agreements | File with check |
| Apartment | Building |
| Sync status | Cloud with check, arrows, or slash |

Emoji are used sparingly (at most one per message) and never inside headings, because they render differently on every device.
