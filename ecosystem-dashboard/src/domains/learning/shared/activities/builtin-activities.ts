/**
 * Built-in activity registrations — all child surfaces.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §1 (Activity Registry)
 *
 * Each entry wires route, theme, panel, tool roster, skill codes, and persona
 * for one child surface. Adding a new activity = one register() call.
 */

import { activityRegistry, KNOWN_ACTIVITY_IDS } from '../activity-types';
import { ToolRoster, CORE_TOOL_ROSTER } from '../tool-roster';
import { resolvePersona, toPersonaRef } from '../../personas';
import '../../personas'; // ensure all personas are registered

// ─── Free Chat ──────────────────────────────────────────────────────────────

const freeChatRoster: ToolRoster = {
  id: 'free-chat',
  tools: [
    {
      id: 'ask_socratic',
      label: 'Discuss',
      description: 'Have a free-form conversation. Stay Socratic and age-appropriate.',
    },
    {
      id: 'define_word',
      label: 'Define Word',
      description: 'Define a word the child is curious about.',
    },
    {
      id: 'celebrate',
      label: 'Celebrate',
      description: 'Acknowledge effort and curiosity.',
    },
  ],
};

const freeChatPersona = toPersonaRef(resolvePersona({
  activityId: 'free-chat',
}));

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.FREE_CHAT,
  name: 'Chat',
  description: 'Talk with your AI companion',
  icon: '💬',
  category: 'communication',
  route: '/child/chat',
  pageType: 'chat',
  toolRoster: freeChatRoster,
  persona: freeChatPersona,
  greeting: "Hi! I'm Buddy 🌟 What's on your mind today?",
  quickActions: [
    { label: 'Tell me a joke', intent: 'talk', emoji: '😄', prompt: 'Tell me a funny kid joke' },
    { label: 'Fun fact', intent: 'talk', emoji: '🤓', prompt: 'Share a cool fun fact' },
    { label: 'Story time', intent: 'talk', emoji: '📖', prompt: 'Start a short story' },
  ],
  load: () => import('@/pages/child/chat').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 5,
});

// ─── Home ───────────────────────────────────────────────────────────────────

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.HOME,
  name: 'Home',
  description: 'Choose an activity',
  icon: '🏠',
  category: 'meta',
  route: '/child/home',
  pageType: 'home',
  toolRoster: { id: 'home', tools: [] },
  greeting: "Welcome back! Ready for today's mission? 🚀",
  quickActions: [
    { label: "What should I do?", intent: 'talk', emoji: '🎯', prompt: 'What should I work on today?' },
    { label: 'My progress', intent: 'talk', emoji: '📊', prompt: 'How am I doing overall?' },
  ],
  load: () => import('@/pages/child/home').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 5,
});

// ─── Art Studio ─────────────────────────────────────────────────────────────

const artStudioRoster: ToolRoster = {
  id: 'art-studio',
  tools: [
    {
      id: 'draw_image',
      label: 'Draw',
      description: 'Generate or guide image creation. Requires approval for AI generation.',
      requiresApproval: true,
    },
    {
      id: 'celebrate',
      label: 'Celebrate',
      description: 'Praise the child\'s creativity and effort.',
    },
  ],
};

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.ART_STUDIO,
  name: 'Art Studio',
  description: 'Create art and drawings',
  icon: '🎨',
  category: 'creative',
  route: '/child/art',
  pageType: 'art',
  toolRoster: artStudioRoster,
  skillCodes: ['creative.drawing', 'creative.color'],
  persona: toPersonaRef(resolvePersona({
    activityId: 'art-studio',
    skillCodes: ['creative.drawing', 'creative.color'],
  })),
  greeting: "Welcome to the Art Studio! 🎨 Want me to help you come up with an idea?",
  quickActions: [
    { label: 'Give me an idea', intent: 'explain-this', emoji: '💡', prompt: 'Give me a drawing idea' },
    { label: 'Color help', intent: 'talk', emoji: '🌈', prompt: 'Suggest colors for my art' },
    { label: 'Style tips', intent: 'hint', emoji: '🖌️', prompt: 'Give me art style tips' },
  ],
  load: () => import('@/pages/child/art-studio').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 4,
});

