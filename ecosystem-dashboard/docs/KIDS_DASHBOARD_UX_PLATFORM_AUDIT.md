# Kids Dashboard — UI/UX & Platform-Abstraction Audit (pre-code)

> Status: **Assessment + pre-implementation plan.** Answers: *did we assess the
> UI/UX, and what's next before we start writing code?* Grounded in the current
> codebase (not aspirational). Scope: chat/companion placement + theming, Settings,
> Profile, Parent's Portal connectivity, and the module abstractions that must exist
> for the platform to scale to more users.
>
> Reads with: `KIDS_PLATFORM_CONTRACTS.md` (the ratifiable contracts these abstractions
> become), `AGENT_CONTEXT_HUB.md` (context spine), `LEARNING_EXPERIENCE_DESIGN.md`
> (Brilliant-style surfaces), `FSD_AGENTIC_HARNESS.md` (§1.5/§1.6/§4.6),
> `KIDS_DASHBOARD_HARNESS_AUDIT.md` (logic/agent audit + backlog).

---

## 1. Verdict

The thematic UX is genuinely good and worth preserving (4 rich themes, per-page
wallpapers, themed icons/avatars/welcome copy). **But the dashboard is built as a
collection of bespoke, monolithic activity pages — not a platform of composable
activities.** The agent is a *destination page*, not an always-present companion;
theming is *global per child*, not *scoped to the activity in view*; Settings/Profile
are *scattered*; the Parent's Portal is a *monitor*, not a *control plane*. None of
this is fatal — the right primitives mostly exist — but we should ratify a small set
of **abstractions first**, or every new lab will deepen the debt.

**Answer to "did you assess the UI/UX?":** not before — my earlier work was the
architecture/pedagogy layer. This doc is that assessment.

---

## 2. Chat / companion placement + theming

### What exists
- **Chat is a standalone page** — `src/pages/child/chat.tsx` renders `ChildChatUI`
  (`src/components/child/ChildChatUI.tsx`, ~70KB) and posts to
  `/api/child/goosemind/chat` (+ `/api/child/chat`). It is **GooseMind-backed**, the
  path the harness plans to replace with the AI Gateway / Pi Code agent.
- **A route-driven contextual panel already exists** — `RightPanelContext`
  (`src/contexts/RightPanelContext.tsx`) maps each route to a `PanelContext` with
  activity-specific tabs, and each child activity *already* has an AI helper concept:
  `child-art` → "Art Helper", `child-books` → "Reading Buddy", `child-planner` →
  "Study Buddy", `child-email` → "Helper". This is **most of the always-present
  companion mechanism**, already shipped.
- **Theming is per-child + global** — `ChildThemeProvider` fetches one theme from
  `/api/child/theme` (`child-default | child-pusheen | child-minecraft |
  child-pokemon`) and applies it to the whole dashboard. The Pokémon theme even has
  per-page wallpapers (`child-themes.ts` → `pokemonTheme.childExtras.decorations.backgroundImages`).

### Gaps (this is the mismatch you flagged)
- **The companion is fragmented, not unified.** Each activity helper is a separate
  bespoke component, separately wired (mostly to GooseMind). There is no single
  agent that follows the child across surfaces. → "always in the loop" is not real yet.
- **Theming is not activity-scoped.** If a child's base theme is Minecraft and they
  enter Pokémon Lab, the lab hardcodes its *own* Pokémon colors (`PokemonLab.tsx`,
  e.g. `#3b7dd8`) while the chat/companion stay Minecraft. The chat cannot "employ
  Pokémon theming in Pokémon Lab" because nothing scopes a theme to the active activity.
- **Coverage holes.** `RightPanelContext` route-detection has **no mapping for
  `/child/pokemon-lab`, `/child/learn`, `/child/learning-path`, `/child/teams`** — and
  the layout's `contextMap` omits them too — so those pages fall back to **`default`
  (adult "AI Settings")** or `child-home`. The newest, most important learning surfaces
  have no companion context.
- **Hardcoded in 3+ places.** Adding an activity requires editing the `PanelContext`
  union, `PANEL_CONFIGS`, the route-detection switch, *and* the layout `contextMap`.
  Plus duplicates exist (`child-art` vs `child-art-studio`).

### Recommendation
Reuse the right-panel as the companion slot, but (a) **unify** the bespoke helpers
into one **Tutor Companion** (reads the active Context Frame, calls the harness/Pi
Code agent with the per-activity tool roster), and (b) add an **activity-theme scope**
so the companion + chrome re-theme to the activity in view over the child's base theme.

