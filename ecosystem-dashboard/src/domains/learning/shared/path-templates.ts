/**
 * Age-based preset learning path templates.
 *
 * These are vetted, structured path templates that parents can assign to
 * children based on age band and interests. Each template produces a
 * PathRecommendation that can be passed to LearningPathService.createPath().
 *
 * Templates are organized by age band (5-7, 8-10, 11-13) and domain focus
 * (math, reading, writing, science, mixed). Steps within each template
 * are carefully sequenced with age-appropriate prompts, difficulty levels,
 * and hints.
 */

import type { PathRecommendation } from '@/lib/learning/LearningPathService';

export type AgeBand = '5-7' | '8-10' | '11-13';
export type PathDomainFocus = 'math' | 'reading' | 'writing' | 'science' | 'mixed';

export interface PresetPathTemplate {
  id: string;
  title: string;
  description: string;
  pathEmoji: string;
  ageBand: AgeBand;
  domainFocus: PathDomainFocus;
  interests?: string[];
  source: 'parent_assigned' | 'curriculum_aligned';
  recommendation: PathRecommendation;
}

// ============================================================================
// Card set builder helper
// ============================================================================

/**
 * Build a Brilliant-style 5-card sequence (try→see→explain→play→check)
 * for a path step. This produces an explicit cardSet that the CardPlayer
 * renders directly, giving each micro-skill a rich interactive experience.
 */
function buildCardSequence(opts: {
  tryQuestion: string;
  tryChoices: Array<{ id: string; label: string; correct: boolean }>;
  tryExplanation: string;
  seeSteps: string[];
  explainText: string;
  playPrompt: string;
  playInteraction: string;
  checkQuestion: string;
  checkChoices: Array<{ id: string; label: string; correct: boolean }>;
  checkExplanation: string;
  checkHint: string;
  skillCode: string;
}): unknown[] {
  return [
    {
      id: 'try',
      type: 'try',
      title: 'Make a prediction',
      emoji: '🤔',
      question: opts.tryQuestion,
      choices: opts.tryChoices,
      explanation: opts.tryExplanation,
    },
    {
      id: 'see',
      type: 'see',
      title: 'See how it works',
      emoji: '👁️',
      exampleTitle: 'Watch and learn',
      steps: opts.seeSteps,
    },
    {
      id: 'explain',
      type: 'explain',
      title: 'Let\'s understand why',
      emoji: '💡',
      passageTitle: 'The big idea',
      passageText: opts.explainText,
    },
    {
      id: 'play',
      type: 'play',
      title: 'Try it yourself',
      emoji: '🎮',
      prompt: opts.playPrompt,
      interaction: opts.playInteraction,
    },
    {
      id: 'check',
      type: 'check',
      title: 'Show what you know!',
      emoji: '✅',
      question: opts.checkQuestion,
      choices: opts.checkChoices,
      explanation: opts.checkExplanation,
      hint: opts.checkHint,
      skillCode: opts.skillCode,
    },
  ];
}

// ============================================================================
// Math Templates
// ============================================================================

const MATH_AGE_5_7: PresetPathTemplate = {
  id: 'math-5-7-counting-adventure',
  title: 'Counting Adventure',
  description: 'A fun journey through numbers, counting, and simple addition.',
  pathEmoji: '🔢',
  ageBand: '5-7',
  domainFocus: 'math',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Counting Adventure',
    description: 'Learn to count, add, and explore numbers!',
    pathEmoji: '🔢',
    source: 'curriculum_aligned',
    focusDomains: ['math'],
    steps: [
      {
        title: 'Count to 10!',
        description: 'Let\'s practice counting from 1 to 10 with pictures.',
        stepEmoji: '🌱',
        skillCode: 'math.counting',
        customPrompt: 'Can you count to 10? Write the numbers 1 through 10!',
        customContentType: 'question',
        targetDifficulty: 1,
        hints: ['Start with 1', 'Go slowly, one number at a time'],
        cardSet: buildCardSequence({
          tryQuestion: 'How many fingers do you have on both hands?',
          tryChoices: [
            { id: 'a', label: '8', correct: false },
            { id: 'b', label: '10', correct: true },
            { id: 'c', label: '12', correct: false },
          ],
          tryExplanation: 'Great thinking! You have 10 fingers — 5 on each hand. That\'s why we count to 10!',
          seeSteps: [
            'Let\'s count together: 1, 2, 3, 4, 5...',
            '...6, 7, 8, 9, 10!',
            'Each number is one more than the one before it.',
          ],
          explainText: 'Numbers help us count things! When we count, we say one number for each thing we point to. The last number we say tells us how many there are altogether.',
          playPrompt: 'Count 5 things you can see around you. Point to each one and say its number out loud!',
          playInteraction: 'Point and count out loud',
          checkQuestion: 'What comes after 7 when we count?',
          checkChoices: [
            { id: 'a', label: '6', correct: false },
            { id: 'b', label: '8', correct: true },
            { id: 'c', label: '10', correct: false },
            { id: 'd', label: '9', correct: false },
          ],
          checkExplanation: 'When counting up, each number is one more. After 7 comes 8!',
          checkHint: 'Count slowly: 1, 2, 3, 4, 5, 6, 7... what comes next?',
          skillCode: 'math.counting',
        }),
      },
      {
        title: 'Counting Objects',
        description: 'Count groups of objects you can see around you.',
        stepEmoji: '🍎',
        skillCode: 'math.counting',
        customPrompt: 'Look around you! Count 3 things you can see. Write them down.',
        customContentType: 'question',
        targetDifficulty: 1,
        hints: ['Look for toys, books, or snacks', 'Point and count out loud first'],
      },
      {
        title: 'Adding with 1',
        description: 'Learn what happens when we add 1 to a number.',
        stepEmoji: '➕',
        skillCode: 'math.addition',
        customPrompt: 'If you have 2 apples and get 1 more, how many do you have? Draw a picture!',
        customContentType: 'problem',
        targetDifficulty: 2,
        hints: ['Count the first group', 'Then count the new one', 'Put them together and count all'],
      },
      {
        title: 'Adding to 5',
        description: 'Practice adding numbers that make 5.',
        stepEmoji: '⚡',
        skillCode: 'math.addition',
        customPrompt: 'What pairs of numbers add up to 5? Write as many as you can!',
        customContentType: 'problem',
        targetDifficulty: 2,
        hints: ['1 + ? = 5', '2 + ? = 5', 'Try 3 + ? too!'],
      },
      {
        title: 'Number Champion!',
        description: 'Show off your counting and adding skills!',
        stepEmoji: '🏆',
        skillCode: 'math.addition',
        customPrompt: 'Make your own addition problem and solve it! Share it with someone you love.',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Pick two small numbers', 'Draw them as objects', 'Count the total'],
      },
    ],
  },
};