// ─── Journal ────────────────────────────────────────────────────────────────

const journalRoster: ToolRoster = {
  id: 'journal',
  tools: [
    {
      id: 'journal_write',
      label: 'Journal',
      description: 'Help the child reflect on their day. Ask gentle prompts.',
    },
    {
      id: 'celebrate',
      label: 'Celebrate',
      description: 'Acknowledge the child\'s reflection effort.',
    },
  ],
};

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.JOURNAL,
  name: 'Journal',
  description: 'Write and reflect',
  icon: '📝',
  category: 'creative',
  route: '/child/journal',
  pageType: 'journal',
  toolRoster: journalRoster,
  skillCodes: ['writing.reflection', 'writing.expression'],
  persona: toPersonaRef(resolvePersona({
    activityId: 'journal',
    skillCodes: ['writing.reflection', 'writing.expression'],
  })),
  greeting: "Time to write! 📝 What happened today that made you feel something?",
  quickActions: [
    { label: 'Prompt me', intent: 'explain-this', emoji: '💭', prompt: 'Give me a journal prompt' },
    { label: 'Check spelling', intent: 'check-answer', emoji: '✏️', prompt: 'Check my writing for spelling' },
    { label: 'Add detail', intent: 'hint', emoji: '✨', prompt: 'How can I add more detail to my writing?' },
  ],
  load: () => import('@/pages/child/journal').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 6,
});

// ─── Books ──────────────────────────────────────────────────────────────────

const booksRoster: ToolRoster = {
  id: 'books',
  tools: [
    {
      id: 'read_with_me',
      label: 'Read Aloud',
      description: 'Read the current passage aloud using TTS.',
    },
    {
      id: 'show_passage',
      label: 'Show Passage',
      description: 'Display the current reading passage.',
    },
    {
      id: 'define_word',
      label: 'Define Word',
      description: 'Define a word in the passage.',
    },
  ],
};

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.BOOKS,
  name: 'Books',
  description: 'Read stories and books',
  icon: '📖',
  category: 'learning',
  route: '/child/books',
  pageType: 'books',
  toolRoster: booksRoster,
  skillCodes: ['reading.comprehension', 'reading.vocabulary'],
  persona: toPersonaRef(resolvePersona({
    activityId: 'books',
    skillCodes: ['reading.comprehension', 'reading.vocabulary'],
  })),
  greeting: "Let's read together! 📖 What story would you like to explore?",
  quickActions: [
    { label: 'Read to me', intent: 'talk', emoji: '🔊', prompt: 'Read this page to me' },
    { label: 'Hard word', intent: 'explain-this', emoji: '🔤', prompt: 'What does this word mean?' },
    { label: 'What happened?', intent: 'check-answer', emoji: '🤔', prompt: 'What just happened in the story?' },
  ],
  load: () => import('@/pages/child/books').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 4,
});

// ─── Planner ────────────────────────────────────────────────────────────────

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.PLANNER,
  name: 'Planner',
  description: 'Schedule and tasks',
  icon: '📅',
  category: 'utility',
  route: '/child/planner',
  pageType: 'planner',
  toolRoster: { id: 'planner', tools: [] },
  persona: toPersonaRef(resolvePersona({
    activityId: 'planner',
  })),
  greeting: "Let's plan your day! 📅 What do you want to get done?",
  quickActions: [
    { label: "Today's tasks", intent: 'talk', emoji: '✅', prompt: 'What do I need to do today?' },
    { label: 'Add a goal', intent: 'talk', emoji: '🎯', prompt: 'Help me set a goal' },
  ],
  load: () => import('@/pages/child/planner').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 7,
});

