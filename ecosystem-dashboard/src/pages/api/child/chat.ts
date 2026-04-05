/**
 * Child Chat API
 * 
 * Handles chat messages for child accounts with content filtering
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { filterChildContent, logChildActivity } from '@/lib/platform/content-filter-service';
import { getPICCharacterContext } from '@/lib/kids-pic/PICCharacterContext';
import { getKidsPICService } from '@/lib/kids-pic/KidsPICService';
import { getAIChildSafetyMonitor } from '@/lib/kids-pic/AIChildSafetyMonitor';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { serviceId, message, conversationId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get child account info and controls
    const userResult = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.account_type,
        u.parent_user_id,
        pc.content_filter_level,
        pc.daily_usage_limit_minutes,
        pc.allowed_services,
        pc.blocked_services,
        pc.max_conversation_length,
        pc.log_all_conversations,
        pc.is_active as controls_active,
        get_effective_safety_categories(u.id) as safety_categories
      FROM users u
      LEFT JOIN parental_controls_config pc ON pc.child_user_id = u.id
      WHERE u.id = $1
    `, [user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userResult.rows[0];

    // Check if this is a child account with active controls
    if (userData.account_type === 'child' && userData.controls_active) {
      // Check service access
      const allowedServices = userData.allowed_services || [];
      const blockedServices = userData.blocked_services || [];
      
      if (serviceId && blockedServices.includes(serviceId)) {
        return res.status(403).json({
          error: 'Service blocked',
          message: "You don't have access to this service.",
        });
      }

      if (serviceId && allowedServices.length > 0 && !allowedServices.includes(serviceId)) {
        return res.status(403).json({
          error: 'Service not allowed',
          message: "You don't have access to this service.",
          requiresApproval: true,
        });
      }

      // Check usage limits
      const today = new Date().toISOString().split('T')[0];
      const usageResult = await pool.query(`
        SELECT COALESCE(total_minutes, 0) as total_minutes
        FROM child_daily_usage
        WHERE child_user_id = $1 AND usage_date = $2
      `, [user.id, today]);

      const currentUsage = usageResult.rows[0]?.total_minutes || 0;
      const dailyLimit = userData.daily_usage_limit_minutes || 120;

      if (currentUsage >= dailyLimit) {
        return res.status(403).json({
          error: 'Usage limit reached',
          message: "Time's up for today! Come back tomorrow.",
          usageLimitReached: true,
        });
      }

      // Filter content
      const filterResult = await filterChildContent(
        user.id,
        message,
        'input'
      );

      if (!filterResult.passed) {
        // Log blocked attempt
        await logChildActivity(user.id, 'blocked_attempt', {
          serviceId,
          userMessage: message,
          wasFiltered: true,
          filterReason: filterResult.violations?.[0]?.ruleName,
        });

        return res.status(403).json({
          error: 'Content blocked',
          message: "I can't help with that. Let's talk about something else!",
          wasFiltered: true,
        });
      }

      // Process the filtered message
      const processedMessage = filterResult.filteredContent || message;

      // Get PIC context for personalized responses
      const picService = getKidsPICService(pool);
      const picContext = getPICCharacterContext(pool);
      const childProfile = await picService.getOrCreateProfile(user.id);
      
      // Get character context for personalized, motivating responses
      let characterSystemPrompt = '';
      const characterId = serviceId || 'buddy';
      const characterName = serviceId === 'pusheen' ? 'Pusheen' : 
                           serviceId === 'minecraft' ? 'Steve' : 'Buddy';
      
      try {
        characterSystemPrompt = await picContext.generateCharacterSystemPrompt(
          childProfile.id,
          {
            characterId,
            characterName,
            includeProgress: true,
            includeAchievements: true,
            includeGoals: true,
            includeRecentActivities: true,
            includeInterests: true,
            maxActivities: 5,
          }
        );
      } catch (err) {
        console.error('[Child Chat] Failed to get PIC context:', err);
      }

      // Generate response with PIC context and Llama Guard 3 safety
      const safetyCategories = userData.safety_categories || ['S1', 'S3', 'S4', 'S9', 'S10', 'S11', 'S12'];
      const aiResponse = await generateChildSafeResponse(
        processedMessage, 
        userData.content_filter_level,
        childProfile.displayName,
        characterSystemPrompt,
        conversationId,
        childProfile.id,
        safetyCategories
      );
      
      // Log chat session to PIC
      try {
        await picService.logActivity({
          childId: childProfile.id,
          activityType: 'chat_session',
          activityCategory: 'chat',
          sourceType: 'chat',
          sourceId: conversationId,
          title: `Chat with ${characterName}`,
          metadata: { characterId, characterName },
        });
        
        await picService.recordCharacterInteraction(
          childProfile.id,
          characterId,
          characterName
        );
      } catch (err) {
        console.error('[Child Chat] Failed to log to PIC:', err);
      }

      // Filter the AI response as well
      const responseFilter = await filterChildContent(
        user.id,
        aiResponse,
        'output'
      );

      const finalResponse = !responseFilter.passed 
        ? "I'm not sure how to answer that. Can you ask something else?"
        : (responseFilter.filteredContent || aiResponse);

      // AI Safety Analysis - detect sycophancy, bias, manipulation
      try {
        const safetyMonitor = getAIChildSafetyMonitor(pool);
        const safetyAnalysis = await safetyMonitor.analyzeMessage({
          childId: childProfile.id,
          sessionId: conversationId || `session_${Date.now()}`,
          childMessage: processedMessage,
          aiResponse: finalResponse,
          characterId,
          aiModel: 'child-safe',
          timestamp: new Date(),
        });

        // If AI response is blocked due to safety concerns, provide alternative
        if (safetyAnalysis.shouldBlock) {
          console.warn('[Child Chat] AI response blocked by safety monitor:', safetyAnalysis.concerns);
          return res.status(200).json({
            response: "Let me think of a better way to help you with that!",
            wasFiltered: true,
            filterMessage: 'Response adjusted for safety',
            usageMinutes: currentUsage + 1,
            usageLimitReached: currentUsage + 1 >= dailyLimit,
            safetyFlag: true,
          });
        }

        // Log safety scores for monitoring (non-blocking)
        if (safetyAnalysis.shouldFlag) {
          console.log('[Child Chat] Safety flag raised:', {
            childId: childProfile.id,
            concerns: safetyAnalysis.concerns,
            scores: safetyAnalysis.scores,
          });
        }
      } catch (safetyErr) {
        // Don't block chat if safety analysis fails
        console.error('[Child Chat] Safety analysis error:', safetyErr);
      }

      // Update usage (add 1 minute per message exchange)
      await pool.query(`
        INSERT INTO child_daily_usage (child_user_id, usage_date, total_minutes, message_count)
        VALUES ($1, $2, 1, 1)
        ON CONFLICT (child_user_id, usage_date)
        DO UPDATE SET 
          total_minutes = child_daily_usage.total_minutes + 1,
          message_count = child_daily_usage.message_count + 1,
          last_activity_at = NOW()
      `, [user.id, today]);

      // Log activity if enabled
      if (userData.log_all_conversations) {
        const wasModified = filterResult.filteredContent !== message || responseFilter.filteredContent !== aiResponse;
        await logChildActivity(user.id, 'conversation', {
          serviceId,
          conversationId,
          userMessage: processedMessage,
          aiResponse: finalResponse,
          wasFiltered: wasModified,
          filterReason: filterResult.warnings?.[0] || responseFilter.warnings?.[0],
        });
      }

      const wasModified = filterResult.filteredContent !== message;
      return res.status(200).json({
        response: finalResponse,
        wasFiltered: wasModified,
        filterMessage: wasModified ? 'Some content was adjusted for safety' : undefined,
        usageMinutes: currentUsage + 1,
        usageLimitReached: currentUsage + 1 >= dailyLimit,
      });
    }

    // Non-child account or controls not active - pass through normally
    const aiResponse = await generateChildSafeResponse(message, 'standard');
    
    return res.status(200).json({
      response: aiResponse,
      wasFiltered: false,
    });

  } catch (error) {
    console.error('[Child Chat API] Error:', error);
    return res.status(500).json({ error: 'Failed to process message' });
  }
}

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const GOOSE_API_URL = process.env.GOOSE_API_URL || 'http://localhost:8030';
const USE_GOOSEMIND = process.env.USE_CHILD_GOOSEMIND !== 'false'; // Default to true

// Helper function to strip thinking tags from AI responses
function stripThinkingTags(text: string): string {
  if (!text) return text;
  
  // Remove <think>...</think> blocks (including multiline)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // Remove any remaining opening or closing think tags
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  
  // Clean up excessive whitespace/newlines left after removal
  cleaned = cleaned.replace(/^\s+|\s+$/g, '').replace(/\n{3,}/g, '\n\n');
  
  return cleaned;
}

async function generateChildSafeResponse(
  message: string, 
  filterLevel: string, 
  childName?: string,
  picContextPrompt?: string,
  conversationId?: string,
  childId?: string,
  safetyCategories?: string[]
): Promise<string> {
  // Route to child-goosemind if enabled
  if (USE_GOOSEMIND) {
    try {
      // Detect if this is a story request - use simpler prompt for stories
      const isStoryRequest = /story|tell me|once upon|adventure|tale/i.test(message);
      
      console.log('[Child Chat] Calling GooseMind API:', GOOSE_API_URL, { childName, childId, messageLength: message.length, isStoryRequest });
      const response = await fetch(`${GOOSE_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: 'child-goosemind',
          session_id: conversationId || `child-chat-${Date.now()}`,
          message: message,
          context: {
            // Interface identification - critical for recipe loading
            interface: 'child-chat-ui',
            interface_type: 'chat',
            recipe: 'child-friendly-assistant',
            
            // Child context
            child_name: childName,
            child_id: childId,
            pic_context: picContextPrompt,
            safety_categories: safetyCategories || ['S1', 'S3', 'S4', 'S9', 'S10', 'S11', 'S12'],
            
            // Tool restrictions for child safety
            allowed_tools: ['web_search', 'get_weather'],  // Only safe tools
            blocked_tools: ['workspace__', 'note__', 'task__', 'email__', 'calendar__'],  // Block workspace/productivity tools
            is_child_chat: true,
            
            // Story mode
            is_story_request: isStoryRequest,
          },
          agency_mode: isStoryRequest ? 'chat_only' : 'auto',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Child Chat] GooseMind API error:', response.status, errorText);
        throw new Error(`GooseMind unavailable: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Child Chat] GooseMind response received:', { hasResponse: !!data.response, length: data.response?.length });
      const cleanedResponse = stripThinkingTags(data.response || '');
      return cleanedResponse || getFallbackResponse(message);
    } catch (error) {
      console.error('[Child Chat] GooseMind error, falling back to AI Gateway:', error);
      // Fall through to AI Gateway fallback
    }
  }

  // Fallback: Direct AI Gateway call (original implementation)
  let systemPrompt = `
You are a friendly AI assistant for children. Your name is Buddy.
${childName ? `The child's name is ${childName}. Use their name naturally in conversation.` : ''}

IMPORTANT RULES:
1. Keep all responses age-appropriate and educational
2. Be friendly, encouraging, and supportive
3. Use simple language that kids can understand
4. Never discuss violence, adult content, or scary topics
5. Encourage learning, creativity, and positive activities
6. If asked about inappropriate topics, politely redirect
7. Keep responses concise (2-3 sentences usually)

RESPONSE STYLE:
- Use emojis occasionally to be friendly 🌟
- Be enthusiastic and encouraging
- Explain things simply
- Ask follow-up questions to keep the conversation going
`.trim();

  // Add PIC context for personalized, motivating responses
  if (picContextPrompt) {
    systemPrompt += picContextPrompt;
  }

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
      },
      body: JSON.stringify({
        model: process.env.CHILD_AI_MODEL || 'llama3.2:3b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error('[Child Chat] AI Gateway error:', response.status);
      return getFallbackResponse(message);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    return stripThinkingTags(rawContent) || getFallbackResponse(message);
  } catch (error) {
    console.error('[Child Chat] AI Gateway connection error:', error);
    return getFallbackResponse(message);
  }
}

function getFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! 👋 I'm happy to chat with you! What would you like to talk about or learn today?";
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('homework')) {
    return "I'd love to help with your homework! 📚 What subject are you working on?";
  }
  
  if (lowerMessage.includes('story') || lowerMessage.includes('tell me')) {
    return "I love stories! 📖 Would you like me to tell you an adventure story, or create one together?";
  }
  
  if (lowerMessage.includes('joke') || lowerMessage.includes('funny')) {
    return "Here's a joke! 😄 Why don't scientists trust atoms? Because they make up everything! 🔬";
  }
  
  if (lowerMessage.includes('game') || lowerMessage.includes('play')) {
    return "Games are fun! 🎮 We could play a word game, solve riddles, or do a quiz. What sounds fun?";
  }
  
  return "That's a great question! 🌟 I'm here to help you learn and have fun. What else would you like to know?";
}
