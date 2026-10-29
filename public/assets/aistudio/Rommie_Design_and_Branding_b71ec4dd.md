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
- Large, generous sizes. Minimum body size 16px.
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
