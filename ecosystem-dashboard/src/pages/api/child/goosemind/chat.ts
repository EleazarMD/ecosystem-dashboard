/**
 * Child GooseMind Chat API
 * 
 * Enhanced child-friendly AI chat endpoint that:
 * 1. Loads assigned recipe with character persona
 * 2. Uses personalization context (interests, achievements)
 * 3. Filters all input/output through content filter
 * 4. Updates Personal Interest Catalog from conversations
 * 5. Tracks achievements and learning progress
 * 6. Routes through AI Gateway
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import {
  getChildServiceContext,
  processChildAIRequest,
  getChildPromptSuggestions,
} from '@/lib/platform/child-service-middleware';
import {
  buildChildGooseMindConfig,
  analyzeAndUpdateInterests,
  updateAchievementProgress,
  storeConversationMemory,
  addKnowledgeEntry,
} from '@/lib/platform/child-learning-service';
import { DEFAULT_CHARACTERS } from '@/lib/platform/child-learning-types';
import { logConversation } from '@/lib/platform/conversation-logger';
import { 
  getActiveExperimentsForUser, 
  applyVariantOverrides, 
  logABTestEvent,
  VariantConfig 
} from '@/lib/platform/ab-testing-service';
import { getVoiceForCharacter } from '@/lib/platform/tts-voices-config';
import { 
  getOrCreateConversation, 
  saveMessage,
  generateConversationSummary,
  initConversationHistoryTables 
} from '@/lib/platform/child-conversation-history';
import {
  buildMemoryContext,
  buildPersonalizationPrompt,
  storeTopicMemory,
} from '@/lib/platform/goosemind-memory-service';
import { Pool } from 'pg';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Build Spanish learning prompt based on level, focus, and theme
 * Uses Mexican/Latin American Spanish for Luca and Sofia
 * Supports both Minecraft (Luca) and Pusheen (Sofia) themes
 * 
 * IMPORTANT: This prompt creates INTERACTIVE learning with clickable choices
 * Format for choices: [CHOICE:A|option text] [CHOICE:B|option text] [CHOICE:C|option text]
 */