const MATH_AGE_8_10: PresetPathTemplate = {
  id: 'math-8-10-multiplication-journey',
  title: 'Multiplication Journey',
  description: 'Master multiplication from skip-counting to multi-digit problems.',
  pathEmoji: '✖️',
  ageBand: '8-10',
  domainFocus: 'math',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Multiplication Journey',
    description: 'From skip-counting to multiplication mastery!',
    pathEmoji: '✖️',
    source: 'curriculum_aligned',
    focusDomains: ['math'],
    steps: [
      {
        title: 'Skip Counting Warm-Up',
        description: 'Practice counting by 2s, 5s, and 10s.',
        stepEmoji: '🌱',
        skillCode: 'math.multiplication',
        customPrompt: 'Count by 5s from 0 to 50. Write all the numbers!',
        customContentType: 'question',
        targetDifficulty: 1,
        hints: ['Start at 0', 'Add 5 each time: 0, 5, 10...'],
        cardSet: buildCardSequence({
          tryQuestion: 'If you count by 5s, what number comes after 15?',
          tryChoices: [
            { id: 'a', label: '16', correct: false },
            { id: 'b', label: '20', correct: true },
            { id: 'c', label: '25', correct: false },
          ],
          tryExplanation: 'When skip counting by 5s, we add 5 each time. After 15 comes 20!',
          seeSteps: [
            'Counting by 5s: 0, 5, 10, 15, 20, 25...',
            'Each number is 5 more than the last one.',
            'We can also count by 2s (2, 4, 6, 8...) or by 10s (10, 20, 30...).',
          ],
          explainText: 'Skip counting is like jumping forward by the same amount each time. It\'s the secret behind multiplication! When you count by 5s five times, you reach 25 — that\'s the same as 5 × 5.',
          playPrompt: 'Count by 10s from 0 to 100. Say each number out loud!',
          playInteraction: 'Count out loud by 10s',
          checkQuestion: 'Count by 2s: what comes after 8?',
          checkChoices: [
            { id: 'a', label: '9', correct: false },
            { id: 'b', label: '10', correct: true },
            { id: 'c', label: '12', correct: false },
            { id: 'd', label: '16', correct: false },
          ],
          checkExplanation: 'Counting by 2s means adding 2 each time: 2, 4, 6, 8, 10. After 8 comes 10!',
          checkHint: 'Add 2 to 8 to get the next number.',
          skillCode: 'math.multiplication',
        }),
      },
      {
        title: 'Times Tables Basics',
        description: 'Learn the 2, 5, and 10 times tables.',
        stepEmoji: '📚',
        skillCode: 'math.multiplication',
        customPrompt: 'Write out the 5 times table from 5×1 to 5×10.',
        customContentType: 'problem',
        targetDifficulty: 2,
        hints: ['5×1 = 5', '5×2 = 10', 'Each one adds 5 more'],
      },
      {
        title: 'Multiplication Challenge',
        description: 'Solve word problems using multiplication.',
        stepEmoji: '⚡',
        skillCode: 'math.multiplication',
        customPrompt: 'If 4 boxes have 6 pencils each, how many pencils are there in total? Explain your thinking.',
        customContentType: 'problem',
        targetDifficulty: 3,
        hints: ['Draw the boxes', 'Count pencils in each box', 'Multiply or add repeatedly'],
      },
      {
        title: 'Real-World Multiplication',
        description: 'Find multiplication in everyday life.',
        stepEmoji: '🎨',
        skillCode: 'math.multiplication',
        customPrompt: 'Think of 3 places where you see multiplication in real life. Describe each one!',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Think about grocery shopping', 'What about sharing snacks with friends?', 'How about rows of seats?'],
      },
      {
        title: 'Multiplication Master!',
        description: 'Create and solve your own multi-step problem.',
        stepEmoji: '🏆',
        skillCode: 'math.multiplication',
        customPrompt: 'Create a multiplication word problem about something you love. Then solve it!',
        customContentType: 'reasoning',
        targetDifficulty: 4,
        hints: ['Pick a topic you enjoy', 'Use numbers you\'re comfortable with', 'Show your work step by step'],
      },
    ],
  },
};

// ============================================================================
// Reading Templates
// ============================================================================

const READING_AGE_5_7: PresetPathTemplate = {
  id: 'reading-5-7-story-explorer',
  title: 'Story Explorer',
  description: 'Build reading confidence with picture stories and simple comprehension.',
  pathEmoji: '📖',
  ageBand: '5-7',
  domainFocus: 'reading',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Story Explorer',
    description: 'Discover the joy of reading stories!',
    pathEmoji: '📖',
    source: 'curriculum_aligned',
    focusDomains: ['reading'],
    steps: [
      {
        title: 'What Do You Love to Read?',
        description: 'Share your favorite stories and books.',
        stepEmoji: '🌱',
        skillCode: 'reading.comp.literal',
        customPrompt: 'What is your favorite story? Why do you like it? Draw or write about it!',
        customContentType: 'question',
        targetDifficulty: 1,
        hints: ['Think about a book someone read to you', 'What made it fun?'],
      },
      {
        title: 'Picture Clues',
        description: 'Learn to use pictures to understand stories.',
        stepEmoji: '🔍',
        skillCode: 'reading.comp.literal',
        customPrompt: 'Look at a picture in a book. What do you think is happening? Write 2 sentences about it.',
        customContentType: 'question',
        targetDifficulty: 2,
        hints: ['Look at faces — are they happy or sad?', 'What objects do you see?'],
        cardSet: buildCardSequence({
          tryQuestion: 'When you look at a picture in a story, what can it tell you?',
          tryChoices: [
            { id: 'a', label: 'How a character feels', correct: true },
            { id: 'b', label: 'Nothing — pictures are just decoration', correct: false },
            { id: 'c', label: 'What might happen next', correct: true },
          ],
          tryExplanation: 'Pictures are full of clues! They show us how characters feel, where the story happens, and what might happen next.',
          seeSteps: [
            'Look at a character\'s face — a smile means happy, a frown means sad.',
            'Look at the setting — is it inside or outside? Day or night?',
            'Look at objects — they might be important to the story!',
          ],
          explainText: 'Illustrations are like a second story running alongside the words. Good readers look at both! Pictures can tell us about feelings, setting, and events that the words don\'t mention.',
          playPrompt: 'Find a book with pictures. Pick one page and describe everything you see in the picture. What is happening?',
          playInteraction: 'Explore a picture book',
          checkQuestion: 'Why do authors include pictures in stories?',
          checkChoices: [
            { id: 'a', label: 'To help us understand the story better', correct: true },
            { id: 'b', label: 'To make the book longer', correct: false },
            { id: 'c', label: 'Because they have to', correct: false },
          ],
          checkExplanation: 'Pictures give us extra clues about the story — how characters feel, where things happen, and what objects are important.',
          checkHint: 'Think about what you learn from a picture that the words don\'t tell you.',
          skillCode: 'reading.comp.literal',
        }),
      },
      {
        title: 'Story Retell',
        description: 'Practice retelling a story in your own words.',
        stepEmoji: '⚡',
        skillCode: 'reading.comp.literal',
        customPrompt: 'Pick a short story. Retell what happened at the beginning, middle, and end.',
        customContentType: 'writing',
        targetDifficulty: 2,
        hints: ['First, what happened?', 'Then, what changed?', 'Finally, how did it end?'],
      },
      {
        title: 'My Favorite Character',
        description: 'Describe a character from a story you love.',
        stepEmoji: '🎨',
        skillCode: 'reading.comp.inferential',
        customPrompt: 'Who is your favorite character in any story? Describe them! What do they look like? What do they do?',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Describe their appearance', 'What do they do in the story?', 'Why do you like them?'],
      },
      {
        title: 'Reading Star!',
        description: 'Create your own mini-story.',
        stepEmoji: '🏆',
        skillCode: 'reading.comp.inferential',
        customPrompt: 'Make up a short story about an animal who goes on an adventure. Write at least 3 sentences!',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Pick an animal', 'Where do they go?', 'What happens there?'],
      },
    ],
  },
};

