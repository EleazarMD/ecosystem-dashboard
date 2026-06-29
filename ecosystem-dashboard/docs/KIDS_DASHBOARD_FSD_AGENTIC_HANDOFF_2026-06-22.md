# Kids Dashboard Sidebar + FSD Agentic Harness Handoff — 2026-06-22

## Scope

This assessment captures the current state after integrating the Tutor Companion into the kids dashboard right sidebar and reviewing the PiCode/FSD agentic harness path and lesson-plan alignment.

## UI Assessment

### Implemented in this pass

- The child right sidebar now uses the same integrated panel idiom as the reference image: fixed right edge, square child-studio chrome, activity-theme surface tokens, compact tabs, and a chat-first default.
- The closed-state rail now derives directly from `RightPanelContext.config.tabs` instead of a duplicated per-route emoji map, reducing drift between open and closed sidebar states.
- The closed rail uses real Feather icons from each tab's `icon` key. `FiLightbulb` is preserved as a config key but maps to `FiZap` because `react-icons/fi` does not export `FiLightbulb` in this dependency set.
- `TutorCompanion` compact mode now has enough internal gutter to look integral to the sidebar instead of flush/bolted on.
- `ChildLearnPanel` and `ChildPokemonLabPanel` now render `ChildTutorTab` on the shared `chat` tab, matching `RightPanelContext`.

### Remaining UX work for next agent

- Add contextual panel headers that reflect the current activity frame, not only the panel registry name. Example: Workspace should show `Writing Helper`; Pokémon lesson steps should show the current lesson title or `Professor Lab` context.
- Add lightweight state chips in the panel header: current activity, active persona, tools available, and safety status. Keep these kid-friendly and non-alarming.
- Consider making the right rail visible as a single primary chat launcher plus optional overflow on narrow child screens; too many shortcut icons can crowd the vertical rail.
- Improve active tab affordance in the open panel with theme-aware selected styles and better contrast for activity-specific dark themes.

## PiCode / Agentic Harness Assessment

### Current state

- The companion API path is `/api/child/companion/agent-turn`.
- The endpoint calls `getPiCodeTransport()` and uses the child service safety pattern: child session context, content filtering, `AIChildSafetyMonitor`, activity logging, and Context Hub outcome recording.
- `PiCodeTransport` is implemented as an in-process cognitive-loop transport, not a spawned external CLI process. It does use the same intended PiCode pattern: ambient context from Context Hub, AI Gateway tool selection, gated tool execution, reflection/outcome recording.
- `PiCodeTransport` calls AI Gateway via `/api/v1/chat/completions` with `Authorization: Bearer ${CHILD_SAFETY_API_KEY || 'child-safety-key'}` and child metadata. This matches the child-generation lane, not the analyzer lane.
- This pass fixed telemetry drift: transport responses now attach metadata for `toolsUsed`, `hops`, `budgetExhausted`, and source; `agent-turn` now returns/logs those actual values instead of always returning `hops: 0` and `toolsUsed: []`.

### Critical gap

The code does not yet verify or invoke a real external PiCode CLI service/binary. It provides a PiCode-compatible transport inside the dashboard process. If the architectural requirement is literally “PiCode CLI hosts the loop,” the next agent should add a runtime adapter that shells out or calls the PiCode service over a defined protocol, while keeping the current `AgentTransport` seam as fallback.

### Next implementation tasks

1. Define `PiCodeRuntimeAdapter` behind `AgentTransport`:
   - `InProcessPiCodeTransport` = current implementation.
   - `ExternalPiCodeCliTransport` = real CLI/service adapter.
   - feature flag/env selects runtime.
2. Add health/status endpoint for kids agent runtime:
   - verifies AI Gateway reachability,
   - verifies PiCode external runtime if enabled,
   - verifies Context Hub compose path,
   - verifies at least CORE tools can pass Tool Gate.
3. Persist per-turn trajectory:
   - selected tool,
   - tool args,
   - gate decision,
   - output safety result,
   - final answer,
   - latency and fallback reason.
4. Stream tool events to the sidebar chat UI so the child sees friendly progress like “Checking your thinking…” or “Finding a hint…” rather than a long pause.
5. Add approval deferral for `draw_image` and any future irreversible/sensitive child tools.

## Tool Roster Assessment

### Implemented in this pass

- Standardized Pokémon graph tool id from `explore-graph` to `explore_graph` so it matches the agent dispatcher in `features/agent-tools.ts` and roadmap/tool roster docs.
- Updated unit tests covering Context Hub/PiCode and Pokémon Lab mastery; both pass.

### Remaining tool issues

- Some activity rosters are still sparse. Planner/workspace/email currently expose empty rosters despite having surfaces that could become safe tools.
- `generate_problem`, `read_with_me`, and `show_passage` appear in docs but should be verified end-to-end against dispatcher support and activity rosters before an agent is allowed to choose them broadly.
- Tool ids should be centrally tested with a roster/dispatcher consistency test: every `ToolDescriptor.id` on any registered activity should either be a UI-only route tool or have an executor.

## Lesson Plan / Learning Experience Assessment

### On track

- `learning-planner.ts` composes plans from parent assignments, prerequisite-aware next objectives, spaced-review warm-up, and lowest-score focus fallback.
- Roadmap Phase 18/19 and `LEARNING_EXPERIENCE_DESIGN.md` remain aligned with the intended direction: Context Hub + always-present Socratic tutor + card-based Brilliant-style learning UX.
- Pokémon Lab measured-learning tests pass after tool-id alignment.

### Gaps to close

- The planner is still request-driven, not harness-self-driven. There is no autonomous nightly or session-end scheduler that selects next-best actions without a user request.
- The current kids dashboard right sidebar is now present across studios, but many surfaces still need richer `ContextProvider` updates from live UI state. The agent can only be as contextual as the frames it receives.
- The Brilliant-style card system is still a design target. The current Learn Hub has pieces of the UX, but the canonical Try/See/Explain/Play/Check card templates and immediate feedback loop should be extracted into reusable widgets.
- Lesson plans should explicitly expose age-based goals and mastery targets to the child UI and to parent dashboards. Current plan objects include skill/proficiency data but do not yet render a transparent “why this is next” explanation everywhere.

## Validation

Ran:

```bash
npm test -- context-hub-picode pokemon-lab-mastery --runInBand
```

Result:

- 2 suites passed.
- 41 tests passed.

## Recommended Next Agent Path

1. Build a small contextual header for the right sidebar that reads active Context Hub frame + activity registry persona/tool count.
2. Add runtime health for PiCode transport and distinguish in-process fallback vs external PiCode CLI.
3. Add stream rendering in `TutorCompanion` for tool-hop events.
4. Add a roster/dispatcher consistency test.
5. Extract card templates for the Learn Hub and wire `give_hint` / `check_answer` into immediate feedback UI.
6. Add per-surface live context updates for workspace current page, book passage/page, journal mood/prompt, art canvas state, dictionary selected word, and planner due task.
