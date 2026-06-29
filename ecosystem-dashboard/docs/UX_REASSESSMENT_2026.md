# Kids Dashboard — UX Reassessment & New Design Goals

> Status: **Current assessment (2026-06-22).** Supersedes the pre-code UI/UX audit
> (`KIDS_DASHBOARD_UX_PLATFORM_AUDIT.md`) for all UI-layer findings. The harness
> audit (`KIDS_DASHBOARD_HARNESS_AUDIT.md`) and architecture docs
> (`FSD_AGENTIC_HARNESS.md`, `LEARNING_EXPERIENCE_DESIGN.md`) remain canonical for
> their respective layers.
>
> This doc is grounded in the **actual codebase today**, not aspirations.

---

## 1. What Changed Since the Last Assessment

The last UX audit (`KIDS_DASHBOARD_UX_PLATFORM_AUDIT.md`) was written pre-code.
Since then, significant work landed:

| Area | Then | Now |
|------|------|-----|
| **Chat unification** | 5+ bespoke inline chat UIs (Art Helper, Reading Buddy, Study Buddy, etc.) | All child panels now use shared `ChildTutorTab` → `TutorCompanion` |
| **Theme-awareness** | Hardcoded `pink.50`, `gray.50`, `purple.50` everywhere | Non-chat tabs in Journal, Planner, Art Studio, Home use `useChildTheme()` colors |
| **Activity Registry** | Did not exist | `src/domains/learning/shared/activity-registry.ts` with `KNOWN_ACTIVITY_IDS`, personas, tool rosters |
| **Tutor Companion** | Did not exist | `TutorCompanion.tsx` — shared component with quick actions, concept checks, tool-hop progress |
| **Agent Transport** | Single-shot LLM call only | `picode-transport.ts` — multi-hop tool-using loop with tool gate, safety lane, fallback |
| **Learning Kit** | Did not exist | `MasteryBar`, `StreakFlame`, `DailyGoalRing`, `LevelChip`, `XPBurst`, `InteractiveLessonCard`, `ConceptCheckCard` |
| **Context Hub** | Did not exist | `context-hub.ts` + `context-hub-service.ts` with `ContextFrame`, `ContextEnvelope`, providers |
| **Activity Theme** | Global per-child only | `resolveEffectiveTheme()` overlays activity tokens on base theme; `EffectiveChildTheme` in context |
| **Right panel coverage** | Missing pokemon-lab, learn, learning-path, teams | All child routes have panel contexts |
| **Dead code** | Inline chat state, handlers, constants in every panel | Removed from Journal, Planner, Art Studio |

---

## 2. What Still Looks Primitive — the Honest Assessment

Despite the structural progress, **the user-facing experience still feels
primitive**. The architecture is sound; the UI is not. Here is a candid
inventory of what a child actually sees today:

### 2.1 The Chat Experience

**What the child sees:** A plain text input at the bottom of the right panel.
Messages are simple text bubbles. There are three small pill buttons (Explain,
Hint, Check) that send a canned prefix. Loading state is a spinner with cycling
phrases. That's it.

**What's missing vs. Brilliant / modern kid apps:**

- **No rich content in messages.** The agent can return text and an optional
  concept-check card, but it can't render images, diagrams, interactive
  manipulatives, code blocks, math notation, or embedded cards *inside* the chat
  flow. Brilliant lessons are visual + interactive; our chat is a text walkie-talkie.
- **No streaming.** The child waits in silence for the full response. Modern chat
  UIs stream tokens so the child sees the agent "thinking" in real time.
- **No voice input or output.** The `LEARNING_EXPERIENCE_DESIGN.md` spec calls
  for read-aloud and speech-to-text (pre-readers!), but the companion has neither.
- **No conversation memory across sessions.** Messages are in React state —
  refresh and they're gone. No persistence, no scrollback.
- **No visual persona.** The "persona" is a string name + emoji avatar. No
  animated character, no expressions, no reactions to correct/wrong answers.
- **No contextual awareness shown to the child.** The Context Hub feeds context
  to the agent, but the child can't see *what* the agent knows — no "I see you're
  on the Counting Island lesson" indicator, no breadcrumb linking chat to activity.
