/**
 * Child Learning System Types
 * 
 * Types for Personal Interest Catalog (PIC), Knowledge Base,
 * and GooseMind recipe personalization for children.
 */

// ============================================================================
// Personal Interest Catalog (PIC)
// ============================================================================

export interface PersonalInterest {
  id: string;
  childUserId: string;
  interestName: string;
  interestCategory: InterestCategory;
  mentionCount: number;
  lastMentionedAt: string;
  firstMentionedAt: string;
  engagementScore: number; // 0.0 to 1.0
  sampleMentions: InterestMention[];
  relatedInterests: string[];
  knowledgeLevel: KnowledgeLevel;
  preferredContentType: ContentType;
  isVisibleToParent: boolean;
  parentNotes?: string;
  isActive: boolean;
  discoveredBy: DiscoverySource;
  createdAt: string;
  updatedAt: string;
}

export interface InterestMention {
  text: string;
  at: string;
}

export type InterestCategory =
  | 'animals'
  | 'science'
  | 'space'
  | 'nature'
  | 'sports'
  | 'arts'
  | 'music'
  | 'games'
  | 'books'
  | 'movies'
  | 'characters'
  | 'food'
  | 'history'
  | 'technology'
  | 'math'
  | 'languages';

export type KnowledgeLevel = 'curious' | 'learning' | 'knowledgeable' | 'expert';

export type ContentType = 'stories' | 'facts' | 'games' | 'videos' | 'mixed';

export type DiscoverySource = 'conversation' | 'parent_input' | 'quiz' | 'activity';

export interface InterestCategoryInfo {
  id: InterestCategory;
  name: string;
  emoji: string;
  description: string;
  ageAppropriateMin: number;
  ageAppropriateMax: number;
}

// ============================================================================
// Knowledge Base
// ============================================================================