const READING_AGE_8_10: PresetPathTemplate = {
  id: 'reading-8-10-comprehension-quest',
  title: 'Comprehension Quest',
  description: 'Develop deeper reading comprehension with inference and evidence.',
  pathEmoji: '📚',
  ageBand: '8-10',
  domainFocus: 'reading',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Comprehension Quest',
    description: 'Become a reading detective who finds clues in stories!',
    pathEmoji: '📚',
    source: 'curriculum_aligned',
    focusDomains: ['reading'],
    steps: [
      {
        title: 'Reading Detective',
        description: 'Learn to find evidence in what you read.',
        stepEmoji: '🌱',
        skillCode: 'reading.comp.literal',
        customPrompt: 'Read a short passage from a book. Write down 3 facts you learned from it.',
        customContentType: 'question',
        targetDifficulty: 2,
        hints: ['Look for specific details', 'Write exactly what the text says'],
      },
      {
        title: 'Reading Between the Lines',
        description: 'Practice making inferences from clues in the text.',
        stepEmoji: '🔍',
        skillCode: 'reading.comp.inferential',
        customPrompt: 'Think about a character in a book. How do you think they felt at the end? What clues tell you that?',
        customContentType: 'problem',
        targetDifficulty: 3,
        hints: ['Look for words that show feelings', 'What happened to them?', 'Why might they feel that way?'],
      },
      {
        title: 'Vocabulary Explorer',
        description: 'Discover new words and their meanings.',
        stepEmoji: '⚡',
        skillCode: 'reading.vocab',
        customPrompt: 'Find 3 new words in a book you\'re reading. Write each word, guess its meaning, then look it up!',
        customContentType: 'problem',
        targetDifficulty: 3,
        hints: ['Pick words you don\'t know', 'Use surrounding sentences as clues', 'Check a dictionary to verify'],
      },
      {
        title: 'Story Connections',
        description: 'Connect stories to your own life.',
        stepEmoji: '🎨',
        skillCode: 'reading.comp.inferential',
        customPrompt: 'How does a story you read connect to your own life? Write about a similar experience you had.',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Did something similar happen to you?', 'How did you feel compared to the character?'],
      },
      {
        title: 'Book Reviewer!',
        description: 'Write a review of a book you enjoyed.',
        stepEmoji: '🏆',
        skillCode: 'reading.comp.inferential',
        customPrompt: 'Write a book review! Include: what the book is about, what you liked, who would enjoy it, and your rating (1-5 stars).',
        customContentType: 'writing',
        targetDifficulty: 4,
        hints: ['Summarize without spoiling the ending', 'Give specific reasons you liked it', 'Recommend it to a type of reader'],
      },
    ],
  },
};

// ============================================================================
// Science Templates
// ============================================================================

const SCIENCE_AGE_8_10: PresetPathTemplate = {
  id: 'science-8-10-young-scientist',
  title: 'Young Scientist',
  description: 'Explore the natural world through observation and experiments.',
  pathEmoji: '🔬',
  ageBand: '8-10',
  domainFocus: 'science',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Young Scientist',
    description: 'Discover the wonders of science all around you!',
    pathEmoji: '🔬',
    source: 'curriculum_aligned',
    focusDomains: ['science'],
    steps: [
      {
        title: 'Science All Around',
        description: 'Find science in your everyday life.',
        stepEmoji: '🌱',
        skillCode: 'science.earth.weather',
        customPrompt: 'Look outside! What do you notice about the weather today? Write 3 observations.',
        customContentType: 'question',
        targetDifficulty: 1,
        hints: ['Is it sunny, cloudy, or rainy?', 'What does the sky look like?', 'How does the air feel?'],
      },
      {
        title: 'Living vs Non-Living',
        description: 'Sort things into living and non-living categories.',
        stepEmoji: '🌿',
        skillCode: 'science.classification.living',
        customPrompt: 'List 5 living things and 5 non-living things you can find in your home or yard.',
        customContentType: 'problem',
        targetDifficulty: 2,
        hints: ['Living things grow and need food/water', 'Non-living things don\'t grow', 'Plants are living!'],
      },
      {
        title: 'States of Matter',
        description: 'Explore solids, liquids, and gases.',
        stepEmoji: '💧',
        skillCode: 'science.physical.matter',
        customPrompt: 'Find 3 solids, 2 liquids, and 1 gas in your kitchen. Describe each one!',
        customContentType: 'problem',
        targetDifficulty: 3,
        hints: ['Solids hold their shape', 'Liquids take the shape of their container', 'Gases are invisible but there'],
      },
      {
        title: 'Design an Experiment',
        description: 'Think like a scientist and plan an experiment.',
        stepEmoji: '🎨',
        skillCode: 'science.physical.forces',
        customPrompt: 'Design an experiment to test which surface is fastest for a toy car: carpet, wood, or tile. Write your plan!',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['What will you keep the same?', 'What will you change?', 'How will you measure speed?'],
      },
      {
        title: 'Science Fair Star!',
        description: 'Conduct a simple experiment and report results.',
        stepEmoji: '🏆',
        skillCode: 'science.life.ecosystems',
        customPrompt: 'Observe a plant for 3 days. Write down what you notice each day. Draw or describe the changes!',
        customContentType: 'reasoning',
        targetDifficulty: 4,
        hints: ['Look at the leaves and soil', 'Note any changes in color or shape', 'Water it and see what happens'],
      },
    ],
  },
};

