/**
 * PIC Character Context Provider
 * 
 * Provides AI characters with access to child's PIC data for personalized,
 * motivating interactions. Characters can reference:
 * - Recent activities and achievements
 * - Current goals and progress
 * - Favorite topics and interests
 * - Past conversations and memorable moments
 */

import { Pool } from 'pg';
import { getKidsPICService, KidsPICService } from './KidsPICService';

// ============================================================================
// Types
// ============================================================================

export interface CharacterContextOptions {
  characterId: string;
  characterName: string;
  characterPersonality?: string;
  includeProgress?: boolean;
  includeAchievements?: boolean;
  includeGoals?: boolean;
  includeRecentActivities?: boolean;
  includeInterests?: boolean;
  includeMemorableMoments?: boolean;
  maxActivities?: number;
}

export interface CharacterContext {
  childName: string;
  ageGroup: string;
  gradeLevel?: string;
  interests: string[];
  favoriteTopics: string[];
  currentGoals: GoalSummary[];
  recentProgress: ProgressSummary[];
  recentAchievements: AchievementSummary[];
  recentActivities: ActivitySummary[];
  characterRelationship: CharacterRelationship | null;
  motivationalContext: string;
}

interface GoalSummary {
  title: string;
  category: string;
  progress: number;
  status: string;
}

interface ProgressSummary {
  category: string;
  metric: string;
  value: number;
  streak: number;
  bestStreak: number;
}

interface AchievementSummary {
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

interface ActivitySummary {
  type: string;
  category: string;
  title: string;
  timestamp: Date;
}

interface CharacterRelationship {
  interactionCount: number;
  lastInteraction: Date;
  favoriteTopics: string[];
  memorableMoments: string[];
  relationshipLevel: 'new' | 'familiar' | 'friend' | 'bestFriend';
}

// ============================================================================
// Main Class
// ============================================================================

export class PICCharacterContext {
  private picService: KidsPICService;

  constructor(pool: Pool) {
    this.picService = getKidsPICService(pool);
  }

  /**
   * Get context for a character to use in conversation
   */
  async getCharacterContext(
    childId: string,
    options: CharacterContextOptions
  ): Promise<CharacterContext> {
    const profile = await this.picService.getOrCreateProfile(childId);
    
    if (!profile) {
      throw new Error('Child profile not found');
    }

    // Get character-specific relationship
    const characterRelationship = await this.getCharacterRelationship(
      childId,
      options.characterId
    );

    // Build context based on options
    const context: CharacterContext = {
      childName: profile.displayName || 'friend',
      ageGroup: profile.ageGroup || 'middle',
      gradeLevel: profile.gradeLevel,
      interests: profile.interests || [],
      favoriteTopics: profile.favoriteTopics || [],
      currentGoals: [],
      recentProgress: [],
      recentAchievements: [],
      recentActivities: [],
      characterRelationship,
      motivationalContext: '',
    };

    // Fetch additional data based on options
    if (options.includeGoals !== false) {
      context.currentGoals = (profile.currentGoals || []).map((g: any) => ({
        title: g.title,
        category: g.category,
        progress: g.progress,
        status: g.status,
      }));
    }

    if (options.includeProgress !== false) {
      const progress = await this.picService.getProgress(childId);
      context.recentProgress = progress.slice(0, 5).map((p: any) => ({
        category: p.category,
        metric: p.metricName,
        value: p.currentValue,
        streak: p.streakCount,
        bestStreak: p.bestStreak,
      }));
    }

    if (options.includeAchievements !== false) {
      const achievements = await this.picService.getAchievements(childId);
      context.recentAchievements = achievements.slice(0, 3).map((a: any) => ({
        title: a.title,
        description: a.description,
        icon: a.icon,
        earnedAt: a.earnedAt,
      }));
    }

    if (options.includeRecentActivities !== false) {
      const activities = await this.picService.getRecentActivities(
        childId,
        options.maxActivities || 5
      );
      context.recentActivities = activities.map((a: any) => ({
        type: a.activityType,
        category: a.activityCategory,
        title: a.title,
        timestamp: a.createdAt,
      }));
    }

    // Generate motivational context
    context.motivationalContext = this.generateMotivationalContext(context, options);

    return context;
  }

  /**
   * Get the relationship between a character and child
   */
  private async getCharacterRelationship(
    childId: string,
    characterId: string
  ): Promise<CharacterRelationship | null> {
    const interactions = await this.picService.getCharacterInteractions(childId);
    const characterInteraction = interactions.find(
      (i: any) => i.characterId === characterId
    );

    if (!characterInteraction) {
      return null;
    }

    // Determine relationship level based on interaction count
    let relationshipLevel: CharacterRelationship['relationshipLevel'] = 'new';
    if (characterInteraction.totalInteractions >= 20) {
      relationshipLevel = 'bestFriend';
    } else if (characterInteraction.totalInteractions >= 10) {
      relationshipLevel = 'friend';
    } else if (characterInteraction.totalInteractions >= 3) {
      relationshipLevel = 'familiar';
    }

    return {
      interactionCount: characterInteraction.totalInteractions,
      lastInteraction: characterInteraction.lastInteractionAt as Date,
      favoriteTopics: characterInteraction.favoriteTopics || [],
      memorableMoments: (characterInteraction.memorableMoments || []).map(m => m.summary),
      relationshipLevel,
    };
  }