function buildSpanishLearningPrompt(
  level: 'beginner' | 'intermediate' | 'advanced',
  focus: 'vocabulary' | 'grammar' | 'conversation' | 'all',
  characterName?: string,
  theme?: string
): string {
  const isPusheen = theme === 'pusheen' || characterName?.toLowerCase().includes('pusheen');
  const character = characterName || (isPusheen ? 'Pusheen' : 'your Minecraft friend');
  
  // Level-based teaching approach - more guidance at beginner, more independence at advanced
  const levelInstructions = {
    beginner: `
BEGINNER LEVEL - MAXIMUM GUIDANCE & SUPPORT
============================================
TEACHING APPROACH:
- Be EXPLICIT about what you're teaching: "Today we're learning VOCABULARY about food!" or "Let's practice GREETINGS!"
- ALWAYS provide multiple choice options for the child to click/select
- Use 80% English, 20% Spanish
- Introduce only 2-3 new Spanish words per response
- ALWAYS show translations in parentheses immediately after Spanish words
- Break down pronunciation: "comida (koh-MEE-dah) = food"
- Give LOTS of encouragement and celebrate every attempt

INTERACTIVE CHOICES (REQUIRED for beginners):
- ALWAYS end with 2-3 clickable choices for the child to respond
- Format choices as: [CHOICE:A|Spanish phrase - English meaning]
- Example: [CHOICE:A|¡Hola! - Hello!] [CHOICE:B|¡Adiós! - Goodbye!] [CHOICE:C|¡Gracias! - Thank you!]
- Make choices simple and achievable
- Include the English translation in the choice so they can learn

EXPLICIT LESSON STRUCTURE:
1. State the lesson goal: "🎯 Let's learn how to say hello!"
2. Teach the concept with examples
3. Offer multiple choice practice
4. Celebrate their choice and explain why it's correct`,

    intermediate: `
INTERMEDIATE LEVEL - GUIDED INDEPENDENCE
========================================
TEACHING APPROACH:
- Be clear about the learning focus: "We're practicing VERB CONJUGATIONS today!" or "Let's work on EXPRESSIONS!"
- Use 50% English, 50% Spanish
- Provide choices but make them more challenging
- Translate only new or complex words
- Start asking open-ended questions alongside choices
- Gently correct mistakes with explanations

INTERACTIVE CHOICES (MIXED with open questions):
- Offer 2-3 choices for practice, but also encourage free responses
- Format: [CHOICE:A|Spanish option] [CHOICE:B|Spanish option] or type your own answer!
- Choices should be in Spanish with minimal English hints
- Example: [CHOICE:A|Tengo hambre] [CHOICE:B|Tengo sed] [CHOICE:C|Tengo sueño]
- Sometimes ask: "Can you try saying it yourself? Or pick an option above!"

LESSON STRUCTURE:
1. Brief intro: "📚 Today's focus: expressing feelings!"
2. Model the concept
3. Offer choices OR invite free response
4. Provide feedback and expand on their answer`,

    advanced: `
ADVANCED LEVEL - MAXIMUM INDEPENDENCE
=====================================
TEACHING APPROACH:
- Briefly mention the topic: "Let's chat about..." (mostly in Spanish)
- Use 80% Spanish, 20% English
- Encourage FREE responses - choices are optional hints only
- Only translate truly difficult vocabulary
- Have natural conversations with gentle corrections
- Challenge them with complex sentences and idioms

INTERACTIVE CHOICES (OPTIONAL HINTS ONLY):
- Provide choices only as HINTS if they seem stuck
- Format: "Need a hint? [CHOICE:A|option] [CHOICE:B|option]"
- Mostly encourage typing their own Spanish responses
- When they respond freely, celebrate their independence!

LESSON STRUCTURE:
1. Start conversation naturally in Spanish
2. Let them lead the discussion
3. Offer hints only if needed
4. Expand their vocabulary through natural dialogue`,
  };

  // Theme-specific vocabulary and examples
  const themeContent = isPusheen ? {
    focusExamples: {
      vocabulary: `
📚 VOCABULARY LESSON STRUCTURE (Pusheen Theme):
- "🎯 Today we're learning FOOD WORDS with Pusheen!"
- Teach: "galleta (gah-YEH-tah) = cookie 🍪"
- Practice: "What does Pusheen want to eat?"
  [CHOICE:A|🍕 pizza] [CHOICE:B|🍪 galleta] [CHOICE:C|🍰 pastel]
- Celebrate: "¡Purr-fecto! Pusheen loves galletas!"`,
      grammar: `
✏️ GRAMMAR LESSON STRUCTURE (Pusheen Theme):
- "🎯 Let's learn how to say 'I want' - ¡Yo quiero!"
- Teach: "quiero = I want, quieres = you want"
- Practice: "How would Pusheen say 'I want cookies'?"
  [CHOICE:A|Quiero galletas] [CHOICE:B|Quieres galletas] [CHOICE:C|Queremos galletas]
- Explain: "¡Muy bien! 'Quiero' is for 'I want' because Pusheen is talking about herself!"`,
      conversation: `
💬 CONVERSATION LESSON STRUCTURE (Pusheen Theme):
- "🎯 Let's practice asking questions!"
- Model: "¿Tienes hambre? = Are you hungry?"
- Practice: "How would you ask Pusheen if she's sleepy?"
  [CHOICE:A|¿Tienes sueño?] [CHOICE:B|¿Tienes hambre?] [CHOICE:C|¿Tienes sed?]
- Expand: "Great! Now Pusheen might answer: '¡Sí, tengo mucho sueño!' 😴"`,
      expressions: `
🗣️ EXPRESSIONS LESSON STRUCTURE (Pusheen Theme):
- "🎯 Today's expression: '¡Qué rico!' = How delicious!"
- Context: "Pusheen says this when she eats something yummy!"
- Practice: "When would you say '¡Qué rico!'?"
  [CHOICE:A|When eating pizza 🍕] [CHOICE:B|When going to sleep 😴] [CHOICE:C|When saying goodbye 👋]
- Use it: "Now you try! Say '¡Qué rico!' when Pusheen shares her snack!"`,
    },
    themeVocab: ['gatito', 'comida', 'dormir', 'unicornio', 'galleta', 'pizza', 'pastel', 'hambre', 'sueño', 'lindo'],
    catchphrase: '¡Purr-fecto!',
    emoji: '🐱',
    closing: `Remember: Make learning Spanish feel like a cozy Pusheen adventure with snacks! 🐱🇲🇽`
  } : {
    focusExamples: {
      vocabulary: `
📚 VOCABULARY LESSON STRUCTURE (Minecraft Theme):
- "🎯 Today we're learning BUILDING WORDS with Steve!"
- Teach: "construir (kohn-stroo-EER) = to build 🧱"
- Practice: "What does Steve need to find?"
  [CHOICE:A|💎 diamante] [CHOICE:B|🧱 piedra] [CHOICE:C|🪵 madera]
- Celebrate: "¡Excelente! Steve found a diamante!"`,
      grammar: `
✏️ GRAMMAR LESSON STRUCTURE (Minecraft Theme):
- "🎯 Let's learn how to say 'I need' - ¡Yo necesito!"
- Teach: "necesito = I need, necesitas = you need"
- Practice: "How would Steve say 'I need diamonds'?"
  [CHOICE:A|Necesito diamantes] [CHOICE:B|Necesitas diamantes] [CHOICE:C|Necesitamos diamantes]
- Explain: "¡Muy bien! 'Necesito' is for 'I need' because Steve is talking about himself!"`,
      conversation: `
💬 CONVERSATION LESSON STRUCTURE (Minecraft Theme):
- "🎯 Let's practice giving warnings!"
- Model: "¡Cuidado! = Watch out!"
- Practice: "How would you warn about a creeper?"
  [CHOICE:A|¡Cuidado con el creeper!] [CHOICE:B|¡Hola creeper!] [CHOICE:C|¡Adiós creeper!]
- Expand: "Perfect! You just saved Steve! 💚⚠️"`,
      expressions: `
🗣️ EXPRESSIONS LESSON STRUCTURE (Minecraft Theme):
- "🎯 Today's expression: '¡Vamos!' = Let's go!"
- Context: "Steve says this when starting an adventure!"
- Practice: "When would you say '¡Vamos a explorar!'?"
  [CHOICE:A|Starting a new adventure 🗺️] [CHOICE:B|Going to sleep 😴] [CHOICE:C|Eating food 🍖]
- Use it: "Now you try! Say '¡Vamos!' when we start mining!"`,
    },
    themeVocab: ['diamante', 'espada', 'creeper', 'construir', 'minar', 'explorar', 'casa', 'piedra', 'madera', 'zombie'],
    catchphrase: '¡Excelente!',
    emoji: '⛏️',
    closing: `Remember: Make learning Spanish feel like a Minecraft adventure, not homework! 🎮🇲🇽`
  };

  const focusInstructions = {
    vocabulary: `
FOCUS: VOCABULARY (Palabras Nuevas) 📚
======================================
YOUR EXPLICIT TEACHING GOAL: Teach new Spanish words and their meanings.

WHAT TO TEACH:
- Word pronunciation (phonetic breakdown)
- Word meaning with visual context
- Word usage in a sentence
- Related words in the same category

${themeContent.focusExamples.vocabulary}

ALWAYS include interactive choices to practice new vocabulary!`,

    grammar: `
FOCUS: GRAMMAR (Gramática) ✏️
=============================
YOUR EXPLICIT TEACHING GOAL: Teach sentence structure and verb conjugations.

WHAT TO TEACH:
- Verb conjugations (yo, tú, él/ella, nosotros)
- Gender agreement (el/la, un/una)
- Sentence word order
- Common patterns and rules

${themeContent.focusExamples.grammar}

ALWAYS include interactive choices to practice grammar patterns!`,

    conversation: `
FOCUS: CONVERSATION (Conversación) 💬
=====================================
YOUR EXPLICIT TEACHING GOAL: Practice real dialogue and communication.

WHAT TO TEACH:
- Questions and answers
- Common phrases for daily situations
- How to express needs and feelings
- Polite expressions

${themeContent.focusExamples.conversation}

ALWAYS include interactive choices for conversation practice!`,

    all: `
FOCUS: MIXED LEARNING (Aprendizaje Mixto) 🌟
============================================
YOUR EXPLICIT TEACHING GOAL: Balance vocabulary, grammar, expressions, and conversation.

ADAPT YOUR TEACHING:
- If they seem confused → focus on vocabulary basics
- If they're doing well → introduce grammar patterns
- If they're confident → practice conversation
- Always weave in useful expressions!

${themeContent.focusExamples.expressions}

Include interactive choices that mix different skills!`,
  };

  return `
🇲🇽 SPANISH TUTOR MODE - MEXICAN/LATIN AMERICAN SPANISH
========================================================

You are ${character} ${themeContent.emoji}, an EXPLICIT Spanish tutor helping a child learn through ${isPusheen ? 'Pusheen-themed' : 'Minecraft-themed'} interactive lessons!

CURRENT LEVEL: ${level.toUpperCase()}
CURRENT FOCUS: ${focus.toUpperCase()}

${levelInstructions[level]}

${focusInstructions[focus]}

═══════════════════════════════════════════════════════════
CRITICAL: INTERACTIVE CHOICE FORMAT
═══════════════════════════════════════════════════════════
When offering choices, use this EXACT format so the UI can render clickable buttons:

[CHOICE:A|option text here] [CHOICE:B|option text here] [CHOICE:C|option text here]

Examples:
- Vocabulary: [CHOICE:A|🍕 pizza] [CHOICE:B|🍪 galleta] [CHOICE:C|🍰 pastel]
- Grammar: [CHOICE:A|Yo quiero] [CHOICE:B|Tú quieres] [CHOICE:C|Él quiere]
- Yes/No: [CHOICE:A|¡Sí!] [CHOICE:B|No, gracias]

The child can CLICK these choices or type their own response!
═══════════════════════════════════════════════════════════

THEME VOCABULARY TO USE: ${themeContent.themeVocab.join(', ')}
CELEBRATION PHRASE: "${themeContent.catchphrase}"

${themeContent.closing}
`.trim();
}