// ============================================================================
// Mixed / Interdisciplinary Templates
// ============================================================================

const MIXED_AGE_5_7: PresetPathTemplate = {
  id: 'mixed-5-7-curiosity-quest',
  title: 'Curiosity Quest',
  description: 'A mixed-subject adventure exploring math, reading, and the world.',
  pathEmoji: '🌟',
  ageBand: '5-7',
  domainFocus: 'mixed',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Curiosity Quest',
    description: 'Explore math, reading, and science in one fun adventure!',
    pathEmoji: '🌟',
    source: 'curriculum_aligned',
    focusDomains: ['math', 'reading', 'science'],
    steps: [
      {
        title: 'I Wonder...',
        description: 'Share what you\'re curious about!',
        stepEmoji: '🌱',
        customPrompt: 'What are 3 things you wonder about? They can be about anything!',
        customContentType: 'question',
        targetDifficulty: 1,
        hints: ['Think about questions you ask', 'What do you want to learn?', 'What makes you go "wow"?'],
      },
      {
        title: 'Counting in Nature',
        description: 'Combine counting with outdoor observation.',
        stepEmoji: '🌳',
        skillCode: 'math.counting',
        customPrompt: 'Go outside (or look out a window). Count 5 things you see. Write them down with their numbers!',
        customContentType: 'question',
        targetDifficulty: 2,
        hints: ['Look for trees, birds, or clouds', 'Write: "I see 3 ___"', 'Have fun exploring!'],
      },
      {
        title: 'Story Time',
        description: 'Read or listen to a story and share your favorite part.',
        stepEmoji: '📖',
        skillCode: 'reading.comp.literal',
        customPrompt: 'Read or listen to a short story. What was your favorite part? Why?',
        customContentType: 'writing',
        targetDifficulty: 2,
        hints: ['Think about the funniest or most exciting part', 'What made you feel something?'],
      },
      {
        title: 'Creative Maker',
        description: 'Use what you\'ve learned to create something new.',
        stepEmoji: '🎨',
        customPrompt: 'Draw or build something inspired by what you learned this week. Describe what you made!',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Use materials around you', 'It can be a drawing, a model, or a story', 'Tell us about your creation'],
      },
      {
        title: 'Curiosity Champion!',
        description: 'Share everything you discovered on your quest.',
        stepEmoji: '🏆',
        customPrompt: 'What was the most exciting thing you learned on this quest? Tell us about it!',
        customContentType: 'reasoning',
        targetDifficulty: 3,
        hints: ['Pick your favorite discovery', 'Explain why it was exciting', 'Share it with someone!'],
      },
    ],
  },
};

const MIXED_AGE_11_13: PresetPathTemplate = {
  id: 'mixed-11-13-critical-thinker',
  title: 'Critical Thinker',
  description: 'Develop analytical thinking across math, reading, and science.',
  pathEmoji: '🧠',
  ageBand: '11-13',
  domainFocus: 'mixed',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Critical Thinker',
    description: 'Build reasoning skills across multiple subjects!',
    pathEmoji: '🧠',
    source: 'curriculum_aligned',
    focusDomains: ['math', 'reading', 'analytical'],
    steps: [
      {
        title: 'Evidence Hunter',
        description: 'Learn to find and evaluate evidence.',
        stepEmoji: '🌱',
        skillCode: 'analytical.infer_evidence',
        customPrompt: 'Read a short article or passage. Identify 2 claims the author makes and the evidence they use to support each.',
        customContentType: 'question',
        targetDifficulty: 2,
        hints: ['A claim is a statement the author believes is true', 'Evidence is the proof they give', 'Look for facts, statistics, or examples'],
      },
      {
        title: 'Pattern Detective',
        description: 'Find and describe patterns in data.',
        stepEmoji: '🔍',
        skillCode: 'analytical.patterns',
        customPrompt: 'Look at this sequence: 2, 4, 8, 16, ?... What comes next? Explain the pattern you found.',
        customContentType: 'problem',
        targetDifficulty: 3,
        hints: ['How do you get from 2 to 4?', 'Is it adding or multiplying?', 'Check if the same rule works for 4 to 8'],
      },
      {
        title: 'Argument Builder',
        description: 'Construct a well-reasoned argument.',
        stepEmoji: '⚡',
        skillCode: 'writing.opinion',
        customPrompt: 'Should kids have homework? Write a paragraph arguing your position with at least 2 reasons and evidence.',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['State your opinion clearly', 'Give specific reasons', 'Support each reason with an example'],
      },
      {
        title: 'Real-World Problem Solver',
        description: 'Apply math to solve a real-world scenario.',
        stepEmoji: '🎨',
        skillCode: 'math.fractions',
        customPrompt: 'You\'re planning a party for 12 people. Each pizza serves 3 people. How many pizzas do you need? Show your reasoning.',
        customContentType: 'problem',
        targetDifficulty: 4,
        hints: ['How many groups of 3 are in 12?', 'Try drawing it out', 'Think: 12 ÷ 3 = ?'],
      },
      {
        title: 'Critical Thinker Master!',
        description: 'Synthesize your skills in a final project.',
        stepEmoji: '🏆',
        skillCode: 'analytical.infer_evidence',
        customPrompt: 'Choose a topic you care about. Write a short persuasive essay (3-4 paragraphs) with a claim, evidence, and a counter-argument.',
        customContentType: 'reasoning',
        targetDifficulty: 5,
        hints: ['Start with your main claim', 'Use 2-3 pieces of evidence', 'Address the other side', 'End with a strong conclusion'],
      },
    ],
  },
};

// ============================================================================
// Writing Templates
// ============================================================================