- **Quick actions are generic.** "Explain / Hint / Check" are the same on every
  surface. They should be activity-specific: "Show me an example" in math, "Read
  this to me" in books, "Give me a drawing idea" in art.

### 2.2 The Right Panel (Non-Chat Tabs)

**What the child sees:** Scrolling lists of static cards with emoji headers,
text descriptions, and occasional badges. The styling is now theme-aware, but
the *content* is static and hardcoded:

- **Home panel** still has inline chat code (`AIMessage`, `messages`, `input`,
  `loading`, `handleSend`) — the dead code cleanup hasn't reached it yet.
- **Journal** writing-tips are a static list. Prompts are static. Progress tab
  shows hardcoded zeros from localStorage — no real data.
- **Planner** goals are static achievements. Settings are localStorage. No
  connection to the real planner API (`/api/learn/plan`).
- **Art Studio** image settings are static style pickers. Gallery is empty
  placeholders. Challenges are static text.
- **No activity uses real learner data.** Mastery bars show 0%. Streaks show 0.
  Goals show 0/N. Everything is mockup data in localStorage.

### 2.3 The Main Canvas (Left Side)

**What the child sees:** Each studio is a full-page monolith with its own
bespoke layout:

- **Pokemon Lab** (131KB) — the most polished, with real lessons, interactive
  components, badges, and a concept lens. But it's a self-contained world; the
  right panel companion can't see into it (the `stateRef` integration exists but
  only for the pokemon-lab page, not surfaced in the companion UI).
- **Workspace** (78KB) — a monolith with half-finished old/new refactors.
- **Chat page** — still exists as a standalone page (`/child/chat`) with the
  70KB `ChildChatUI` component, separate from the right-panel companion.
- **Other studios** (books, dictionary, journal, art-studio, planner) — each is
  a standalone page with its own layout, not integrated with the companion.

### 2.4 The Dashboard Shell

**What the child sees:** A left sidebar with navigation icons, a top bar, a main
content area, and a right panel. The shell works but feels like an *admin
dashboard*, not a *kid's learning world*:

- **No world map / narrative skill-map.** The `LEARNING_EXPERIENCE_DESIGN.md`
  spec calls for "Counting Island," "Shapes Forest" — an explorable world. The
  home page is a grid of quick-action buttons.
- **No session shape.** No "warm-up → target → practice → reflection" flow. No
  review burst at session start. No "exit on a win" logic.
- **No onboarding flow.** A new child lands on a dashboard with no guidance,
  no character greeting, no "let's find out what you know."
- **No transitions or motion design.** Page changes are hard cuts. Card
  appearances have a subtle pop animation, but there's no journey feeling.

### 2.5 The Architecture vs. Experience Gap

The critical insight: **we built the pipes but not the fountain.** The Activity
Registry, Context Hub, Tool Roster, agent transport, safety lane, and theme
system are all real — but they're invisible to the child. The UI layer doesn't
yet *express* the capabilities the architecture provides.

| Architecture capability | UI expression today |
|------------------------|-------------------|
| Agent can call tools (hint, generate, define, read-aloud) | Three generic pill buttons |
| Context Hub knows what surface the child is on | Nothing visible to the child |
| Activity theme overlay | Colors change, but layout/structure don't |
| Concept checks (Brilliant-style predict-then-reveal) | Rendered, but only when agent emits them (rare) |
| Mastery/progress data in PCG | Hardcoded zeros in localStorage |
| Persona system (Buddy/Steve/Pusheen) | Emoji + name string |
| Multi-hop agent loop | Hidden behind a spinner |

---

## 3. New Design Goals

### Goal 1: The Companion Is a Character, Not a Textbox

**Target:** The tutor companion should feel like a *character* that is *with*
the child, not a chatbot at the bottom of a panel.

- **Animated avatar** — the persona (Buddy/Steve/Pusheen) has a visual presence
  that reacts: happy on correct, thoughtful on loading, encouraging on stuck.
  Start with CSS-animated SVG/emoji; later upgrade to sprite sheet.
- **Speech bubbles, not input bars** — messages render as speech bubbles from
  the character, not gray boxes. The input field is styled as "whisper to your
  buddy" with a soft, rounded look.
- **Voice I/O** — integrate Web Speech API for read-aloud (tap any message to
  hear it) and speech-to-text (tap microphone to speak instead of type). This is
  critical for pre-readers (ages 5–7) and a quality-of-life feature for all ages.
