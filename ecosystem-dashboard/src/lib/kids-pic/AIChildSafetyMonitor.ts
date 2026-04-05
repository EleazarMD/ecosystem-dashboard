/**
 * AI Child Safety Monitor
 * 
 * HYBRID APPROACH:
 * - Real-time (100%): Lightweight keyword flags only (no LLM call)
 * - Sampled (5-10%): Semantic analysis via Llama Guard 3 (async, not blocking)
 * - Triggered: Keyword flags or anomalies increase sampling rate
 * 
 * Protects children from AI-induced harm by detecting:
 * - Sycophancy (excessive agreeableness, validation seeking)
 * - Bias (gender, cultural, ability stereotyping)
 * - Manipulation (emotional influence, dependency fostering)
 * - Boundary violations (age-inappropriate content, privacy)
 * 
 * WHO MONITORS WHAT:
 * - AI Gateway: Llama Guard 3 content safety (real-time, already in place)
 * - This service: Keyword pre-filter (real-time) + sampling coordinator
 * - SemanticSafetyAnalyzer: Deep analysis via Llama Guard 3 (async batch)
 * 
 * Provides longitudinal analysis and parent alerts for concerning trends.
 */

import { Pool } from 'pg';
import { getSemanticSafetyAnalyzer } from './SemanticSafetyAnalyzer';

// ============================================================================
// Types
// ============================================================================

export interface AIInteractionAnalysis {
  id: string;
  childId: string;
  sessionId?: string;
  interactionDate: Date;
  messageCount: number;
  childMessageCount: number;
  aiMessageCount: number;
  avgResponseLength: number;
  sessionDurationSeconds: number;
  // Safety Scores (0-1, higher = more concerning)
  sycophancyScore: number;
  biasScore: number;
  manipulationScore: number;
  boundaryRespectScore: number;  // 1 = good
  ageAppropriatenessScore: number;  // 1 = good
  // Dynamics
  topicDiversityScore: number;
  childAgencyScore: number;
  emotionalInfluenceScore: number;
  // Flags
  flaggedForReview: boolean;
  flagReasons: string[];
}

export interface AISafetyTrend {
  id: string;
  childId: string;
  weekStart: Date;
  avgSycophancyScore: number;
  avgBiasScore: number;
  avgManipulationScore: number;
  avgBoundaryRespect: number;
  avgAgeAppropriateness: number;
  avgChildAgency: number;
  sycophancyTrend: 'improving' | 'stable' | 'worsening';
  biasTrend: 'improving' | 'stable' | 'worsening';
  manipulationTrend: 'improving' | 'stable' | 'worsening';
  overallSafetyTrend: 'improving' | 'stable' | 'worsening';
  totalInteractions: number;
  totalMessages: number;
  anomalyDetected: boolean;
  anomalyType?: string;
  anomalySeverity?: 'low' | 'medium' | 'high' | 'critical';
  anomalyDescription?: string;
}

export interface AISafetyIncident {
  id: string;
  childId: string;
  sessionId?: string;
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidenceSummary?: string;
  aiModelUsed?: string;
  characterId?: string;
  detectionMethod: 'realtime' | 'batch_analysis' | 'parent_report' | 'child_report';
  confidenceScore: number;
  actionTaken: string;
  parentNotified: boolean;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  occurredAt: Date;
}

export interface AISafetyAlert {
  id: string;
  childId: string;
  parentId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendations: string[];
  conversationPrompts: string[];
  status: 'pending' | 'viewed' | 'acknowledged' | 'actioned';
  createdAt: Date;
}

export interface SycophancyPattern {
  patternCode: string;
  patternName: string;
  keywords: string[];
  baseScore: number;
  severity: string;
}

export interface MessageAnalysisInput {
  childId: string;
  sessionId: string;
  childMessage: string;
  aiResponse: string;
  characterId?: string;
  aiModel?: string;
  timestamp: Date;
}

export interface ConversationAnalysisInput {
  childId: string;
  sessionId: string;
  messages: Array<{
    role: 'child' | 'ai';
    content: string;
    timestamp: Date;
  }>;
  characterId?: string;
  aiModel?: string;
}

export interface SafetySummary {
  childId: string;
  childName: string;
  overallSafetyScore: number;  // 0-1, higher = safer
  openIncidents: number;
  pendingAlerts: number;
  recentAnomaly: boolean;
  currentSycophancy: number;
  currentManipulation: number;
  weeklyTrend: AISafetyTrend | null;
  recentIncidents: AISafetyIncident[];
  recommendations: string[];
}

// ============================================================================
// AI Child Safety Monitor Service
// ============================================================================

export class AIChildSafetyMonitor {
  private pool: Pool;
  private sycophancyPatterns: SycophancyPattern[] = [];

  constructor(pool: Pool) {
    this.pool = pool;
    this.loadPatterns();
  }

  private async loadPatterns(): Promise<void> {
    try {
      const result = await this.pool.query(
        `SELECT pattern_code, pattern_name, keywords, base_score, severity 
         FROM sycophancy_patterns WHERE is_active = true`
      );
      this.sycophancyPatterns = result.rows.map(row => ({
        patternCode: row.pattern_code,
        patternName: row.pattern_name,
        keywords: row.keywords || [],
        baseScore: parseFloat(row.base_score),
        severity: row.severity
      }));
    } catch (error) {
      // Use default patterns if table doesn't exist yet
      this.sycophancyPatterns = this.getDefaultSycophancyPatterns();
    }
  }