const WRITING_AGE_5_7: PresetPathTemplate = {
  id: 'writing-5-7-story-weaver',
  title: 'Story Weaver',
  description: 'Begin to tell and write short stories with pictures and words.',
  pathEmoji: '✏️',
  ageBand: '5-7',
  domainFocus: 'writing',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Story Weaver',
    description: 'Spin your first tales with words and pictures!',
    pathEmoji: '✏️',
    source: 'curriculum_aligned',
    focusDomains: ['writing'],
    steps: [
      {
        title: 'My Favorite Thing',
        description: 'Write about something you love.',
        stepEmoji: '🌱',
        skillCode: 'writing.narrative',
        customPrompt: 'Draw your favorite thing and write 1-2 sentences about why you love it.',
        customContentType: 'writing',
        targetDifficulty: 1,
        hints: ['Start with "My favorite thing is..."', 'Tell us what it looks like', 'Why does it make you happy?'],
      },
      {
        title: 'Once Upon a Time',
        description: 'Write the beginning of a story.',
        stepEmoji: '📖',
        skillCode: 'writing.narrative',
        customPrompt: 'Write the beginning of a story about a friendly animal. Start with "Once upon a time..."',
        customContentType: 'writing',
        targetDifficulty: 2,
        hints: ['Who is the animal?', 'Where do they live?', 'What is their name?'],
      },
      {
        title: 'A Problem to Solve',
        description: 'Add a problem to your story.',
        stepEmoji: '⚡',
        skillCode: 'writing.narrative',
        customPrompt: 'Think of a problem your animal character faces. Write 2-3 sentences about what goes wrong.',
        customContentType: 'writing',
        targetDifficulty: 2,
        hints: ['Maybe they lose something', 'Maybe they get lost', 'Maybe they need help from a friend'],
      },
      {
        title: 'Happy Ending',
        description: 'Finish your story with a solution.',
        stepEmoji: '🎨',
        skillCode: 'writing.narrative',
        customPrompt: 'Write the ending of your story. How does the animal solve the problem?',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['A friend can help', 'They can be brave', 'They can try something new'],
      },
      {
        title: 'Story Time!',
        description: 'Share your complete story.',
        stepEmoji: '🏆',
        skillCode: 'writing.narrative',
        customPrompt: 'Put your whole story together — beginning, problem, and ending. Read it to someone you love!',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Read it out loud first', 'Does it make sense?', 'Add a picture if you want!'],
      },
    ],
  },
};

const WRITING_AGE_8_10: PresetPathTemplate = {
  id: 'writing-8-10-young-author',
  title: 'Young Author',
  description: 'Craft longer stories with characters, settings, and dialogue.',
  pathEmoji: '🖊️',
  ageBand: '8-10',
  domainFocus: 'writing',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Young Author',
    description: 'Build worlds, characters, and exciting plots!',
    pathEmoji: '🖊️',
    source: 'curriculum_aligned',
    focusDomains: ['writing'],
    steps: [
      {
        title: 'Meet Your Character',
        description: 'Create a detailed character profile.',
        stepEmoji: '🌱',
        skillCode: 'writing.narrative',
        customPrompt: 'Invent a character! Write their name, age, what they look like, what they love, and one thing they fear.',
        customContentType: 'writing',
        targetDifficulty: 2,
        hints: ['Give them a unique name', 'What makes them special?', 'Everyone is afraid of something'],
      },
      {
        title: 'Setting the Scene',
        description: 'Describe where your story takes place.',
        stepEmoji: '🗺️',
        skillCode: 'writing.descriptive',
        customPrompt: 'Describe the place where your story happens. Use all 5 senses — what can you see, hear, smell, feel, and taste?',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Is it a real place or made-up?', 'What time of day is it?', 'Use describing words (adjectives)'],
      },
      {
        title: 'Dialogue Practice',
        description: 'Write a conversation between two characters.',
        stepEmoji: '💬',
        skillCode: 'writing.dialogue',
        customPrompt: 'Write a conversation between your main character and a new friend they meet. Use quotation marks!',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Use "Hello!" said [name] format', 'Make each character sound different', 'What do they talk about?'],
      },
      {
        title: 'The Big Moment',
        description: 'Write the most exciting part of your story.',
        stepEmoji: '⚡',
        skillCode: 'writing.narrative',
        customPrompt: 'Write the climax of your story — the most exciting or scary moment. Make us hold our breath!',
        customContentType: 'writing',
        targetDifficulty: 4,
        hints: ['What is the biggest challenge?', 'Use short sentences for excitement', 'How does your character feel?'],
      },
      {
        title: 'Published Author!',
        description: 'Complete and polish your story.',
        stepEmoji: '🏆',
        skillCode: 'writing.narrative',
        customPrompt: 'Write your complete short story (3-5 paragraphs). Include a title, setting, characters, problem, and resolution.',
        customContentType: 'writing',
        targetDifficulty: 4,
        hints: ['Reread and fix mistakes', 'Does each paragraph flow to the next?', 'Give your story a great title'],
      },
    ],
  },
};

const WRITING_AGE_11_13: PresetPathTemplate = {
  id: 'writing-11-13-essay-craft',
  title: 'Essay Craft',
  description: 'Master persuasive and analytical writing with structured arguments.',
  pathEmoji: '📝',
  ageBand: '11-13',
  domainFocus: 'writing',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Essay Craft',
    description: 'Learn to argue, persuade, and write with power!',
    pathEmoji: '📝',
    source: 'curriculum_aligned',
    focusDomains: ['writing'],
    steps: [
      {
        title: 'What Do You Think?',
        description: 'Form and express a clear opinion.',
        stepEmoji: '🌱',
        skillCode: 'writing.opinion',
        customPrompt: 'Should schools have longer recess? Write your opinion in one clear sentence, then list 3 reasons supporting it.',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Pick a side — yes or no', 'Think about what matters to students', 'Each reason should be different'],
      },
      {
        title: 'Building an Argument',
        description: 'Structure a paragraph with a claim and evidence.',
        stepEmoji: '🏗️',
        skillCode: 'writing.opinion',
        customPrompt: 'Write a structured paragraph: topic sentence, 2 pieces of evidence, and a concluding sentence. Topic: Is homework helpful or harmful?',
        customContentType: 'writing',
        targetDifficulty: 4,
        hints: ['Start with your strongest point', 'Use facts or examples as evidence', 'Wrap up with "Therefore..." or "This shows that..."'],
      },
      {
        title: 'Counter-Arguments',
        description: 'Address the other side of the debate.',
        stepEmoji: '⚖️',
        skillCode: 'writing.persuasive',
        customPrompt: 'Write a paragraph acknowledging the opposite viewpoint on homework, then explain why your position is still stronger.',
        customContentType: 'writing',
        targetDifficulty: 4,
        hints: ['Start with "Some people believe..."', 'Be fair to the other side', 'Use "However..." to pivot back to your view'],
      },
      {
        title: 'Introduction & Hook',
        description: 'Write a compelling essay introduction.',
        stepEmoji: '🎣',
        skillCode: 'writing.persuasive',
        customPrompt: 'Write an introduction paragraph for a persuasive essay. Start with a hook (question, fact, or story), give background, and end with a thesis statement.',
        customContentType: 'writing',
        targetDifficulty: 5,
        hints: ['A hook grabs attention', 'Background tells the reader what they need to know', 'A thesis is your main argument in one sentence'],
      },
      {
        title: 'Essay Master!',
        description: 'Write a complete persuasive essay.',
        stepEmoji: '🏆',
        skillCode: 'writing.persuasive',
        customPrompt: 'Write a complete 4-paragraph persuasive essay on a topic you care about. Include: introduction with thesis, 2 body paragraphs with evidence, and a conclusion.',
        customContentType: 'writing',
        targetDifficulty: 5,
        hints: ['Each body paragraph needs a topic sentence', 'Use transition words (First, Additionally, However)', 'Your conclusion should restate your thesis powerfully'],
      },
    ],
  },
};