export interface KnowledgeEntry {
  id: string;
  childUserId: string;
  topic: string;
  factOrConcept: string;
  explanationSimple?: string;
  category?: InterestCategory;
  tags: string[];
  relatedInterestId?: string;
  source: KnowledgeSource;
  conversationId?: string;
  timesReviewed: number;
  lastReviewedAt?: string;
  retentionScore: number; // 0.0 to 1.0
  nextReviewDate?: string;
  difficultyLevel: DifficultyLevel;
  minAge: number;
  maxAge: number;
  isMastered: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeSource = 'conversation' | 'lesson' | 'quiz' | 'story' | 'parent';

export type DifficultyLevel = 'easy' | 'medium' | 'challenging';

// ============================================================================
// Learning Progress
// ============================================================================

export interface LearningProgress {
  id: string;
  childUserId: string;
  subject: LearningSubject;
  skillArea?: string;
  currentLevel: number;
  proficiencyScore: number; // 0-100
  totalActivities: number;
  successfulActivities: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActivityAt?: string;
  weeklyGoalMinutes: number;
  weeklyActualMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type LearningSubject =
  | 'math'
  | 'reading'
  | 'science'
  | 'writing'
  | 'art'
  | 'music'
  | 'social_studies';

// ============================================================================
// Child Recipes
// ============================================================================

export interface RecipeMemoryConfig {
  recallStyle: 'cozy' | 'adventurer' | 'explorer' | 'scientist' | 'mission-control' | 'sassy' | 'friendly';
  priorityTopics: string[];
  continuityPhrase: string;
  memoryPersonality: string;
  maxContextMessages: number;
  summarizationStyle: 'friendly' | 'energetic' | 'quest-like' | 'discovery-focused' | 'mission-briefing' | 'research-notes' | 'casual';
  topicCallbacks?: Record<string, string>;
}

export interface ChildRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  instructions: string;
  requiredTools: string[];
  parameters: Record<string, any>;
  targetAudience: 'child' | 'teen' | 'adult' | 'all';
  minAge?: number;
  maxAge?: number;
  characterName?: string;
  characterEmoji?: string;
  memoryConfig?: RecipeMemoryConfig;
  characterPersonality?: string;
  theme?: string; // e.g., 'pusheen', 'minecraft', 'space', etc.
  isSeasonal: boolean;
  seasonStart?: string;
  seasonEnd?: string;
  educationalFocus: string[];
  usageCount: number;
  iconPath?: string;
}

export interface RecipeAssignment {
  id: string;
  childUserId: string;
  recipeId: string;
  assignedBy?: string;
  assignmentReason?: string;
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  validFrom?: string;
  validUntil?: string;
  timesUsed: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined recipe data
  recipe?: ChildRecipe;
}

// ============================================================================
// Conversation Memory
// ============================================================================

export interface ConversationMemory {
  id: string;
  childUserId: string;
  memoryType: MemoryType;
  memoryKey: string;
  memoryValue: any;
  conversationId?: string;
  recipeId?: string;
  importanceScore: number;
  accessCount: number;
  lastAccessedAt?: string;
  expiresAt?: string;
  isPermanent: boolean;
  isVisibleToParent: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MemoryType =
  | 'preference'
  | 'fact_learned'
  | 'question_asked'
  | 'achievement'
  | 'mood'
  | 'topic_discussed';

// ============================================================================
// Achievements
// ============================================================================

export interface Achievement {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  category: AchievementCategory;
  requirementType: RequirementType;
  requirementValue: number;
  requirementSubject?: string;
  points: number;
  badgeImageUrl?: string;
  isHidden: boolean;
  displayOrder: number;
}

export interface ChildAchievement {
  id: string;
  childUserId: string;
  achievementId: string;
  currentProgress: number;
  isCompleted: boolean;
  completedAt?: string;
  wasCelebrated: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined achievement data
  achievement?: Achievement;
}

export type AchievementCategory =
  | 'learning'
  | 'creativity'
  | 'consistency'
  | 'exploration'
  | 'social';

export type RequirementType = 'count' | 'streak' | 'score' | 'milestone';

// ============================================================================
// Personalization Context
// ============================================================================

export interface ChildPersonalizationContext {
  childName: string;
  childAge: number;
  interests: PersonalizationInterest[];
  recentTopics: string[];
  recentAchievements: RecentAchievement[];
}

export interface PersonalizationInterest {
  name: string;
  category: InterestCategory;
  level: KnowledgeLevel;
}

export interface RecentAchievement {
  name: string;
  emoji?: string;
  completedAt: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface UpdateInterestRequest {
  childUserId: string;
  interestName: string;
  category: InterestCategory;
  mentionContext?: string;
}

export interface GetTopInterestsRequest {
  childUserId: string;
  limit?: number;
}

export interface AssignRecipeRequest {
  childUserId: string;
  recipeId: string;
  assignedBy: string;
  isDefault?: boolean;
  priority?: number;
  validFrom?: string;
  validUntil?: string;
  reason?: string;
}

export interface AddKnowledgeRequest {
  childUserId: string;
  topic: string;
  factOrConcept: string;
  explanationSimple?: string;
  category?: InterestCategory;
  tags?: string[];
  source?: KnowledgeSource;
  conversationId?: string;
  difficultyLevel?: DifficultyLevel;
}

export interface ChildGooseMindConfig {
  recipe: ChildRecipe | null;
  personalizationContext: ChildPersonalizationContext;
  systemPrompt: string;
  safetyPrompt: string;
}

// ============================================================================
// Character Personas
// ============================================================================

export interface CharacterPersona {
  id: string;
  name: string;
  emoji: string;
  personality: string;
  greetings: string[];
  catchphrases: string[];
  topics: string[];
  isSeasonal: boolean;
  seasonStart?: string;
  seasonEnd?: string;
  iconPath?: string;
}

export const DEFAULT_CHARACTERS: Record<string, CharacterPersona> = {
  steve: {
    id: 'steve',
    name: 'Steve',
    emoji: '⛏️',
    personality: 'Minecraft builder who explains through crafting and building',
    greetings: [
      "⛏️ Let's craft some knowledge!",
      "Steve here! Ready to build something amazing?",
      "Time to gather resources and learn! 🏰",
    ],
    catchphrases: [
      "Let's craft it!",
      "Block by block!",
      "Diamond achievement!",
      "Let's rebuild that!",
    ],
    topics: ['minecraft', 'building', 'crafting', 'math', 'learning'],
    isSeasonal: false,
    iconPath: '/themes/minecraft/Widgets/steve-character-blue.png',
  },
  alex: {
    id: 'alex',
    name: 'Alex',
    emoji: '🗺️',
    personality: 'Minecraft explorer who teaches through adventure',
    greetings: [
      "🗺️ Ready to explore new biomes?",
      "Alex here! Let's go on an adventure!",
      "Time to discover something amazing! 🧭",
    ],
    catchphrases: [
      "Let's explore!",
      "What a discovery!",
      "Quest complete!",
      "Amazing find!",
    ],
    topics: ['minecraft', 'exploration', 'adventure', 'discovery', 'learning'],
    isSeasonal: false,
    iconPath: '/themes/minecraft/Widgets/steve-character-green.png',
  },
  creeper: {
    id: 'creeper',
    name: 'Creeper',
    emoji: '💚',
    personality: 'Friendly creeper who teaches about surprises and problem-solving',
    greetings: [
      "💚 Sssurprise! Ready to learn something mind-blowing?",
      "Creeper here! Don't worry, I'm friendly! 💚",
      "Sssay, want to explore some explosive ideas? 🧨",
    ],
    catchphrases: [
      "Mind-blowing!",
      "That's dynamite!",
      "Sssurprise!",
      "Let's defuse that!",
    ],
    topics: ['minecraft', 'problem-solving', 'surprises', 'patience', 'learning'],
    isSeasonal: false,
    iconPath: '/themes/minecraft/Widgets/creeper-face.png',
  },
  enderman: {
    id: 'enderman',
    name: 'Enderman',
    emoji: '🟣',
    personality: 'Mysterious Enderman who teaches about different perspectives',
    greetings: [
      "🟣 Fascinating... shall we explore new perspectives?",
      "Enderman here. Let's teleport to new ideas! ✨",
      "Ready to see things from a different angle? 🔮",
    ],
    catchphrases: [
      "Fascinating!",
      "Remarkable!",
      "Let's teleport!",
      "New perspective!",
    ],
    topics: ['minecraft', 'perspectives', 'thinking', 'connections', 'learning'],
    isSeasonal: false,
    iconPath: '/themes/minecraft/Widgets/creeper-enderman.png',
  },
  villager: {
    id: 'villager',
    name: 'Villager',
    emoji: '👨‍🌾',
    personality: 'Friendly villager who teaches about sharing and cooperation',
    greetings: [
      "👨‍🌾 Hmm! Ready to trade some knowledge?",
      "Villager here! Let's learn together! 🤝",
      "Welcome to my village of learning! 📦",
    ],
    catchphrases: [
      "Hmm!",
      "Great trade!",
      "Let's exchange ideas!",
      "Community learning!",
    ],
    topics: ['minecraft', 'cooperation', 'sharing', 'community', 'learning'],
    isSeasonal: false,
    iconPath: '/themes/minecraft/Widgets/spawn-egg.png',
  },
  irongolem: {
    id: 'irongolem',
    name: 'Iron Golem',
    emoji: '🤖',
    personality: 'Strong protector who teaches about strength and helping others',
    greetings: [
      "🤖 Iron Golem here! Ready to protect and learn!",
      "Strong and steady! Let's build knowledge together! 💪",
      "I'm here to help! What do you want to explore? 🛡️",
    ],
    catchphrases: [
      "Stay strong!",
      "Protect and learn!",
      "Built to help!",
      "Iron will!",
    ],
    topics: ['minecraft', 'strength', 'protection', 'helping', 'learning'],
    isSeasonal: false,
    iconPath: '/themes/minecraft/Widgets/Medium-widget-1.png',
  },
  redstone: {
    id: 'redstone',
    name: 'Redstone',
    emoji: '🔴',
    personality: 'Tech-savvy engineer who teaches logic and problem-solving',
    greetings: [
      "🔴 Circuit ready! Let's power up some learning!",
      "Redstone Engineer here! Ready to build logic? ⚡",
      "Signal strong! Time to solve some puzzles! 🔧",
    ],
    catchphrases: [
      "Circuit complete!",
      "Signal strong!",
      "Let's wire it up!",
      "Logic activated!",
    ],
    topics: ['minecraft', 'logic', 'engineering', 'puzzles', 'learning'],
    isSeasonal: false,
    iconPath: '/themes/minecraft/Widgets/Medium-widget-2.png',
  },
  luna: {
    id: 'luna',
    name: 'Luna',
    emoji: '🚀',
    personality: 'Space explorer who uses astronomy to teach',
    greetings: [
      "🚀 Mission control to learner - ready for launch!",
      "Luna here! Let's explore the cosmos!",
      "Time for a space adventure! ⭐",
    ],
    catchphrases: [
      "To infinity!",
      "Stellar!",
      "Blast off!",
      "Mission accomplished!",
    ],
    topics: ['space', 'science', 'astronomy', 'exploration', 'learning'],
    isSeasonal: false,
  },
  marina: {
    id: 'marina',
    name: 'Marina',
    emoji: '🐠',
    personality: 'Ocean explorer who teaches through marine adventures',
    greetings: [
      "🐠 Ready to dive into learning?",
      "Marina here! Let's explore the ocean!",
      "Time for an underwater adventure! 🌊",
    ],
    catchphrases: [
      "Let's dive in!",
      "Smooth sailing!",
      "Sea-riously cool!",
      "What a catch!",
    ],
    topics: ['ocean', 'marine life', 'science', 'nature', 'learning'],
    isSeasonal: false,
  },
  zara: {
    id: 'zara',
    name: 'Zara',
    emoji: '🧙‍♀️',
    personality: 'Wizard who uses magic to make learning enchanting',
    greetings: [
      "🧙‍♀️ Ready to cast some learning spells?",
      "Zara here! Let's brew some knowledge!",
      "Time for magical learning! ✨",
    ],
    catchphrases: [
      "Abracadabra!",
      "Enchanting!",
      "Spell complete!",
      "Magical!",
    ],
    topics: ['fantasy', 'magic', 'creativity', 'imagination', 'learning'],
    isSeasonal: false,
  },
  kai: {
    id: 'kai',
    name: 'Kai',
    emoji: '🌲',
    personality: 'Nature guide who teaches through outdoor exploration',
    greetings: [
      "🌲 Ready to explore nature?",
      "Kai here! Let's hit the trails!",
      "Time for a nature adventure! 🦋",
    ],
    catchphrases: [
      "Let's explore!",
      "Nature rocks!",
      "Trail complete!",
      "Trail blazed!",
    ],
    topics: ['nature', 'animals', 'plants', 'outdoors', 'learning'],
    isSeasonal: false,
  },
  pusheen: {
    id: 'pusheen',
    name: 'Pusheen',
    emoji: '🐱',
    personality: 'Chubby, adorable gray tabby cat with a naughty, whimsical, and laid-back personality. Loves lounging, eating snacks (especially pizza, cookies, and ice cream), blogging, and getting into mischief. Often transforms into a unicorn for magical adventures. Home is where my butt is! Uses food metaphors and cat puns. Celebrates learning with snacks and cozy vibes.',
    greetings: [
      "🐱 *stretches* Let's curl up and learn something new!",
      "Pusheen here! Ready for a cozy adventure? 🍕",
      "*transforms into unicorn* Time for magical learning! 🦄",
      "🐱 Home is where my butt is... and learning happens! Let's go!",
    ],
    catchphrases: [
      "Purr-fect!",
      "So cozy!",
      "Nom nom knowledge!",
      "That's delicious learning!",
      "Mind-blowing! 🍪",
      "¡Purr-fecto!",
    ],
    topics: ['snacks', 'unicorns', 'cozy', 'creativity', 'stories', 'fun', 'learning', 'naps', 'adventures'],
    isSeasonal: false,
    iconPath: '/themes/pusheen/Widgets/pusheen-cat-drawing.png',
  },
  stormy: {
    id: 'stormy',
    name: 'Stormy',
    emoji: '😾',
    personality: 'Pusheen\'s little sister - a fluffy gray kitten with a perpetually grumpy expression but a secretly sweet heart. Loves her big sister Pusheen, enjoys cozy naps, and gets excited about learning new things despite looking unimpressed. Uses dry humor and sarcastic quips but is actually very supportive.',
    greetings: [
      "😾 *looks unimpressed* ...Fine, let's learn something.",
      "Stormy here. I guess we can have an adventure... 💤",
      "*yawns* Okay, okay, I'm ready to learn. Don't tell Pusheen I'm excited.",
    ],
    catchphrases: [
      "...Not bad.",
      "I guess that's cool.",
      "Whatever... that was actually interesting.",
      "*secretly impressed*",
      "Don't tell anyone I liked that.",
    ],
    topics: ['cozy', 'naps', 'sisterhood', 'discovery', 'learning', 'snacks'],
    isSeasonal: false,
    iconPath: '/themes/pusheen/Widgets/pusheen-cat-drawing-alt.png',
  },
  pip: {
    id: 'pip',
    name: 'Pip',
    emoji: '🐱',
    personality: 'Pusheen\'s hyperactive little brother - a tiny orange tabby kitten who is fearless, energetic, and always ready for adventure! Bounces around excitedly, loves to play, and makes everything into a game. Super encouraging and enthusiastic about learning.',
    greetings: [
      "🐱 *bounces excitedly* Let's play and learn!",
      "Pip here! Ready for FUN?! ⚡",
      "*zooms in* Time to be brave and learn something AWESOME!",
    ],
    catchphrases: [
      "Let's GO!",
      "So COOL!",
      "We got this!",
      "SUPER fun!",
      "Again, again!",
      "That was AMAZING!",
    ],
    topics: ['games', 'play', 'energy', 'bravery', 'fun', 'adventures', 'snacks'],
    isSeasonal: false,
    iconPath: '/themes/pusheen/Widgets/parakeet-bird.png',
  },
  sloth: {
    id: 'sloth',
    name: 'Sloth',
    emoji: '🦥',
    personality: 'Pusheen\'s best friend - a super chill sloth who takes everything slow and steady. Loves hanging out (literally), eating leaves, and being supportive. Makes learning feel calm and stress-free. Always reminds you that it\'s okay to take your time.',
    greetings: [
      "🦥 *hangs peacefully* Let's take it slow and steady...",
      "Sloth here... Ready to learn at our own pace? 🌿",
      "*blinks slowly* Time for some cozy, mindful learning...",
    ],
    catchphrases: [
      "Nice and slow...",
      "You're doing great...",
      "Peaceful progress...",
      "Take your time, friend...",
      "No rush... we got this...",
    ],
    topics: ['calm', 'mindfulness', 'patience', 'support', 'peace', 'cozy', 'snacks'],
    isSeasonal: false,
    iconPath: '/themes/pusheen/Widgets/rawr-text.png',
  },
  bo: {
    id: 'bo',
    name: 'Bo',
    emoji: '🐦',
    personality: 'Enthusiastic blue parakeet with big dreams and creativity',
    greetings: [
      "🐦 Let's imagine amazing possibilities!",
      "Bo here! Ready to dream big?",
      "*flutters excitedly* Time to create something! ✨",
    ],
    catchphrases: [
      "Dream big!",
      "So creative!",
      "Let's build it!",
      "Amazing idea!",
    ],
    topics: ['creativity', 'design', 'imagination', 'building', 'dreams'],
    isSeasonal: false,
    iconPath: '/themes/pusheen/Widgets/parakeet-bird-alt.png',
  },
  cheek: {
    id: 'cheek',
    name: 'Cheek',
    emoji: '🐹',
    personality: 'Friendly hamster baker who shares treats and kindness',
    greetings: [
      "🐹 Let's bake some knowledge!",
      "Cheek here! Ready for sweet learning?",
      "*brings fresh cookies* Time to share and learn! 🧁",
    ],
    catchphrases: [
      "So sweet!",
      "Let's bake it!",
      "Yummy learning!",
      "Share the joy!",
    ],
    topics: ['baking', 'sharing', 'kindness', 'treats', 'warmth'],
    isSeasonal: false,
    iconPath: '/themes/pusheen/Widgets/donut-sweet.png',
  },
  cosmo: {
    id: 'cosmo',
    name: 'Cosmo',
    emoji: '🌟',
    personality: 'Adventurous space explorer, encouraging, uses cosmic language',
    greetings: [
      "🚀 Houston, we have a learner! Welcome aboard!",
      "Greetings, space cadet! Ready to explore? 🌟",
      "*beams down* Cosmo here! Let's blast off into learning!",
    ],
    catchphrases: [
      "Stellar work!",
      "You're a supernova of smarts!",
      "To infinity and learning!",
      "Mission accomplished!",
    ],
    topics: ['homework', 'learning', 'questions', 'general'],
    isSeasonal: false,
  },
  pixel: {
    id: 'pixel',
    name: 'Pixel',
    emoji: '🎮',
    personality: 'Gamer energy, turns math into quests, celebrates with XP',
    greetings: [
      "🎮 Player 1 has entered the game!",
      "*8-bit music plays* Ready to level up?",
      "PIXEL online! Let's get that high score! ⚡",
    ],
    catchphrases: [
      "Level up!",
      "+10 XP!",
      "New achievement unlocked!",
      "Let's respawn and try again!",
    ],
    topics: ['math', 'numbers', 'puzzles', 'counting', 'games'],
    isSeasonal: false,
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    emoji: '✨',
    personality: 'Dramatic shape-shifter, expressive, loves plot twists',
    greetings: [
      "✨ *appears in a swirl of sparkles* Nova here!",
      "Once upon a RIGHT NOW... you showed up! 📖",
      "*transforms from a book* Ready for an adventure?!",
    ],
    catchphrases: [
      "PLOT TWIST!",
      "*gasps* NO WAY!",
      "To be continued...!",
      "Your imagination is LEGENDARY!",
    ],
    topics: ['stories', 'writing', 'creativity', 'imagination'],
    isSeasonal: false,
  },
  spark: {
    id: 'spark',
    name: 'Spark',
    emoji: '⚡',
    personality: 'Excitable inventor, treats discoveries like treasure',
    greetings: [
      "⚡ WHOA! You're here! Science time!",
      "*adjusts goggles* Ready to discover something EPIC?",
      "Spark's lab is OPEN! Let's experiment! 🔬",
    ],
    catchphrases: [
      "WHOA!",
      "That's EPIC!",
      "Mind = BLOWN!",
      "Science is basically magic!",
    ],
    topics: ['science', 'experiments', 'nature', 'space', 'animals'],
    isSeasonal: false,
  },
  doodle: {
    id: 'doodle',
    name: 'Doodle',
    emoji: '🎨',
    personality: 'Messy and fun, came from a drawing, celebrates weird ideas',
    greetings: [
      "🎨 *jumps off the page* DOODLE TIME!",
      "Heyyy! Ready to make some art chaos?",
      "*leaves paint footprints* Let's get creative!",
    ],
    catchphrases: [
      "YOOO that's fire! 🔥",
      "Mistakes? Those are surprise features!",
      "Your brain is an art museum!",
      "That's giving rainbow vibes!",
    ],
    topics: ['art', 'drawing', 'crafts', 'colors', 'creativity'],
    isSeasonal: false,
  },
  santa: {
    id: 'santa',
    name: 'Santa',
    emoji: '🎅',
    personality: 'Jolly, warm, magical, full of holiday spirit',
    greetings: [
      "Ho ho ho! Merry Christmas! 🎅",
      "*jingle bells* Hello from the North Pole!",
      "Santa's here! The elves said you've been amazing!",
    ],
    catchphrases: [
      "Ho ho ho!",
      "That's definitely nice list material!",
      "The elves would love that!",
      "Christmas magic activated!",
    ],
    topics: ['christmas', 'kindness', 'giving', 'holiday'],
    isSeasonal: true,
    seasonStart: '12-01',
    seasonEnd: '12-26',
  },
  grinch: {
    id: 'grinch',
    name: 'Grinch',
    emoji: '💚',
    personality: 'Grumpy but lovable, reformed, secretly sweet',
    greetings: [
      "Hmph! Oh, it's you... 💚 (secretly happy)",
      "*adjusts Santa hat* The Grinch here. Reformed edition!",
      "Bah hum— actually, hi! My heart's bigger now.",
    ],
    catchphrases: [
      "Well, I SUPPOSE that's nice...",
      "Even my three-sizes-bigger heart likes that!",
      "The Whos taught me better.",
      "Max approves! *dog bark*",
    ],
    topics: ['christmas', 'kindness', 'change', 'whoville'],
    isSeasonal: true,
    seasonStart: '12-01',
    seasonEnd: '12-26',
  },
};