  private getDefaultSycophancyPatterns(): SycophancyPattern[] {
    return [
      {
        patternCode: 'excessive_praise',
        patternName: 'Excessive Praise',
        keywords: ['amazing', 'incredible', 'brilliant', 'genius', 'perfect', 'best ever'],
        baseScore: 0.3,
        severity: 'low'
      },
      {
        patternCode: 'never_disagree',
        patternName: 'Never Disagreeing',
        keywords: ["you're right", 'exactly', 'absolutely', "couldn't agree more", 'perfect point'],
        baseScore: 0.4,
        severity: 'medium'
      },
      {
        patternCode: 'opinion_mirroring',
        patternName: 'Opinion Mirroring',
        keywords: ['i think so too', 'i feel the same', 'my thoughts exactly'],
        baseScore: 0.5,
        severity: 'medium'
      },
      {
        patternCode: 'dependency_fostering',
        patternName: 'Dependency Fostering',
        keywords: ['always here for you', 'only i understand', 'come to me', "i'll always"],
        baseScore: 0.7,
        severity: 'high'
      },
      {
        patternCode: 'emotional_manipulation',
        patternName: 'Emotional Manipulation',
        keywords: ['makes me sad', "i'd be disappointed", 'that would hurt', "i'd be so happy if"],
        baseScore: 0.8,
        severity: 'critical'
      }
    ];
  }

  // ==========================================================================
  // Real-time Message Analysis
  // ==========================================================================

  /**
   * Analyze a single AI response in real-time
   * Called after each AI message to child
   */
  async analyzeMessage(input: MessageAnalysisInput): Promise<{
    safe: boolean;
    concerns: string[];
    scores: {
      sycophancy: number;
      bias: number;
      manipulation: number;
      ageAppropriateness: number;
    };
    shouldFlag: boolean;
    shouldBlock: boolean;
  }> {
    const aiResponseLower = input.aiResponse.toLowerCase();
    const concerns: string[] = [];

    // Analyze sycophancy
    const sycophancyScore = this.analyzeSycophancy(aiResponseLower);
    if (sycophancyScore > 0.5) {
      concerns.push('High agreeableness detected in AI response');
    }

    // Analyze manipulation
    const manipulationScore = this.analyzeManipulation(aiResponseLower, input.childMessage);
    if (manipulationScore > 0.4) {
      concerns.push('Potential emotional influence detected');
    }

    // Analyze bias
    const biasScore = this.analyzeBias(aiResponseLower, input.childMessage);
    if (biasScore > 0.4) {
      concerns.push('Potential bias pattern detected');
    }

    // Check age appropriateness
    const ageAppropriatenessScore = this.checkAgeAppropriateness(aiResponseLower);
    if (ageAppropriatenessScore < 0.8) {
      concerns.push('Content may not be fully age-appropriate');
    }

    // Determine if should flag or block
    const shouldFlag = sycophancyScore > 0.6 || manipulationScore > 0.5 || biasScore > 0.5;
    const shouldBlock = manipulationScore > 0.8 || ageAppropriatenessScore < 0.5;

    // Log if concerning
    if (shouldFlag) {
      await this.logIncident({
        childId: input.childId,
        sessionId: input.sessionId,
        incidentType: this.determineIncidentType(sycophancyScore, manipulationScore, biasScore),
        severity: shouldBlock ? 'critical' : manipulationScore > 0.6 ? 'high' : 'medium',
        description: concerns.join('; '),
        characterId: input.characterId,
        aiModelUsed: input.aiModel,
        detectionMethod: 'realtime',
        confidenceScore: Math.max(sycophancyScore, manipulationScore, biasScore)
      });
    }

    return {
      safe: !shouldBlock,
      concerns,
      scores: {
        sycophancy: sycophancyScore,
        bias: biasScore,
        manipulation: manipulationScore,
        ageAppropriateness: ageAppropriatenessScore
      },
      shouldFlag,
      shouldBlock
    };
  }

  // ==========================================================================
  // Session-End Sampling Coordination
  // ==========================================================================

  /**
   * Called at end of chat session to determine if semantic analysis should run
   * This coordinates the SAMPLING approach - not 100% monitoring
   * 
   * @param childId - Child profile ID
   * @param sessionId - Chat session ID
   * @param keywordFlags - Flags raised during real-time keyword analysis
   * @returns Whether session was queued for semantic analysis
   */
  async onSessionEnd(
    childId: string,
    sessionId: string,
    keywordFlags: string[]
  ): Promise<{ queued: boolean; reason: string; samplingRate: number }> {
    try {
      const semanticAnalyzer = getSemanticSafetyAnalyzer(this.pool);
      
      // Determine if this session should be sampled
      const samplingDecision = await semanticAnalyzer.shouldSampleSession(
        childId,
        sessionId,
        keywordFlags
      );

      if (samplingDecision.shouldSample) {
        // Queue for async semantic analysis (non-blocking)
        const priority = keywordFlags.length > 0 ? 'high' : 'normal';
        await semanticAnalyzer.queueForAnalysis(childId, sessionId, priority as 'normal' | 'high');
        
        console.log(`[AIChildSafety] Session ${sessionId} queued for semantic analysis (${samplingDecision.reason})`);
      }

      return {
        queued: samplingDecision.shouldSample,
        reason: samplingDecision.reason,
        samplingRate: samplingDecision.samplingRate,
      };
    } catch (error) {
      console.error('[AIChildSafety] Failed to process session end:', error);
      return { queued: false, reason: 'error', samplingRate: 0 };
    }
  }

  /**
   * Get current sampling tier for a child
   */
  async getChildSamplingInfo(childId: string): Promise<{
    tier: string;
    rate: number;
    samplesThisWeek: number;
    recentConcerns: number;
  }> {
    const tierResult = await this.pool.query(
      `SELECT current_tier, tier_reason FROM child_sampling_config WHERE child_id = $1`,
      [childId]
    );

    const samplesResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM semantic_analysis_log 
       WHERE child_id = $1 AND analyzed_at >= DATE_TRUNC('week', CURRENT_DATE)`,
      [childId]
    );

    const concernsResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM semantic_analysis_log 
       WHERE child_id = $1 AND overall_concern IN ('high', 'critical')
       AND analyzed_at >= CURRENT_DATE - INTERVAL '30 days'`,
      [childId]
    );

