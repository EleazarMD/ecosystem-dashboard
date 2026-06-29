---
name: kids-dashboard-tool-creation
description: >
  Create new agent tools (skills) for the kids learning dashboard. Each tool is a
  self-contained SkillModule file with descriptor, executor, and safety metadata.
---

# Kids Dashboard Tool Creation

Create new agent tools for the kids learning dashboard using the SkillModule abstraction.

## When to Invoke

- Adding a new tool to the child agent's tool roster
- Creating a new capability for the Pi Code Agent (tutor, stats, navigation, etc.)
- Extending the agentic tutoring system with a new skill

## Architecture Overview

```
src/domains/learning/
├── shared/
│   ├── skill-module.ts      # SkillModule interface + SkillRegistry singleton
│   ├── tool-roster.ts       # ToolRoster type + Tool Gate (auto-derived from registry)
│   └── tool-hop-labels.ts   # UI labels/emojis for tool-hop visualization
├── skills/                  # One file per tool — self-contained
│   ├── ask-socratic.ts      # Tutoring: Socratic guidance via AI Gateway
│   ├── give-hint.ts         # Tutoring: Laddered hint reveal
│   ├── check-answer.ts      # Tutoring: Answer reasoning (grading stays server-side)
│   ├── define-word.ts       # Reference: Kid-friendly definitions
│   ├── explore-graph.ts     # Exploration: Pokémon Lab lessons
│   ├── get-child-stats.ts   # Stats: Real usage data from usageTracker
│   ├── recommend-activity.ts # Navigation: Activity suggestions from registry
│   ├── generate-problem.ts  # Practice: Problem generation by skill
│   ├── celebrate.ts         # Celebration: Effort acknowledgment
│   ├── draw-image.ts        # Creative: Art prompts
│   ├── journal-write.ts     # Creative: Reflection prompts
│   ├── read-with-me.ts      # Reading: Read-aloud guidance
│   ├── show-passage.ts      # Reading: Passage display
│   └── index.ts             # Barrel: registers all skills with the registry
├── features/
│   └── agent-tools.ts       # Dispatcher (delegates to SkillRegistry) + fallback
└── shared/
    └── transports/
        └── picode-transport.ts # Agent loop (calls executeTool → registry)
```

## Instructions

### Step 1: Create the SkillModule file

Create `src/domains/learning/skills/<your-tool-name>.ts`:

```typescript
import { SkillModule, ToolExecutionResult } from '../shared/skill-module';

export const myToolSkill: SkillModule = {
  id: 'my_tool',
  label: 'My Tool',
  description: 'Brief description for the agent\'s tool-use prompt.',
  category: 'tutoring', // tutoring | stats | navigation | creative | reading | celebration | reference | exploration | practice
  async execute(args, ctx): Promise<ToolExecutionResult> {
    // args: Record<string, unknown> — cast as needed
    // ctx: ToolContext — childUserId, contentPrompt, hintSet, focus, pcgContext, etc.
    return {
      output: 'Result string the agent reads',
      success: true,
    };
  },
};
```

### Step 2: Register in the barrel

Add to `src/domains/learning/skills/index.ts`:

```typescript
import { myToolSkill } from './my-tool-name';
skillRegistry.register(myToolSkill);
```

### Step 3: Add tool-hop label (optional, for UI)

Add an entry in `src/domains/learning/shared/tool-hop-labels.ts` so the streaming
UI shows a friendly emoji + label when the agent uses your tool.

### Step 4: Update the system prompt (if needed)

If the agent should proactively use your tool, add a prompt line in
`src/domains/learning/shared/transports/picode-transport.ts`:

```
'- If the learner asks about X, use "my_tool" first.',
```

### Step 5: Verify

```bash
npx tsc --noEmit 2>&1 | grep "your-tool-name"
npx jest --testPathPattern="tool-roster-consistency" --runInBand
```

## SkillModule Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique tool id (matches ToolId in tool-roster.ts) |
| `label` | `string` | Yes | Human-readable label for UI |
| `description` | `string` | Yes | Brief description for agent prompt |
| `category` | `SkillCategory` | Yes | Grouping: tutoring, stats, navigation, etc. |
| `requiresApproval` | `boolean` | No | Whether parental approval is needed |
| `blockedForChildren` | `boolean` | No | Whether blocked for child accounts |
| `uiOnly` | `boolean` | No | If true, no server-side executor |
| `endpoint` | `string` | No | HTTP endpoint reference (documentation) |
| `execute` | `function` | Yes | The executor (sync or async) |

## ToolContext fields available in execute()

| Field | Type | Description |
|-------|------|-------------|
| `childUserId` | `string` | Authenticated child user ID |
| `contentPrompt` | `string` | Current problem/task text |
| `contentItemId` | `string` | Content item being worked on |
| `skillCode` | `string` | Skill code for mastery tracking |
| `attemptNumber` | `number` | Current attempt count |
| `hintSet` | `string[]` | Available hints for this problem |
| `safetySystemPrompt` | `string` | Safety system prompt for AI calls |
| `pcgContext` | `object` | Child name, age group, interests, goals |
| `focus` | `object` | What's on screen: title, summary, entities |

## Safety Rules

1. **Never reveal answers** — use Socratic scaffolding for tutoring tools
2. **Praise effort, not traits** — "great persistence" not "you're smart"
3. **Keep it age-appropriate** — warm, brief, non-manipulative language
4. **No external API keys in tool files** — use env vars
5. **Grade server-side** — `check_answer` delegates to `/api/learn/attempt`

## Examples

<example>
User: "Add a tool that lets the agent quiz the child on vocabulary"
Assistant: Creates `src/domains/learning/skills/vocabulary-quiz.ts` with a
SkillModule that picks a word from the child's reading level and generates
a multiple-choice quiz. Registers it in `skills/index.ts`.
</example>

<example>
User: "Add a tool for fetching the child's streak data"
Assistant: Creates `src/domains/learning/skills/get-streak.ts` that calls
the streak API, returns days + emoji. Registers it, adds tool-hop label.
</example>

## References

- `src/domains/learning/shared/skill-module.ts` — SkillModule interface + SkillRegistry
- `src/domains/learning/skills/index.ts` — Registration barrel
- `src/domains/learning/shared/tool-roster.ts` — Tool Gate + auto-derived CORE_TOOL_ROSTER
- `src/domains/learning/features/agent-tools.ts` — Dispatcher (delegates to registry)
- `docs/FSD_AGENTIC_HARNESS.md` — Agent loop contract
- `docs/KIDS_PLATFORM_CONTRACTS.md` — Platform contracts
