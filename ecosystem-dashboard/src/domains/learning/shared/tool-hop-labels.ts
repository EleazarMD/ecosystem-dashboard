/**
 * Tool Hop Labels — kid-friendly labels and progress phrases for agent tools.
 *
 * Used by TutorCompanion to show friendly progress indicators while the
 * agent loop runs, and to badge assistant messages with the tools that
 * were used during the turn.
 */

export interface ToolHopLabel {
  label: string;
  emoji: string;
}

export const TOOL_HOP_LABELS: Record<string, ToolHopLabel> = {
  ask_socratic: { label: 'Thinking with you', emoji: '💡' },
  give_hint: { label: 'Finding a hint', emoji: '🤔' },
  check_answer: { label: 'Checking your thinking', emoji: '✅' },
  define_word: { label: 'Looking up a word', emoji: '📖' },
  read_with_me: { label: 'Reading together', emoji: '📚' },
  show_passage: { label: 'Finding the passage', emoji: '📖' },
  journal_write: { label: 'Writing in journal', emoji: '✏️' },
  draw_image: { label: 'Creating art', emoji: '🎨' },
  celebrate: { label: 'Celebrating', emoji: '🎉' },
  explore_graph: { label: 'Exploring the graph', emoji: '🕸️' },
  'pokedex-query': { label: 'Searching Pokédex', emoji: '🔍' },
  'pokedex-nl': { label: 'Asking Pokédex', emoji: '🔍' },
  'learn-attempt': { label: 'Checking your work', emoji: '📝' },
  'learn-plan': { label: 'Planning your day', emoji: '🗺️' },
  'tutor-turn': { label: 'Talking with tutor', emoji: '🧑‍🏫' },
  'dictionary-lookup': { label: 'Looking up a word', emoji: '📖' },
  calculator: { label: 'Calculating', emoji: '🔢' },
  workspace_create_page: { label: 'Creating a page', emoji: '📄' },
  workspace_add_block: { label: 'Adding content', emoji: '🧱' },
  workspace_update_block: { label: 'Editing content', emoji: '✏️' },
  workspace_delete_block: { label: 'Removing content', emoji: '🗑️' },
  workspace_get_pages: { label: 'Finding pages', emoji: '📋' },
  workspace_search: { label: 'Searching workspace', emoji: '🔍' },
  pokedex_search: { label: 'Searching Pokédex', emoji: '🔍' },
  pokedex_detail: { label: 'Looking up Pokémon', emoji: '📕' },
  pokedex_type_effectiveness: { label: 'Checking type matchups', emoji: '⚔️' },
  pokedex_evolution: { label: 'Finding evolutions', emoji: '🔄' },
  pokedex_nl_query: { label: 'Asking the Pokédex', emoji: '🔮' },
};

const PROGRESS_PHRASES = [
  'Thinking...',
  'Checking your thinking...',
  'Finding the right words...',
  'Looking for a hint...',
  'Almost there...',
];

export function formatToolHopProgress(): string[] {
  return PROGRESS_PHRASES;
}

export function getToolLabel(toolId: string): ToolHopLabel {
  return TOOL_HOP_LABELS[toolId] ?? { label: toolId, emoji: '🔧' };
}