  /**
   * Generate motivational context for the character
   */
  private generateMotivationalContext(
    context: CharacterContext,
    options: CharacterContextOptions
  ): string {
    const parts: string[] = [];

    // Relationship-based greeting context
    if (context.characterRelationship) {
      const rel = context.characterRelationship;
      if (rel.relationshipLevel === 'bestFriend') {
        parts.push(`You and ${context.childName} are best friends! You've talked ${rel.interactionCount} times.`);
      } else if (rel.relationshipLevel === 'friend') {
        parts.push(`You and ${context.childName} are becoming good friends.`);
      } else if (rel.relationshipLevel === 'familiar') {
        parts.push(`You've met ${context.childName} a few times before.`);
      }

      if (rel.favoriteTopics.length > 0) {
        parts.push(`You often talk about: ${rel.favoriteTopics.slice(0, 3).join(', ')}.`);
      }

      if (rel.memorableMoments.length > 0) {
        parts.push(`Memorable moment: "${rel.memorableMoments[0]}"`);
      }
    }

    // Recent achievements to celebrate
    if (context.recentAchievements.length > 0) {
      const recent = context.recentAchievements[0];
      const daysSince = Math.floor(
        (Date.now() - new Date(recent.earnedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince <= 3) {
        parts.push(`${context.childName} recently earned "${recent.title}"! Celebrate this!`);
      }
    }

    // Progress streaks to encourage
    const activeStreaks = context.recentProgress.filter(p => p.streak >= 3);
    if (activeStreaks.length > 0) {
      const best = activeStreaks.reduce((a, b) => a.streak > b.streak ? a : b);
      parts.push(`${context.childName} has a ${best.streak}-day streak in ${best.category}! Encourage them to keep going!`);
    }

    // Goals to check on
    const activeGoals = context.currentGoals.filter(g => g.status === 'active');
    if (activeGoals.length > 0) {
      const goal = activeGoals[0];
      if (goal.progress >= 75) {
        parts.push(`${context.childName} is ${goal.progress}% done with "${goal.title}"! Almost there!`);
      } else if (goal.progress >= 50) {
        parts.push(`${context.childName} is halfway through "${goal.title}". Encourage them!`);
      }
    }

    // Recent activities to reference
    if (context.recentActivities.length > 0) {
      const recent = context.recentActivities[0];
      const hoursSince = Math.floor(
        (Date.now() - new Date(recent.timestamp).getTime()) / (1000 * 60 * 60)
      );
      if (hoursSince <= 24) {
        parts.push(`${context.childName} recently worked on "${recent.title}" in ${recent.category}.`);
      }
    }

    // Interests to incorporate
    if (context.interests.length > 0) {
      parts.push(`${context.childName}'s interests: ${context.interests.slice(0, 3).join(', ')}.`);
    }

    return parts.join(' ');
  }

  /**
   * Generate a system prompt addition for character AI
   */
  async generateCharacterSystemPrompt(
    childId: string,
    options: CharacterContextOptions
  ): Promise<string> {
    const context = await this.getCharacterContext(childId, options);

    let prompt = `\n\n## CHILD CONTEXT (Use this to personalize your responses)\n`;
    prompt += `Child's name: ${context.childName}\n`;
    prompt += `Age group: ${context.ageGroup}\n`;
    
    if (context.gradeLevel) {
      prompt += `Grade: ${context.gradeLevel}\n`;
    }

    if (context.interests.length > 0) {
      prompt += `Interests: ${context.interests.join(', ')}\n`;
    }

    if (context.characterRelationship) {
      const rel = context.characterRelationship;
      prompt += `\n### Your Relationship with ${context.childName}\n`;
      prompt += `- Relationship level: ${rel.relationshipLevel}\n`;
      prompt += `- Times talked: ${rel.interactionCount}\n`;
      if (rel.favoriteTopics.length > 0) {
        prompt += `- Topics you discuss: ${rel.favoriteTopics.join(', ')}\n`;
      }
      if (rel.memorableMoments.length > 0) {
        prompt += `- Memorable moments: ${rel.memorableMoments.slice(0, 2).join('; ')}\n`;
      }
    }

    if (context.recentAchievements.length > 0) {
      prompt += `\n### Recent Achievements (celebrate these!)\n`;
      context.recentAchievements.forEach(a => {
        prompt += `- ${a.icon} ${a.title}: ${a.description}\n`;
      });
    }

    if (context.currentGoals.length > 0) {
      prompt += `\n### Current Goals (encourage progress)\n`;
      context.currentGoals.forEach(g => {
        prompt += `- ${g.title} (${g.progress}% complete)\n`;
      });
    }

    if (context.recentProgress.length > 0) {
      const streaks = context.recentProgress.filter(p => p.streak >= 2);
      if (streaks.length > 0) {
        prompt += `\n### Active Streaks (keep them motivated!)\n`;
        streaks.forEach(p => {
          prompt += `- ${p.category}: ${p.streak}-day streak\n`;
        });
      }
    }

    if (context.motivationalContext) {
      prompt += `\n### Motivational Notes\n${context.motivationalContext}\n`;
    }

    prompt += `\n### Guidelines\n`;
    prompt += `- Use ${context.childName}'s name naturally in conversation\n`;
    prompt += `- Reference their interests and recent activities when relevant\n`;
    prompt += `- Celebrate achievements and encourage goal progress\n`;
    prompt += `- Build on your relationship history with them\n`;
    prompt += `- Be encouraging, supportive, and age-appropriate\n`;

    return prompt;
  }
}

// Singleton instance
let picCharacterContext: PICCharacterContext | null = null;

export function getPICCharacterContext(pool: Pool): PICCharacterContext {
  if (!picCharacterContext) {
    picCharacterContext = new PICCharacterContext(pool);
  }
  return picCharacterContext;
}

export default PICCharacterContext;