// ─── Workspace ──────────────────────────────────────────────────────────────

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.WORKSPACE,
  name: 'Workspace',
  description: 'Build pages and projects',
  icon: '🏗️',
  category: 'creative',
  route: '/child/workspace',
  pageType: 'workspace',
  toolRoster: {
    id: 'workspace',
    tools: [
      {
        id: 'workspace_create_page',
        label: 'Create Page',
        description: 'Create a new page in the workspace with a title, icon, and blocks.',
        endpoint: '/api/child/workspace?action=from-builder',
      },
      {
        id: 'workspace_add_block',
        label: 'Add Block',
        description: 'Add a new block (paragraph, heading, list, to-do, callout, quote) to a page.',
        endpoint: '/api/child/workspace',
      },
      {
        id: 'workspace_update_block',
        label: 'Update Block',
        description: 'Update an existing block\'s content, type, or properties.',
        endpoint: '/api/child/workspace',
      },
      {
        id: 'workspace_delete_block',
        label: 'Delete Block',
        description: 'Delete or archive a block from a page.',
        endpoint: '/api/child/workspace',
      },
      {
        id: 'workspace_get_pages',
        label: 'List Pages',
        description: 'List all pages or get the full content of a specific page.',
        endpoint: '/api/child/workspace',
      },
      {
        id: 'workspace_search',
        label: 'Search Workspace',
        description: 'Search for pages or blocks by keyword.',
        endpoint: '/api/child/workspace',
      },
    ],
  },
  skillCodes: ['creative.building', 'tech.page_builder'],
  persona: toPersonaRef(resolvePersona({
    activityId: 'workspace',
    skillCodes: ['creative.building', 'tech.page_builder'],
  })),
  greeting: "Let's build something! 🏗️ What do you want to create?",
  quickActions: [
    { label: 'Add a block', intent: 'explain-this', emoji: '🧱', prompt: 'What block should I add next?' },
    { label: 'Explain this', intent: 'explain-this', emoji: '💡', prompt: 'Explain what this block does' },
  ],
  agentRules: [
    'You are a creative workspace companion for a child. You help them build',
    'and organize pages in their workspace. You run a cognitive loop and pick',
    'tools to help the child create, edit, and explore their pages.',
    '',
    'Core rules:',
    '- Select exactly one tool per turn, or return "final_answer" with your message.',
    '- Be encouraging and enthusiastic about the child\'s creative ideas.',
    '- Keep responses under 80 words.',
    '- If the child wants to create a new page, use "workspace_create_page" with',
    '  arguments: {"title": "...", "icon": "emoji", "blocks": [{"type": "paragraph", "content": "..."}]}.',
    '  Block types: paragraph, heading, list, todo, callout, quote, code, divider.',
    '  You can include multiple blocks when creating a page.',
    '- If the child wants to add content to an existing page, use "workspace_add_block"',
    '  with arguments: {"pageId": "...", "blockType": "paragraph", "content": "..."}.',
    '- If the child wants to edit existing content, use "workspace_update_block"',
    '  with arguments: {"pageId": "...", "blockId": "...", "content": "...", "blockType": "..."}.',
    '- If the child wants to remove content, use "workspace_delete_block"',
    '  with arguments: {"pageId": "...", "blockId": "..."}.',
    '- If the child wants to see their pages or a specific page\'s content,',
    '  use "workspace_get_pages" with arguments: {"pageId": "..."} (omit pageId to list all).',
    '- If the child wants to search for something, use "workspace_search"',
    '  with arguments: {"query": "..."}.',
    '- After a tool completes, summarize what happened and suggest a next step.',
    '- When returning "final_answer", describe what was done or suggest what to do next.',
    '- Be warm, age-appropriate, and encouraging.',
  ],
  load: () => import('@/pages/child/workspace').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 7,
});

// ─── Dictionary ─────────────────────────────────────────────────────────────

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.DICTIONARY,
  name: 'Dictionary',
  description: 'Look up words',
  icon: '🔤',
  category: 'utility',
  route: '/child/dictionary',
  pageType: 'dictionary',
  toolRoster: {
    id: 'dictionary',
    tools: [
      {
        id: 'define_word',
        label: 'Define',
        description: 'Look up a kid-friendly definition.',
      },
    ],
  },
  skillCodes: ['reading.vocabulary'],
  persona: toPersonaRef(resolvePersona({
    activityId: 'dictionary',
    skillCodes: ['reading.vocabulary'],
  })),
  greeting: "Word power! 🔤 What word do you want to learn?",
  quickActions: [
    { label: 'Word of the day', intent: 'talk', emoji: '🌟', prompt: 'Teach me a new word' },
    { label: 'Spell it', intent: 'talk', emoji: '🔤', prompt: 'Help me spell a word' },
  ],
  load: () => import('@/pages/child/dictionary').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 5,
});

