# AnyStory — UI Mockup Design

**Date:** 2026-03-24
**Status:** Approved
**Scope:** Public-facing UI only (no admin dashboard)

---

## 1. Overview

AnyStory is a children's story generator that turns any public website URL into a short illustrated, narrated bedtime story. This document describes the approved visual design and UX for the public-facing interface.

---

## 2. Visual Style

**Direction:** Enchanted Night

- **Background:** Deep purple-to-warm-amber gradient (`#1e1145` → `#3d1a6e` → `#7c2d12`)
- **Stars:** Subtle multi-layer radial dot pattern over the background
- **Moon:** Glowing amber orb, top-right corner on all pages
- **Primary font:** Fredoka (all UI chrome, labels, buttons)
- **Story title font:** Bubblegum Sans
- **Story body font:** Patrick Hand
- **Primary accent:** Amber `#fbbf24` → Orange `#f97316` gradient
- **Cards:** Glassmorphism — `rgba(255,255,255,0.07)` background, `backdrop-filter: blur(24px)`, `1px rgba(255,255,255,0.12)` border
- **No dark mode toggle required** — the enchanted night aesthetic is the single theme

---

## 3. Pages

### 3.1 Home Page (`/`)

**Layout:** Centered Focus — everything vertically centered, recent stories below.

**Components:**
- Top navigation bar: logo left, sign-in button right (guest) or avatar + name right (signed in)
- App logo with book emoji + gradient text ("📖 AnyStory")
- Tagline: "Turn any website into a bedtime story — in seconds"
- Generator card (glassmorphism):
  - URL input with link icon prefix
  - 2-column selector row: Narrator Voice + Story Font (each shows name + character description)
  - Voice options: Rachel, Domi, Bella, Antoni, Elli, Josh, Arnold, Adam (from SPEC.md §4.4)
  - Font options: Bubblegum Sans, Patrick Hand, Fredoka, Baloo 2, Schoolbell, Short Stack, Sniglet, Chewy (from SPEC.md §8.2)
  - "✨ Generate My Story" amber→orange gradient CTA button
- Soft sign-in nudge below the card (guest only): "Want to save your stories? Sign in with Google"
- Recent stories section:
  - Guest: "Recent Public Stories" — last 6 stories, 3-column grid
  - Signed in: "My Stories" — user's own stories with count, amber info badge confirming auto-save

**States:**
- Guest: sign-in button in nav, nudge below form, public stories grid
- Signed in: avatar in nav, "My Stories" header with story count, auto-save badge

---

### 3.2 Generating Page (in-place replacement of home content)

Replaces the home view after form submission while polling `/api/stories/status/[id]`.

**Components:**
- Heading: "Crafting your story…" + sub "Usually takes 30–60 seconds"
- Progress card (glassmorphism):
  - Source URL display row
  - 4 steps with status icons:
    1. 🔍 Scraping website — `done` (green ring + ✅)
    2. ✍️ Writing your story — `done` (green ring + ✅)
    3. 🎨 Painting the illustration — `active` (amber pulsing ring + ⏳)
    4. 🎙 Recording narration — `pending` (dim ring + ○)
  - Progress bar: amber→orange gradient fill, glowing shadow
- Step icon states: `done` = green tint + border, `active` = amber tint + pulse animation, `pending` = dim

---

### 3.3 Story Page (`/story/[slug]`)

**Layout:** Single storybook card, centered, max-width 560px.

**Components:**
- Top navigation: logo + user state (same as home)
- Story card (glassmorphism with rounded corners):
  - **Illustration area** (340px tall): AI-generated image with gradient background fallback, "🎨 Fal AI · Flux Pro Ultra" tag bottom-left
  - **Story body:**
    - Source domain (small, muted, uppercase)
    - Story title (Bubblegum Sans, 32px, amber→orange gradient)
    - Story text (Patrick Hand, 17px, 1.78 line-height)
    - Custom audio player: play button (amber gradient), track bar with scrubber, narrator name, timestamp
    - Action row: Copy Link · Download MP3 · ✨ New Story (CTA)
    - Signed-in indicator: "✅ Saved to your library" (below actions, signed-in only)
- Guest-only save nudge below the card: amber-tinted banner — "Want to keep this story? Sign in to save it to your library." with "Save Story →" pill button

---

### 3.4 Sign In Page (`/signin`)

**Layout:** Centered card, vertically centered in full viewport.

**Components:**
- Logo + "Welcome back!" heading
- Descriptor: explains library/save benefits
- "Continue with Google" button (white, Google logo, full width)
- "— or —" divider
- "Continue without signing in" text link (exits to home guest)
- Benefits list (3 items, icon + text):
  - 📚 Your story library, saved forever
  - 🔗 Shareable links tied to your account
  - 🆓 Free to use — no credit card

**Auth flow:**
- Google OAuth via NextAuth.js
- No email/password form
- No forced login — guests can generate and read freely
- Sign-in is prompted at two soft moments:
  1. Below the generator form on Home (guest state)
  2. "Save Story" banner on the Story page (guest state)

---

## 4. Authentication Model

| State | Can generate | Stories saved | Rate limit |
|---|---|---|---|
| Guest | Yes | No (session only) | IP-based (5/hr) |
| Signed in | Yes | Yes (to account) | User-based |

- Auth provider: Google OAuth only (NextAuth.js)
- No email/password, no magic link
- Session persists across visits when signed in
- Generations are associated to `userId` when available, otherwise anonymous

---

## 5. Design Tokens

| Token | Value |
|---|---|
| Background gradient start | `#1e1145` |
| Background gradient mid | `#3d1a6e` |
| Background gradient end | `#7c2d12` |
| Accent amber | `#fbbf24` |
| Accent orange | `#f97316` |
| Glass fill | `rgba(255,255,255,0.07)` |
| Glass border | `rgba(255,255,255,0.12)` |
| Text primary | `#ffffff` |
| Text dim | `rgba(255,255,255,0.5)` |
| Text muted | `rgba(255,255,255,0.3)` |
| Success green | `#4ade80` |
| Error red | `#f87171` |
| Border radius (cards) | `24px` |
| Border radius (inputs) | `14px` |
| Border radius (buttons) | `14px` |
| Border radius (chips/pills) | `100px` |

---

## 6. Component Inventory

| Component | Location | Notes |
|---|---|---|
| `UrlForm` | `components/generator/UrlForm.tsx` | URL input + selectors + CTA |
| `GenerationProgress` | `components/generator/GenerationProgress.tsx` | Polling + step display |
| `StoryCard` | `components/story/StoryCard.tsx` | Illustration + title + text |
| `AudioPlayer` | `components/story/AudioPlayer.tsx` | Custom HTML5 player |
| `VoiceSelector` | `components/story/VoiceSelector.tsx` | Dropdown, name + description |
| `FontSelector` | `components/story/FontSelector.tsx` | Dropdown, name + description |
| `SignInNudge` | `components/auth/SignInNudge.tsx` | Soft prompt (home + story page) |
| `SaveStoryBanner` | `components/auth/SaveStoryBanner.tsx` | Amber banner on story page (guest) |
| `UserNav` | `components/ui/UserNav.tsx` | Avatar + name or sign-in button |

---

## 7. Mockup Files

Interactive HTML mockups saved at:
```
.superpowers/brainstorm/22735-1774332951/
  visual-style.html       # Style direction selection (A/B/C)
  home-layout.html        # Layout structure selection (A/B/C)
  mockup-v2.html          # Final approved mockup — all 6 views
```
