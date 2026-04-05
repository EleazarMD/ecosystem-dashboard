/**
 * Skill Progress Service
 * 
 * ARCHITECTURE:
 * Layer 1: Platform-Native Skills (Universal) - DEFAULT
 *   - Based on developmental psychology research (Piaget, Chall, etc.)
 *   - Works for ALL children regardless of location
 *   - Proficiency levels: emerging → developing → proficient → advanced
 *   - NOT dependent on any curriculum standard
 * 
 * Layer 2: Curriculum Alignments (Optional Overlays)
 *   - Texas TEKS, Common Core, UK National Curriculum, etc.
 *   - Parents can OPT-IN to curriculum alignment
 *   - Standards MAP TO platform skills (not vice versa)
 *   - Disabled by default
 * 
 * Key Concepts:
 * - Skills are organized into domains (reading, writing, math, analytical)
 * - Each skill has research-based age-appropriate milestones
 * - Progress is tracked via assessments derived from activities
 * - Proficiency is calculated from weighted assessment history
 * - Curriculum alignment is OPTIONAL and family-configurable
 */

import { Pool } from 'pg';

// ============================================================================
// Types
// ============================================================================

export interface SkillDomain {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface Skill {
  id: string;
  domainId: string;
  code: string;
  name: string;
  description: string;
  minGrade: string;
  maxGrade: string;
  parentSkillId?: string;
  skillLevel: number;
  assessmentType: string;
  masteryThreshold: number;
}

export interface ProficiencyLevel {
  id: string;
  code: string;
  name: string;
  description: string;
  levelOrder: number;
  minScore: number;
  maxScore: number;
  color: string;
  icon: string;
  isMastery: boolean;
}

export interface SkillProgress {
  skillId: string;
  skillCode: string;
  skillName: string;
  domainCode: string;
  domainName: string;
  currentScore: number;
  proficiencyLevel: ProficiencyLevel;
  trend: 'improving' | 'stable' | 'declining';
  assessmentsCount: number;
  lastAssessmentDate?: Date;
  streakDays: number;
  milestonesCompleted: number;
}

export interface DomainProgress {
  domain: SkillDomain;
  avgScore: number;
  proficiencyLevel: string;
  skillsCount: number;
  skillsProficient: number;
  trend: string;
  skills: SkillProgress[];
}

export interface SkillMilestone {
  id: string;
  skillId: string;
  gradeLevel: string;
  proficiencyLevel: string;
  title: string;
  description: string;
  successIndicators: string[];
  exampleActivities: string[];
  achieved: boolean;
  achievedAt?: Date;
}

export interface SkillAssessmentInput {
  childId: string;
  skillCode: string;
  sourceType: string;
  sourceId?: string;
  score: number;
  evidenceType?: string;
  evidenceData?: Record<string, any>;
  aiAnalysis?: Record<string, any>;
  aiConfidence?: number;
}

export interface CurriculumStandard {
  id: string;
  frameworkCode: string;
  standardCode: string;
  fullCode: string;
  subject: string;
  domain: string;
  gradeLevel: string;
  title: string;
  description: string;
}

export interface CurriculumSettings {
  curriculumEnabled: boolean;
  frameworkCode?: string;  // 'TEKS', 'CCSS', 'UK_NC', 'none'
  frameworkName?: string;
  gradeLevel?: string;
  showStandardCodes: boolean;
}

export interface ChildSkillSummary {
  childId: string;
  childName: string;
  gradeLevel: string;
  overallScore: number;
  overallProficiency: string;
  domains: DomainProgress[];
  recentMilestones: SkillMilestone[];
  recommendedActivities: string[];
  // Curriculum alignment is OPTIONAL - only populated if enabled
  curriculumSettings: CurriculumSettings;
  curriculumAlignment?: {
    frameworkName: string;
    standardsAligned: number;
    standardsMastered: number;
    nextStandards: CurriculumStandard[];
  };
}

// ============================================================================
// Service
// ============================================================================

export class SkillProgressService {
  private pool: Pool;
  private proficiencyLevels: ProficiencyLevel[] = [];

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  async loadProficiencyLevels(): Promise<void> {
    const result = await this.pool.query(
      `SELECT id, code, name, description, level_order, min_score, max_score, color, icon, is_mastery
       FROM proficiency_levels ORDER BY level_order`
    );
    this.proficiencyLevels = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      levelOrder: row.level_order,
      minScore: parseFloat(row.min_score),
      maxScore: parseFloat(row.max_score),
      color: row.color,
      icon: row.icon,
      isMastery: row.is_mastery,
    }));
  }

  private getProficiencyFromScore(score: number): ProficiencyLevel {
    if (this.proficiencyLevels.length === 0) {
      // Return default if not loaded
      return {
        id: '',
        code: 'emerging',
        name: 'Emerging',
        description: 'Beginning to develop',
        levelOrder: 1,
        minScore: 0,
        maxScore: 0.39,
        color: '#FC8181',
        icon: '🌱',
        isMastery: false,
      };
    }
    
    for (const level of [...this.proficiencyLevels].reverse()) {
      if (score >= level.minScore && score <= level.maxScore) {
        return level;
      }
    }
    return this.proficiencyLevels[0];
  }

  // ==========================================================================
  // Skill Domains
  // ==========================================================================

  async getSkillDomains(): Promise<SkillDomain[]> {
    const result = await this.pool.query(
      `SELECT id, code, name, description, icon, color
       FROM skill_domains WHERE is_active = true ORDER BY sort_order`
    );
    return result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
    }));
  }

  async getSkillsByDomain(domainCode: string, gradeLevel?: string): Promise<Skill[]> {
    let query = `
      SELECT s.id, s.domain_id, s.code, s.name, s.description,
             s.min_grade, s.max_grade, s.parent_skill_id, s.skill_level,
             s.assessment_type, s.mastery_threshold
      FROM skills s
      JOIN skill_domains sd ON sd.id = s.domain_id
      WHERE sd.code = $1 AND s.is_active = true
    `;
    const params: any[] = [domainCode];

    if (gradeLevel) {
      query += ` AND (s.min_grade IS NULL OR s.min_grade <= $2)
                 AND (s.max_grade IS NULL OR s.max_grade >= $2)`;
      params.push(gradeLevel);
    }

    query += ` ORDER BY s.skill_level, s.sort_order`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      domainId: row.domain_id,
      code: row.code,
      name: row.name,
      description: row.description,
      minGrade: row.min_grade,
      maxGrade: row.max_grade,
      parentSkillId: row.parent_skill_id,
      skillLevel: row.skill_level,
      assessmentType: row.assessment_type,
      masteryThreshold: parseFloat(row.mastery_threshold),
    }));
  }

  // ==========================================================================
  // Child Progress
  // ==========================================================================

  async getChildSkillSummary(childId: string): Promise<ChildSkillSummary | null> {
    await this.loadProficiencyLevels();

    // Get child info
    const childResult = await this.pool.query(
      `SELECT id, display_name, grade_level FROM child_profiles WHERE id = $1`,
      [childId]
    );
    if (childResult.rows.length === 0) return null;
    const child = childResult.rows[0];

    // Get domain progress
    const domainResult = await this.pool.query(
      `SELECT * FROM get_child_skill_summary($1)`,
      [childId]
    );

    const domains: DomainProgress[] = [];
    for (const row of domainResult.rows) {
      const skills = await this.getChildSkillProgress(childId, row.domain_code);
      domains.push({
        domain: {
          id: '',
          code: row.domain_code,
          name: row.domain_name,
          description: '',
          icon: row.domain_icon,
          color: '',
        },
        avgScore: parseFloat(row.avg_score || 0),
        proficiencyLevel: row.proficiency_level || 'Emerging',
        skillsCount: row.skills_count || 0,
        skillsProficient: row.skills_proficient || 0,
        trend: row.trend || 'stable',
        skills,
      });
    }

    // Calculate overall
    const overallScore = domains.length > 0
      ? domains.reduce((sum, d) => sum + d.avgScore, 0) / domains.length
      : 0;
    const overallProficiency = this.getProficiencyFromScore(overallScore);

    // Get recent milestones
    const milestonesResult = await this.pool.query(
      `SELECT sm.id, sm.skill_id, sm.grade_level, pl.name as proficiency_level,
              sm.title, sm.description, sm.success_indicators, sm.example_activities,
              sma.achieved_at
       FROM skill_milestones sm
       JOIN proficiency_levels pl ON pl.id = sm.proficiency_level_id
       JOIN student_milestone_achievements sma ON sma.milestone_id = sm.id
       WHERE sma.child_id = $1
       ORDER BY sma.achieved_at DESC
       LIMIT 5`,
      [childId]
    );

    const recentMilestones: SkillMilestone[] = milestonesResult.rows.map(row => ({
      id: row.id,
      skillId: row.skill_id,
      gradeLevel: row.grade_level,
      proficiencyLevel: row.proficiency_level,
      title: row.title,
      description: row.description,
      successIndicators: row.success_indicators || [],
      exampleActivities: row.example_activities || [],
      achieved: true,
      achievedAt: row.achieved_at,
    }));

    // Get curriculum settings for this child (OPTIONAL - disabled by default)
    const curriculumSettings = await this.getChildCurriculumSettings(childId);

    // Build base summary (works for ALL children, no curriculum required)
    const summary: ChildSkillSummary = {
      childId,
      childName: child.display_name,
      gradeLevel: child.grade_level,
      overallScore,
      overallProficiency: overallProficiency.name,
      domains,
      recentMilestones,
      recommendedActivities: this.generateRecommendedActivities(domains),
      curriculumSettings,
    };

    // Only fetch curriculum alignment if ENABLED by parent
    if (curriculumSettings.curriculumEnabled && curriculumSettings.frameworkCode && curriculumSettings.frameworkCode !== 'none') {
      const alignmentResult = await this.pool.query(
        `SELECT COUNT(DISTINCT cs.id) as aligned,
                COUNT(DISTINCT cs.id) FILTER (WHERE ssp.current_score >= 0.70) as mastered
         FROM curriculum_standards cs
         JOIN curriculum_frameworks cf ON cf.id = cs.framework_id AND cf.code = $1
         JOIN skill_standard_mappings ssm ON ssm.standard_id = cs.id
         JOIN skills s ON s.id = ssm.skill_id
         LEFT JOIN student_skill_progress ssp ON ssp.skill_id = s.id AND ssp.child_id = $2
         WHERE cs.grade_level = $3 OR cs.grade_level LIKE '%' || $3 || '%'`,
        [curriculumSettings.frameworkCode, childId, curriculumSettings.gradeLevel || child.grade_level || '3']
      );

      const nextStandardsResult = await this.pool.query(
        `SELECT cs.id, cf.code as framework_code, cs.standard_code, cs.full_code,
                cs.subject, cs.domain, cs.grade_level, cs.title, cs.description
         FROM curriculum_standards cs
         JOIN curriculum_frameworks cf ON cf.id = cs.framework_id AND cf.code = $1
         JOIN skill_standard_mappings ssm ON ssm.standard_id = cs.id
         JOIN skills s ON s.id = ssm.skill_id
         LEFT JOIN student_skill_progress ssp ON ssp.skill_id = s.id AND ssp.child_id = $2
         WHERE (cs.grade_level = $3 OR cs.grade_level LIKE '%' || $3 || '%')
         AND (ssp.current_score IS NULL OR ssp.current_score < 0.70)
         ORDER BY cs.subject, cs.standard_code
         LIMIT 5`,
        [curriculumSettings.frameworkCode, childId, curriculumSettings.gradeLevel || child.grade_level || '3']
      );

      summary.curriculumAlignment = {
        frameworkName: curriculumSettings.frameworkName || curriculumSettings.frameworkCode,
        standardsAligned: parseInt(alignmentResult.rows[0]?.aligned || 0),
        standardsMastered: parseInt(alignmentResult.rows[0]?.mastered || 0),
        nextStandards: nextStandardsResult.rows.map(row => ({
          id: row.id,
          frameworkCode: row.framework_code,
          standardCode: row.standard_code,
          fullCode: row.full_code,
          subject: row.subject,
          domain: row.domain,
          gradeLevel: row.grade_level,
          title: row.title,
          description: row.description,
        })),
      };
    }

    return summary;
  }

  // ==========================================================================
  // Curriculum Settings (OPTIONAL - disabled by default)
  // ==========================================================================

  async getChildCurriculumSettings(childId: string): Promise<CurriculumSettings> {
    // Check for child-specific settings first
    const childResult = await this.pool.query(
      `SELECT ccs.curriculum_enabled, ccs.grade_level,
              cf.code as framework_code, cf.name as framework_name
       FROM child_curriculum_settings ccs
       LEFT JOIN curriculum_frameworks cf ON cf.id = ccs.curriculum_framework_id
       WHERE ccs.child_id = $1`,
      [childId]
    );

    if (childResult.rows.length > 0 && childResult.rows[0].curriculum_enabled !== null) {
      const row = childResult.rows[0];
      return {
        curriculumEnabled: row.curriculum_enabled || false,
        frameworkCode: row.framework_code,
        frameworkName: row.framework_name,
        gradeLevel: row.grade_level,
        showStandardCodes: false,
      };
    }

    // Fall back to family settings
    const familyResult = await this.pool.query(
      `SELECT fcs.curriculum_enabled, fcs.show_standard_codes,
              cf.code as framework_code, cf.name as framework_name
       FROM child_profiles cp
       JOIN users u ON u.id = cp.user_id
       LEFT JOIN family_curriculum_settings fcs ON fcs.family_id = u.parent_user_id
       LEFT JOIN curriculum_frameworks cf ON cf.id = fcs.curriculum_framework_id
       WHERE cp.id = $1`,
      [childId]
    );

    if (familyResult.rows.length > 0 && familyResult.rows[0].curriculum_enabled) {
      const row = familyResult.rows[0];
      return {
        curriculumEnabled: row.curriculum_enabled || false,
        frameworkCode: row.framework_code,
        frameworkName: row.framework_name,
        showStandardCodes: row.show_standard_codes || false,
      };
    }

    // Default: curriculum alignment DISABLED
    return {
      curriculumEnabled: false,
      showStandardCodes: false,
    };
  }

  async updateChildCurriculumSettings(
    childId: string,
    settings: Partial<CurriculumSettings>
  ): Promise<void> {
    // Get framework ID if code provided
    let frameworkId: string | null = null;
    if (settings.frameworkCode) {
      const fwResult = await this.pool.query(
        `SELECT id FROM curriculum_frameworks WHERE code = $1`,
        [settings.frameworkCode]
      );
      frameworkId = fwResult.rows[0]?.id || null;
    }

    await this.pool.query(
      `INSERT INTO child_curriculum_settings (child_id, curriculum_framework_id, curriculum_enabled, grade_level)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (child_id) DO UPDATE SET
         curriculum_framework_id = EXCLUDED.curriculum_framework_id,
         curriculum_enabled = EXCLUDED.curriculum_enabled,
         grade_level = EXCLUDED.grade_level,
         updated_at = NOW()`,
      [childId, frameworkId, settings.curriculumEnabled ?? false, settings.gradeLevel]
    );
  }

  async getChildSkillProgress(childId: string, domainCode?: string): Promise<SkillProgress[]> {
    await this.loadProficiencyLevels();

    let query = `
      SELECT s.id as skill_id, s.code as skill_code, s.name as skill_name,
             sd.code as domain_code, sd.name as domain_name,
             COALESCE(ssp.current_score, 0) as current_score,
             ssp.current_level_id,
             COALESCE(ssp.trend, 'stable') as trend,
             COALESCE(ssp.assessments_count, 0) as assessments_count,
             ssp.last_assessment_date,
             COALESCE(ssp.streak_days, 0) as streak_days,
             COALESCE(ssp.milestones_completed, 0) as milestones_completed
      FROM skills s
      JOIN skill_domains sd ON sd.id = s.domain_id
      LEFT JOIN student_skill_progress ssp ON ssp.skill_id = s.id AND ssp.child_id = $1
      WHERE s.is_active = true
    `;
    const params: any[] = [childId];

    if (domainCode) {
      query += ` AND sd.code = $2`;
      params.push(domainCode);
    }

    query += ` ORDER BY sd.sort_order, s.skill_level, s.sort_order`;

    const result = await this.pool.query(query, params);

    return result.rows.map(row => {
      const score = parseFloat(row.current_score);
      const proficiency = this.getProficiencyFromScore(score);

      return {
        skillId: row.skill_id,
        skillCode: row.skill_code,
        skillName: row.skill_name,
        domainCode: row.domain_code,
        domainName: row.domain_name,
        currentScore: score,
        proficiencyLevel: proficiency,
        trend: row.trend as 'improving' | 'stable' | 'declining',
        assessmentsCount: row.assessments_count,
        lastAssessmentDate: row.last_assessment_date,
        streakDays: row.streak_days,
        milestonesCompleted: row.milestones_completed,
      };
    });
  }

  // ==========================================================================
  // Skill Assessment
  // ==========================================================================

  async recordSkillAssessment(input: SkillAssessmentInput): Promise<void> {
    // Get skill ID from code
    const skillResult = await this.pool.query(
      `SELECT id FROM skills WHERE code = $1`,
      [input.skillCode]
    );
    if (skillResult.rows.length === 0) {
      throw new Error(`Skill not found: ${input.skillCode}`);
    }
    const skillId = skillResult.rows[0].id;

    // Get proficiency level
    const levelResult = await this.pool.query(
      `SELECT get_proficiency_level($1) as level_id`,
      [input.score]
    );
    const levelId = levelResult.rows[0]?.level_id;

    // Insert assessment (trigger will update progress)
    await this.pool.query(
      `INSERT INTO skill_assessments 
       (child_id, skill_id, source_type, source_id, score, proficiency_level_id,
        evidence_type, evidence_data, ai_analysis, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        input.childId,
        skillId,
        input.sourceType,
        input.sourceId,
        input.score,
        levelId,
        input.evidenceType,
        JSON.stringify(input.evidenceData || {}),
        input.aiAnalysis ? JSON.stringify(input.aiAnalysis) : null,
        input.aiConfidence,
      ]
    );

    // Check for milestone achievements
    await this.checkMilestoneAchievements(input.childId, skillId);
  }

  // ==========================================================================
  // Activity Tracking (Play vs Learning Mode)
  // ==========================================================================

  /**
   * Check if an activity should be tracked for skill assessment.
   * 
   * Tracking modes:
   * - 'always': Inherently educational (math_quiz, reading_comprehension)
   * - 'assigned': Only if parent-assigned task
   * - 'optional': Child can self-initiate if age 10+ and curriculum enabled
   * - 'never': Free play (art_created, word_lookup, journal_entry)
   */
  async shouldTrackActivityForSkills(
    childId: string,
    activityType: string,
    assignmentId?: string
  ): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT should_track_activity_for_skills($1, $2, $3) as should_track`,
      [childId, activityType, assignmentId || null]
    );
    return result.rows[0]?.should_track || false;
  }

  /**
   * Get the tracking mode for an activity type.
   * Returns: 'always' | 'assigned' | 'optional' | 'never' | null
   */
  async getActivityTrackingMode(activityType: string): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT tracking_mode FROM trackable_activity_types 
       WHERE activity_type = $1 AND is_active = true`,
      [activityType]
    );
    return result.rows[0]?.tracking_mode || null;
  }

  /**
   * Derive skills from an activity - only if tracking is enabled.
   * This is the main entry point for activity-based skill assessment.
   */
  async deriveSkillsFromActivity(
    childId: string,
    activityType: string,
    activityId: string,
    activityData: Record<string, any>,
    assignmentId?: string
  ): Promise<{ tracked: boolean; reason: string }> {
    // Check if this activity should be tracked for skills
    const shouldTrack = await this.shouldTrackActivityForSkills(
      childId,
      activityType,
      assignmentId
    );

    if (!shouldTrack) {
      const mode = await this.getActivityTrackingMode(activityType);
      return {
        tracked: false,
        reason: mode === 'never' 
          ? 'Activity is free play (not tracked for skills)'
          : mode === 'assigned'
            ? 'Activity requires parent assignment to be tracked'
            : mode === 'optional'
              ? 'Child does not meet requirements for self-initiated practice'
              : 'Unknown activity type',
      };
    }

    // Get skill mappings for this activity type
    const mappingsResult = await this.pool.query(
      `SELECT asm.skill_id, s.code as skill_code, asm.assessment_weight,
              asm.scoring_method, asm.scoring_config
       FROM activity_skill_mappings asm
       JOIN skills s ON s.id = asm.skill_id
       WHERE asm.activity_type = $1 AND asm.is_active = true`,
      [activityType]
    );

    if (mappingsResult.rows.length === 0) {
      return {
        tracked: false,
        reason: 'No skill mappings defined for this activity type',
      };
    }

    let assessmentsRecorded = 0;
    for (const mapping of mappingsResult.rows) {
      const score = this.calculateActivityScore(
        mapping.scoring_method,
        mapping.scoring_config,
        activityData
      );

      if (score !== null) {
        await this.recordSkillAssessment({
          childId,
          skillCode: mapping.skill_code,
          sourceType: 'activity',
          sourceId: activityId,
          score: score * parseFloat(mapping.assessment_weight),
          evidenceType: mapping.scoring_method,
          evidenceData: { ...activityData, assignmentId },
        });
        assessmentsRecorded++;
      }
    }

    return {
      tracked: true,
      reason: `Recorded ${assessmentsRecorded} skill assessment(s)`,
    };
  }

  private calculateActivityScore(
    method: string,
    config: Record<string, any>,
    data: Record<string, any>
  ): number | null {
    switch (method) {
      case 'completion':
        // Simple completion-based scoring
        if (data.completed) {
          return config.base_score || 0.7;
        }
        return data.progress ? data.progress * 0.7 : null;

      case 'accuracy':
        // Accuracy-based scoring (e.g., math problems)
        if (data.correct !== undefined && data.total !== undefined && data.total > 0) {
          return data.correct / data.total;
        }
        return null;

      case 'rubric':
        // Rubric-based scoring (e.g., writing)
        if (data.rubricScore !== undefined && data.rubricMax !== undefined) {
          return data.rubricScore / data.rubricMax;
        }
        return null;

      case 'ai_analysis':
        // AI-derived score
        if (data.aiScore !== undefined) {
          return data.aiScore;
        }
        return null;

      case 'time_based':
        // Time-on-task scoring
        if (data.durationSeconds && config.target_seconds) {
          const ratio = data.durationSeconds / config.target_seconds;
          return Math.min(1, ratio * 0.8 + 0.2); // 20% base + up to 80% for time
        }
        return null;

      default:
        return null;
    }
  }

  // ==========================================================================
  // Milestones
  // ==========================================================================

  async getSkillMilestones(skillId: string, gradeLevel?: string): Promise<SkillMilestone[]> {
    let query = `
      SELECT sm.id, sm.skill_id, sm.grade_level, pl.name as proficiency_level,
             sm.title, sm.description, sm.success_indicators, sm.example_activities
      FROM skill_milestones sm
      JOIN proficiency_levels pl ON pl.id = sm.proficiency_level_id
      WHERE sm.skill_id = $1 AND sm.is_active = true
    `;
    const params: any[] = [skillId];

    if (gradeLevel) {
      query += ` AND sm.grade_level = $2`;
      params.push(gradeLevel);
    }

    query += ` ORDER BY pl.level_order, sm.sort_order`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      skillId: row.skill_id,
      gradeLevel: row.grade_level,
      proficiencyLevel: row.proficiency_level,
      title: row.title,
      description: row.description,
      successIndicators: row.success_indicators || [],
      exampleActivities: row.example_activities || [],
      achieved: false,
    }));
  }

  async getChildMilestones(childId: string, skillId?: string): Promise<SkillMilestone[]> {
    let query = `
      SELECT sm.id, sm.skill_id, sm.grade_level, pl.name as proficiency_level,
             sm.title, sm.description, sm.success_indicators, sm.example_activities,
             sma.achieved_at
      FROM skill_milestones sm
      JOIN proficiency_levels pl ON pl.id = sm.proficiency_level_id
      LEFT JOIN student_milestone_achievements sma ON sma.milestone_id = sm.id AND sma.child_id = $1
      WHERE sm.is_active = true
    `;
    const params: any[] = [childId];

    if (skillId) {
      query += ` AND sm.skill_id = $2`;
      params.push(skillId);
    }

    query += ` ORDER BY pl.level_order, sm.sort_order`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      skillId: row.skill_id,
      gradeLevel: row.grade_level,
      proficiencyLevel: row.proficiency_level,
      title: row.title,
      description: row.description,
      successIndicators: row.success_indicators || [],
      exampleActivities: row.example_activities || [],
      achieved: !!row.achieved_at,
      achievedAt: row.achieved_at,
    }));
  }

  private async checkMilestoneAchievements(childId: string, skillId: string): Promise<void> {
    // Get current progress
    const progressResult = await this.pool.query(
      `SELECT current_score FROM student_skill_progress
       WHERE child_id = $1 AND skill_id = $2`,
      [childId, skillId]
    );
    if (progressResult.rows.length === 0) return;

    const currentScore = parseFloat(progressResult.rows[0].current_score);

    // Get unachieved milestones that should now be achieved
    const milestonesResult = await this.pool.query(
      `SELECT sm.id, pl.min_score
       FROM skill_milestones sm
       JOIN proficiency_levels pl ON pl.id = sm.proficiency_level_id
       LEFT JOIN student_milestone_achievements sma ON sma.milestone_id = sm.id AND sma.child_id = $1
       WHERE sm.skill_id = $2 AND sma.id IS NULL AND $3 >= pl.min_score`,
      [childId, skillId, currentScore]
    );

    // Award milestones
    for (const milestone of milestonesResult.rows) {
      await this.pool.query(
        `INSERT INTO student_milestone_achievements (child_id, milestone_id)
         VALUES ($1, $2)
         ON CONFLICT (child_id, milestone_id) DO NOTHING`,
        [childId, milestone.id]
      );
    }
  }

  // ==========================================================================
  // TEKS Alignment
  // ==========================================================================

  async getTEKSStandards(subject?: string, gradeLevel?: string): Promise<CurriculumStandard[]> {
    let query = `
      SELECT cs.id, cf.code as framework_code, cs.standard_code, cs.full_code,
             cs.subject, cs.domain, cs.grade_level, cs.title, cs.description
      FROM curriculum_standards cs
      JOIN curriculum_frameworks cf ON cf.id = cs.framework_id
      WHERE cf.code = 'TEKS' AND cs.is_active = true
    `;
    const params: any[] = [];

    if (subject) {
      params.push(subject);
      query += ` AND cs.subject = $${params.length}`;
    }

    if (gradeLevel) {
      params.push(gradeLevel);
      query += ` AND (cs.grade_level = $${params.length} OR cs.grade_level LIKE '%' || $${params.length} || '%')`;
    }

    query += ` ORDER BY cs.subject, cs.grade_level, cs.standard_code`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      frameworkCode: row.framework_code,
      standardCode: row.standard_code,
      fullCode: row.full_code,
      subject: row.subject,
      domain: row.domain,
      gradeLevel: row.grade_level,
      title: row.title,
      description: row.description,
    }));
  }

  async getChildTEKSProgress(childId: string, gradeLevel?: string): Promise<{
    standard: CurriculumStandard;
    progress: number;
    proficiency: string;
    skills: { code: string; name: string; score: number }[];
  }[]> {
    const child = await this.pool.query(
      `SELECT grade_level FROM child_profiles WHERE id = $1`,
      [childId]
    );
    const grade = gradeLevel || child.rows[0]?.grade_level || '3';

    const result = await this.pool.query(
      `SELECT cs.id, cf.code as framework_code, cs.standard_code, cs.full_code,
              cs.subject, cs.domain, cs.grade_level, cs.title, cs.description,
              AVG(ssp.current_score) as avg_progress,
              json_agg(json_build_object(
                'code', s.code,
                'name', s.name,
                'score', COALESCE(ssp.current_score, 0)
              )) as skills
       FROM curriculum_standards cs
       JOIN curriculum_frameworks cf ON cf.id = cs.framework_id AND cf.code = 'TEKS'
       JOIN skill_standard_mappings ssm ON ssm.standard_id = cs.id
       JOIN skills s ON s.id = ssm.skill_id
       LEFT JOIN student_skill_progress ssp ON ssp.skill_id = s.id AND ssp.child_id = $1
       WHERE (cs.grade_level = $2 OR cs.grade_level LIKE '%' || $2 || '%')
       GROUP BY cs.id, cf.code, cs.standard_code, cs.full_code, cs.subject, cs.domain, 
                cs.grade_level, cs.title, cs.description
       ORDER BY cs.subject, cs.standard_code`,
      [childId, grade]
    );

    return result.rows.map(row => ({
      standard: {
        id: row.id,
        frameworkCode: row.framework_code,
        standardCode: row.standard_code,
        fullCode: row.full_code,
        subject: row.subject,
        domain: row.domain,
        gradeLevel: row.grade_level,
        title: row.title,
        description: row.description,
      },
      progress: parseFloat(row.avg_progress || 0),
      proficiency: this.getProficiencyFromScore(parseFloat(row.avg_progress || 0)).name,
      skills: row.skills || [],
    }));
  }

  // ==========================================================================
  // Recommendations
  // ==========================================================================

  private generateRecommendedActivities(domains: DomainProgress[]): string[] {
    const recommendations: string[] = [];

    for (const domain of domains) {
      if (domain.avgScore < 0.4) {
        // Emerging - needs foundational practice
        recommendations.push(`Practice ${domain.domain.name.toLowerCase()} basics with guided activities`);
      } else if (domain.avgScore < 0.7) {
        // Developing - needs more practice
        recommendations.push(`Continue building ${domain.domain.name.toLowerCase()} skills with varied exercises`);
      } else if (domain.trend === 'declining') {
        // Was proficient but declining
        recommendations.push(`Review ${domain.domain.name.toLowerCase()} to maintain progress`);
      }
    }

    // Add specific skill recommendations
    for (const domain of domains) {
      const weakSkills = domain.skills.filter(s => s.currentScore < 0.5);
      for (const skill of weakSkills.slice(0, 2)) {
        recommendations.push(`Focus on: ${skill.skillName}`);
      }
    }

    return recommendations.slice(0, 5);
  }
}

// ============================================================================
// Factory
// ============================================================================

let skillProgressServiceInstance: SkillProgressService | null = null;

export function getSkillProgressService(pool: Pool): SkillProgressService {
  if (!skillProgressServiceInstance) {
    skillProgressServiceInstance = new SkillProgressService(pool);
  }
  return skillProgressServiceInstance;
}
