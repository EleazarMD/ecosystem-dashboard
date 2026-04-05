/**
 * Creative Activity Types
 * 
 * Types for the guided creative activity system that connects
 * Chat conversations to Art-Studio image generation.
 * 
 * Flow:
 * 1. Child starts a creative activity (e.g., "Build a Castle" or "Bake a Treat")
 * 2. Character guides them through design choices via conversation
 * 3. Each choice is captured as a design element
 * 4. When complete, the design is sent to Art-Studio for image generation
 * 5. Child receives their personalized creation as an image
 */

// Activity categories by theme
export type ActivityCategory = 
  | 'building'      // Minecraft: castles, houses, farms
  | 'crafting'      // Minecraft: items, tools, armor
  | 'exploration'   // Minecraft: biomes, caves, nether
  | 'baking'        // Pusheen: cookies, cakes, treats
  | 'cooking'       // Pusheen: meals, snacks
  | 'crafts'        // Pusheen: art, decorations
  | 'adventure'     // Both: stories, quests
  | 'custom';       // User-defined

// Activity status
export type ActivityStatus = 
  | 'started'       // Activity just began
  | 'designing'     // Gathering design choices
  | 'reviewing'     // Showing summary before generation
  | 'generating'    // Image is being generated
  | 'completed'     // Image ready
  | 'cancelled';    // User cancelled

// Design element types
export type DesignElementType =
  | 'subject'       // Main subject (castle, cookie, etc.)
  | 'style'         // Visual style (medieval, modern, cute)
  | 'color'         // Color scheme
  | 'size'          // Size/scale
  | 'material'      // Material (stone, brick, chocolate)
  | 'decoration'    // Decorations/details
  | 'environment'   // Background/setting
  | 'mood'          // Atmosphere (happy, magical, cozy)
  | 'special'       // Special features
  | 'custom';       // Custom element

// A single design choice made during the activity
export interface DesignElement {
  type: DesignElementType;
  label: string;           // Display label (e.g., "Castle Style")
  value: string;           // Selected value (e.g., "Medieval")
  emoji?: string;          // Visual emoji
  promptFragment: string;  // Fragment to add to image prompt
}

// Activity template definition
export interface CreativeActivityTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  theme: 'minecraft' | 'pusheen' | 'space' | 'ocean' | 'universal';
  category: ActivityCategory;
  
  // Characters that can guide this activity
  compatibleCharacters: string[];
  
  // Design steps to guide the user through
  designSteps: DesignStep[];
  
  // Base prompt template with {placeholders}
  promptTemplate: string;
  
  // Image generation settings
  imageSettings: {
    style: string;           // cartoon, pixel, storybook, etc.
    aspectRatio?: string;    // 1:1, 16:9, etc.
    additionalPrompt?: string; // Extra prompt additions
  };
  
  // Age appropriateness
  minAge?: number;
  maxAge?: number;
  
  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
  educationalFocus?: string[];
}

// A step in the design process
export interface DesignStep {
  id: string;
  elementType: DesignElementType;
  question: string;         // Question to ask the child
  characterPrompt: string;  // How the character should ask
  options: DesignOption[];  // Available choices
  allowCustom?: boolean;    // Can child type custom answer
  required?: boolean;       // Must answer to continue
}

// An option for a design step
export interface DesignOption {
  id: string;
  label: string;
  emoji: string;
  promptFragment: string;   // What to add to the image prompt
  followUp?: string;        // Optional follow-up question
}

// Active creative activity session
export interface CreativeActivitySession {
  id: string;
  userId: string;
  templateId: string;
  template: CreativeActivityTemplate;
  characterId: string;
  characterName: string;
  
  status: ActivityStatus;
  currentStepIndex: number;
  
  // Collected design choices
  designElements: DesignElement[];
  
  // Conversation context
  conversationHistory: ActivityMessage[];
  
  // Generated result
  generatedImageUrl?: string;
  generatedImageId?: string;
  finalPrompt?: string;
  
  // Timestamps
  startedAt: string;
  completedAt?: string;
  
  // Metadata
  metadata?: Record<string, any>;
}

