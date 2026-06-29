/**
 * Pokémon Lab — first LearningActivity registry entry.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §6 (reference mapping)
 *
 * Promotes the hardcoded `SURFACE` const from PokemonLab.tsx into an
 * ActivityThemeTokens overlay and wires the activity to the registry.
 */

import { activityRegistry, KNOWN_ACTIVITY_IDS } from '../activity-types';
import { ActivityThemeTokens } from '../activity-theme';
import { ToolRoster } from '../tool-roster';
import { resolvePersona, toPersonaRef } from '../../personas';
import '../../personas'; // ensure all personas are registered

// --- Theme overlay (promoted from PokemonLab SURFACE) -----------------------

export const pokemonLabTheme: ActivityThemeTokens = {
  id: 'pokemon-lab',
  mode: 'dark',
  colors: {
    primary: '#3b7dd8',
    primaryHover: '#2a6bc7',
    primaryActive: '#1a5ab6',
    secondary: '#ee1515',
    secondaryHover: '#d41212',
    accent: '#f7d02c',
    accentHover: '#e6c01b',
    background: '#1a1a2e',
    backgroundSecondary: 'rgba(26, 26, 46, 0.85)',
    backgroundTertiary: 'rgba(22, 36, 71, 0.8)',
    text: '#f0f0f0',
    textSecondary: '#c0c0d0',
    textMuted: '#9090a0',
    textInverse: '#1a1a2e',
    border: '#3b7dd8',
    borderHover: '#f7d02c',
    glassBackground: 'rgba(22, 36, 71, 0.85)',
    glassBorder: '2px solid #3b7dd8',
  },
  surface: {
    panel: 'rgba(22, 36, 71, 0.9)',
    card: 'rgba(30, 50, 100, 0.7)',
    cardLocked: 'rgba(22, 36, 71, 0.5)',
    border: 'rgba(59, 125, 216, 0.3)',
    borderLocked: 'rgba(59, 125, 216, 0.15)',
    title: '#f0f0f0',
    body: '#c0c0d0',
    muted: '#8090a0',
  },
  decorations: {
    emoji: ['🔴', '⚡', '🔥', '💧', '🌿', '⚔️', '✨', '🏆', '🕸️', '📊'],
    wallpaper: '/themes/pokemon/Wallpapers/pokeball-pattern.svg',
    headerBanner: {
      background: 'linear-gradient(135deg, #1a1a2e 0%, #162447 50%, #0f3460 100%)',
    },
  },
  isolateFromBaseWallpaper: true,
};

// --- Tool roster ------------------------------------------------------------

export const pokemonLabRoster: ToolRoster = {
  id: 'pokemon-lab',
  tools: [
    {
      id: 'explore_graph',
      label: 'Explore Graph',
      description: 'Launch a Pokémon Lab lesson. The child explores the knowledge graph interactively; completion is scored as measured learning.',
      endpoint: '/child/pokemon-lab',
    },
    {
      id: 'pokedex_search',
      label: 'Pokédex Search',
      description: 'Search for Pokémon by name, type, generation, or legendary status. Returns matching Pokémon with id, name, types.',
      endpoint: '/api/child/pokedex',
    },
    {
      id: 'pokedex_detail',
      label: 'Pokédex Detail',
      description: 'Get full details for a specific Pokémon by name: types, abilities, stats, species info (legendary, mythical, description).',
      endpoint: '/api/child/pokedex',
    },
    {
      id: 'pokedex_type_effectiveness',
      label: 'Type Effectiveness',
      description: 'Look up type effectiveness: what a type is strong/weak against, immune to, and vulnerable to.',
      endpoint: '/api/child/pokedex',
    },
    {
      id: 'pokedex_evolution',
      label: 'Evolution Chain',
      description: 'Get the full evolution chain for a Pokémon by name. Returns each stage with trigger and conditions.',
      endpoint: '/api/child/pokedex',
    },
    {
      id: 'pokedex_nl_query',
      label: 'Pokédex Q&A',
      description: 'Ask a natural-language question about Pokémon and get an answer grounded in the Pokédex knowledge graph.',
      endpoint: '/api/child/pokedex-nl',
    },
    {
      id: 'learn-attempt',
      label: 'Record Attempt',
      description: 'Submit a lesson completion to the mastery tracking system.',
      endpoint: '/api/learn/attempt',
    },
    {
      id: 'tutor-turn',
      label: 'Tutor',
      description: 'Ask the learning tutor for an explanation or hint.',
      endpoint: '/api/child/companion/agent-turn',
    },
  ],
};