- **Contextual greeting** — when the child enters a studio, the companion says
  "Welcome to the Art Studio! Want me to help you come up with an idea?" — not a
  generic "Hi, I'm Buddy."
- **Reactive quick actions** — buttons change per activity: "Show example" in
  Learn, "Read to me" in Books, "Give me an idea" in Art, "Check my spelling" in
  Journal. Driven by the Activity Registry's tool roster.

### Goal 2: Chat Messages Are Rich, Not Plain Text

**Target:** Agent responses can contain embedded interactive elements, not just
text strings.

- **Structured message types** — the agent can return:
  - `text` (plain message)
  - `concept_check` (interactive MCQ — already implemented)
  - `hint_card` (tiered hint with "show next level" button)
  - `example_card` (worked example with step-by-step reveal)
  - `celebration` (animated confetti + praise + XP burst)
  - `image_prompt` (suggested image to draw, with "copy to clipboard")
  - `passage` (embedded reading passage with read-aloud button)
- **Streaming** — responses stream token-by-token so the child sees the agent
  composing its answer. Use SSE or chunked transfer from the agent-turn API.
- **Message persistence** — conversations persist per activity per session.
  When the child returns to a studio, they see their previous conversation.
- **Markdown rendering** — agent can use bold, lists, code blocks, and simple
  diagrams (ASCII art or embedded SVG) in messages.

### Goal 3: The Right Panel Is an Activity Dashboard, Not a Static List

**Target:** Each studio's non-chat tabs show *real, live data* and *interactive
controls*, not hardcoded mockups.

- **Wire to real APIs** — Journal progress reads from `/api/child/journal`. Planner
  reads from `/api/learn/plan`. Art Studio gallery reads from actual image store.
  Home reads from `/api/child/dashboard`.
- **Gamification with real data** — `StreakFlame`, `DailyGoalRing`, `MasteryBar`,
  `LevelChip` show real values from the learner model (PCG / Postgres), not zeros.
- **Activity-specific widgets** — each studio's non-chat tabs have widgets
  relevant to that activity:
  - **Home:** Today's mission card, active courses grid, daily challenge, streak + goals header
  - **Learn:** Current lesson card with progress, mastery bars per skill, next-up
    recommendation
  - **Pokemon Lab:** Trainer journey badges, lesson progress, type coverage
  - **Journal:** Writing streak, entry count, prompt of the day, mood tracker
  - **Art Studio:** Gallery grid, style settings, daily challenge with completion
  - **Planner:** Today's tasks, weekly progress, goal tracker, parent-set goals
- **Interactive, not just display** — tabs have buttons that *do things*: mark
  task complete, start a lesson, copy a prompt, toggle a setting. Not just
  read-only lists.

### Goal 4: The Home Is a Brilliant-Style Skill Dashboard, Not a Button Grid

**Target:** The home page follows Brilliant.org's home design — a clean, focused
**skill dashboard** that shows progress, today's work, and next steps. Not a
world map, not a grid of app icons — a *learning dashboard*.

**Brilliant's home has five sections. We adapt each for kids:**

1. **Today's Mission card** (Brilliant's "Today" section) — a prominent card at
   the top showing the single most important thing to do right now:
   - The lesson/activity the planner recommends (from `/api/learn/plan`)
   - A progress ring showing how far into today's goal the child is
   - One tap to start — no navigation hunting
   - If no plan exists: "Pick something to explore" with 2–4 bounded choices