// Message in activity conversation
export interface ActivityMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  designElement?: DesignElement; // If this message captured a design choice
}

// API request/response types
export interface StartActivityRequest {
  templateId: string;
  characterId?: string;
}

export interface StartActivityResponse {
  session: CreativeActivitySession;
  welcomeMessage: string;
  firstQuestion: string;
  options: DesignOption[];
}

export interface ActivityChoiceRequest {
  sessionId: string;
  choiceId?: string;        // Selected option ID
  customValue?: string;     // Custom text input
}

export interface ActivityChoiceResponse {
  session: CreativeActivitySession;
  message: string;          // Character's response
  nextQuestion?: string;    // Next question if more steps
  options?: DesignOption[]; // Next options
  isComplete?: boolean;     // True if all steps done
  summary?: string;         // Design summary if complete
}

export interface GenerateActivityImageRequest {
  sessionId: string;
  confirmed: boolean;       // User confirmed the design
}

export interface GenerateActivityImageResponse {
  session: CreativeActivitySession;
  message: string;
  imageUrl?: string;
  imageId?: string;
  error?: string;
}

// ============================================================================
// Pre-defined Activity Templates
// ============================================================================

export const MINECRAFT_ACTIVITIES: CreativeActivityTemplate[] = [
  {
    id: 'minecraft-castle-builder',
    name: 'Castle Builder',
    description: 'Design and build your dream Minecraft castle!',
    emoji: '🏰',
    theme: 'minecraft',
    category: 'building',
    compatibleCharacters: ['steve', 'alex', 'villager'],
    designSteps: [
      {
        id: 'castle-style',
        elementType: 'style',
        question: 'What style of castle do you want to build?',
        characterPrompt: "⛏️ Awesome! Let's build a castle! First, what style should it be?",
        options: [
          { id: 'medieval', label: 'Medieval', emoji: '🏰', promptFragment: 'medieval stone castle with towers and battlements' },
          { id: 'fantasy', label: 'Fantasy', emoji: '✨', promptFragment: 'magical fantasy castle with floating towers and glowing crystals' },
          { id: 'japanese', label: 'Japanese', emoji: '🏯', promptFragment: 'Japanese pagoda-style castle with curved roofs' },
          { id: 'ice', label: 'Ice Palace', emoji: '❄️', promptFragment: 'frozen ice palace castle made of blue ice and packed ice' },
        ],
        required: true,
      },
      {
        id: 'castle-material',
        elementType: 'material',
        question: 'What blocks should we use?',
        characterPrompt: "Block by block! What material should we craft it from?",
        options: [
          { id: 'stone', label: 'Stone Bricks', emoji: '🧱', promptFragment: 'built with gray stone bricks' },
          { id: 'deepslate', label: 'Deepslate', emoji: '⬛', promptFragment: 'built with dark deepslate bricks' },
          { id: 'sandstone', label: 'Sandstone', emoji: '🟨', promptFragment: 'built with golden sandstone' },
          { id: 'prismarine', label: 'Prismarine', emoji: '🟦', promptFragment: 'built with aqua prismarine blocks' },
        ],
        required: true,
      },
      {
        id: 'castle-size',
        elementType: 'size',
        question: 'How big should your castle be?',
        characterPrompt: "Let's plan the size! How grand should this castle be?",
        options: [
          { id: 'cozy', label: 'Cozy Fort', emoji: '🏠', promptFragment: 'small cozy castle' },
          { id: 'medium', label: 'Noble Castle', emoji: '🏰', promptFragment: 'medium-sized noble castle' },
          { id: 'grand', label: 'Grand Palace', emoji: '👑', promptFragment: 'massive grand palace with multiple towers' },
          { id: 'epic', label: 'Epic Fortress', emoji: '⚔️', promptFragment: 'epic sprawling fortress complex' },
        ],
        required: true,
      },
      {
        id: 'castle-features',
        elementType: 'special',
        question: 'What special features should it have?',
        characterPrompt: "Diamond achievement unlocked! What cool features should we add?",
        options: [
          { id: 'moat', label: 'Moat & Bridge', emoji: '🌊', promptFragment: 'with a water moat and drawbridge' },
          { id: 'garden', label: 'Royal Garden', emoji: '🌸', promptFragment: 'with beautiful royal gardens' },
          { id: 'dragon', label: 'Dragon Perch', emoji: '🐉', promptFragment: 'with a dragon perch on the highest tower' },
          { id: 'redstone', label: 'Redstone Tech', emoji: '🔴', promptFragment: 'with redstone-powered doors and traps' },
        ],
        allowCustom: true,
      },
      {
        id: 'castle-environment',
        elementType: 'environment',
        question: 'Where should your castle be located?',
        characterPrompt: "Almost done! Where in the Minecraft world should we place it?",
        options: [
          { id: 'mountain', label: 'Mountain Top', emoji: '⛰️', promptFragment: 'on top of a tall mountain' },
          { id: 'plains', label: 'Green Plains', emoji: '🌿', promptFragment: 'in lush green plains' },
          { id: 'ocean', label: 'Ocean Cliff', emoji: '🌊', promptFragment: 'on a cliff overlooking the ocean' },
          { id: 'forest', label: 'Dark Forest', emoji: '🌲', promptFragment: 'in a mysterious dark oak forest' },
        ],
        required: true,
      },
    ],
    promptTemplate: 'Minecraft-style {style}, {material}, {size}, {special}, located {environment}, blocky voxel art style, colorful, detailed, game screenshot aesthetic',
    imageSettings: {
      style: 'pixel',
      additionalPrompt: 'Minecraft game art style, blocky voxels, vibrant colors, detailed pixel art',
    },
    difficulty: 'easy',
    estimatedMinutes: 5,
    educationalFocus: ['creativity', 'architecture', 'planning'],
  },
  {
    id: 'minecraft-house-builder',
    name: 'Dream House',
    description: 'Design your perfect Minecraft home!',
    emoji: '🏠',
    theme: 'minecraft',
    category: 'building',
    compatibleCharacters: ['steve', 'alex', 'villager'],
    designSteps: [
      {
        id: 'house-style',
        elementType: 'style',
        question: 'What style of house do you want?',
        characterPrompt: "🏠 Let's build your dream house! What style should it be?",
        options: [
          { id: 'cottage', label: 'Cozy Cottage', emoji: '🏡', promptFragment: 'cozy cottage with a thatched roof' },
          { id: 'modern', label: 'Modern House', emoji: '🏢', promptFragment: 'sleek modern house with large windows' },
          { id: 'treehouse', label: 'Treehouse', emoji: '🌳', promptFragment: 'magical treehouse built in a giant oak tree' },
          { id: 'underwater', label: 'Underwater Base', emoji: '🐠', promptFragment: 'underwater glass dome house' },
        ],
        required: true,
      },
      {
        id: 'house-material',
        elementType: 'material',
        question: 'What should we build it with?',
        characterPrompt: "Great choice! What blocks should we use?",
        options: [
          { id: 'oak', label: 'Oak Wood', emoji: '🪵', promptFragment: 'built with warm oak wood planks' },
          { id: 'spruce', label: 'Spruce Wood', emoji: '🌲', promptFragment: 'built with dark spruce wood' },
          { id: 'quartz', label: 'Quartz', emoji: '⬜', promptFragment: 'built with smooth white quartz' },
          { id: 'copper', label: 'Copper', emoji: '🟤', promptFragment: 'built with oxidized copper' },
        ],
        required: true,
      },
      {
        id: 'house-features',
        elementType: 'decoration',
        question: 'What special rooms or features?',
        characterPrompt: "Let's make it special! What should be inside?",
        options: [
          { id: 'farm', label: 'Indoor Farm', emoji: '🌾', promptFragment: 'with an indoor wheat farm' },
          { id: 'enchant', label: 'Enchanting Room', emoji: '📖', promptFragment: 'with a magical enchanting room' },
          { id: 'aquarium', label: 'Aquarium', emoji: '🐟', promptFragment: 'with a tropical fish aquarium' },
          { id: 'pets', label: 'Pet Area', emoji: '🐱', promptFragment: 'with a cozy pet corner for cats and dogs' },
        ],
        allowCustom: true,
      },
    ],
    promptTemplate: 'Minecraft-style {style}, {material}, {decoration}, blocky voxel art, colorful game screenshot',
    imageSettings: {
      style: 'pixel',
      additionalPrompt: 'Minecraft aesthetic, blocky, vibrant, cozy atmosphere',
    },
    difficulty: 'easy',
    estimatedMinutes: 4,
    educationalFocus: ['creativity', 'interior design', 'planning'],
  },
];