---

## 3. Settings & Profile

### What exists
- Theme (`/api/child/theme`), avatar (`/api/child/avatar`), TTS (`TTSSettingsCard.tsx`
  + `/api/child/tts`), and **client-side** learning settings inside `ChildChatPanel`
  (subject/difficulty/spanish/read-aloud/creative — local React state, chat-only).
- Usage/limits via `/api/child/dashboard`; page-access via `check-page-access` /
  `request-page-access`.

### Gaps
- **No consolidated child Profile/Settings surface or entity.** There is no
  `src/pages/child/settings.tsx` / `profile.tsx` and no `/api/child/profile`. Identity,
  persona/character choice, theme, reading level, learning style, accessibility, and
  time limits are spread across ad-hoc endpoints and component state.
- Learning preferences set in the chat panel **don't persist to the learner model**,
  so they can't steer the planner/agent or scale across surfaces.

### Recommendation
Introduce one **Child Profile/Settings entity** (identity, persona, theme,
reading level, learning-style, accessibility/TTS, time limits) with a single API and a
single settings surface — readable by the agent (long-form context) and writable by
both child (bounded) and parent (authoritative).

---

## 4. Parent's Portal connectivity

### What exists
- Pages: `src/pages/parent/children-journals.tsx`, `content-approvals.tsx`.
- APIs: `/api/parent/approval-requests`, `child-conversations`, `children-journals`,
  `content-flags`. Plus parent-facing component dashboards (`PCGInsightsDashboard`,
  `SkillProgressDashboard`, `AISafetyDashboard`).

### Gaps
- **It's a monitor, not a control plane.** Parents can review journals, conversations,
  flags, and approvals — but there is **no API/UI to set per-child goals, difficulty
  bounds, allowed activities, or session length**, and **no review queue for
  AI-generated content** (the content-generate endpoint has no approval gate).
- Goal-setting does not steer the planner's next-best-action (also flagged in the
  harness audit, rows 15–16).

### Recommendation
Promote the portal to a **control plane** backed by the same Profile/Settings entity +
harness events: goals → planner, learning-config (bounds/allowed activities/limits),
AI-content review queue, per-child insights. This is the backbone for multi-family scale.

---

## 5. Module abstractions for platform scale

This is the heart of "create the correct abstractions so these scale with more users."

### 5.1 The core problem: everything is dual-homed + bespoke + monolithic
- **Two logic homes:** legacy `src/lib/kids-pic/*` **and** new FSD `src/domains/learning/*`.
- **Two API homes:** `/api/child/*` (legacy) **and** `/api/learn/*` (harness).
- **Two UI homes:** legacy monoliths (`src/components/child/*`, `src/pages/child/*`)
  **vs** `domains/learning/widgets/` which has **1 widget**. The logic migrated; the
  **UI did not**.
- **Monolithic surfaces:** `PokemonLab.tsx` ~131KB, `ChildChatUI.tsx` ~70KB,
  `pages/child/workspace.tsx` ~78KB; plus half-finished refactors
  (`workspace-old.tsx` / `workspace-new.tsx`) and duplicate endpoints
  (`goosemind/chat` + `chat.ts`).

### 5.2 The keystone abstraction: an Activity/Module Registry
Today an "activity" is implicitly defined across ≥4 files (panel union, panel config,
route switch, layout map) plus a bespoke page + panel. **Replace this with one
declarative registry entry per activity:**

```ts
// DESIGN CONTRACT (not implementation)
interface LearningActivity {
  id: string;                       // 'pokemon-lab', 'reading', 'journal'
  route: string;                    // '/child/pokemon-lab'
  title: string; icon: string;
  theme: ActivityThemeTokens;       // §5.3 — re-themes companion + chrome
  panel: { tabs: PanelTab[]; defaultTab: string };  // replaces PANEL_CONFIGS entry
  contextProvider: ContextProvider; // AGENT_CONTEXT_HUB §4 — emits ContextFrame
  toolRoster: string[];             // FSD harness §4.6 allow-list for this surface
  skillCodes?: string[];            // wires completion → mastery
}
```

Adding a lab becomes **one entry**; the panel system, companion, theming, routing, and
tool-gating all read from it. This is the single biggest unlock for scale.

### 5.3 Activity Theme layer
Extend `ChildThemeProvider` with a **scoped activity theme**: base = child's chosen
theme; overlay = active activity's tokens (from the registry). Move the colors that
`PokemonLab.tsx` currently hardcodes into `ActivityThemeTokens`, so the companion and
chrome consistently adopt the active lab's look while preserving the child's identity.