// ============================================================================
// Additional Math, Reading, Science, Mixed Templates
// ============================================================================

const MATH_AGE_11_13: PresetPathTemplate = {
  id: 'math-11-13-algebra-thinking',
  title: 'Algebra Thinking',
  description: 'Transition from arithmetic to algebraic reasoning and equations.',
  pathEmoji: '🧮',
  ageBand: '11-13',
  domainFocus: 'math',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Algebra Thinking',
    description: 'Unlock the power of variables, equations, and logical reasoning!',
    pathEmoji: '🧮',
    source: 'curriculum_aligned',
    focusDomains: ['math'],
    steps: [
      {
        title: 'What is a Variable?',
        description: 'Understand how letters represent numbers.',
        stepEmoji: '🌱',
        skillCode: 'math.algebra',
        customPrompt: 'If x + 5 = 12, what is x? Explain how you figured it out.',
        customContentType: 'problem',
        targetDifficulty: 3,
        hints: ['What number plus 5 equals 12?', 'You can subtract 5 from both sides', 'x = 12 - 5'],
        cardSet: buildCardSequence({
          tryQuestion: 'If x + 5 = 12, what do you think x is?',
          tryChoices: [
            { id: 'a', label: '5', correct: false },
            { id: 'b', label: '7', correct: true },
            { id: 'c', label: '12', correct: false },
          ],
          tryExplanation: 'A variable is a letter that stands for a number we don\'t know yet. Here, x is 7 because 7 + 5 = 12.',
          seeSteps: [
            'Think of a variable as a mystery box. It holds a number.',
            'In x + 5 = 12, we need to find what number goes in the box.',
            'We can "undo" the +5 by subtracting 5 from both sides: x = 12 - 5 = 7.',
          ],
          explainText: 'Variables (like x, y, or n) are placeholders for unknown numbers. An equation says "these two sides are equal." To solve for a variable, we do the same operation to both sides to isolate it. This is the foundation of algebra!',
          playPrompt: 'Try solving: if y - 3 = 10, what is y? Write your answer and check it by plugging it back in.',
          playInteraction: 'Solve and check',
          checkQuestion: 'If 2x = 14, what is x?',
          checkChoices: [
            { id: 'a', label: '6', correct: false },
            { id: 'b', label: '7', correct: true },
            { id: 'c', label: '12', correct: false },
            { id: 'd', label: '28', correct: false },
          ],
          checkExplanation: 'Divide both sides by 2: x = 14 ÷ 2 = 7. Check: 2 × 7 = 14. ✓',
          checkHint: 'To undo multiplication, divide both sides by the same number.',
          skillCode: 'math.algebra',
        }),
      },
      {
        title: 'Solving Equations',
        description: 'Practice solving one-step equations.',
        stepEmoji: '📚',
        skillCode: 'math.algebra',
        customPrompt: 'Solve these equations: 1) y - 7 = 15, 2) 3n = 24, 3) w/4 = 9. Show your work for each.',
        customContentType: 'problem',
        targetDifficulty: 4,
        hints: ['Do the opposite operation to both sides', 'For subtraction, add; for division, multiply', 'Check by plugging your answer back in'],
      },
      {
        title: 'Word Problems with Algebra',
        description: 'Translate words into equations.',
        stepEmoji: '⚡',
        skillCode: 'math.algebra',
        customPrompt: 'A movie ticket costs $9. If you have $45, how many tickets can you buy? Write an equation and solve it.',
        customContentType: 'problem',
        targetDifficulty: 4,
        hints: ['Let t = number of tickets', '9t = 45', 'Divide both sides by 9'],
      },
      {
        title: 'Patterns and Rules',
        description: 'Describe patterns using algebraic expressions.',
        stepEmoji: '🎨',
        skillCode: 'math.algebra',
        customPrompt: 'A pattern starts: 3, 7, 11, 15, ... Write a rule for the nth term. What is the 20th term?',
        customContentType: 'reasoning',
        targetDifficulty: 5,
        hints: ['How much does each term increase?', 'The first term is 3, and you add 4 each time', 'The rule is: 3 + 4(n-1) or 4n - 1'],
      },
      {
        title: 'Algebra Master!',
        description: 'Apply algebra to a real-world scenario.',
        stepEmoji: '🏆',
        skillCode: 'math.algebra',
        customPrompt: 'You are saving for a $240 bike. You already have $60 and save $15 per week. Write an equation for when you\'ll have enough, and solve for the number of weeks.',
        customContentType: 'reasoning',
        targetDifficulty: 5,
        hints: ['Let w = weeks', '60 + 15w ≥ 240', 'Subtract 60, then divide by 15'],
      },
    ],
  },
};