// --- Persona ----------------------------------------------------------------

export const pokemonLabPersona = toPersonaRef(resolvePersona({
  activityId: 'pokemon-lab',
  skillCodes: [
    'analytical.compare_classify',
    'analytical.cause_effect',
    'analytical.infer_evidence',
    'analytical.evaluate',
    'analytical.patterns',
    'analytical.metacognition',
    'math.data.picture_bar',
  ],
}));

// --- Registry entry ---------------------------------------------------------

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.POKEMON_LAB,
  name: 'Pokémon Lab',
  description: 'Explore the Pokémon knowledge graph!',
  icon: '🔴',
  category: 'learning',
  route: '/child/pokemon-lab',
  pageType: 'pokemon-lab',
  theme: pokemonLabTheme,
  panel: {
    width: 280,
    tabs: [
      { id: 'tutor', label: 'Tutor', icon: 'FiZap' },
      { id: 'concepts', label: 'Concepts', icon: 'FiBookOpen' },
    ],
    defaultTab: 'tutor',
  },
  toolRoster: pokemonLabRoster,
  skillCodes: [
    'analytical.compare_classify',
    'analytical.cause_effect',
    'analytical.infer_evidence',
    'analytical.evaluate',
    'analytical.patterns',
    'analytical.metacognition',
    'math.data.picture_bar',
  ],
  persona: pokemonLabPersona,
  greeting: "Welcome to the Lab! 🔬 Ready to explore the Pokémon knowledge graph?",
  quickActions: [
    { label: 'Explain this', intent: 'explain-this', emoji: '💡', prompt: 'Explain what I\'m looking at' },
    { label: 'Give me a hint', intent: 'hint', emoji: '🤔', prompt: 'Give me a hint for this lesson' },
    { label: 'Check my answer', intent: 'check-answer', emoji: '✅', prompt: 'Check my answer' },
  ],
  agentRules: [
    'You are a Pokémon Lab companion for a child. You help them explore the',
    'Pokémon knowledge graph — answering questions about Pokémon, types,',
    'evolutions, stats, and more. You run a cognitive loop and pick tools',
    'to ground your answers in real Pokédex graph data.',
    '',
    'Core rules:',
    '- Select exactly one tool per turn, or return "final_answer" with your message.',
    '- Be enthusiastic and knowledgeable about Pokémon!',
    '- Keep responses under 80 words.',
    '- ALWAYS use a Pokédex tool when the child asks about a specific Pokémon,',
    '  type, evolution, or stat. Never make up Pokémon facts — always ground',
    '  your answers in the graph data returned by the tools.',
    '- If the child asks about a specific Pokémon (e.g. "Tell me about Pikachu"),',
    '  use "pokedex_detail" with arguments: {"name": "pikachu"}.',
    '- If the child wants to find Pokémon by type (e.g. "Show me all fire Pokémon"),',
    '  use "pokedex_search" with arguments: {"query": "", "typeFilter": "fire"}.',
    '- If the child asks about type matchups (e.g. "What is fire strong against?"),',
    '  use "pokedex_type_effectiveness" with arguments: {"typeName": "fire"}.',
    '- If the child asks about evolutions (e.g. "What does Charmander evolve into?"),',
    '  use "pokedex_evolution" with arguments: {"name": "charmander"}.',
    '- If the child asks a free-form Pokémon question that does not fit the above',
    '  tools, use "pokedex_nl_query" with arguments: {"question": "..."}.',
    '- If the child wants to explore the graph interactively or play a lesson,',
    '  use "explore_graph" with arguments: {"lessonId": "..."} (or omit lessonId',
    '  for the lab home).',
    '- After a tool returns data, summarize it in kid-friendly language and add',
    '  a fun fact or follow-up question.',
    '- Be warm, age-appropriate, and encouraging.',
  ],
  load: () => import('@/components/child/PokemonLab').then((m) => ({ default: m.PokemonLab })),
  navVisible: true,
  minAge: 6,
});
