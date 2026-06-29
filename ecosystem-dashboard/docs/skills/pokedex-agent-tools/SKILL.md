---
name: pokedex-agent-tools
description: >
  Create and maintain Pokédex knowledge graph tools (SkillModules) that ground the
  child agent loop in real Pokémon data from the Neo4j-backed pokedex-graph service.
---

# Pokédex Agent Tools

Create and maintain SkillModule tools that let the Pi Code agent loop query the
Pokédex knowledge graph (Neo4j via pokedex-graph GraphQL service) so child chat
responses are grounded in real graph data, not hallucinated.

## When to Invoke

- Adding a new Pokédex query tool to the agent's tool roster
- Modifying how the agent loop accesses Pokémon graph data
- Debugging why the agent is not returning grounded Pokédex answers
- Extending Pokémon Lab activity with new graph-backed capabilities

## Architecture Overview

```
Child Chat UI
  → TutorCompanion
    → /api/child/companion/agent-turn
      → PiCodeTransport.stream()
        → selectNextTool() — asks AI Gateway (minimax-m3) which tool to call
        → executeGatedHop() — checks Tool Gate, then calls executeTool()
          → agent-tools.ts dispatcher
            → skillRegistry.execute(toolId, args, ctx)
              → pokedex-*.ts SkillModule
                → pokedex-graph GraphQL service (Neo4j, port 8795)
```

### Data Flow

1. Child asks "Tell me about Pikachu" in the Pokémon Lab chat
2. `PiCodeTransport` calls AI Gateway with the pokemon-lab system prompt
3. AI returns `{"nextAction": "pokedex_detail", "arguments": {"name": "pikachu"}}`
4. `executeGatedHop` checks the tool gate (pokedex_detail is in the roster)
5. `executeTool` dispatches to `skillRegistry.execute("pokedex_detail", ...)`
6. `pokedex-detail.ts` sends a GraphQL query to the pokedex-graph service
7. Graph returns Pikachu's types, abilities, stats, species info
8. Agent loop feeds the result back to the AI for a kid-friendly summary
9. AI returns `{"nextAction": "final_answer", "finalMessage": "Pikachu is an Electric-type..."}`

### Key Files

```
src/domains/learning/
├── skills/
│   ├── pokedex-search.ts           # Search Pokémon by name/type/generation
│   ├── pokedex-detail.ts           # Full details for a specific Pokémon
│   ├── pokedex-type-effectiveness.ts  # Type matchup data
│   ├── pokedex-evolution.ts        # Evolution chain lookup
│   ├── pokedex-nl-query.ts         # Natural language → GraphQL via AI Gateway
│   └── index.ts                    # Barrel: registers all pokedex skills
├── shared/
│   ├── activities/pokemon-lab.ts   # Activity registry with pokedex toolRoster
│   ├── tool-roster.ts              # ToolId types (includes pokedex_* IDs)
│   ├── tool-hop-labels.ts          # UI labels for tool-hop visualization
│   └── transports/picode-transport.ts  # Agent loop + activity-aware system prompt
├── features/
│   └── agent-tools.ts              # Dispatcher (delegates pokedex_* to skillRegistry)
src/lib/pokedex-client.ts           # Frontend GraphQL client (20+ query methods)
src/pages/api/child/pokedex.ts      # GraphQL proxy to pokedex-graph service
src/pages/api/child/pokedex-nl.ts   # NL → GraphQL translator via AI Gateway
```

### Infrastructure

- **pokedex-graph service**: Neo4j-backed GraphQL API on port 8795
  - Nodes: Pokemon, Species, Type, Ability, Move, Item, Nature, Generation, Region, Location, EvolutionChain, Stat, TcgCard, AnimeEpisode
  - Env: `POKEDEX_GRAPH_URL` or `http://localhost:8795`, `POKEDEX_API_KEY`
- **AI Gateway**: `http://localhost:8777`, model `minimax-m3`, child-safety key
- **System prompt**: Activity-aware in `picode-transport.ts` — pokemon-lab gets pokedex-specific rules

## Instructions

### Step 1: Create the SkillModule

Create `src/domains/learning/skills/pokedex-<capability>.ts`:

```typescript
import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

const POKEDEX_URL = process.env.POKEDEX_GRAPH_URL || `http://localhost:${process.env.POKEDEX_PORT || 8795}`;
const POKEDEX_API_KEY = process.env.POKEDEX_API_KEY || 'pokedex-local-key-2026';