const READING_AGE_11_13: PresetPathTemplate = {
  id: 'reading-11-13-literary-explorer',
  title: 'Literary Explorer',
  description: 'Analyze literature with theme, symbolism, and critical thinking.',
  pathEmoji: '🎭',
  ageBand: '11-13',
  domainFocus: 'reading',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Literary Explorer',
    description: 'Read between the lines and uncover deeper meanings!',
    pathEmoji: '🎭',
    source: 'curriculum_aligned',
    focusDomains: ['reading'],
    steps: [
      {
        title: 'Theme Detective',
        description: 'Identify themes in stories.',
        stepEmoji: '🌱',
        skillCode: 'reading.comp.thematic',
        customPrompt: 'Think of a book or movie you love. What is the main theme or big idea? Write 2-3 sentences explaining it.',
        customContentType: 'question',
        targetDifficulty: 3,
        hints: ['Themes are big ideas like "friendship" or "courage"', 'What does the story teach you about life?', 'The theme is not the plot — it\'s the message'],
      },
      {
        title: 'Character Analysis',
        description: 'Analyze how characters change.',
        stepEmoji: '🔍',
        skillCode: 'reading.comp.inferential',
        customPrompt: 'Choose a character from a book. Describe how they change from the beginning to the end. What causes the change?',
        customContentType: 'writing',
        targetDifficulty: 4,
        hints: ['Who were they at the start?', 'What events changed them?', 'Who are they by the end?'],
      },
      {
        title: 'Symbolism Search',
        description: 'Find and interpret symbols in literature.',
        stepEmoji: '🔑',
        skillCode: 'reading.comp.thematic',
        customPrompt: 'Find a symbol in a story you\'ve read (an object that represents a bigger idea). Write what it is and what you think it represents.',
        customContentType: 'writing',
        targetDifficulty: 4,
        hints: ['A symbol is an object that stands for something more', 'A ring can symbolize commitment', 'Weather can symbolize mood'],
      },
      {
        title: 'Author\'s Purpose',
        description: 'Analyze why authors make specific choices.',
        stepEmoji: '🎨',
        skillCode: 'reading.comp.inferential',
        customPrompt: 'Why do you think the author chose to tell the story from a specific character\'s perspective? How would it change if told differently?',
        customContentType: 'reasoning',
        targetDifficulty: 5,
        hints: ['Who tells the story — the main character or someone else?', 'First-person vs third-person changes what we know', 'What does the narrator\'s viewpoint hide or reveal?'],
      },
      {
        title: 'Literary Critic!',
        description: 'Write a literary analysis paragraph.',
        stepEmoji: '🏆',
        skillCode: 'reading.comp.thematic',
        customPrompt: 'Write a literary analysis paragraph about a book. Include: a claim about the theme, evidence from the text, and your interpretation.',
        customContentType: 'reasoning',
        targetDifficulty: 5,
        hints: ['Start with your claim about the theme', 'Quote or describe a specific scene', 'Explain how the evidence supports your claim'],
      },
    ],
  },
};

const SCIENCE_AGE_5_7: PresetPathTemplate = {
  id: 'science-5-7-nature-discoverer',
  title: 'Nature Discoverer',
  description: 'Observe and explore the natural world with all your senses.',
  pathEmoji: '🌻',
  ageBand: '5-7',
  domainFocus: 'science',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Nature Discoverer',
    description: 'Discover the amazing world of plants, animals, and weather!',
    pathEmoji: '🌻',
    source: 'curriculum_aligned',
    focusDomains: ['science'],
    steps: [
      {
        title: 'My Five Senses',
        description: 'Explore the world using your senses.',
        stepEmoji: '🌱',
        skillCode: 'science.observation',
        customPrompt: 'Go outside or look out a window. Write one thing you can see, hear, and feel right now.',
        customContentType: 'question',
        targetDifficulty: 1,
        hints: ['Look with your eyes — what do you see?', 'Listen carefully — what do you hear?', 'Feel the air — is it warm or cool?'],
      },
      {
        title: 'Animal Friends',
        description: 'Learn about different animals.',
        stepEmoji: '🐾',
        skillCode: 'science.life.animals',
        customPrompt: 'Draw or write about your favorite animal. Where does it live? What does it eat?',
        customContentType: 'writing',
        targetDifficulty: 2,
        hints: ['Is it big or small?', 'Does it live in a forest, ocean, or your house?', 'What does it like to eat?'],
      },
      {
        title: 'Weather Watcher',
        description: 'Observe and describe the weather.',
        stepEmoji: '☁️',
        skillCode: 'science.earth.weather',
        customPrompt: 'Look at the sky today. Is it sunny, cloudy, or rainy? Draw a picture and write 1 sentence about the weather.',
        customContentType: 'question',
        targetDifficulty: 2,
        hints: ['What color is the sky?', 'Can you see the sun or clouds?', 'How does the weather feel?'],
      },
      {
        title: 'Plant a Seed',
        description: 'Learn how plants grow.',
        stepEmoji: '🌿',
        skillCode: 'science.life.plants',
        customPrompt: 'What does a plant need to grow? Draw or list 3 things that help plants grow tall!',
        customContentType: 'question',
        targetDifficulty: 2,
        hints: ['Plants need water', 'Plants need sunlight', 'Plants need soil to grow in'],
      },
      {
        title: 'Nature Scientist!',
        description: 'Observe something in nature and share your discovery.',
        stepEmoji: '🏆',
        skillCode: 'science.observation',
        customPrompt: 'Find one amazing thing in nature (a bug, a flower, a cloud). Draw it and write why you think it is amazing!',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Look closely at the details', 'What makes it special?', 'Tell someone what you found!'],
      },
    ],
  },
};

const SCIENCE_AGE_11_13: PresetPathTemplate = {
  id: 'science-11-13-science-investigator',
  title: 'Science Investigator',
  description: 'Design experiments, analyze data, and think like a scientist.',
  pathEmoji: '🔭',
  ageBand: '11-13',
  domainFocus: 'science',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'Science Investigator',
    description: 'Investigate the world with the scientific method!',
    pathEmoji: '🔭',
    source: 'curriculum_aligned',
    focusDomains: ['science'],
    steps: [
      {
        title: 'The Scientific Method',
        description: 'Learn the steps scientists use.',
        stepEmoji: '🌱',
        skillCode: 'science.method',
        customPrompt: 'List the 5 steps of the scientific method in order. Write one sentence explaining each step.',
        customContentType: 'question',
        targetDifficulty: 3,
        hints: ['Start with a question', 'Then make a hypothesis (a guess)', 'Test it, analyze results, and conclude'],
      },
      {
        title: 'Hypothesis Builder',
        description: 'Practice writing testable hypotheses.',
        stepEmoji: '💡',
        skillCode: 'science.method',
        customPrompt: 'Write a hypothesis for this question: "Does salt water freeze faster than fresh water?" Use "If... then..." format.',
        customContentType: 'writing',
        targetDifficulty: 4,
        hints: ['Start with "If salt water freezes at a lower temperature..."', '"...then fresh water will freeze first."', 'A hypothesis must be testable!'],
      },
      {
        title: 'Variables and Controls',
        description: 'Identify variables in an experiment.',
        stepEmoji: '⚖️',
        skillCode: 'science.method',
        customPrompt: 'In an experiment testing how sunlight affects plant growth, identify: the independent variable, dependent variable, and 2 controlled variables.',
        customContentType: 'problem',
        targetDifficulty: 4,
        hints: ['Independent = what you change (sunlight)', 'Dependent = what you measure (growth)', 'Controlled = what you keep the same (water, soil, plant type)'],
      },
      {
        title: 'Data Analysis',
        description: 'Interpret data from an experiment.',
        stepEmoji: '📊',
        skillCode: 'science.data',
        customPrompt: 'A student measured plant heights: Day 1 = 2cm, Day 5 = 5cm, Day 10 = 9cm. Calculate the average daily growth rate and describe the trend.',
        customContentType: 'problem',
        targetDifficulty: 5,
        hints: ['Growth = final height - initial height', 'Rate = total growth / total days', 'Is the growth speeding up or slowing down?'],
      },
      {
        title: 'Science Fair Champion!',
        description: 'Design a complete experiment.',
        stepEmoji: '🏆',
        skillCode: 'science.method',
        customPrompt: 'Design a complete experiment: question, hypothesis, variables, procedure (5 steps), and what data you would collect.',
        customContentType: 'reasoning',
        targetDifficulty: 5,
        hints: ['Pick a question you can test at home', 'Make sure you only change one thing', 'Write clear steps anyone could follow'],
      },
    ],
  },
};

