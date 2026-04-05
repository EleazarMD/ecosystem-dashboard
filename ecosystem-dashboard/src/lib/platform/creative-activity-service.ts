/**
 * Creative Activity Service
 * 
 * Manages creative activity sessions that connect Chat to Art-Studio.
 * Handles session creation, design choice tracking, and image generation requests.
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  CreativeActivitySession,
  CreativeActivityTemplate,
  DesignElement,
  DesignOption,
  DesignStep,
  ActivityMessage,
  ActivityStatus,
  getTemplateById,
  getTemplatesByTheme,
  ALL_ACTIVITY_TEMPLATES,
} from './creative-activity-types';
import { DEFAULT_CHARACTERS } from './child-learning-types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// In-memory session store (for MVP - could move to Redis/DB later)
const activeSessions = new Map<string, CreativeActivitySession>();

// ============================================================================
// Session Management
// ============================================================================

/**
 * Start a new creative activity session
 */
export async function startCreativeActivity(
  userId: string,
  templateId: string,
  characterId?: string
): Promise<{ session: CreativeActivitySession; welcomeMessage: string; firstStep: DesignStep }> {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Activity template not found: ${templateId}`);
  }

  // Get character info
  const character = characterId 
    ? DEFAULT_CHARACTERS[characterId] || DEFAULT_CHARACTERS['steve']
    : DEFAULT_CHARACTERS[template.compatibleCharacters[0]] || DEFAULT_CHARACTERS['steve'];

  const sessionId = uuidv4();
  const now = new Date().toISOString();

  const session: CreativeActivitySession = {
    id: sessionId,
    userId,
    templateId,
    template,
    characterId: character.id,
    characterName: character.name,
    status: 'started',
    currentStepIndex: 0,
    designElements: [],
    conversationHistory: [],
    startedAt: now,
  };

  // Generate welcome message
  const welcomeMessage = generateWelcomeMessage(template, character);
  
  // Add to conversation history
  session.conversationHistory.push({
    role: 'assistant',
    content: welcomeMessage,
    timestamp: now,
  });

  // Store session
  activeSessions.set(sessionId, session);

  // Log activity start
  try {
    await pool.query(`
      INSERT INTO child_learning.activity_logs (
        user_id, activity_type, activity_data, started_at
      ) VALUES ($1, 'creative_activity', $2, NOW())
    `, [userId, JSON.stringify({ templateId, characterId: character.id, sessionId })]);
  } catch (e) {
    console.warn('[Creative Activity] Could not log activity start:', e);
  }

  const firstStep = template.designSteps[0];

  return {
    session,
    welcomeMessage,
    firstStep,
  };
}

/**
 * Process a design choice from the user
 */
export async function processDesignChoice(
  sessionId: string,
  choiceId?: string,
  customValue?: string
): Promise<{
  session: CreativeActivitySession;
  message: string;
  nextStep?: DesignStep;
  isComplete: boolean;
  summary?: string;
}> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const currentStep = session.template.designSteps[session.currentStepIndex];
  if (!currentStep) {
    throw new Error('No current step');
  }

  // Find the selected option or use custom value
  let selectedOption: DesignOption | null = null;
  let designValue: string;
  let promptFragment: string;

  if (choiceId) {
    selectedOption = currentStep.options.find(o => o.id === choiceId) || null;
    if (!selectedOption) {
      throw new Error(`Invalid choice: ${choiceId}`);
    }
    designValue = selectedOption.label;
    promptFragment = selectedOption.promptFragment;
  } else if (customValue && currentStep.allowCustom) {
    designValue = customValue;
    promptFragment = customValue; // Use custom value directly in prompt
  } else {
    throw new Error('No choice provided');
  }

  // Record the design element
  const designElement: DesignElement = {
    type: currentStep.elementType,
    label: currentStep.question,
    value: designValue,
    emoji: selectedOption?.emoji,
    promptFragment,
  };

  session.designElements.push(designElement);

  // Add user choice to conversation
  const now = new Date().toISOString();
  session.conversationHistory.push({
    role: 'user',
    content: selectedOption ? `${selectedOption.emoji} ${selectedOption.label}` : customValue!,
    timestamp: now,
    designElement,
  });

  // Move to next step
  session.currentStepIndex++;
  session.status = 'designing';

  // Check if we're done with all steps
  const isComplete = session.currentStepIndex >= session.template.designSteps.length;

  let message: string;
  let nextStep: DesignStep | undefined;
  let summary: string | undefined;

  if (isComplete) {
    session.status = 'reviewing';
    summary = generateDesignSummary(session);
    message = generateCompletionMessage(session, summary);
  } else {
    nextStep = session.template.designSteps[session.currentStepIndex];
    message = generateTransitionMessage(session, currentStep, nextStep, selectedOption);
  }

  // Add assistant response to conversation
  session.conversationHistory.push({
    role: 'assistant',
    content: message,
    timestamp: new Date().toISOString(),
  });

  // Update session
  activeSessions.set(sessionId, session);

  return {
    session,
    message,
    nextStep,
    isComplete,
    summary,
  };
}

/**
 * Generate the final image for a completed activity
 */
export async function generateActivityImage(
  sessionId: string
): Promise<{
  session: CreativeActivitySession;
  prompt: string;
  imageUrl?: string;
  error?: string;
}> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status !== 'reviewing') {
    throw new Error('Activity not ready for image generation');
  }

  // Build the final prompt from design elements
  const prompt = buildImagePrompt(session);
  session.finalPrompt = prompt;
  session.status = 'generating';
  activeSessions.set(sessionId, session);

  console.log('[Creative Activity] Generated prompt:', prompt);

  return {
    session,
    prompt,
  };
}

/**
 * Update session with generated image result
 */
export async function completeActivityWithImage(
  sessionId: string,
  imageUrl: string,
  imageId?: string
): Promise<CreativeActivitySession> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  session.status = 'completed';
  session.generatedImageUrl = imageUrl;
  session.generatedImageId = imageId;
  session.completedAt = new Date().toISOString();

  // Add completion message
  session.conversationHistory.push({
    role: 'assistant',
    content: generateImageReadyMessage(session),
    timestamp: new Date().toISOString(),
  });

  activeSessions.set(sessionId, session);

  // Log completion
  try {
    await pool.query(`
      UPDATE child_learning.activity_logs
      SET completed_at = NOW(), 
          activity_data = activity_data || $1::jsonb
      WHERE user_id = $2 
        AND activity_type = 'creative_activity'
        AND activity_data->>'sessionId' = $3
    `, [
      JSON.stringify({ imageUrl, imageId, finalPrompt: session.finalPrompt }),
      session.userId,
      sessionId,
    ]);
  } catch (e) {
    console.warn('[Creative Activity] Could not log completion:', e);
  }

  return session;
}

/**
 * Cancel an activity session
 */
export function cancelActivity(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.status = 'cancelled';
    activeSessions.set(sessionId, session);
  }
}

/**
 * Get an active session
 */
export function getSession(sessionId: string): CreativeActivitySession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Get available activities for a theme
 */
export function getAvailableActivities(theme: string): CreativeActivityTemplate[] {
  return getTemplatesByTheme(theme);
}

/**
 * Get all activity templates
 */
export function getAllActivities(): CreativeActivityTemplate[] {
  return ALL_ACTIVITY_TEMPLATES;
}

// ============================================================================
// Message Generation
// ============================================================================

function generateWelcomeMessage(
  template: CreativeActivityTemplate,
  character: { name: string; emoji: string; greetings: string[] }
): string {
  const greeting = character.greetings[Math.floor(Math.random() * character.greetings.length)];
  const firstStep = template.designSteps[0];
  
  return `${greeting}\n\n${template.emoji} **${template.name}**\n\n${template.description}\n\n${firstStep.characterPrompt}`;
}

function generateTransitionMessage(
  session: CreativeActivitySession,
  currentStep: DesignStep,
  nextStep: DesignStep,
  selectedOption: DesignOption | null
): string {
  const character = DEFAULT_CHARACTERS[session.characterId];
  const catchphrase = character?.catchphrases?.[Math.floor(Math.random() * (character.catchphrases?.length || 1))] || 'Great!';
  
  const acknowledgment = selectedOption 
    ? `${selectedOption.emoji} ${catchphrase} ${selectedOption.label} is an awesome choice!`
    : `${catchphrase} I love that idea!`;

  return `${acknowledgment}\n\n${nextStep.characterPrompt}`;
}

function generateDesignSummary(session: CreativeActivitySession): string {
  const lines = session.designElements.map(el => 
    `• **${el.value}** ${el.emoji || ''}`
  );
  
  return `Here's what we're creating:\n\n${lines.join('\n')}`;
}

function generateCompletionMessage(session: CreativeActivitySession, summary: string): string {
  const character = DEFAULT_CHARACTERS[session.characterId];
  const celebration = character?.catchphrases?.[0] || 'Amazing!';
  
  return `🎉 ${celebration} Your design is complete!\n\n${summary}\n\n**Ready to create your ${session.template.emoji} ${session.template.name}?**\n\nClick "Generate Image" to bring your creation to life!`;
}

function generateImageReadyMessage(session: CreativeActivitySession): string {
  const character = DEFAULT_CHARACTERS[session.characterId];
  const celebration = character?.catchphrases?.[Math.floor(Math.random() * (character.catchphrases?.length || 1))] || 'Wow!';
  
  return `🎨 ${celebration} Your ${session.template.name} is ready!\n\nI created this just for you based on all your awesome design choices. You can save it to your gallery or share it with your family!`;
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildImagePrompt(session: CreativeActivitySession): string {
  const template = session.template;
  
  // Collect all prompt fragments
  const fragments: Record<string, string> = {};
  
  for (const element of session.designElements) {
    // Map element type to template placeholder
    const placeholderKey = element.type;
    fragments[placeholderKey] = element.promptFragment;
  }

  // Build prompt from template
  let prompt = template.promptTemplate;
  
  // Replace placeholders with collected fragments
  for (const [key, value] of Object.entries(fragments)) {
    prompt = prompt.replace(`{${key}}`, value);
  }
  
  // Remove any unreplaced placeholders
  prompt = prompt.replace(/\{[^}]+\}/g, '');
  
  // Clean up extra commas and spaces
  prompt = prompt.replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim();
  
  // Add style-specific additions
  if (template.imageSettings.additionalPrompt) {
    prompt = `${prompt}, ${template.imageSettings.additionalPrompt}`;
  }

  return prompt;
}

// ============================================================================
// Cleanup
// ============================================================================

// Clean up old sessions periodically (sessions older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  for (const [sessionId, session] of activeSessions.entries()) {
    const startedAt = new Date(session.startedAt).getTime();
    if (startedAt < oneHourAgo && session.status !== 'completed') {
      activeSessions.delete(sessionId);
    }
  }
}, 15 * 60 * 1000); // Run every 15 minutes