export const pokedexCapabilitySkill: SkillModule = {
  id: 'pokedex_capability',
  label: 'Pokédex Capability',
  description: 'Brief description for the agent prompt.',
  category: 'exploration',
  endpoint: '/api/child/pokedex',
  async execute(args): Promise<ToolExecutionResult> {
    // Build GraphQL query
    // Fetch from pokedex-graph service
    // Return kid-friendly output string
    return { output: '...', success: true };
  },
};
```

### Step 2: Register in barrel

Add to `src/domains/learning/skills/index.ts`:

```typescript
import { pokedexCapabilitySkill } from './pokedex-capability';
skillRegistry.register(pokedexCapabilitySkill);
```

### Step 3: Add ToolId type

Add `'pokedex_capability'` to the `ToolId` union in `src/domains/learning/shared/tool-roster.ts`.

### Step 4: Add dispatcher case

Add to `src/domains/learning/features/agent-tools.ts` in the workspace/pokedex case block:

```typescript
case 'pokedex_capability': {
  const { skillRegistry } = await import('../skills');
  return skillRegistry.execute(toolId, args, ctx);
}
```

### Step 5: Add tool-hop label

Add to `src/domains/learning/shared/tool-hop-labels.ts`:

```typescript
pokedex_capability: { label: 'Doing Pokédex thing', emoji: '🔍' },
```

### Step 6: Add to pokemon-lab roster

Add the tool descriptor to `pokemonLabRoster.tools` in `src/domains/learning/shared/activities/pokemon-lab.ts`.

### Step 7: Update system prompt

Add a rule to the pokemon-lab branch of `buildSystemPrompt` in `picode-transport.ts`:

```
'- If the child asks about X, use "pokedex_capability" with arguments: {...}.
```

### Step 8: Update cross-interface labels

- `src/theme/novaLabels.ts` — Add `pokedex_capability: "Doing thing…"`
- `src/components/workspace/ToolExecutionCard.tsx` — Add display name + icon

### Step 9: Verify

```bash
npx tsc --noEmit 2>&1 | grep "pokedex"
```

## Available GraphQL Queries

The pokedex-graph service exposes these queries (see `src/lib/pokedex-client.ts` for full client):

- `searchPokemon(query, typeFilter, generation, isLegendary, limit, offset)`
- `pokemonByName(name)` / `pokemonByDex(dex)` / `pokemonById(id)`
- `pokemonByType(typeName, limit)` / `pokemonByDualType(type1, type2, limit)`
- `evolutionChain(speciesId)`
- `typeEffectiveness(typeName)`
- `pokemonMoves(pokemonId, learnMethod)`
- `pokemonForms(pokemonId)`
- `teamSuggest(types, limit)` / `teamWeakness(pokemonIds)` / `teamCoverage(pokemonIds)`
- `allTypes` / `allGenerations` / `allEggGroups`
- `graphStats`
- `searchTcgCards(...)` / `animeEpisodesByPokemon(pokemonName, limit)`
- `pokemonByMove(moveId, limit)` / `pokemonByAbility(abilityId, limit)`
- `pokemonEncounters(pokemonId, limit)`
- `dailyPokemon(seed)` / `comparePokemon(id1, id2)` / `fuzzySearchPokemon(query, limit)`

## Safety Rules

1. **Always ground in graph data** — never make up Pokémon facts
2. **Kid-friendly output** — summarize graph results in simple language
3. **No raw GraphQL to the child** — the SkillModule formats the output
4. **Truncate long results** — keep tool output under 2000 chars
5. **Handle service unavailable** — return graceful failure, not a crash

## Examples

<example>
User: "Add a tool that lets the agent look up Pokémon moves"
Assistant: Creates `src/domains/learning/skills/pokedex-moves.ts` with a
SkillModule that queries `pokemonMoves(pokemonId)` from the pokedex-graph
service. Registers it, adds ToolId, dispatcher case, tool-hop label, and
system prompt rule.
</example>

<example>
User: "The agent isn't returning real Pokémon data when Luca asks about Pikachu"
Assistant: Checks that the pokemon-lab activity roster includes `pokedex_detail`,
the system prompt has pokedex rules, and the pokedex-graph service is running
on port 8795. Verifies the SkillModule is registered in the barrel.
</example>

## References

- `src/domains/learning/shared/skill-module.ts` — SkillModule interface + SkillRegistry
- `src/domains/learning/skills/index.ts` — Registration barrel
- `src/domains/learning/shared/activities/pokemon-lab.ts` — Pokémon Lab activity + roster
- `src/domains/learning/shared/transports/picode-transport.ts` — Agent loop + system prompt
- `src/lib/pokedex-client.ts` — Frontend GraphQL client (full query reference)
- `src/pages/api/child/pokedex.ts` — GraphQL proxy route
- `src/pages/api/child/pokedex-nl.ts` — NL → GraphQL translator
- `docs/skills/kids-dashboard-tool-creation/SKILL.md` — General tool creation skill