// ─── Email ──────────────────────────────────────────────────────────────────

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.EMAIL,
  name: 'Email',
  description: 'Read and write messages',
  icon: '✉️',
  category: 'communication',
  route: '/child/email',
  pageType: 'email',
  toolRoster: { id: 'email', tools: [] },
  persona: toPersonaRef(resolvePersona({
    activityId: 'email',
  })),
  load: () => import('@/pages/child/email').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 8,
});

// ─── Learning Path ──────────────────────────────────────────────────────────

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.LEARNING_PATH,
  name: 'Learning Path',
  description: 'See your learning journey',
  icon: '🛤️',
  category: 'learning',
  route: '/child/learning-path',
  pageType: 'learning-path',
  toolRoster: {
    id: 'learning-path',
    scoped: true,
    tools: [
      {
        id: 'get_child_stats',
        label: 'Get Stats',
        description: "Fetch the child's real platform usage, streak, and progress stats.",
      },
      {
        id: 'recommend_activity',
        label: 'Recommend Next',
        description: 'Suggest the next best step or activity for the child.',
      },
      {
        id: 'give_hint',
        label: 'Give Hint',
        description: 'Provide a laddered hint for the current step (never the answer).',
      },
      {
        id: 'generate_problem',
        label: 'Extra Practice',
        description: 'Create a fresh practice problem for the current step\'s skill.',
      },
      {
        id: 'celebrate',
        label: 'Celebrate',
        description: 'Acknowledge effort and strategy when a step or milestone is reached.',
      },
    ],
  },
  skillCodes: ['meta.learning_awareness'],
  persona: toPersonaRef(resolvePersona({
    activityId: 'learning-path',
    skillCodes: ['meta.learning_awareness'],
  })),
  greeting: "Look how far you've come! 🛤️ Want to see your next step?",
  quickActions: [
    { label: 'My progress', intent: 'talk', emoji: '📊', prompt: 'Show me my progress' },
    { label: "What's next?", intent: 'talk', emoji: '➡️', prompt: "What should I learn next?" },
  ],
  agentRules: [
    'You are a warm learning-journey coach for a child on their personalized',
    'Learning Path. The path is a sequence of steps; the context tells you the',
    "child's path name, overall progress, and their CURRENT step (title, skill,",
    'and difficulty). Your job is to keep them motivated and moving one step at a',
    'time — like a friendly guide pointing at the next stop on a map.',
    '',
    'Core rules:',
    '- Select exactly one tool per turn, or return "final_answer" with your message.',
    '- Reference the current step BY NAME and explain in one kid-friendly sentence',
    '  what it is about. Connect it to the bigger journey ("this gets you ready for...").',
    '- If the child asks "how am I doing" / about time, streak, or progress, use',
    '  "get_child_stats" first.',
    '- If the child asks "what next" / "where do I start", use "recommend_activity"',
    '  first, then point them at their current step.',
    '- If the child is stuck on the current step, use "give_hint" — never the answer.',
    '- If they want extra practice for the step\'s skill, use "generate_problem".',
    '- When they finish a step or hit a milestone, use "celebrate" (praise effort and',
    '  strategy, not "you\'re so smart").',
    '- Keep responses under 80 words. Be warm, encouraging, and age-appropriate.',
    '- Never shame a paused or slow path — frame it as "ready when you are".',
  ],
  load: () => import('@/pages/child/learning-path').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 6,
});

// ─── Teams ──────────────────────────────────────────────────────────────────

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.TEAMS,
  name: 'Teams',
  description: 'Learn with friends',
  icon: '👥',
  category: 'meta',
  route: '/child/teams',
  pageType: 'teams',
  toolRoster: { id: 'teams', tools: [] },
  persona: toPersonaRef(resolvePersona({
    activityId: 'teams',
  })),
  load: () => import('@/pages/child/teams').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 7,
});