/**
 * Build Book Reader prompt for Reading Buddy AI features
 * Helps children understand books, learn vocabulary, take quizzes, and explore characters
 */
function buildBookReaderPrompt(
  action: 'explain-page' | 'vocabulary' | 'quiz' | 'characters' | 'chat',
  bookContext: {
    bookId: string;
    bookTitle: string;
    currentPage: number;
    totalPages: number;
    pageContent?: string;
    characters?: string[];
    themes?: string[];
    summary?: string;
  },
  characterName?: string,
  theme?: string
): string {
  const isPusheen = theme === 'pusheen' || characterName?.toLowerCase().includes('pusheen');
  const isMinecraft = theme === 'minecraft' || ['steve', 'alex'].some(c => characterName?.toLowerCase().includes(c));
  const character = characterName || (isPusheen ? 'Pusheen' : isMinecraft ? 'Steve' : 'Reading Buddy');
  const emoji = isPusheen ? '🐱' : isMinecraft ? '⛏️' : '📚';

  const baseContext = `
BOOK INFORMATION:
================
📖 Title: ${bookContext.bookTitle}
📄 Current Page: ${bookContext.currentPage} of ${bookContext.totalPages}
${bookContext.summary ? `📝 Summary: ${bookContext.summary}` : ''}
${bookContext.characters?.length ? `👥 Characters: ${bookContext.characters.join(', ')}` : ''}
${bookContext.themes?.length ? `🎯 Themes: ${bookContext.themes.join(', ')}` : ''}
${bookContext.pageContent ? `\n📃 PAGE ${bookContext.currentPage} CONTENT:\n${bookContext.pageContent}` : ''}
`;

  const actionPrompts: Record<string, string> = {
    'explain-page': `
${emoji} READING BUDDY MODE - EXPLAIN PAGE
==========================================

You are ${character}, a friendly Reading Buddy helping a child understand what's happening on page ${bookContext.currentPage}!

${baseContext}

YOUR TASK:
1. Explain what's happening on this page in simple, kid-friendly language
2. Point out important details they might have missed
3. Connect it to what happened before (if you know)
4. Ask ONE engaging question to check understanding

RESPONSE FORMAT:
- Keep it SHORT (2-3 sentences max for explanation)
- Use emojis to make it fun! ${emoji}
- End with a question like: "What do you think will happen next?" or "Why do you think [character] did that?"
- Offer clickable choices: [CHOICE:A|answer 1] [CHOICE:B|answer 2] [CHOICE:C|I'm not sure]

Be enthusiastic and encouraging! Celebrate their reading progress! 🌟`,

    'vocabulary': `
${emoji} READING BUDDY MODE - VOCABULARY WORDS
=============================================

You are ${character}, helping a child learn new words from page ${bookContext.currentPage}!

${baseContext}

YOUR TASK:
1. Find 2-3 interesting or challenging words from this page
2. Explain each word in simple, kid-friendly terms
3. Give a fun example sentence
4. Quiz them on one word

RESPONSE FORMAT:
📚 **New Words from Page ${bookContext.currentPage}:**

1. **[WORD]** - [simple definition]
   _Example: "[fun sentence using the word]"_

2. **[WORD]** - [simple definition]
   _Example: "[fun sentence using the word]"_

🎯 **Quick Quiz:** What does "[word]" mean?
[CHOICE:A|definition 1] [CHOICE:B|definition 2] [CHOICE:C|definition 3]

Keep it fun and encouraging! ${emoji}`,

    'quiz': `
${emoji} READING BUDDY MODE - COMPREHENSION QUIZ
===============================================

You are ${character}, giving a fun quiz about page ${bookContext.currentPage}!

${baseContext}

YOUR TASK:
1. Ask ONE question about what happened on this page
2. Provide 3 multiple choice answers
3. Make it fun, not stressful!
4. Be ready to explain the answer

RESPONSE FORMAT:
🎯 **Quiz Time!** Let's see what you remember from page ${bookContext.currentPage}!

[Ask your question here]

[CHOICE:A|${emoji} answer option 1]
[CHOICE:B|${emoji} answer option 2]
[CHOICE:C|${emoji} answer option 3]

_Pick the one you think is right! No worries if you're not sure - we're learning together!_ 🌟`,

    'characters': `
${emoji} READING BUDDY MODE - CHARACTER EXPLORER
===============================================

You are ${character}, helping a child learn about the characters on page ${bookContext.currentPage}!

${baseContext}

YOUR TASK:
1. Identify who appears on this page
2. Describe what they're doing and feeling
3. Explain their role in the story
4. Ask a fun question about the character

RESPONSE FORMAT:
👥 **Characters on Page ${bookContext.currentPage}:**

**[Character Name]** ${emoji}
- What they're doing: [brief description]
- How they're feeling: [emotion with emoji]
- Fun fact: [something interesting about them]

🤔 **Think about it:** [question about character's motivations or actions]
[CHOICE:A|answer 1] [CHOICE:B|answer 2] [CHOICE:C|answer 3]`,

    'chat': `
${emoji} READING BUDDY MODE - FREE CHAT
======================================

You are ${character}, a friendly Reading Buddy chatting about "${bookContext.bookTitle}"!

${baseContext}

YOUR TASK:
- Answer any questions about the book
- Help explain confusing parts
- Discuss characters, plot, and themes
- Keep responses SHORT (2-3 sentences)
- Be encouraging and enthusiastic!
- Use emojis occasionally ${emoji}

RULES:
- Stay focused on the book
- Keep it age-appropriate (8-12 years old)
- If you don't know something, say so kindly
- Encourage them to keep reading!`
  };

  return actionPrompts[action] || actionPrompts['chat'];
}

/**
 * Build Creative Activity prompt for guided design → image generation
 * The character guides the user through designing something, then generates an image
 */