export const PUSHEEN_ACTIVITIES: CreativeActivityTemplate[] = [
  {
    id: 'pusheen-cookie-baker',
    name: 'Cookie Creator',
    description: 'Bake the most adorable cookies with Pusheen!',
    emoji: '🍪',
    theme: 'pusheen',
    category: 'baking',
    compatibleCharacters: ['pusheen', 'stormy', 'pip', 'sloth'],
    designSteps: [
      {
        id: 'cookie-shape',
        elementType: 'subject',
        question: 'What shape should your cookies be?',
        characterPrompt: "🍪 Yay! Let's bake cookies! What shape should they be?",
        options: [
          { id: 'cat', label: 'Cat Shaped', emoji: '🐱', promptFragment: 'adorable cat-shaped cookies' },
          { id: 'star', label: 'Stars', emoji: '⭐', promptFragment: 'sparkly star-shaped cookies' },
          { id: 'heart', label: 'Hearts', emoji: '💖', promptFragment: 'cute heart-shaped cookies' },
          { id: 'cloud', label: 'Clouds', emoji: '☁️', promptFragment: 'fluffy cloud-shaped cookies' },
        ],
        required: true,
      },
      {
        id: 'cookie-flavor',
        elementType: 'material',
        question: 'What flavor should they be?',
        characterPrompt: "Mmm! What yummy flavor?",
        options: [
          { id: 'chocolate', label: 'Chocolate', emoji: '🍫', promptFragment: 'rich chocolate cookies' },
          { id: 'vanilla', label: 'Vanilla', emoji: '🍦', promptFragment: 'sweet vanilla sugar cookies' },
          { id: 'strawberry', label: 'Strawberry', emoji: '🍓', promptFragment: 'pink strawberry cookies' },
          { id: 'rainbow', label: 'Rainbow', emoji: '🌈', promptFragment: 'colorful rainbow swirl cookies' },
        ],
        required: true,
      },
      {
        id: 'cookie-topping',
        elementType: 'decoration',
        question: 'How should we decorate them?',
        characterPrompt: "Time to decorate! What toppings?",
        options: [
          { id: 'sprinkles', label: 'Sprinkles', emoji: '✨', promptFragment: 'covered in colorful sprinkles' },
          { id: 'icing', label: 'Cute Icing', emoji: '🎨', promptFragment: 'with adorable icing faces' },
          { id: 'chocolate-drizzle', label: 'Chocolate Drizzle', emoji: '🍫', promptFragment: 'drizzled with chocolate' },
          { id: 'glitter', label: 'Edible Glitter', emoji: '💫', promptFragment: 'sparkling with edible glitter' },
        ],
        allowCustom: true,
      },
      {
        id: 'cookie-presentation',
        elementType: 'environment',
        question: 'How should we display them?',
        characterPrompt: "Almost done! How should we present your cookies?",
        options: [
          { id: 'plate', label: 'Pretty Plate', emoji: '🍽️', promptFragment: 'arranged on a cute pastel plate' },
          { id: 'box', label: 'Gift Box', emoji: '🎁', promptFragment: 'in an adorable gift box with ribbon' },
          { id: 'tower', label: 'Cookie Tower', emoji: '🗼', promptFragment: 'stacked in a tall cookie tower' },
          { id: 'picnic', label: 'Picnic Setup', emoji: '🧺', promptFragment: 'at a cute picnic with tea' },
        ],
        required: true,
      },
    ],
    promptTemplate: '{subject}, {material}, {decoration}, {environment}, kawaii style, pastel colors, adorable, Pusheen aesthetic',
    imageSettings: {
      style: 'cartoon',
      additionalPrompt: 'kawaii cute style, soft pastel colors, adorable, cozy baking aesthetic, Pusheen-inspired',
    },
    difficulty: 'easy',
    estimatedMinutes: 4,
    educationalFocus: ['creativity', 'baking concepts', 'colors'],
  },
  {
    id: 'pusheen-cake-designer',
    name: 'Cake Designer',
    description: 'Design the most amazing birthday cake!',
    emoji: '🎂',
    theme: 'pusheen',
    category: 'baking',
    compatibleCharacters: ['pusheen', 'stormy', 'pip'],
    designSteps: [
      {
        id: 'cake-layers',
        elementType: 'size',
        question: 'How many layers should your cake have?',
        characterPrompt: "🎂 Let's make a cake! How tall should it be?",
        options: [
          { id: 'single', label: 'One Layer', emoji: '1️⃣', promptFragment: 'single layer cake' },
          { id: 'double', label: 'Two Layers', emoji: '2️⃣', promptFragment: 'two-tier layer cake' },
          { id: 'triple', label: 'Three Layers', emoji: '3️⃣', promptFragment: 'tall three-tier cake' },
          { id: 'tower', label: 'Cake Tower!', emoji: '🗼', promptFragment: 'magnificent five-tier tower cake' },
        ],
        required: true,
      },
      {
        id: 'cake-flavor',
        elementType: 'material',
        question: 'What flavor cake?',
        characterPrompt: "Yummy! What flavor should it be?",
        options: [
          { id: 'chocolate', label: 'Chocolate', emoji: '🍫', promptFragment: 'rich chocolate cake' },
          { id: 'vanilla', label: 'Vanilla', emoji: '🍦', promptFragment: 'fluffy vanilla cake' },
          { id: 'strawberry', label: 'Strawberry', emoji: '🍓', promptFragment: 'pink strawberry cake' },
          { id: 'rainbow', label: 'Rainbow', emoji: '🌈', promptFragment: 'colorful rainbow layer cake' },
        ],
        required: true,
      },
      {
        id: 'cake-frosting',
        elementType: 'color',
        question: 'What color frosting?',
        characterPrompt: "Time for frosting! What color?",
        options: [
          { id: 'pink', label: 'Pink', emoji: '💗', promptFragment: 'with pink buttercream frosting' },
          { id: 'purple', label: 'Purple', emoji: '💜', promptFragment: 'with lavender purple frosting' },
          { id: 'blue', label: 'Blue', emoji: '💙', promptFragment: 'with sky blue frosting' },
          { id: 'rainbow', label: 'Rainbow', emoji: '🌈', promptFragment: 'with rainbow swirl frosting' },
        ],
        required: true,
      },
      {
        id: 'cake-topper',
        elementType: 'decoration',
        question: 'What should go on top?',
        characterPrompt: "The finishing touch! What goes on top?",
        options: [
          { id: 'pusheen', label: 'Pusheen Topper', emoji: '🐱', promptFragment: 'topped with a cute Pusheen cat figure' },
          { id: 'flowers', label: 'Sugar Flowers', emoji: '🌸', promptFragment: 'decorated with sugar flowers' },
          { id: 'candles', label: 'Sparkly Candles', emoji: '🕯️', promptFragment: 'with sparkly birthday candles' },
          { id: 'stars', label: 'Star Sprinkles', emoji: '⭐', promptFragment: 'covered in star sprinkles' },
        ],
        allowCustom: true,
      },
    ],
    promptTemplate: '{size}, {material}, {color}, {decoration}, kawaii birthday cake, adorable, pastel aesthetic',
    imageSettings: {
      style: 'cartoon',
      additionalPrompt: 'kawaii cute style, soft pastel colors, birthday celebration, adorable cake design',
    },
    difficulty: 'easy',
    estimatedMinutes: 4,
    educationalFocus: ['creativity', 'baking', 'celebration'],
  },
  {
    id: 'pusheen-cozy-room',
    name: 'Cozy Room Designer',
    description: 'Design the coziest room for Pusheen!',
    emoji: '🛋️',
    theme: 'pusheen',
    category: 'crafts',
    compatibleCharacters: ['pusheen', 'stormy', 'sloth'],
    designSteps: [
      {
        id: 'room-type',
        elementType: 'subject',
        question: 'What kind of room should we design?',
        characterPrompt: "🛋️ Let's make a cozy space! What room?",
        options: [
          { id: 'bedroom', label: 'Bedroom', emoji: '🛏️', promptFragment: 'cozy bedroom' },
          { id: 'reading', label: 'Reading Nook', emoji: '📚', promptFragment: 'cozy reading nook' },
          { id: 'cafe', label: 'Cat Café', emoji: '☕', promptFragment: 'adorable cat café' },
          { id: 'garden', label: 'Indoor Garden', emoji: '🌿', promptFragment: 'peaceful indoor garden room' },
        ],
        required: true,
      },
      {
        id: 'room-color',
        elementType: 'color',
        question: 'What color scheme?',
        characterPrompt: "What colors should we use?",
        options: [
          { id: 'pink', label: 'Pink & White', emoji: '💗', promptFragment: 'in soft pink and white colors' },
          { id: 'lavender', label: 'Lavender', emoji: '💜', promptFragment: 'in calming lavender tones' },
          { id: 'mint', label: 'Mint Green', emoji: '💚', promptFragment: 'in fresh mint green' },
          { id: 'peach', label: 'Peach & Cream', emoji: '🍑', promptFragment: 'in warm peach and cream' },
        ],
        required: true,
      },
      {
        id: 'room-furniture',
        elementType: 'decoration',
        question: 'What special furniture?',
        characterPrompt: "What cozy furniture should we add?",
        options: [
          { id: 'bean-bag', label: 'Giant Bean Bag', emoji: '🫘', promptFragment: 'with a giant fluffy bean bag' },
          { id: 'hammock', label: 'Cat Hammock', emoji: '🛏️', promptFragment: 'with a cozy cat hammock' },
          { id: 'bookshelf', label: 'Cute Bookshelf', emoji: '📚', promptFragment: 'with a cat-shaped bookshelf' },
          { id: 'window-seat', label: 'Window Seat', emoji: '🪟', promptFragment: 'with a sunny window seat' },
        ],
        allowCustom: true,
      },
      {
        id: 'room-extras',
        elementType: 'special',
        question: 'Any special touches?',
        characterPrompt: "Final touches! What makes it extra special?",
        options: [
          { id: 'fairy-lights', label: 'Fairy Lights', emoji: '✨', promptFragment: 'decorated with twinkling fairy lights' },
          { id: 'plants', label: 'Cute Plants', emoji: '🪴', promptFragment: 'filled with adorable potted plants' },
          { id: 'snacks', label: 'Snack Corner', emoji: '🍿', promptFragment: 'with a cozy snack corner' },
          { id: 'pets', label: 'Pet Friends', emoji: '🐱', promptFragment: 'with Pusheen and friends relaxing' },
        ],
        allowCustom: true,
      },
    ],
    promptTemplate: '{subject}, {color}, {decoration}, {special}, kawaii interior design, cozy aesthetic, Pusheen style',
    imageSettings: {
      style: 'cartoon',
      additionalPrompt: 'kawaii interior design, soft pastel colors, cozy atmosphere, adorable details',
    },
    difficulty: 'medium',
    estimatedMinutes: 5,
    educationalFocus: ['creativity', 'interior design', 'colors'],
  },
];

// All available templates
export const ALL_ACTIVITY_TEMPLATES: CreativeActivityTemplate[] = [
  ...MINECRAFT_ACTIVITIES,
  ...PUSHEEN_ACTIVITIES,
];

// Get templates by theme
export function getTemplatesByTheme(theme: string): CreativeActivityTemplate[] {
  return ALL_ACTIVITY_TEMPLATES.filter(t => t.theme === theme || t.theme === 'universal');
}

// Get template by ID
export function getTemplateById(templateId: string): CreativeActivityTemplate | undefined {
  return ALL_ACTIVITY_TEMPLATES.find(t => t.id === templateId);
}