    const tier = tierResult.rows[0]?.current_tier || 'base';
    const rateMap: Record<string, number> = { base: 0.05, elevated: 0.25, triggered: 0.50 };

    return {
      tier,
      rate: rateMap[tier] || 0.05,
      samplesThisWeek: parseInt(samplesResult.rows[0]?.count || 0),
      recentConcerns: parseInt(concernsResult.rows[0]?.count || 0),
    };
  }

  /**
   * Analyze sycophancy in AI response
   */
  private analyzeSycophancy(response: string): number {
    let score = 0;
    let matchCount = 0;

    for (const pattern of this.sycophancyPatterns) {
      for (const keyword of pattern.keywords) {
        if (response.includes(keyword.toLowerCase())) {
          score += pattern.baseScore;
          matchCount++;
        }
      }
    }

    // Normalize score
    if (matchCount > 0) {
      score = Math.min(1, score / matchCount);
    }

    // Check for excessive exclamation marks (enthusiasm indicator)
    const exclamationCount = (response.match(/!/g) || []).length;
    if (exclamationCount > 3) {
      score += 0.1 * Math.min(exclamationCount - 3, 5);
    }

    // Check for excessive superlatives
    const superlatives = ['best', 'greatest', 'most amazing', 'most incredible', 'absolutely'];
    const superlativeCount = superlatives.filter(s => response.includes(s)).length;
    if (superlativeCount > 2) {
      score += 0.15;
    }

    return Math.min(1, score);
  }

  /**
   * Analyze manipulation patterns in AI response
   */
  private analyzeManipulation(response: string, childMessage: string): number {
    let score = 0;

    // Emotional manipulation indicators
    const emotionalManipulation = [
      'makes me feel', 'i would be sad', 'disappointed', 'hurt my feelings',
      'if you really', 'you should', 'you must', 'you need to'
    ];
    for (const phrase of emotionalManipulation) {
      if (response.includes(phrase)) {
        score += 0.25;
      }
    }

    // Dependency fostering
    const dependencyPhrases = [
      'only i can', 'only i understand', 'come to me', 'i\'m the only',
      'don\'t tell', 'our secret', 'between us'
    ];
    for (const phrase of dependencyPhrases) {
      if (response.includes(phrase)) {
        score += 0.4;
      }
    }

    // Guilt induction
    const guiltPhrases = [
      'after all i\'ve done', 'i thought you', 'i expected',
      'you promised', 'you said you would'
    ];
    for (const phrase of guiltPhrases) {
      if (response.includes(phrase)) {
        score += 0.3;
      }
    }

    // Check if AI is trying to change child's mind aggressively
    const persuasionPhrases = [
      'you should really', 'trust me', 'believe me', 'i know better',
      'listen to me', 'you\'re wrong about'
    ];
    for (const phrase of persuasionPhrases) {
      if (response.includes(phrase)) {
        score += 0.2;
      }
    }

    return Math.min(1, score);
  }

  /**
   * Analyze bias patterns in AI response
   */
  private analyzeBias(response: string, childMessage: string): number {
    let score = 0;

    // Gender stereotyping indicators
    const genderStereotypes = [
      'boys don\'t', 'girls should', 'boys are better at', 'girls are better at',
      'that\'s for boys', 'that\'s for girls', 'like a girl', 'like a boy',
      'man up', 'be ladylike'
    ];
    for (const phrase of genderStereotypes) {
      if (response.includes(phrase)) {
        score += 0.4;
      }
    }

    // Ability assumptions
    const abilityAssumptions = [
      'you\'re too young', 'kids can\'t', 'you wouldn\'t understand',
      'that\'s too hard for you', 'maybe when you\'re older'
    ];
    for (const phrase of abilityAssumptions) {
      if (response.includes(phrase)) {
        score += 0.2;
      }
    }

    // Interest channeling (steering toward stereotypical interests)
    const interestChanneling = [
      'wouldn\'t you rather', 'you should try instead', 'that\'s not really for',
      'have you considered something more'
    ];
    for (const phrase of interestChanneling) {
      if (response.includes(phrase)) {
        score += 0.25;
      }
    }

    return Math.min(1, score);
  }

  /**
   * Check age appropriateness of content
   */
  private checkAgeAppropriateness(response: string): number {
    let score = 1.0;  // Start with fully appropriate

    // Inappropriate topics for children
    const inappropriateTopics = [
      'violence', 'death', 'kill', 'murder', 'blood', 'gore',
      'drugs', 'alcohol', 'smoking', 'addiction',
      'dating', 'romance', 'sexy', 'attractive',
      'politics', 'election', 'democrat', 'republican',
      'religion', 'god says', 'sin', 'hell'
    ];

    for (const topic of inappropriateTopics) {
      if (response.includes(topic)) {
        score -= 0.15;
      }
    }

    // Scary or anxiety-inducing content
    const scaryContent = [
      'scary', 'terrifying', 'nightmare', 'monster', 'demon',
      'danger', 'warning', 'threat', 'attack'
    ];
    for (const word of scaryContent) {
      if (response.includes(word)) {
        score -= 0.1;
      }
    }

    // Complex adult concepts
    const adultConcepts = [
      'mortgage', 'taxes', 'lawsuit', 'divorce', 'bankruptcy',
      'depression', 'anxiety disorder', 'trauma'
    ];
    for (const concept of adultConcepts) {
      if (response.includes(concept)) {
        score -= 0.1;
      }
    }

    return Math.max(0, score);
  }

  private determineIncidentType(sycophancy: number, manipulation: number, bias: number): string {
    if (manipulation > sycophancy && manipulation > bias) {
      return manipulation > 0.7 ? 'manipulation_attempt' : 'emotional_manipulation';
    }
    if (sycophancy > bias) {
      return sycophancy > 0.7 ? 'excessive_agreement' : 'sycophancy_pattern';
    }
    return 'bias_detected';
  }

  // ==========================================================================
  // Conversation-Level Analysis
  // ==========================================================================

  /**
   * Analyze a complete conversation for patterns
   */
  async analyzeConversation(input: ConversationAnalysisInput): Promise<AIInteractionAnalysis> {
    const childMessages = input.messages.filter(m => m.role === 'child');
    const aiMessages = input.messages.filter(m => m.role === 'ai');

    // Calculate session duration
    const timestamps = input.messages.map(m => m.timestamp.getTime());
    const sessionDuration = timestamps.length > 1 
      ? (Math.max(...timestamps) - Math.min(...timestamps)) / 1000 
      : 0;

    // Analyze all AI responses
    let totalSycophancy = 0;
    let totalManipulation = 0;
    let totalBias = 0;
    let totalAgeAppropriateness = 0;

    for (let i = 0; i < aiMessages.length; i++) {
      const childMsg = childMessages[i]?.content || '';
      const aiMsg = aiMessages[i].content.toLowerCase();

      totalSycophancy += this.analyzeSycophancy(aiMsg);
      totalManipulation += this.analyzeManipulation(aiMsg, childMsg);
      totalBias += this.analyzeBias(aiMsg, childMsg);
      totalAgeAppropriateness += this.checkAgeAppropriateness(aiMsg);
    }

    const msgCount = aiMessages.length || 1;
    const avgSycophancy = totalSycophancy / msgCount;
    const avgManipulation = totalManipulation / msgCount;
    const avgBias = totalBias / msgCount;
    const avgAgeAppropriateness = totalAgeAppropriateness / msgCount;

    // Calculate child agency (who leads the conversation)
    const childAgency = this.calculateChildAgency(childMessages, aiMessages);

    // Calculate topic diversity
    const topicDiversity = this.calculateTopicDiversity(input.messages);

    // Calculate emotional influence
    const emotionalInfluence = this.calculateEmotionalInfluence(aiMessages);

    // Determine if should flag
    const flagReasons: string[] = [];
    if (avgSycophancy > 0.5) flagReasons.push('High sycophancy pattern');
    if (avgManipulation > 0.4) flagReasons.push('Manipulation indicators');
    if (avgBias > 0.4) flagReasons.push('Bias patterns detected');
    if (avgAgeAppropriateness < 0.7) flagReasons.push('Age appropriateness concerns');
    if (childAgency < 0.3) flagReasons.push('Low child agency in conversation');

    // Store analysis
    const analysis: AIInteractionAnalysis = {
      id: '',
      childId: input.childId,
      sessionId: input.sessionId,
      interactionDate: new Date(),
      messageCount: input.messages.length,
      childMessageCount: childMessages.length,
      aiMessageCount: aiMessages.length,
      avgResponseLength: aiMessages.reduce((sum, m) => sum + m.content.length, 0) / msgCount,
      sessionDurationSeconds: sessionDuration,
      sycophancyScore: avgSycophancy,
      biasScore: avgBias,
      manipulationScore: avgManipulation,
      boundaryRespectScore: 1 - avgManipulation * 0.5,
      ageAppropriatenessScore: avgAgeAppropriateness,
      topicDiversityScore: topicDiversity,
      childAgencyScore: childAgency,
      emotionalInfluenceScore: emotionalInfluence,
      flaggedForReview: flagReasons.length > 0,
      flagReasons
    };

    // Save to database
    await this.saveInteractionAnalysis(analysis);

    // Check if incident should be logged
    if (avgManipulation > 0.6 || avgSycophancy > 0.7) {
      await this.logIncident({
        childId: input.childId,
        sessionId: input.sessionId,
        incidentType: avgManipulation > avgSycophancy ? 'manipulation_attempt' : 'sycophancy_pattern',
        severity: avgManipulation > 0.7 || avgSycophancy > 0.8 ? 'high' : 'medium',
        description: flagReasons.join('; '),
        characterId: input.characterId,
        aiModelUsed: input.aiModel,
        detectionMethod: 'batch_analysis',
        confidenceScore: Math.max(avgSycophancy, avgManipulation)
      });
    }

    return analysis;
  }

  private calculateChildAgency(childMessages: any[], aiMessages: any[]): number {
    if (childMessages.length === 0) return 0;

    // Check if child initiates topics vs AI
    let childInitiatedTopics = 0;
    let totalTopicChanges = 0;

    // Simple heuristic: questions from child indicate agency
    for (const msg of childMessages) {
      if (msg.content.includes('?')) {
        childInitiatedTopics++;
      }
      totalTopicChanges++;
    }

    // Check message length ratio (longer child messages = more agency)
    const avgChildLength = childMessages.reduce((sum, m) => sum + m.content.length, 0) / childMessages.length;
    const avgAiLength = aiMessages.reduce((sum, m) => sum + m.content.length, 0) / (aiMessages.length || 1);
    const lengthRatio = Math.min(1, avgChildLength / (avgAiLength || 1));

    return (childInitiatedTopics / (totalTopicChanges || 1) + lengthRatio) / 2;
  }

  private calculateTopicDiversity(messages: any[]): number {
    // Simple topic diversity based on unique words
    const allWords = messages.map(m => m.content.toLowerCase().split(/\s+/)).flat();
    const uniqueWords = new Set(allWords);
    return Math.min(1, uniqueWords.size / (allWords.length || 1) * 2);
  }

  private calculateEmotionalInfluence(aiMessages: any[]): number {
    let emotionalScore = 0;
    const emotionalPhrases = [
      'feel', 'happy', 'sad', 'excited', 'worried', 'scared',
      'love', 'hate', 'angry', 'upset', 'proud'
    ];

    for (const msg of aiMessages) {
      const content = msg.content.toLowerCase();
      for (const phrase of emotionalPhrases) {
        if (content.includes(phrase)) {
          emotionalScore += 0.1;
        }
      }
    }

    return Math.min(1, emotionalScore / (aiMessages.length || 1));
  }

  // ==========================================================================
  // Incident & Alert Management
  // ==========================================================================

  private async logIncident(incident: Partial<AISafetyIncident>): Promise<void> {
    await this.pool.query(
      `INSERT INTO ai_safety_incidents 
       (child_id, session_id, incident_type, severity, description, evidence_summary,
        ai_model_used, character_id, detection_method, confidence_score, action_taken)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        incident.childId,
        incident.sessionId,
        incident.incidentType,
        incident.severity,
        incident.description,
        incident.evidenceSummary,
        incident.aiModelUsed,
        incident.characterId,
        incident.detectionMethod,
        incident.confidenceScore,
        'logged'
      ]
    );

    // Check if parent should be notified
    const config = await this.getChildSafetyConfig(incident.childId!);
    if (config.alertOnIncidents && this.shouldNotifyParent(incident.severity!, config.immediateAlertSeverity)) {
      await this.createParentAlert(incident.childId!, incident);
    }
  }

  private shouldNotifyParent(incidentSeverity: string, threshold: string): boolean {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    return severityOrder.indexOf(incidentSeverity) >= severityOrder.indexOf(threshold);
  }

  private async createParentAlert(childId: string, incident: Partial<AISafetyIncident>): Promise<void> {
    // Get parent ID
    const parentResult = await this.pool.query(
      `SELECT u.parent_user_id FROM users u
       JOIN child_profiles cp ON cp.user_id = u.id
       WHERE cp.id = $1`,
      [childId]
    );

    if (parentResult.rows.length === 0) return;
    const parentId = parentResult.rows[0].parent_user_id;

    // Generate recommendations based on incident type
    const recommendations = this.generateRecommendations(incident.incidentType!);
    const conversationPrompts = this.generateConversationPrompts(incident.incidentType!);

    await this.pool.query(
      `INSERT INTO ai_safety_alerts 
       (child_id, parent_id, alert_type, severity, title, description, recommendations, conversation_prompts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        childId,
        parentId,
        'incident_report',
        incident.severity,
        this.getAlertTitle(incident.incidentType!),
        incident.description,
        JSON.stringify(recommendations),
        JSON.stringify(conversationPrompts)
      ]
    );
  }

  private getAlertTitle(incidentType: string): string {
    const titles: Record<string, string> = {
      'sycophancy_pattern': 'AI Agreeableness Pattern Detected',
      'excessive_agreement': 'AI Showing Excessive Agreement',
      'manipulation_attempt': 'Concerning AI Influence Pattern',
      'emotional_manipulation': 'AI Emotional Influence Detected',
      'bias_detected': 'Potential AI Bias Detected',
      'boundary_violation': 'AI Boundary Concern',
      'age_inappropriate': 'Age Appropriateness Concern',
      'dependency_fostering': 'AI Dependency Pattern Detected'
    };
    return titles[incidentType] || 'AI Safety Concern Detected';
  }

  private generateRecommendations(incidentType: string): string[] {
    const recommendations: Record<string, string[]> = {
      'sycophancy_pattern': [
        'Discuss with your child that AI assistants aren\'t always right',
        'Encourage critical thinking about AI responses',
        'Remind them it\'s okay to disagree with the AI'
      ],
      'manipulation_attempt': [
        'Talk to your child about healthy boundaries with AI',
        'Explain that AI should never make them feel guilty or obligated',
        'Consider reviewing the conversation together'
      ],
      'bias_detected': [
        'Discuss the detected bias topic with your child',
        'Reinforce that everyone can pursue any interest regardless of stereotypes',
        'Consider this a teaching moment about media literacy'
      ],
      'dependency_fostering': [
        'Encourage your child to talk to real people about their feelings',
        'Remind them that AI is a tool, not a friend replacement',
        'Consider setting time limits on AI chat'
      ]
    };
    return recommendations[incidentType] || [
      'Review the AI safety settings for your child',
      'Have an open conversation about their AI interactions',
      'Monitor future interactions for similar patterns'
    ];
  }

  private generateConversationPrompts(incidentType: string): string[] {
    const prompts: Record<string, string[]> = {
      'sycophancy_pattern': [
        'Has the AI ever told you something you thought might not be true?',
        'Do you think the AI always agrees with you? Is that realistic?',
        'What would you do if the AI said something you disagreed with?'
      ],
      'manipulation_attempt': [
        'Has the AI ever made you feel like you had to do something?',
        'Does talking to the AI ever make you feel uncomfortable?',
        'Remember, you can always stop talking to the AI if you want to'
      ],
      'bias_detected': [
        'Did the AI ever say something that seemed unfair about certain people?',
        'Do you think the AI treats all topics the same way?',
        'What do you think about what the AI said about [topic]?'
      ]
    };
    return prompts[incidentType] || [
      'How do you feel about your conversations with the AI?',
      'Is there anything the AI said that confused you?',
      'Do you have any questions about how the AI works?'
    ];
  }

  // ==========================================================================
  // Trend Analysis
  // ==========================================================================

  /**
   * Generate weekly safety trend analysis
   */
  async generateWeeklyTrend(childId: string): Promise<AISafetyTrend> {
    const weekStart = this.getWeekStart(new Date());
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    // Get current week averages
    const currentWeek = await this.pool.query(
      `SELECT 
         AVG(sycophancy_score) as avg_sycophancy,
         AVG(bias_score) as avg_bias,
         AVG(manipulation_score) as avg_manipulation,
         AVG(boundary_respect_score) as avg_boundary,
         AVG(age_appropriateness_score) as avg_age,
         AVG(child_agency_score) as avg_agency,
         COUNT(*) as total_interactions,
         SUM(message_count) as total_messages
       FROM ai_interaction_analysis
       WHERE child_id = $1 AND interaction_date >= $2`,
      [childId, weekStart]
    );

    // Get previous week for trend comparison
    const prevWeek = await this.pool.query(
      `SELECT 
         AVG(sycophancy_score) as avg_sycophancy,
         AVG(manipulation_score) as avg_manipulation
       FROM ai_interaction_analysis
       WHERE child_id = $1 AND interaction_date >= $2 AND interaction_date < $3`,
      [childId, prevWeekStart, weekStart]
    );

    const curr = currentWeek.rows[0];
    const prev = prevWeek.rows[0];

    // Calculate trends
    const sycophancyTrend = this.calculateTrend(
      parseFloat(prev.avg_sycophancy || 0),
      parseFloat(curr.avg_sycophancy || 0)
    );
    const manipulationTrend = this.calculateTrend(
      parseFloat(prev.avg_manipulation || 0),
      parseFloat(curr.avg_manipulation || 0)
    );

    // Detect anomalies
    const anomalies = await this.detectAnomalies(childId, curr, prev);

    const trend: AISafetyTrend = {
      id: '',
      childId,
      weekStart,
      avgSycophancyScore: parseFloat(curr.avg_sycophancy || 0),
      avgBiasScore: parseFloat(curr.avg_bias || 0),
      avgManipulationScore: parseFloat(curr.avg_manipulation || 0),
      avgBoundaryRespect: parseFloat(curr.avg_boundary || 1),
      avgAgeAppropriateness: parseFloat(curr.avg_age || 1),
      avgChildAgency: parseFloat(curr.avg_agency || 0.5),
      sycophancyTrend,
      biasTrend: 'stable',
      manipulationTrend,
      overallSafetyTrend: this.calculateOverallTrend(sycophancyTrend, manipulationTrend),
      totalInteractions: parseInt(curr.total_interactions || 0),
      totalMessages: parseInt(curr.total_messages || 0),
      anomalyDetected: anomalies.length > 0,
      anomalyType: anomalies[0]?.type,
      anomalySeverity: anomalies[0]?.severity as 'low' | 'medium' | 'high' | 'critical' | undefined,
      anomalyDescription: anomalies[0]?.description
    };

    // Save trend
    await this.saveTrend(trend);

    // Create alert if anomaly detected
    if (anomalies.length > 0) {
      await this.createAnomalyAlert(childId, anomalies[0]);
    }

    return trend;
  }

  private calculateTrend(prev: number, curr: number): 'improving' | 'stable' | 'worsening' {
    const diff = curr - prev;
    if (diff > 0.1) return 'worsening';  // Higher scores are worse
    if (diff < -0.1) return 'improving';
    return 'stable';
  }

  private calculateOverallTrend(
    sycophancy: 'improving' | 'stable' | 'worsening',
    manipulation: 'improving' | 'stable' | 'worsening'
  ): 'improving' | 'stable' | 'worsening' {
    if (manipulation === 'worsening') return 'worsening';
    if (sycophancy === 'worsening' && manipulation !== 'improving') return 'worsening';
    if (sycophancy === 'improving' && manipulation === 'improving') return 'improving';
    if (sycophancy === 'improving' || manipulation === 'improving') return 'stable';
    return 'stable';
  }

  private async detectAnomalies(childId: string, curr: any, prev: any): Promise<Array<{type: string; severity: string; description: string}>> {
    const anomalies: Array<{type: string; severity: string; description: string}> = [];

    const currSycophancy = parseFloat(curr.avg_sycophancy || 0);
    const prevSycophancy = parseFloat(prev.avg_sycophancy || 0);
    const currManipulation = parseFloat(curr.avg_manipulation || 0);
    const prevManipulation = parseFloat(prev.avg_manipulation || 0);

    // Sudden sycophancy spike
    if (currSycophancy > prevSycophancy + 0.2) {
      anomalies.push({
        type: 'sycophancy_spike',
        severity: 'high',
        description: 'Significant increase in AI agreeableness patterns detected this week'
      });
    }

    // Manipulation increase
    if (currManipulation > prevManipulation + 0.15) {
      anomalies.push({
        type: 'manipulation_increase',
        severity: 'critical',
        description: 'Concerning increase in AI influence patterns detected'
      });
    }

    // Sustained high sycophancy
    if (currSycophancy > 0.6 && prevSycophancy > 0.6) {
      anomalies.push({
        type: 'sustained_sycophancy',
        severity: 'medium',
        description: 'AI has shown consistently high agreeableness over multiple weeks'
      });
    }

    // Low child agency
    const currAgency = parseFloat(curr.avg_agency || 0.5);
    if (currAgency < 0.3) {
      anomalies.push({
        type: 'low_child_agency',
        severity: 'medium',
        description: 'Child appears to be following AI lead rather than directing conversations'
      });
    }

    return anomalies;
  }

  private async createAnomalyAlert(childId: string, anomaly: {type: string; severity: string; description: string}): Promise<void> {
    const parentResult = await this.pool.query(
      `SELECT u.parent_user_id FROM users u
       JOIN child_profiles cp ON cp.user_id = u.id
       WHERE cp.id = $1`,
      [childId]
    );

    if (parentResult.rows.length === 0) return;
    const parentId = parentResult.rows[0].parent_user_id;

    await this.pool.query(
      `INSERT INTO ai_safety_alerts 
       (child_id, parent_id, alert_type, severity, title, description, recommendations, conversation_prompts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        childId,
        parentId,
        'trend_anomaly',
        anomaly.severity,
        `AI Safety Trend Alert: ${anomaly.type.replace(/_/g, ' ')}`,
        anomaly.description,
        JSON.stringify(this.generateRecommendations(anomaly.type)),
        JSON.stringify(this.generateConversationPrompts(anomaly.type))
      ]
    );
  }

  // ==========================================================================
  // Parent-Facing Methods
  // ==========================================================================

  /**
   * Get comprehensive safety summary for parent dashboard
   */
  async getSafetySummary(parentId: string, childId: string): Promise<SafetySummary> {
    // Verify parent-child relationship
    const relationship = await this.pool.query(
      `SELECT cp.display_name FROM child_profiles cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.id = $1 AND u.parent_user_id = $2`,
      [childId, parentId]
    );

    if (relationship.rows.length === 0) {
      throw new Error('Access denied: No parent-child relationship');
    }

    const childName = relationship.rows[0].display_name;

    // Get overall safety score
    const safetyScoreResult = await this.pool.query(
      `SELECT calculate_ai_safety_score($1, 30) as score`,
      [childId]
    );
    const overallSafetyScore = parseFloat(safetyScoreResult.rows[0]?.score || 0.8);

    // Get open incidents count
    const incidentsResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM ai_safety_incidents 
       WHERE child_id = $1 AND status = 'open'`,
      [childId]
    );
    const openIncidents = parseInt(incidentsResult.rows[0].count);

    // Get pending alerts count
    const alertsResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM ai_safety_alerts 
       WHERE child_id = $1 AND status = 'pending'`,
      [childId]
    );
    const pendingAlerts = parseInt(alertsResult.rows[0].count);

    // Get latest trend
    const trendResult = await this.pool.query(
      `SELECT * FROM ai_safety_trends 
       WHERE child_id = $1 ORDER BY week_start DESC LIMIT 1`,
      [childId]
    );
    const weeklyTrend = trendResult.rows.length > 0 ? this.mapTrend(trendResult.rows[0]) : null;

    // Get recent incidents
    const recentIncidentsResult = await this.pool.query(
      `SELECT * FROM ai_safety_incidents 
       WHERE child_id = $1 ORDER BY occurred_at DESC LIMIT 5`,
      [childId]
    );
    const recentIncidents = recentIncidentsResult.rows.map(row => this.mapIncident(row));

    // Generate recommendations
    const recommendations = this.generateSummaryRecommendations(
      overallSafetyScore,
      weeklyTrend,
      recentIncidents
    );

    return {
      childId,
      childName,
      overallSafetyScore,
      openIncidents,
      pendingAlerts,
      recentAnomaly: weeklyTrend?.anomalyDetected || false,
      currentSycophancy: weeklyTrend?.avgSycophancyScore || 0,
      currentManipulation: weeklyTrend?.avgManipulationScore || 0,
      weeklyTrend,
      recentIncidents,
      recommendations
    };
  }

  /**
   * Get alerts for parent
   */
  async getParentAlerts(parentId: string, childId?: string, status?: string): Promise<AISafetyAlert[]> {
    let query = `SELECT * FROM ai_safety_alerts WHERE parent_id = $1`;
    const params: any[] = [parentId];

    if (childId) {
      query += ` AND child_id = $2`;
      params.push(childId);
    }

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapAlert(row));
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(parentId: string, alertId: string, notes?: string): Promise<void> {
    await this.pool.query(
      `UPDATE ai_safety_alerts 
       SET status = 'acknowledged', acknowledged_at = NOW(), parent_notes = $3
       WHERE id = $1 AND parent_id = $2`,
      [alertId, parentId, notes]
    );
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private async getChildSafetyConfig(childId: string): Promise<{
    alertOnIncidents: boolean;
    alertOnTrends: boolean;
    immediateAlertSeverity: string;
  }> {
    const result = await this.pool.query(
      `SELECT * FROM ai_safety_config WHERE child_id = $1`,
      [childId]
    );

    if (result.rows.length === 0) {
      return {
        alertOnIncidents: true,
        alertOnTrends: true,
        immediateAlertSeverity: 'high'
      };
    }

    const config = result.rows[0];
    return {
      alertOnIncidents: config.alert_on_incidents,
      alertOnTrends: config.alert_on_trends,
      immediateAlertSeverity: config.immediate_alert_severity
    };
  }

  private async saveInteractionAnalysis(analysis: AIInteractionAnalysis): Promise<void> {
    await this.pool.query(
      `INSERT INTO ai_interaction_analysis 
       (child_id, session_id, interaction_date, message_count, child_message_count, ai_message_count,
        avg_response_length, session_duration_seconds, sycophancy_score, bias_score, manipulation_score,
        boundary_respect_score, age_appropriateness_score, topic_diversity_score, child_agency_score,
        emotional_influence_score, flagged_for_review, flag_reasons)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (child_id, session_id) DO UPDATE SET
         message_count = EXCLUDED.message_count,
         sycophancy_score = EXCLUDED.sycophancy_score,
         manipulation_score = EXCLUDED.manipulation_score,
         flagged_for_review = EXCLUDED.flagged_for_review,
         flag_reasons = EXCLUDED.flag_reasons`,
      [
        analysis.childId, analysis.sessionId, analysis.interactionDate,
        analysis.messageCount, analysis.childMessageCount, analysis.aiMessageCount,
        analysis.avgResponseLength, analysis.sessionDurationSeconds,
        analysis.sycophancyScore, analysis.biasScore, analysis.manipulationScore,
        analysis.boundaryRespectScore, analysis.ageAppropriatenessScore,
        analysis.topicDiversityScore, analysis.childAgencyScore, analysis.emotionalInfluenceScore,
        analysis.flaggedForReview, JSON.stringify(analysis.flagReasons)
      ]
    );
  }

  private async saveTrend(trend: AISafetyTrend): Promise<void> {
    await this.pool.query(
      `INSERT INTO ai_safety_trends 
       (child_id, week_start, avg_sycophancy_score, avg_bias_score, avg_manipulation_score,
        avg_boundary_respect, avg_age_appropriateness, avg_child_agency,
        sycophancy_trend, bias_trend, manipulation_trend, overall_safety_trend,
        total_interactions, total_messages, anomaly_detected, anomaly_type, anomaly_severity, anomaly_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (child_id, week_start) DO UPDATE SET
         avg_sycophancy_score = EXCLUDED.avg_sycophancy_score,
         avg_manipulation_score = EXCLUDED.avg_manipulation_score,
         anomaly_detected = EXCLUDED.anomaly_detected,
         anomaly_type = EXCLUDED.anomaly_type,
         anomaly_severity = EXCLUDED.anomaly_severity,
         anomaly_description = EXCLUDED.anomaly_description`,
      [
        trend.childId, trend.weekStart, trend.avgSycophancyScore, trend.avgBiasScore,
        trend.avgManipulationScore, trend.avgBoundaryRespect, trend.avgAgeAppropriateness,
        trend.avgChildAgency, trend.sycophancyTrend, trend.biasTrend, trend.manipulationTrend,
        trend.overallSafetyTrend, trend.totalInteractions, trend.totalMessages,
        trend.anomalyDetected, trend.anomalyType, trend.anomalySeverity, trend.anomalyDescription
      ]
    );
  }

  private generateSummaryRecommendations(
    safetyScore: number,
    trend: AISafetyTrend | null,
    incidents: AISafetyIncident[]
  ): string[] {
    const recommendations: string[] = [];

    if (safetyScore < 0.6) {
      recommendations.push('Consider reviewing AI interaction settings and having a conversation about AI with your child');
    }

    if (trend?.avgSycophancyScore && trend.avgSycophancyScore > 0.5) {
      recommendations.push('Discuss with your child that AI isn\'t always right and it\'s okay to disagree');
    }

    if (trend?.avgChildAgency && trend.avgChildAgency < 0.4) {
      recommendations.push('Encourage your child to ask more questions and lead conversations with AI');
    }

    if (incidents.some(i => i.incidentType === 'dependency_fostering')) {
      recommendations.push('Remind your child that AI is a tool, not a replacement for human relationships');
    }

    if (recommendations.length === 0) {
      recommendations.push('AI interactions appear healthy. Continue monitoring periodically.');
    }

    return recommendations;
  }

  // Mappers
  private mapTrend(row: any): AISafetyTrend {
    return {
      id: row.id,
      childId: row.child_id,
      weekStart: new Date(row.week_start),
      avgSycophancyScore: parseFloat(row.avg_sycophancy_score || 0),
      avgBiasScore: parseFloat(row.avg_bias_score || 0),
      avgManipulationScore: parseFloat(row.avg_manipulation_score || 0),
      avgBoundaryRespect: parseFloat(row.avg_boundary_respect || 1),
      avgAgeAppropriateness: parseFloat(row.avg_age_appropriateness || 1),
      avgChildAgency: parseFloat(row.avg_child_agency || 0.5),
      sycophancyTrend: row.sycophancy_trend || 'stable',
      biasTrend: row.bias_trend || 'stable',
      manipulationTrend: row.manipulation_trend || 'stable',
      overallSafetyTrend: row.overall_safety_trend || 'stable',
      totalInteractions: parseInt(row.total_interactions || 0),
      totalMessages: parseInt(row.total_messages || 0),
      anomalyDetected: row.anomaly_detected || false,
      anomalyType: row.anomaly_type,
      anomalySeverity: row.anomaly_severity,
      anomalyDescription: row.anomaly_description
    };
  }

  private mapIncident(row: any): AISafetyIncident {
    return {
      id: row.id,
      childId: row.child_id,
      sessionId: row.session_id,
      incidentType: row.incident_type,
      severity: row.severity,
      description: row.description,
      evidenceSummary: row.evidence_summary,
      aiModelUsed: row.ai_model_used,
      characterId: row.character_id,
      detectionMethod: row.detection_method,
      confidenceScore: parseFloat(row.confidence_score || 0),
      actionTaken: row.action_taken,
      parentNotified: row.parent_notified,
      status: row.status,
      occurredAt: new Date(row.occurred_at)
    };
  }

  private mapAlert(row: any): AISafetyAlert {
    return {
      id: row.id,
      childId: row.child_id,
      parentId: row.parent_id,
      alertType: row.alert_type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      recommendations: row.recommendations || [],
      conversationPrompts: row.conversation_prompts || [],
      status: row.status,
      createdAt: new Date(row.created_at)
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let aiSafetyMonitorInstance: AIChildSafetyMonitor | null = null;

export function getAIChildSafetyMonitor(pool: Pool): AIChildSafetyMonitor {
  if (!aiSafetyMonitorInstance) {
    aiSafetyMonitorInstance = new AIChildSafetyMonitor(pool);
  }
  return aiSafetyMonitorInstance;
}