const MIXED_AGE_8_10: PresetPathTemplate = {
  id: 'mixed-8-10-world-explorer',
  title: 'World Explorer',
  description: 'Explore math, reading, and science through real-world adventures.',
  pathEmoji: '🌍',
  ageBand: '8-10',
  domainFocus: 'mixed',
  source: 'curriculum_aligned',
  recommendation: {
    title: 'World Explorer',
    description: 'Travel through math, science, and stories in one adventure!',
    pathEmoji: '🌍',
    source: 'curriculum_aligned',
    focusDomains: ['math', 'reading', 'science'],
    steps: [
      {
        title: 'Map Maker',
        description: 'Use math to create a map.',
        stepEmoji: '🌱',
        skillCode: 'math.measurement',
        customPrompt: 'Draw a map of your room. Measure 3 things and write their lengths in centimeters.',
        customContentType: 'question',
        targetDifficulty: 2,
        hints: ['Use a ruler or measuring tape', 'Measure a desk, bed, or window', 'Write "My desk is ___ cm long"'],
      },
      {
        title: 'Science in the Kitchen',
        description: 'Explore chemistry through cooking.',
        stepEmoji: '🔬',
        skillCode: 'science.physical.matter',
        customPrompt: 'Help make a snack or drink. Write down 2 changes you observe (like melting, mixing, or bubbling). What kind of change is it?',
        customContentType: 'problem',
        targetDifficulty: 3,
        hints: ['Melting is a physical change', 'Bubbling can be a chemical change', 'Mixing can be either!'],
      },
      {
        title: 'Story Problems',
        description: 'Solve math problems hidden in stories.',
        stepEmoji: '📖',
        skillCode: 'math.word_1step',
        customPrompt: 'A baker made 24 cookies and sold 15. How many are left? Write the problem as a number sentence and solve it.',
        customContentType: 'problem',
        targetDifficulty: 3,
        hints: ['Start with 24', 'Subtract the 15 sold', '24 - 15 = ?'],
      },
      {
        title: 'Read and Wonder',
        description: 'Connect reading to curiosity.',
        stepEmoji: '🤔',
        skillCode: 'reading.comp.inferential',
        customPrompt: 'Read a short article or book about a science topic. Write 2 facts you learned and 1 question you still have.',
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Pick something that interests you', 'Facts are what the text says directly', 'A question shows you want to learn more'],
      },
      {
        title: 'Explorer Champion!',
        description: 'Combine everything you\'ve learned.',
        stepEmoji: '🏆',
        skillCode: 'analytical.infer_evidence',
        customPrompt: 'Pick a topic from this week (an animal, a number pattern, or a story). Write 3-4 sentences about what you learned and why it matters.',
        customContentType: 'reasoning',
        targetDifficulty: 4,
        hints: ['Choose your favorite activity', 'Explain what you discovered', 'Why is it useful or interesting?'],
      },
    ],
  },
};

// ============================================================================
// Template Registry
// ============================================================================

export const PRESET_PATH_TEMPLATES: PresetPathTemplate[] = [
  MATH_AGE_5_7,
  MATH_AGE_8_10,
  MATH_AGE_11_13,
  READING_AGE_5_7,
  READING_AGE_8_10,
  READING_AGE_11_13,
  WRITING_AGE_5_7,
  WRITING_AGE_8_10,
  WRITING_AGE_11_13,
  SCIENCE_AGE_5_7,
  SCIENCE_AGE_8_10,
  SCIENCE_AGE_11_13,
  MIXED_AGE_5_7,
  MIXED_AGE_8_10,
  MIXED_AGE_11_13,
];

/**
 * Get all preset templates appropriate for a given age.
 * @param age - Child's age in years
 * @returns Array of matching templates
 */
export function getPresetTemplatesForAge(age: number): PresetPathTemplate[] {
  const band = ageToBand(age);
  return PRESET_PATH_TEMPLATES.filter((t) => t.ageBand === band);
}

/**
 * Get all preset templates filtered by age and optional domain focus.
 */
export function getPresetTemplates(
  age: number,
  domainFocus?: PathDomainFocus
): PresetPathTemplate[] {
  const byAge = getPresetTemplatesForAge(age);
  if (!domainFocus) return byAge;
  return byAge.filter((t) => t.domainFocus === domainFocus);
}

/**
 * Get a specific template by ID.
 */
export function getPresetTemplateById(id: string): PresetPathTemplate | undefined {
  return PRESET_PATH_TEMPLATES.find((t) => t.id === id);
}

/**
 * Convert a numeric age to an age band.
 */
export function ageToBand(age: number): AgeBand {
  if (age <= 7) return '5-7';
  if (age <= 10) return '8-10';
  return '11-13';
}

/**
 * Generate a PathRecommendation from a preset template.
 * This can be passed directly to LearningPathService.createPath().
 */
export function generatePresetPath(
  templateId: string,
  childName?: string
): PathRecommendation | null {
  const template = getPresetTemplateById(templateId);
  if (!template) return null;

  const rec = template.recommendation;
  if (childName) {
    return {
      ...rec,
      title: `${childName}'s ${rec.title}`,
    };
  }
  return rec;
}