### 5.4 The four named modules (your "lesson / personality / CIG / PCG / tools")
| Module | Today | Target abstraction |
|--------|-------|--------------------|
| **Lessons** | content split across `domains/learning` + `kids-pic/phase*` + STAAR; rendered inside monolith pages | a **Lesson/Card entity + renderer** (Brilliant card templates, `LEARNING_EXPERIENCE_DESIGN.md`), decoupled from any single lab |
| **Personality** | `PCGCharacterContext.ts` (Buddy/Steve/Pusheen) | a **Persona entity** (persona-as-data) selectable per child, themable per activity, fed to the agent |
| **PCG** | `KidsPCGService.ts` (learner model, Neo4j) | the **long-form memory tier** of the Context Hub; the authoritative learner model |
| **CIG** | `lib/cig-client.ts` = **Communications** Intelligence Graph (email/calendar, adult, port 8780) | **Decide kids' scope explicitly** — children should likely *not* touch CIG except via a heavily-gated tool, if at all. Don't entangle it with the learner model. |
| **Tools** | not a module; surfaces are pages; chat has an ad-hoc "Tools" modal | a real **Tool Roster registry** (harness §4.6) wrapping existing surfaces as gated agent tools |

### 5.5 Consolidation
Pick **FSD `domains/learning`** as the single home. Migrate `kids-pic` logic + the
`/api/child/*` learning endpoints behind `/api/learn/*` adapters, and grow
`domains/learning/widgets/` by **decomposing** the monolith pages into
entities/features/widgets. (This is harness migration Phase C + roadmap Phase 12.)

---

## 6. What's next — pre-code checklist (ratify before implementing)

> **Items 1–3 are now drafted** as ratifiable TypeScript in
> **`docs/KIDS_PLATFORM_CONTRACTS.md`** (Registry §1, Activity Theme §2, Context +
> Companion + Transport + Tool Roster §3–5, Pokémon Lab reference mapping §6, OPEN
> DECISIONS §9). Ratify there; items 4–7 remain open decisions.

1. **Activity/Module Registry schema** (§5.2 → contracts §1) — the keystone; everything else reads it.
2. **Activity Theme token contract** (§5.3 → contracts §2) — how a lab declares its look; companion re-themes.
3. **Tutor Companion + Context Provider contracts** (`AGENT_CONTEXT_HUB.md` → contracts §3–5) — unify the
   bespoke helpers; decide placement (reuse right-panel slot + an inline affordance).
4. **GooseMind → AI Gateway / Pi Code** cutover decision for the kids chat.
5. **Child Profile/Settings entity** (§3) + **Parent control-plane** API surface (§4).
6. **Single-home decision** (§5.5) + adapter plan for `kids-pic` and `/api/child/*`.
7. **Tech-debt blockers** that will bite at scale: `workspace-old/new`, `child-art`
   vs `child-art-studio`, `goosemind/chat` vs `chat.ts`, missing panel contexts for
   pokemon-lab/learn/learning-path/teams.

**Then** implement in this order: Registry + Activity Theme → unified Companion on one
reference activity (**Pokémon Lab**) end-to-end → roll out to remaining activities →
Profile/Settings + Parent control plane.

---

## 7. Quick reference — key files

- Chat UI / page: `src/components/child/ChildChatUI.tsx`, `src/pages/child/chat.tsx`
- Chat backend (to replace): `src/pages/api/child/goosemind/`, `src/pages/api/child/chat.ts`
- Contextual panel system: `src/contexts/RightPanelContext.tsx`
- Layout shell: `src/components/layout/ChildDashboardLayout.tsx`
- Theming: `src/lib/child-themes.ts`, `src/components/child/ChildThemeProvider.tsx`
- Activity panels (bespoke helpers): `src/components/child/Child*Panel.tsx`
- Monolith lab: `src/components/child/PokemonLab.tsx` (~131KB)
- Personality: `src/lib/kids-pic/PCGCharacterContext.ts`
- Learner model (PCG): `src/lib/kids-pic/KidsPCGService.ts`
- CIG client (comms, adult): `src/lib/cig-client.ts`
- FSD target home: `src/domains/learning/{entities,features,processes,widgets,shared}`
- Parent portal: `src/pages/parent/*`, `src/pages/api/parent/*`
- Child settings (scattered): `/api/child/theme`, `/api/child/avatar`, `TTSSettingsCard.tsx`