2. **Active Courses grid** (Brilliant's course cards) — a responsive grid of
   cards, one per learning domain the child is working in:
   - Each card: emoji/icon, title, `MasteryBar` showing real mastery %, and a
     subtle "continue" arrow
   - Cards are tappable → navigate to that studio
   - Cards re-theme per activity (Art Studio card uses art palette tokens, etc.)
   - In-progress courses sorted first; mastered courses dimmed to the bottom
   - Example cards: "🧮 Math — Adding within 10 (62%)", "📚 Reading — Phonics
     (80%)", "🔬 Pokémon Lab — Data Detective (45%)", "✏️ Journal — Creative
     Writing (30%)"

3. **Daily Challenge** (Brilliant's daily problem) — a single interactive
   problem-of-the-day card that's fun, low-stakes, and cross-domain:
   - Uses the `ConceptCheckCard` component (already built)
   - Completing it contributes to the daily goal ring
   - If the child already did it: shows a "✅ Completed!" state with the answer

4. **Streak + Goals header** (Brilliant's progress sidebar, adapted) — a compact
   horizontal strip at the top of the page:
   - `StreakFlame` (real streak from learner data)
   - `DailyGoalRing` (real progress from session data)
   - `LevelChip` (real level from XP data)
   - All driven by real data, not localStorage zeros

5. **Keep Exploring** (Brilliant's "More courses" section) — below the active
   grid, a smaller section showing activities the child hasn't tried yet:
   - Dimmed cards with "New!" badges
   - Tapping starts a mini-placement probe so the agent can calibrate difficulty

**What this is NOT:**
- Not a world map with islands and characters walking around (that's a
  kid-gaming aesthetic — Khan Academy Kids, ABCmouse, Prodigy — not Brilliant)
- Not a grid of app-icon buttons (that's an admin dashboard)
- Not a feed of random activities (that's unstructured)

**Session flow** (separate from home layout, but related) — when a child starts
a session from the home:
  1. **Review burst** (3–5 items from older skills — "Let's see what you
     remember!")
  2. **Main activity** (today's mission or chosen activity)
  3. **Reflection** (companion asks "How did that feel? Easy / just right /
     tricky?")
  4. **Exit on a win** (end after a success; offer "done for today?" or "keep
     going")

**Onboarding** — first-time experience: companion introduces themselves, asks
the child's name, does a quick "let's see what you know" placement probe, and
the home grid populates with calibrated starting courses.

**Transitions** — moving between home and a studio uses a smooth fade; the
companion stays present in the right panel throughout.

### Goal 5: The Architecture Becomes Visible

**Target:** The child (and parent) can *see* that the agent is context-aware,
tool-using, and adaptive — not just a chatbot.

- **"What I know" indicator** — a small badge in the companion header showing
  the current context: "📚 Reading: The Three Little Pigs" or "🧮 Math: Adding
  within 10." The child sees the agent knows where they are.
- **Tool-hop visualization** — when the agent calls a tool, show it inline:
  "🔍 Looking up the definition..." → "📖 Found it!" → then the answer. Not a
  generic spinner, but a trace of what the agent is *doing*.
- **Mastery feedback** — after a concept check, show the mastery bar updating
  in real time: "Your mastery of 'Adding within 10' went from 60% to 75%!"
- **Adaptive transparency** — the companion explains difficulty changes in plain
  language: "Those were tricky, so I picked easier ones to warm up" or "You're
  flying — want a challenge puzzle?"

### Goal 6: Dead Code Cleanup Completes

**Target:** No remaining inline chat implementations or hardcoded mockup data.

- **ChildHomePanel** — still has `AIMessage`, `messages`, `input`, `loading`,
  `handleSend`, `messagesEndRef`. Remove and use `ChildTutorTab` like all other
  panels. Wire the daily-guide tab to real dashboard data.
- **ChildChatUI** (70KB standalone chat page) — either integrate into the
  companion system or remove. The standalone chat page should not exist
  separately from the right-panel companion.
- **Workspace old/new** — remove `workspace-old.tsx` / `workspace-new.tsx`
  half-finished refactors.
- **Duplicate endpoints** — consolidate `goosemind/chat` + `chat.ts` +
  `agent-turn` into one path.

### Goal 7: Parent-Facing UX Is a Control Plane, Not a Monitor

**Target:** Parents can *steer* learning, not just *watch* it.

- **Goals → planner** — parent sets weekly goals ("Sofia: focus on sight words
  3x this week") and the planner incorporates them into next-best-action.
- **AI content review queue** — generated content appears in a parent queue
  before it's used in graded items.
- **Session reports** — after each session, parent gets a digest: what the child
  worked on, mastery changes, struggles, wins.
- **Difficulty bounds** — parent can set "keep Sofia in the 70–85% success band"
  or "allow stretch challenges."

---

## 4. Priority Order (What to Build Next)

Ordered by **child-visible impact** (not architectural dependency):

| # | Goal | Impact | Effort |
|---|------|--------|--------|
| 1 | **Streaming chat responses** | Huge — eliminates "silent waiting" | Medium — SSE on agent-turn API + client streaming parser |
| 2 | **Rich message types** (hint cards, example cards, celebrations) | Huge — chat becomes interactive, not just text | Medium — extend `CompanionMessage` type + render components |
| 3 | **Contextual companion greeting + reactive quick actions** | Large — companion feels present, not generic | Small — activity-specific greeting strings + per-activity action config |
| 4 | **Tool-hop visualization** | Large — child sees the agent *doing things* | Small — already have `toolsUsed` metadata, just render it better |
| 5 | **Voice I/O (read-aloud + speech-to-text)** | Large — critical for pre-readers | Medium — Web Speech API integration |
| 6 | **Wire gamification to real data** | Large — zeros → real progress is a step change | Medium — connect to PCG / Postgres APIs |
| 7 | **Home as Brilliant-style skill dashboard** | Transformative — replaces button grid with progress-driven home | Medium — new home layout using existing LearningKit primitives + real data APIs |
| 8 | **Session flow (review burst → activity → reflection)** | Large — structures the learning experience | Medium — session state machine + review burst UI |
| 9 | **Message persistence** | Medium — conversations survive refresh | Small — localStorage or DB per activity |
| 10 | **Dead code cleanup (Home panel, ChildChatUI, workspace-old)** | Medium — removes confusion, reduces bundle | Small — mechanical removal |
| 11 | **Onboarding flow** | Medium — first impression matters | Medium — placement probe + character intro |
| 12 | **Parent control plane UX** | Medium — parent engagement | Large — new pages + API surface |

---

## 5. Design Principles (Non-Negotiables)

Carried forward from `LEARNING_EXPERIENCE_DESIGN.md` with additions:

1. **Active, not passive** — every screen asks the child to *do* something.
2. **Productive struggle, safely** — ZPD-bounded, hint ladder never gives the answer.
3. **Intrinsic motivation protected** — gamification is informational, not controlling.
4. **Text is never a gate** — read-aloud available on every text surface (pre-readers).
5. **One micro-action per screen** — cognitive load management for ages 5–10.
6. **The companion is a coach, not an answer machine** — Socratic, never just gives the answer.
7. **Every surface is agent-aware** — the companion sees what the child sees.
8. **Mistakes are data, not failure** — "Not yet — let's see what it teaches us."
9. **Exit on a win** — end sessions after success, not after frustration.
10. **The architecture serves the experience, not the reverse** — don't expose
    internals; use them to make the experience feel magical.

---

## 6. Success Criteria

A child using the dashboard should be able to:

- [ ] Open the app and see a Brilliant-style skill dashboard: today's mission, active courses with real mastery bars, daily challenge, streak
- [ ] Start a session with a 3-item review burst from previous skills
- [ ] Tap a quick-action button that is *specific to what they're doing* (not generic)
- [ ] See the agent "thinking" with tool-hop traces ("Looking up..." → "Found it!")
- [ ] Get a streamed response that appears word-by-word
- [ ] Tap any message to hear it read aloud
- [ ] Speak instead of type (microphone button)
- [ ] Get an interactive concept check card they can tap to answer
- [ ] See their mastery bar update in real time after answering
- [ ] See their streak, goals, and level with real data, not zeros
- [ ] End a session after a win, with the companion saying "Great work today!"
- [ ] Return the next day and see their previous conversation and progress

---

## 7. What NOT to Build (Yet)

- **World map / islands / character-walking aesthetic** — this is a kid-gaming
  pattern (Khan Academy Kids, ABCmouse, Prodigy), not Brilliant. It's heavier to
  build, can feel childish for older kids (8–10), and conflicts with the focused,
  progress-driven design language we're adopting. Revisit only if we add a
  dedicated pre-K (ages 3–5) mode.
- **Leaderboards or peer comparison** — forbidden by design principles for ages 5–10.
- **Complex achievement trees** — keep gamification gentle and effort-based.
- **3D graphics or heavy animations** — CSS/SVG is sufficient; don't add bundle weight.
- **Custom rendering engine** — use Chakra UI + Emotion; don't introduce a new UI framework.
- **Real-time multiplayer** — out of scope; this is a single-child experience.
- **Parent AI assistant** — the parent portal is a control plane, not an AI chat.