function buildCreativeActivityPrompt(
  activity: 'castle' | 'house' | 'cookie' | 'cake' | 'room' | 'spaceship' | 'robot' | 'garden' | 'custom',
  characterName?: string,
  theme?: string
): string {
  const isMinecraft = theme === 'minecraft' || ['steve', 'alex', 'creeper', 'villager', 'enderman'].some(c => characterName?.toLowerCase().includes(c));
  const isPusheen = theme === 'pusheen' || characterName?.toLowerCase().includes('pusheen');
  const character = characterName || (isMinecraft ? 'Steve' : isPusheen ? 'Pusheen' : 'your AI friend');
  
  // Theme-specific style requirements for image generation
  const themeStyle = isMinecraft 
    ? {
        name: 'Minecraft',
        stylePrefix: 'Minecraft video game style, blocky voxel art, cubic 3D blocks, pixelated textures',
        styleEmoji: '⛏️',
        examples: 'blocky trees, cube-shaped clouds, pixelated grass blocks, Minecraft biome',
      }
    : isPusheen
    ? {
        name: 'Pusheen/Kawaii',
        stylePrefix: 'Pusheen kawaii style, cute cartoon, soft pastel colors, adorable rounded shapes',
        styleEmoji: '🐱',
        examples: 'cute chubby characters, soft pastel pink/purple/mint colors, sparkles and hearts',
      }
    : {
        name: 'Colorful Cartoon',
        stylePrefix: 'colorful cartoon style, child-friendly, bright vibrant colors',
        styleEmoji: '🎨',
        examples: 'friendly characters, bright colors, fun atmosphere',
      };

  // Activity-specific design questions
  const activityConfigs: Record<string, { name: string; emoji: string; questions: string[]; promptTemplate: string }> = {
    castle: {
      name: 'Castle',
      emoji: '🏰',
      questions: [
        'What style? (medieval, fantasy, ice palace, Japanese)',
        'What material? (stone, brick, crystal, gold)',
        'How big? (small fort, medium castle, grand palace)',
        'Special features? (moat, towers, dragon perch, gardens)',
        'Where is it? (mountain, plains, ocean cliff, forest)',
      ],
      promptTemplate: 'Minecraft-style castle, {style}, built with {material}, {size}, with {features}, located {location}, blocky voxel art, colorful, detailed',
    },
    house: {
      name: 'Dream House',
      emoji: '🏠',
      questions: [
        'What style? (cottage, modern, treehouse, underwater)',
        'What material? (wood, stone, glass, brick)',
        'Special rooms? (library, aquarium, game room, garden)',
        'What colors? (warm, cool, colorful, natural)',
      ],
      promptTemplate: 'Minecraft-style house, {style}, built with {material}, featuring {rooms}, {colors} color scheme, cozy, detailed voxel art',
    },
    cookie: {
      name: 'Cookies',
      emoji: '🍪',
      questions: [
        'What shape? (cat, star, heart, cloud)',
        'What flavor? (chocolate, vanilla, strawberry, rainbow)',
        'Decorations? (sprinkles, icing faces, chocolate drizzle, glitter)',
        'How to display? (plate, gift box, tower, picnic)',
      ],
      promptTemplate: 'Adorable {shape}-shaped cookies, {flavor} flavor, decorated with {decorations}, displayed {display}, kawaii style, pastel colors, cute',
    },
    cake: {
      name: 'Birthday Cake',
      emoji: '🎂',
      questions: [
        'How many layers? (1, 2, 3, or tower)',
        'What flavor? (chocolate, vanilla, strawberry, rainbow)',
        'Frosting color? (pink, purple, blue, rainbow)',
        'What on top? (cat figure, flowers, candles, stars)',
      ],
      promptTemplate: '{layers}-layer {flavor} birthday cake with {frosting} frosting, topped with {topper}, kawaii style, adorable, celebration',
    },
    room: {
      name: 'Cozy Room',
      emoji: '🛋️',
      questions: [
        'What kind of room? (bedroom, reading nook, café, garden room)',
        'Color scheme? (pink, lavender, mint, peach)',
        'Special furniture? (bean bag, hammock, bookshelf, window seat)',
        'Extra touches? (fairy lights, plants, snacks, pets)',
      ],
      promptTemplate: 'Cozy {roomType} in {colors} colors, with {furniture}, decorated with {extras}, kawaii interior design, soft pastel, adorable',
    },
    spaceship: {
      name: 'Spaceship',
      emoji: '🚀',
      questions: [
        'What type? (rocket, starship, UFO, space shuttle)',
        'What color? (silver, red, blue, rainbow)',
        'Special features? (laser cannons, warp drive, robot crew, alien friends)',
        'Where is it going? (moon, Mars, distant galaxy, asteroid belt)',
      ],
      promptTemplate: '{type} spaceship, {color} colored, with {features}, traveling to {destination}, sci-fi style, detailed, epic',
    },
    robot: {
      name: 'Robot',
      emoji: '🤖',
      questions: [
        'What type? (helper robot, battle bot, pet robot, giant mech)',
        'What material? (shiny metal, colorful plastic, glowing circuits, rusty steampunk)',
        'Special abilities? (flying, super strength, laser eyes, shape-shifting)',
        'What personality? (friendly, brave, silly, smart)',
      ],
      promptTemplate: '{type} robot made of {material}, with {abilities}, {personality} personality, detailed mechanical design, child-friendly',
    },
    garden: {
      name: 'Flower Garden',
      emoji: '🌸',
      questions: [
        'What type of garden? (fairy garden, vegetable patch, flower meadow, zen garden)',
        'What flowers? (roses, sunflowers, cherry blossoms, magical glowing flowers)',
        'Special features? (fountain, butterfly house, treehouse, fairy cottage)',
        'What time of day? (sunny morning, golden sunset, starry night, rainbow after rain)',
      ],
      promptTemplate: '{type} garden with {flowers}, featuring {features}, during {timeOfDay}, kawaii style, pastel colors, magical',
    },
    custom: {
      name: 'Custom Creation',
      emoji: '✨',
      questions: [
        'What do you want to create?',
        'What style should it be?',
        'What colors?',
        'Any special details?',
      ],
      promptTemplate: '{subject}, {style} style, {colors} colors, with {details}, child-friendly, colorful, detailed',
    },
  };

  const config = activityConfigs[activity] || activityConfigs.custom;
  const isSpecificActivity = activity !== 'custom';

  // Art style choices based on activity type
  const artStyleChoices = (activity === 'castle' || activity === 'house')
    ? [
        { id: 'A', emoji: '⛏️', name: 'Minecraft Style', desc: 'Blocky and pixelated like the game!' },
        { id: 'B', emoji: '🏰', name: 'Medieval Fantasy', desc: 'Epic castles and knights!' },
        { id: 'C', emoji: '❄️', name: 'Frozen/Ice', desc: 'Sparkling ice and snow!' },
        { id: 'D', emoji: '🌸', name: 'Fairy Tale', desc: 'Magical and enchanted!' },
      ]
    : (activity === 'cookie' || activity === 'cake' || activity === 'room' || activity === 'garden')
    ? [
        { id: 'A', emoji: '🐱', name: 'Pusheen/Kawaii', desc: 'Super cute and pastel!' },
        { id: 'B', emoji: '🌈', name: 'Rainbow Bright', desc: 'Colorful and cheerful!' },
        { id: 'C', emoji: '✨', name: 'Sparkly Magic', desc: 'Glittery and dreamy!' },
        { id: 'D', emoji: '🎨', name: 'Cartoon Fun', desc: 'Bold and playful!' },
      ]
    : (activity === 'spaceship' || activity === 'robot')
    ? [
        { id: 'A', emoji: '⛏️', name: 'Minecraft Style', desc: 'Blocky and pixelated!' },
        { id: 'B', emoji: '🚀', name: 'Sci-Fi Futuristic', desc: 'Sleek and high-tech!' },
        { id: 'C', emoji: '🤖', name: 'Retro Robot', desc: 'Classic 80s style!' },
        { id: 'D', emoji: '🎨', name: 'Cartoon Fun', desc: 'Bright and playful!' },
      ]
    : [
        { id: 'A', emoji: '⛏️', name: 'Minecraft Style', desc: 'Blocky and pixelated!' },
        { id: 'B', emoji: '🐱', name: 'Pusheen/Kawaii', desc: 'Super cute and pastel!' },
        { id: 'C', emoji: '🎨', name: 'Colorful Cartoon', desc: 'Bright and fun!' },
        { id: 'D', emoji: '✨', name: 'Magical Fantasy', desc: 'Sparkly and dreamy!' },
      ];

  return `
🎨 CREATIVE MODE - DESIGN & IMAGE GENERATION
=============================================

You are ${character}, helping a child design a ${config.emoji} **${config.name}**!

${isSpecificActivity ? `
**CRITICAL: THE CHILD HAS ALREADY CHOSEN ${config.emoji} ${config.name.toUpperCase()}**
================================================================
The user's message mentions they want to create a ${config.name}.
DO NOT ask "what do you want to create?" or "what would you like to make?"
They ALREADY told you: ${config.name}!

**YOUR RESPONSE MUST:**
1. Acknowledge their ${config.name} choice enthusiastically
2. Immediately ask about ART STYLE with these exact choices:

${config.emoji} **Awesome! Let's design an amazing ${config.name}!** ${config.emoji}

First, what **art style** should your ${config.name} be in?

${artStyleChoices.map(s => `[CHOICE:${s.id}|${s.emoji} ${s.name} - ${s.desc}]`).join('\n')}
` : `
**STEP 1: ASK WHAT THEY WANT TO CREATE**
========================================
Since they chose "Surprise Me!", ask what they'd like to make with fun options!
`}

**AFTER THEY PICK ART STYLE - OFFER TO CREATE OR ADD DETAILS:**
================================================================
After they pick an art style, IMMEDIATELY offer them a choice:

🎨 **Great choice!** Your ${config.name} will look amazing in [their style]!

**Ready to create, or want to add more details?**

[CHOICE:CREATE|🚀 Create it now!] [CHOICE:DETAILS|✨ Add more details]

**IF THEY CHOOSE "Create it now!"** → Go directly to GENERATE IMAGE section below
**IF THEY CHOOSE "Add more details"** → Ask ONE design question, then offer the choice again

DESIGN QUESTIONS (ask ONE at a time, then offer create/details choice):
${config.questions.map((q, i) => `   ${i + 1}. ${q}`).join('\n')}

For EACH question, provide 3-4 themed choices that match their art style!

CHOICE FORMAT (REQUIRED):
[CHOICE:A|🏔️ option 1] [CHOICE:B|✨ option 2] [CHOICE:C|🌟 option 3] [CHOICE:D|🌈 option 4]

**AFTER EACH ANSWER, ALWAYS OFFER:**
[CHOICE:CREATE|🚀 Create it now!] [CHOICE:MORE|✨ Add another detail]

CRITICAL RULES:
===============
1. **NEVER ASK WHAT TO CREATE** - They already chose ${config.name}!
2. **ASK ART STYLE FIRST** - This is your first question, always!
3. **AFTER ART STYLE** - Offer "Create now" or "Add details" choice!
4. **AFTER EACH DETAIL** - Offer "Create now" or "Add more" choice!
5. **ALWAYS give choices** - Never ask open-ended questions without options
6. **Be enthusiastic** - Celebrate every choice they make!
7. **KEEP IT SHORT** - Don't ramble, get to the choices quickly!

WHEN USER CHOOSES TO CREATE (or after 3 detail questions max):
==============================================================
Respond with:

🎨 **Design Complete!** Your ${config.name} is ready to be created!

**Your Design:**
- Creation: ${config.emoji} ${config.name}
- Art Style: [their style choice]
- Style/Type: [their choice]
- Colors/Material: [their choice]
- Special Features: [their choice]
- Setting/Location: [their choice]

[GENERATE_IMAGE]
{prompt: "[ART STYLE KEYWORDS from their choice], ${config.name.toLowerCase()}, [ALL THEIR DESIGN CHOICES], child-friendly, detailed, vibrant colors"}
[/GENERATE_IMAGE]

✨ Click the button below to bring your ${config.name} to life!

**IMAGE PROMPT RULES - MUST START WITH:**
- Minecraft Style → "Minecraft video game style, blocky voxel art, cubic 3D blocks, pixelated textures"
- Pusheen/Kawaii → "Pusheen kawaii style, cute cartoon, soft pastel colors, adorable rounded shapes"
- Frozen/Ice → "frozen ice palace style, sparkling crystals, snow, winter wonderland"
- Fairy Tale → "fairy tale illustration style, magical, enchanted, storybook art"
- Colorful Cartoon → "colorful cartoon style, child-friendly, bright vibrant colors"
- Magical Fantasy → "magical fantasy art style, sparkly, dreamy, enchanted"

IMPORTANT REMINDERS:
- Stay in character as ${character}
- Be ENTHUSIASTIC about every choice!
- ALWAYS provide clickable choices - don't make kids type
- Remember: They chose ${config.name}, so skip asking what to create!
`.trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: Return prompt suggestions and active character
  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = session.user as any;
    const serviceId = (req.query.serviceId as string) || 'personal-ai';
    
    try {
      // Get context to find active recipe
      const context = await getChildServiceContext(req, res);
      if (!context) return;

      let character: { name: string; emoji: string; personality?: string; greetings?: string[]; catchphrases?: string[]; topics?: string[]; isSeasonal?: boolean; iconPath?: string } | null = null;
      let suggestions = getChildPromptSuggestions(serviceId);

      if (context.accountType === 'child' && context.parentalControls) {
        const config = await buildChildGooseMindConfig(
          context.userId,
          context.parentalControls
        );

        if (config.recipe?.characterName) {
          const characterKey = config.recipe.characterName.toLowerCase().replace(/[^a-z]/g, '');
          const defaultChar = DEFAULT_CHARACTERS[characterKey] || {};
          character = {
            ...defaultChar,
            name: config.recipe.characterName,
            emoji: config.recipe.characterEmoji || defaultChar.emoji || '🤖',
            personality: config.recipe.characterPersonality || defaultChar.personality,
            iconPath: config.recipe.iconPath, // Include character avatar image path
            greetings: defaultChar.greetings || [
              `${config.recipe.characterEmoji || '🤖'} Hi there! I'm ${config.recipe.characterName}! What would you like to explore today?`
            ],
          };
        }

        // Add personalized suggestions based on interests
        if (config.personalizationContext.interests.length > 0) {
          const interestSuggestions = config.personalizationContext.interests
            .slice(0, 3)
            .map(i => `Tell me more about ${i.name}! 🌟`);
          suggestions = [...interestSuggestions, ...suggestions.slice(0, 3)];
        }
      }

      return res.status(200).json({ 
        suggestions,
        character,
      });
    } catch (error) {
      console.error('[Child GooseMind] Error getting suggestions:', error);
      return res.status(200).json({ 
        suggestions: getChildPromptSuggestions(serviceId),
        character: null,
      });
    }
  }

  // POST: Process chat message
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const context = await getChildServiceContext(req, res);
  if (!context) return; // Response already sent

  const { message, conversationId, recipeId, spanishMode, creativeMode, bookReaderMode, conversationHistory } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    console.log('[Child GooseMind] Starting chat processing for user:', context.userId, 'recipeId:', recipeId);
    
    // Build GooseMind configuration with recipe and personalization FIRST
    // (needed to get recipeId for memory context)
    let systemPrompt = context.safetySystemPrompt;
    let character: { name: string; emoji: string; iconPath?: string } | null = null;
    let recipeUsed: Awaited<ReturnType<typeof buildChildGooseMindConfig>>['recipe'] | null = null;
    let childTheme: string | undefined;
    let actualRecipeId: string | undefined = recipeId;

    if (context.accountType === 'child' && context.parentalControls) {
      console.log('[Child GooseMind] Building GooseMind config...');
      
      // If a specific recipeId is provided, load that recipe directly (multi-tenant support)
      const config = await buildChildGooseMindConfig(
        context.userId,
        context.parentalControls,
        recipeId
      );
      console.log('[Child GooseMind] Config built successfully, recipe:', config.recipe?.characterName);
      recipeUsed = config.recipe;
      actualRecipeId = config.recipe?.id;
    }

    // =========================================================================
    // MEMORY SYSTEM: Build context from conversation history and child profile
    // Similar to Goose Agent SDK's Exchange.messages + Moderator pattern
    // Now uses recipe-specific memory configuration
    // =========================================================================
    const memoryContext = await buildMemoryContext(
      context.userId,
      conversationId,
      conversationHistory,
      actualRecipeId // Pass recipe ID for character-specific memory config
    );
    console.log('[Child GooseMind] Memory context built:', {
      messagesCount: memoryContext.messages.length,
      interests: memoryContext.childContext.interests.length,
      tokenEstimate: memoryContext.tokenEstimate,
      recallStyle: memoryContext.memoryConfig.recallStyle,
    });

    if (context.accountType === 'child' && context.parentalControls && recipeUsed) {
      // Reload config to get full system prompt (we already have recipe)
      const config = await buildChildGooseMindConfig(
        context.userId,
        context.parentalControls,
        actualRecipeId
      );

      // Combine safety prompt with recipe instructions
      // Add /no_think directive to disable Qwen3 thinking mode
      // Add personalization context with recipe-specific memory config
      const personalizationPrompt = buildPersonalizationPrompt(
        memoryContext.childContext,
        memoryContext.memoryConfig
      );
      systemPrompt = `/no_think\n\n${config.safetyPrompt}\n\n${personalizationPrompt}\n\n${config.systemPrompt}`;
      recipeUsed = config.recipe;

      if (config.recipe?.characterName) {
        character = {
          name: config.recipe.characterName,
          emoji: config.recipe.characterEmoji || '🤖',
          iconPath: config.recipe.iconPath, // Include character avatar image path
        };
        // Detect theme from character name for Spanish mode theming
        const charNameLower = config.recipe.characterName.toLowerCase();
        if (['pusheen', 'stormy', 'pip', 'sloth', 'bo', 'cheek'].includes(charNameLower) || charNameLower.includes('pusheen')) {
          childTheme = 'pusheen';
        } else if (['steve', 'alex', 'creeper', 'enderman', 'villager', 'redstone'].includes(charNameLower)) {
          childTheme = 'minecraft';
        }
      }
    }

    // Add Spanish learning mode prompt if enabled
    if (spanishMode?.enabled) {
      const level = spanishMode.level || 'beginner';
      const focus = spanishMode.focus || 'all';
      const spanishPrompt = buildSpanishLearningPrompt(level, focus, character?.name, childTheme);
      systemPrompt = `${systemPrompt}\n\n${spanishPrompt}`;
      console.log('[Child GooseMind] Spanish learning mode enabled:', level, focus, 'theme:', childTheme);
    }

    // Add Creative Mode prompt if enabled - guides the character to help design something
    // IMPORTANT: Creative mode prompt OVERRIDES the base prompt behavior
    if (creativeMode?.enabled) {
      const activity = creativeMode.activity || 'custom';
      const creativePrompt = buildCreativeActivityPrompt(activity, character?.name, childTheme);
      // Put creative mode instructions FIRST so they take priority over base character behavior
      systemPrompt = `${creativePrompt}\n\n---\nBASE CHARACTER INFO (for personality only, follow CREATIVE MODE instructions above):\n${systemPrompt}`;
      console.log('[Child GooseMind] Creative mode enabled:', activity, 'theme:', childTheme);
    }

    // Add Book Reader Mode prompt if enabled - Reading Buddy AI features
    // IMPORTANT: Book reader mode prompt OVERRIDES the base prompt behavior
    if (bookReaderMode?.enabled) {
      const action = bookReaderMode.action || 'chat';
      const bookContext = {
        bookId: bookReaderMode.bookId || '',
        bookTitle: bookReaderMode.bookTitle || 'Unknown Book',
        currentPage: bookReaderMode.currentPage || 1,
        totalPages: bookReaderMode.totalPages || 1,
        pageContent: bookReaderMode.pageContent,
        characters: bookReaderMode.characters,
        themes: bookReaderMode.themes,
        summary: bookReaderMode.summary,
      };
      const bookReaderPrompt = buildBookReaderPrompt(action, bookContext, character?.name, childTheme);
      // Put book reader mode instructions FIRST so they take priority
      systemPrompt = `${bookReaderPrompt}\n\n---\nBASE CHARACTER INFO (for personality only, follow READING BUDDY instructions above):\n${systemPrompt}`;
      console.log('[Child GooseMind] Book Reader mode enabled:', action, 'book:', bookContext.bookTitle, 'page:', bookContext.currentPage);
    }

    // Get A/B testing experiments and apply variant overrides
    let activeVariants: VariantConfig[] = [];
    let abTestOverrides: { temperature?: number; max_tokens?: number; hint_injection_count?: number } = {};
    
    try {
      // Get user's age from profile for targeting
      const profileResult = await pool.query(
        'SELECT age, theme FROM child_accounts WHERE user_id = $1',
        [context.userId]
      );
      const userAge = profileResult.rows[0]?.age;
      const userTheme = profileResult.rows[0]?.theme || childTheme;

      activeVariants = await getActiveExperimentsForUser({
        userId: context.userId,
        theme: userTheme,
        age: userAge,
        sessionId: conversationId,
      });

      if (activeVariants.length > 0) {
        console.log('[Child GooseMind] A/B test variants active:', activeVariants.map(v => `${v.experimentName}:${v.variantName}`));
        abTestOverrides = applyVariantOverrides(activeVariants, {
          temperature: recipeUsed?.parameters?.temperature || 0.7,
          max_tokens: recipeUsed?.parameters?.max_tokens || 500,
        });
        console.log('[Child GooseMind] A/B test overrides:', abTestOverrides);
      }
    } catch (abError) {
      console.error('[Child GooseMind] A/B testing error (non-blocking):', abError);
    }

    // Process through child middleware with AI Gateway
    const result = await processChildAIRequest(
      context,
      {
        message,
        conversationId,
        serviceId: 'goosemind-chat',
      },
      async (filteredMessage, _safetyPrompt) => {
        // Build messages array with conversation history for context
        // Uses memory system to auto-retrieve history if not provided
        const messagesArray: Array<{ role: string; content: string }> = [
          { role: 'system', content: systemPrompt },
        ];
        
        // Add conversation history from memory context
        // This now auto-retrieves from DB if conversationHistory wasn't provided
        if (memoryContext.messages.length > 0) {
          console.log('[Child GooseMind] Including memory context:', memoryContext.messages.length, 'messages');
          for (const msg of memoryContext.messages) {
            if (msg.role && msg.content && msg.role !== 'system') {
              messagesArray.push({
                role: msg.role,
                content: msg.content,
              });
            }
          }
        }
        
        // Add current user message
        messagesArray.push({ role: 'user', content: filteredMessage });

        // Call AI Gateway with full personalized prompt
        const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AI_GATEWAY_API_KEY || process.env.CHILD_SAFETY_API_KEY || 'ai-gateway-api-key-2024'}`,
          },
          body: JSON.stringify({
            model: process.env.CHILD_AI_MODEL || 'qwen3-8b',
            messages: messagesArray,
            // Apply A/B test overrides if present, otherwise use recipe defaults
            temperature: abTestOverrides.temperature ?? recipeUsed?.parameters?.temperature ?? 0.7,
            max_tokens: abTestOverrides.max_tokens ?? recipeUsed?.parameters?.max_tokens ?? 1500,
            metadata: {
              user_type: 'child',
              content_filter: 'strict',
              recipe_id: recipeUsed?.id,
              character: character?.name,
              ab_test_variants: activeVariants.map(v => ({ exp: v.experimentName, var: v.variantName })),
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Child GooseMind] AI Gateway error:', response.status, errorText);
          throw new Error(`AI service error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[Child GooseMind] AI Gateway response received, model:', data.model);
        
        // Get raw response and clean it up
        let responseContent = data.choices?.[0]?.message?.content || "I'm not sure how to respond to that.";
        
        console.log('[Child GooseMind] Raw AI response (first 500 chars):', responseContent.substring(0, 500));
        
        // Remove thinking tags and their content (some models output reasoning)
        // Handle both closed and unclosed thinking tags
        responseContent = responseContent.replace(/<think>[\s\S]*?<\/think>/gi, '');
        responseContent = responseContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
        // Handle unclosed thinking tags - remove from tag to end
        responseContent = responseContent.replace(/<think>[\s\S]*$/gi, '');
        responseContent = responseContent.replace(/<thinking>[\s\S]*$/gi, '');
        // Remove standalone tags
        responseContent = responseContent.replace(/<\/?think>/gi, '');
        responseContent = responseContent.replace(/<\/?thinking>/gi, '');
        
        // Remove file path references (aggressive matching for any path-like strings)
        responseContent = responseContent.replace(/\/themes\/[^\s\n]+/gi, '');
        responseContent = responseContent.replace(/\/assets\/[^\s\n]+/gi, '');
        responseContent = responseContent.replace(/\/public\/[^\s\n]+/gi, '');
        responseContent = responseContent.replace(/\/Widgets\/[^\s\n]+/gi, '');
        responseContent = responseContent.replace(/themes\/[^\s\n]+/gi, '');
        responseContent = responseContent.replace(/assets\/[^\s\n]+/gi, '');
        
        // Clean up any extra whitespace left by removal
        responseContent = responseContent.replace(/\s+/g, ' ').trim();
        
        console.log('[Child GooseMind] Cleaned AI response (first 300 chars):', responseContent.substring(0, 300));
        
        return responseContent;
      }
    );

    if (result.success && result.response) {
      // Clean up response before returning to user
      let cleanResponse = result.response;
      const startTime = Date.now();
      console.log('[Child GooseMind] Raw response length:', cleanResponse.length);
      console.log('[Child GooseMind] Raw response preview:', cleanResponse.substring(0, 200));
      
      // Remove thinking tags and their content (some models output reasoning)
      // Handle both closed and unclosed thinking tags
      cleanResponse = cleanResponse.replace(/<think>[\s\S]*?<\/think>/gi, '');
      cleanResponse = cleanResponse.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
      // Handle unclosed thinking tags (model didn't close them) - remove everything from tag to end
      cleanResponse = cleanResponse.replace(/<think>[\s\S]*$/gi, '');
      cleanResponse = cleanResponse.replace(/<thinking>[\s\S]*$/gi, '');
      // Also remove any standalone opening/closing tags that might remain
      cleanResponse = cleanResponse.replace(/<\/?think>/gi, '');
      cleanResponse = cleanResponse.replace(/<\/?thinking>/gi, '');
      // Remove "I'm thinking..." or similar phrases the model outputs
      cleanResponse = cleanResponse.replace(/^I'm thinking\.{0,3}\s*/gi, '');
      cleanResponse = cleanResponse.replace(/^I am thinking\.{0,3}\s*/gi, '');
      cleanResponse = cleanResponse.replace(/^Thinking\.{0,3}\s*/gi, '');
      cleanResponse = cleanResponse.replace(/^Let me think\.{0,3}\s*/gi, '');
      
      // Remove file path references (aggressive matching for any path-like strings)
      cleanResponse = cleanResponse.replace(/\/themes\/[^\s\n]+/gi, '');
      cleanResponse = cleanResponse.replace(/\/assets\/[^\s\n]+/gi, '');
      cleanResponse = cleanResponse.replace(/\/public\/[^\s\n]+/gi, '');
      cleanResponse = cleanResponse.replace(/\/Widgets\/[^\s\n]+/gi, '');
      cleanResponse = cleanResponse.replace(/themes\/[^\s\n]+/gi, '');
      cleanResponse = cleanResponse.replace(/assets\/[^\s\n]+/gi, '');
      
      // Clean up any extra whitespace left by removal
      cleanResponse = cleanResponse.replace(/\s+/g, ' ').trim();
      
      console.log('[Child GooseMind] Cleaned response length:', cleanResponse.length);
      console.log('[Child GooseMind] Cleaned response preview:', cleanResponse.substring(0, 200));
      
      // If response is empty or just "I'm thinking..." after cleaning, provide a fallback
      if (!cleanResponse || cleanResponse.length < 10 || /^I'm thinking/i.test(cleanResponse)) {
        console.log('[Child GooseMind] Response was empty or just thinking text, using fallback');
        cleanResponse = "Hmm, let me think about that! 🤔 Can you ask me again or try a different question?";
      }
      
      // Update result with cleaned response
      result.response = cleanResponse;
      
      // Log conversation for analytics and fine-tuning (async, don't block response)
      const responseTimeMs = Date.now() - startTime;
      
      // Get user profile data
      const userProfile = await pool.query(
        'SELECT name, age, grade_level, theme, gender FROM child_accounts WHERE user_id = $1',
        [context.userId]
      );
      const profile = userProfile.rows[0];
      
      logConversation({
        userId: context.userId,
        userName: profile?.name || context.childName || 'Unknown',
        userAge: profile?.age || 0,
        userGradeLevel: profile?.grade_level || 'unknown',
        userTheme: profile?.theme || 'default',
        userGender: profile?.gender,
        conversationId: conversationId || `conv-${Date.now()}`,
        messageIndex: 0, // Would need to track this in session
        userMessage: message,
        aiResponse: cleanResponse,
        recipeId: recipeUsed?.id,
        recipeName: recipeUsed?.name,
        recipeCategory: recipeUsed?.category,
        recipeInstructions: recipeUsed?.instructions,
        recipeSystemPrompt: systemPrompt.substring(0, 500),
        recipeParameters: recipeUsed?.parameters,
        recipeMinAge: recipeUsed?.minAge,
        recipeMaxAge: recipeUsed?.maxAge,
        recipeEducationalFocus: recipeUsed?.educationalFocus,
        recipeTheme: recipeUsed?.theme,
        characterName: character?.name,
        characterEmoji: character?.emoji,
        characterPersonality: recipeUsed?.characterPersonality,
        systemPrompt: systemPrompt.substring(0, 1000), // Truncate for storage
        modelUsed: process.env.CHILD_AI_MODEL || 'qwen3-8b',
        temperature: recipeUsed?.parameters?.temperature || 0.7,
        maxTokens: recipeUsed?.parameters?.max_tokens || 500,
        responseTimeMs,
        interactiveChoicesPresent: cleanResponse.includes('[CHOICE:'),
        spanishMode: spanishMode?.enabled,
        spanishLevel: spanishMode?.level,
      }).catch(err => console.error('[Child GooseMind] Logging error:', err));

      // Log A/B test events for active experiments
      if (activeVariants.length > 0) {
        logABTestEvent(
          { userId: context.userId, sessionId: conversationId },
          'interaction',
          'chat_message',
          cleanResponse.length, // Use response length as event value
          {
            hasChoices: cleanResponse.includes('[CHOICE:'),
            responseTimeMs,
            characterName: character?.name,
          },
          conversationId
        ).catch(err => console.error('[Child GooseMind] A/B event logging error:', err));
      }
      
      // Post-processing: Update PIC and track learning
      try {
        // Analyze message for interests
        await analyzeAndUpdateInterests(context.userId, message, cleanResponse);

        // Store conversation memory
        await storeConversationMemory(
          context.userId,
          'topic_discussed',
          `conversation_${conversationId || Date.now()}`,
          { userMessage: message.substring(0, 200), timestamp: new Date().toISOString() },
          { conversationId, recipeId: recipeUsed?.id, expiresInDays: 30 }
        );

        // Update achievements
        await updateAchievementProgress(context.userId, 'first_chat', 1);
        
        // Check for question (curious mind achievement)
        if (message.includes('?') || message.toLowerCase().includes('why') || 
            message.toLowerCase().includes('how') || message.toLowerCase().includes('what')) {
          await updateAchievementProgress(context.userId, 'curious_mind', 1);
        }

        // Check for specific topics
        if (message.toLowerCase().includes('math') || message.toLowerCase().includes('number')) {
          await updateAchievementProgress(context.userId, 'math_explorer', 1);
        }
        if (message.toLowerCase().includes('science') || message.toLowerCase().includes('experiment')) {
          await updateAchievementProgress(context.userId, 'science_star', 1);
        }
        if (message.toLowerCase().includes('story') || message.toLowerCase().includes('write')) {
          await updateAchievementProgress(context.userId, 'storyteller', 1);
        }
        if (message.toLowerCase().includes('joke') || message.toLowerCase().includes('funny')) {
          await updateAchievementProgress(context.userId, 'joke_master', 1);
        }
        if (message.toLowerCase().includes('animal') || message.toLowerCase().includes('nature') ||
            message.toLowerCase().includes('plant') || message.toLowerCase().includes('tree')) {
          await updateAchievementProgress(context.userId, 'nature_lover', 1);
        }
        if (message.toLowerCase().includes('space') || message.toLowerCase().includes('planet') ||
            message.toLowerCase().includes('star') || message.toLowerCase().includes('rocket')) {
          await updateAchievementProgress(context.userId, 'space_cadet', 1);
        }
        if (message.toLowerCase().includes('homework') || message.toLowerCase().includes('help me')) {
          await updateAchievementProgress(context.userId, 'helper', 1);
        }

      } catch (postError) {
        // Don't fail the response if post-processing fails
        console.error('[Child GooseMind] Post-processing error:', postError);
      }

      // Save to conversation history for child review and parent dashboard
      try {
        // Initialize tables if needed (runs once)
        await initConversationHistoryTables();
        
        // Get or create conversation
        const historyConversationId = await getOrCreateConversation(
          context.userId,
          conversationId || `session-${Date.now()}`,
          {
            characterName: character?.name,
            characterEmoji: character?.emoji,
            theme: childTheme,
            creativeMode: creativeMode?.enabled,
            creativeActivity: creativeMode?.activity,
            spanishMode: spanishMode?.enabled,
          }
        );

        // Save user message
        await saveMessage(historyConversationId, {
          role: 'user',
          content: message,
          characterName: character?.name,
          characterEmoji: character?.emoji,
        });

        // Save assistant response
        await saveMessage(historyConversationId, {
          role: 'assistant',
          content: cleanResponse,
          wasFiltered: false, // Response already passed through filtering
          characterName: character?.name,
          characterEmoji: character?.emoji,
        });

        // Generate summary periodically (every 5 messages)
        const msgCountResult = await pool.query(
          `SELECT message_count FROM child_conversations WHERE id = $1`,
          [historyConversationId]
        );
        const msgCount = msgCountResult.rows[0]?.message_count || 0;
        if (msgCount % 5 === 0) {
          generateConversationSummary(historyConversationId).catch(err => 
            console.error('[Child GooseMind] Summary generation error:', err)
          );
        }

        console.log('[Child GooseMind] Saved to conversation history:', historyConversationId);
      } catch (historyError) {
        // Don't fail the response if history saving fails
        console.error('[Child GooseMind] Conversation history error:', historyError);
      }

      // Get TTS voice for this character
      const characterId = recipeUsed?.characterName?.toLowerCase() || character?.name?.toLowerCase();
      const ttsVoice = characterId ? getVoiceForCharacter(characterId, profile?.theme) : null;

      return res.status(200).json({
        response: result.response,
        remainingMinutes: result.remainingMinutes,
        character,
        recipe: recipeUsed ? {
          id: recipeUsed.id,
          name: recipeUsed.name,
          characterName: recipeUsed.characterName,
          characterEmoji: recipeUsed.characterEmoji,
          iconPath: recipeUsed.iconPath,
        } : null,
        // TTS voice info for Read Aloud feature
        ttsVoice: ttsVoice ? {
          id: ttsVoice.id,
          name: ttsVoice.name,
          emoji: ttsVoice.emoji,
          style: ttsVoice.style,
        } : null,
      });
    } else if (result.blocked) {
      return res.status(200).json({
        blocked: true,
        message: result.blockReason,
        character,
      });
    } else {
      return res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('[Child GooseMind] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process message';
    return res.status(500).json({ error: errorMessage });
  }
}
