import type { NextApiRequest, NextApiResponse } from 'next';

export interface WorkflowStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'pending' | 'queued';
  lastUpdate: string;
  progress?: number;
  details?: string;
  startTime?: string;
  endTime?: string;
  dimension?: string;
  category?: string;
  schedule?: string;
  service?: string;
  port?: number;
  cognitiveLoadReduction?: string;
}

interface ServiceHealth {
  healthy: boolean;
  details?: string;
}

async function checkServiceHealth(url: string, timeoutMs = 3000): Promise<ServiceHealth> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      return { healthy: true, details: data.status || 'healthy' };
    }
    return { healthy: false, details: `HTTP ${resp.status}` };
  } catch (e: any) {
    return { healthy: false, details: e.message || 'unreachable' };
  }
}

async function buildWorkflowRegistry(): Promise<WorkflowStatus[]> {
  const now = new Date().toISOString();

  // Check real service health in parallel
  const [picHealth, hermesHealth, approvalHealth] = await Promise.all([
    checkServiceHealth('http://localhost:8765/health'),
    checkServiceHealth('http://localhost:8780/health'),
    checkServiceHealth('http://localhost:8407/health'),
  ]);

  const workflows: WorkflowStatus[] = [
    // ── Real-Time Workflows ──────────────────────────────────
    {
      id: 'wf_email_ingestion',
      name: 'Email Ingestion & Intelligence',
      status: hermesHealth.healthy ? 'running' : 'failed',
      lastUpdate: now,
      details: hermesHealth.healthy
        ? 'Continuous: New emails → Neo4j + ChromaDB + Priority Scoring'
        : `Hermes Core unavailable: ${hermesHealth.details}`,
      dimension: 'communication',
      category: 'real-time',
      schedule: 'Continuous (event-driven)',
      service: 'hermes-core',
      port: 8780,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_priority_scoring',
      name: 'ML Priority Scoring',
      status: hermesHealth.healthy ? 'running' : 'failed',
      lastUpdate: now,
      details: hermesHealth.healthy
        ? 'Active: Scoring emails 0-100 (sender reputation, content urgency, behavioral patterns)'
        : 'Hermes Core required for priority scoring',
      dimension: 'communication',
      category: 'real-time',
      schedule: 'Per email ingested',
      service: 'hermes-core',
      port: 8780,
      cognitiveLoadReduction: 'critical',
    },
    {
      id: 'wf_approval_routing',
      name: 'Approval Routing & Risk Assessment',
      status: approvalHealth.healthy ? 'running' : 'failed',
      lastUpdate: now,
      details: approvalHealth.healthy
        ? 'Active: Risk assessment → urgency classification → iOS/Dashboard routing'
        : `ApprovalService unavailable: ${approvalHealth.details}`,
      dimension: 'infrastructure',
      category: 'real-time',
      schedule: 'On agent action request',
      service: 'approval-service',
      port: 8407,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_event_enrichment',
      name: 'Event Enrichment Service',
      status: 'running',
      lastUpdate: now,
      details: 'Active: Adding PIC + Hermes + Ticket context to system events',
      dimension: 'infrastructure',
      category: 'real-time',
      schedule: 'Continuous',
      service: 'dashboard',
      port: 8404,
      cognitiveLoadReduction: 'medium',
    },

    // ── Periodic Workflows ───────────────────────────────────
    {
      id: 'wf_daily_briefing',
      name: 'Daily Intelligence Briefing',
      status: hermesHealth.healthy ? 'running' : 'failed',
      lastUpdate: now,
      details: hermesHealth.healthy
        ? 'Scheduled: Email analysis, action items, meeting prep, audio podcast'
        : 'Hermes Core required for briefing generation',
      dimension: 'communication',
      category: 'periodic',
      schedule: '7:00 AM, 6:00 PM daily',
      service: 'hermes-core',
      port: 8780,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_pic_consolidation',
      name: 'PIC Observation Consolidation',
      status: picHealth.healthy ? 'running' : 'failed',
      lastUpdate: now,
      details: picHealth.healthy
        ? 'Hourly: Processing observations → preferences, goals, relationships'
        : `PIC unavailable: ${picHealth.details}`,
      dimension: 'goals',
      category: 'periodic',
      schedule: 'Every 1 hour',
      service: 'personal-kg',
      port: 8765,
      cognitiveLoadReduction: 'medium',
    },
    {
      id: 'wf_email_cleanup',
      name: 'Email Cleanup & Maintenance',
      status: hermesHealth.healthy ? 'running' : 'failed',
      lastUpdate: now,
      details: 'Hourly: Auto-archive newsletters (30d), notifications (14d), empty trash',
      dimension: 'communication',
      category: 'periodic',
      schedule: 'Every 1 hour',
      service: 'hermes-core',
      port: 8780,
      cognitiveLoadReduction: 'medium',
    },
    {
      id: 'wf_health_monitoring',
      name: 'Infrastructure Health Monitoring',
      status: 'running',
      lastUpdate: now,
      details: 'Active: Service health, resource utilization, predictive alerts',
      dimension: 'infrastructure',
      category: 'periodic',
      schedule: 'Every 5 minutes',
      service: 'dashboard',
      port: 8404,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_backup_verification',
      name: 'Backup Verification',
      status: 'running',
      lastUpdate: now,
      details: 'Scheduled: PostgreSQL, Neo4j, ChromaDB, configs integrity checks',
      dimension: 'infrastructure',
      category: 'periodic',
      schedule: 'Daily 3:00 AM',
      service: 'dashboard',
      port: 8404,
      cognitiveLoadReduction: 'high',
    },

    // ── Long-Horizon Workflows ───────────────────────────────
    {
      id: 'wf_preference_evolution',
      name: 'Behavioral Learning & Preference Evolution',
      status: picHealth.healthy ? 'running' : 'failed',
      lastUpdate: now,
      details: 'Continuous: Preference discovery, confidence evolution, drift detection',
      dimension: 'goals',
      category: 'long-horizon',
      schedule: 'Continuous (weeks-months)',
      service: 'personal-kg',
      port: 8765,
      cognitiveLoadReduction: 'medium',
    },
    {
      id: 'wf_relationship_intel',
      name: 'Relationship Intelligence',
      status: hermesHealth.healthy && picHealth.healthy ? 'running' : 'pending',
      lastUpdate: now,
      details: 'Building: Interaction metrics, classification, communication recommendations',
      dimension: 'communication',
      category: 'long-horizon',
      schedule: 'Continuous (weeks-months)',
      service: 'hermes-core + personal-kg',
      port: 8780,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_email_pattern_learning',
      name: 'Email Pattern Learning',
      status: hermesHealth.healthy ? 'running' : 'pending',
      lastUpdate: now,
      details: 'Active: Reading/response/deletion patterns → priority model tuning',
      dimension: 'communication',
      category: 'long-horizon',
      schedule: 'Continuous (weeks-months)',
      service: 'hermes-core',
      port: 8780,
      cognitiveLoadReduction: 'high',
    },

    // ── Voice-of-Eleazar ─────────────────────────────────────
    {
      id: 'wf_voice_of_eleazar',
      name: 'Voice-of-Eleazar Reply Drafting',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Personalized reply drafts using writing style model + PIC context',
      dimension: 'communication',
      category: 'real-time',
      schedule: 'On-demand + Daily 6:30 PM batch',
      service: 'hermes-core + personal-kg',
      port: 8780,
      cognitiveLoadReduction: 'critical',
    },
    {
      id: 'wf_batch_reply',
      name: 'Batch Reply Processing',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Process all pending replies in single approval session',
      dimension: 'communication',
      category: 'periodic',
      schedule: 'Daily 6:30 PM',
      service: 'openclaw + hermes-core',
      port: 18793,
      cognitiveLoadReduction: 'critical',
    },

    // ── Family Coordination ──────────────────────────────────
    {
      id: 'wf_family_calendar',
      name: 'Family Calendar Optimization',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Daily family schedule, conflicts, logistics for Sofia, Luca, Arik',
      dimension: 'family',
      category: 'periodic',
      schedule: 'Daily 6:00 AM',
      service: 'calendar-integration',
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_school_monitor',
      name: 'School Communication Monitor',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Flag emails from Groves Elementary, prioritize school communications',
      dimension: 'family',
      category: 'real-time',
      schedule: 'Continuous',
      service: 'hermes-core',
      port: 8780,
      cognitiveLoadReduction: 'medium',
    },
    {
      id: 'wf_kids_milestones',
      name: 'Kids Milestone Tracking',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Sofia (9), Luca (7), Arik (1.5) developmental milestones + TEKS alignment',
      dimension: 'family',
      category: 'periodic',
      schedule: 'Monthly',
      service: 'personal-kg',
      port: 8765,
      cognitiveLoadReduction: 'medium',
    },

    // ── Research & Education ─────────────────────────────────
    {
      id: 'wf_literature_monitor',
      name: 'Medical/Tech Literature Monitoring',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: PubMed + arXiv papers matching research interests, summarized daily',
      dimension: 'research',
      category: 'periodic',
      schedule: 'Daily 6:00 AM',
      service: 'perplexity-mcp',
      cognitiveLoadReduction: 'medium',
    },
    {
      id: 'wf_cme_tracking',
      name: 'CME Hour Tracking',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Continuing medical education hours, gaps, renewal deadlines',
      dimension: 'clinical',
      category: 'periodic',
      schedule: 'Weekly',
      service: 'personal-kg',
      port: 8765,
      cognitiveLoadReduction: 'medium',
    },

    // ── Health & Wellness ────────────────────────────────────
    {
      id: 'wf_cognitive_load',
      name: 'Cognitive Load Monitoring',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Calendar density + email volume → exhaustion prediction, rest recommendations',
      dimension: 'health',
      category: 'periodic',
      schedule: 'Daily 7:00 AM',
      service: 'dashboard',
      port: 8404,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_sleep_analysis',
      name: 'Sleep Pattern Analysis',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Apple HealthKit → sleep quality trends, optimization recommendations',
      dimension: 'health',
      category: 'periodic',
      schedule: 'Daily 7:00 AM',
      service: 'ios-companion',
      cognitiveLoadReduction: 'medium',
    },

    // ── Financial Intelligence ───────────────────────────────
    {
      id: 'wf_portfolio_monitor',
      name: 'Portfolio Monitoring & Analysis',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Daily portfolio performance, sector analysis, NPV/IRR automation',
      dimension: 'financial',
      category: 'periodic',
      schedule: 'Daily 7:00 AM',
      service: 'financial-intelligence',
      cognitiveLoadReduction: 'medium',
    },

    // ── Goal Tracking ────────────────────────────────────────
    {
      id: 'wf_goal_progress',
      name: 'Goal Progress Dashboard',
      status: picHealth.healthy ? 'running' : 'pending',
      lastUpdate: now,
      details: picHealth.healthy
        ? 'Active: Visual progress on all active goals from PIC'
        : 'PIC required for goal tracking',
      dimension: 'goals',
      category: 'periodic',
      schedule: 'Weekly Sunday',
      service: 'personal-kg',
      port: 8765,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_accountability',
      name: 'Weekly Accountability Check-in',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Nova voice-based weekly review and planning session',
      dimension: 'goals',
      category: 'periodic',
      schedule: 'Weekly Sunday 8:00 PM',
      service: 'nova-agent',
      port: 18803,
      cognitiveLoadReduction: 'high',
    },

    // ── Cross-Agent Coordination ─────────────────────────────
    {
      id: 'wf_nova_delegation',
      name: 'Nova → OpenClaw Task Delegation',
      status: 'running',
      lastUpdate: now,
      details: 'Active: Voice command → intent classification → skill execution',
      dimension: 'infrastructure',
      category: 'real-time',
      schedule: 'On-demand',
      service: 'nova-agent + openclaw',
      port: 18803,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_headless_orchestration',
      name: 'Headless Recipe Orchestration',
      status: 'running',
      lastUpdate: now,
      details: 'Active: Scheduled/event-driven recipe execution with output capture',
      dimension: 'infrastructure',
      category: 'periodic',
      schedule: 'Configurable per recipe',
      service: 'dashboard-backend',
      port: 8404,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_incident_response',
      name: 'Incident Detection & Auto-Response',
      status: 'running',
      lastUpdate: now,
      details: 'Active: Anomaly detection → runbook execution → ticket creation',
      dimension: 'infrastructure',
      category: 'real-time',
      schedule: 'Continuous',
      service: 'dashboard',
      port: 8404,
      cognitiveLoadReduction: 'high',
    },

    // ── Model Thinker Engine ───────────────────────────────
    {
      id: 'wf_model_thinker',
      name: 'Model Thinker Multi-Lens Analysis',
      status: 'running',
      lastUpdate: now,
      details: 'Active: Scott Page many-model thinking — 25 model classes, auto-selects 3-5 per question',
      dimension: 'goals',
      category: 'real-time',
      schedule: 'On-demand (any analytical question)',
      service: 'dashboard + ai-gateway',
      port: 8404,
      cognitiveLoadReduction: 'critical',
    },
    {
      id: 'wf_model_briefing',
      name: 'Morning Model Thinker Briefing',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Multi-model predictions for the day — convergence/divergence alerts',
      dimension: 'goals',
      category: 'periodic',
      schedule: 'Daily 7:00 AM',
      service: 'hermes-core + model-thinker',
      port: 8780,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_investment_analyzer',
      name: 'Investment Decision Multi-Model Analysis',
      status: 'running',
      lastUpdate: now,
      details: 'Active: Random Walk + Power Law + Concavity + Bandit + Signaling per investment question',
      dimension: 'financial',
      category: 'real-time',
      schedule: 'On-demand',
      service: 'model-thinker',
      port: 8404,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_career_analyzer',
      name: 'Career Decision Analyzer',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Rugged Landscape + Path Dependence + Signaling + Network for career path decisions',
      dimension: 'goals',
      category: 'real-time',
      schedule: 'On-demand',
      service: 'model-thinker',
      port: 8404,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_family_decision',
      name: 'Family Decision Support',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Mechanism Design + Cooperation + Collective Action + Shapley for family decisions',
      dimension: 'family',
      category: 'real-time',
      schedule: 'On-demand',
      service: 'model-thinker',
      port: 8404,
      cognitiveLoadReduction: 'high',
    },

    // ── Cognitive Science Dimensions (9-16) ──────────────────

    // D9: Metacognition & Decision Quality
    {
      id: 'wf_bias_detection',
      name: 'Cognitive Bias Detection',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Flag anchoring, availability, confirmation biases in real-time reasoning (Flavell/Kahneman)',
      dimension: 'metacognition',
      category: 'real-time',
      schedule: 'On analytical questions',
      service: 'model-thinker',
      port: 8404,
      cognitiveLoadReduction: 'critical',
    },
    {
      id: 'wf_prediction_calibration',
      name: 'Prediction Calibration Tracker',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Track predictions vs outcomes, measure Dunning-Kruger risk, improve self-assessment accuracy',
      dimension: 'metacognition',
      category: 'periodic',
      schedule: 'Weekly',
      service: 'personal-kg',
      port: 8765,
      cognitiveLoadReduction: 'high',
    },

    // D10: Decision Fatigue Management
    {
      id: 'wf_decision_budget',
      name: 'Decision Budget Tracker',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Count daily decisions, alert at fatigue threshold (Baumeister ego depletion)',
      dimension: 'decision_fatigue',
      category: 'real-time',
      schedule: 'Continuous',
      service: 'dashboard',
      port: 8404,
      cognitiveLoadReduction: 'critical',
    },
    {
      id: 'wf_auto_delegation',
      name: 'Routine Decision Auto-Delegation',
      status: approvalHealth.healthy ? 'running' : 'pending',
      lastUpdate: now,
      details: approvalHealth.healthy
        ? 'Active: Low-stakes decisions auto-routed (Thaler/Sunstein choice architecture)'
        : 'ApprovalService required for delegation',
      dimension: 'decision_fatigue',
      category: 'real-time',
      schedule: 'Continuous',
      service: 'openclaw + approval-service',
      port: 8407,
      cognitiveLoadReduction: 'critical',
    },

    // D11: Flow States & Deep Work
    {
      id: 'wf_deep_work_scheduler',
      name: 'Deep Work Block Scheduler',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Auto-schedule 2-4h uninterrupted blocks at peak energy (Csikszentmihalyi/Newport)',
      dimension: 'flow',
      category: 'periodic',
      schedule: 'Daily 6:00 AM',
      service: 'calendar-integration',
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_distraction_suppression',
      name: 'Flow State Protection',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Silence non-critical notifications during deep blocks, queue approvals (Kotler flow triggers)',
      dimension: 'flow',
      category: 'real-time',
      schedule: 'During deep work blocks',
      service: 'dashboard + ios-companion',
      port: 8404,
      cognitiveLoadReduction: 'high',
    },

    // D12: Attention & Cognitive Load Management
    {
      id: 'wf_info_chunking',
      name: 'Information Chunking Engine',
      status: hermesHealth.healthy ? 'running' : 'failed',
      lastUpdate: now,
      details: hermesHealth.healthy
        ? 'Active: 47 emails → 5-min briefing; Sweller cognitive load optimization'
        : 'Hermes Core required for chunking',
      dimension: 'attention',
      category: 'real-time',
      schedule: 'Continuous',
      service: 'hermes-core',
      port: 8780,
      cognitiveLoadReduction: 'critical',
    },
    {
      id: 'wf_ultradian_breaks',
      name: 'Ultradian Break Reminders',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: 90-min work cycle enforcement with 15-20 min recovery (Posner attention networks)',
      dimension: 'attention',
      category: 'periodic',
      schedule: 'Every 90 minutes',
      service: 'ios-companion',
      cognitiveLoadReduction: 'medium',
    },

    // D13: Chronobiology & Energy Management
    {
      id: 'wf_energy_task_alignment',
      name: 'Energy-Task Alignment Engine',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Schedule complex tasks at circadian peak, routine at trough (Roenneberg chronotype theory)',
      dimension: 'chronobiology',
      category: 'periodic',
      schedule: 'Daily 6:00 AM',
      service: 'calendar-integration + ios-companion',
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_post_clinical_recovery',
      name: 'Post-Clinical Recovery Protocol',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Personalized wind-down after clinic days (Lavie ultradian recovery)',
      dimension: 'chronobiology',
      category: 'real-time',
      schedule: 'After clinical shifts',
      service: 'ios-companion + personal-kg',
      port: 8765,
      cognitiveLoadReduction: 'high',
    },

    // D14: Social Capital & Relationship Intelligence
    {
      id: 'wf_weak_tie_maintenance',
      name: 'Weak Tie Maintenance Agent',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Monthly outreach suggestions for dormant high-value connections (Granovetter weak ties)',
      dimension: 'social_capital',
      category: 'periodic',
      schedule: 'Monthly',
      service: 'personal-kg + hermes-core',
      port: 8765,
      cognitiveLoadReduction: 'medium',
    },
    {
      id: 'wf_dunbar_tracker',
      name: 'Dunbar Layer Tracker',
      status: picHealth.healthy ? 'running' : 'pending',
      lastUpdate: now,
      details: picHealth.healthy
        ? 'Active: Track inner circle (5), close (15), friends (50), acquaintances (150)'
        : 'PIC required for relationship tracking',
      dimension: 'social_capital',
      category: 'periodic',
      schedule: 'Monthly',
      service: 'personal-kg',
      port: 8765,
      cognitiveLoadReduction: 'medium',
    },

    // D15: Meaning, Motivation & Self-Determination
    {
      id: 'wf_sdt_fulfillment',
      name: 'SDT Need Fulfillment Monitor',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Track autonomy/competence/relatedness daily (Deci & Ryan self-determination theory)',
      dimension: 'meaning',
      category: 'periodic',
      schedule: 'Weekly Sunday',
      service: 'personal-kg + nova-agent',
      port: 8765,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_perma_profiling',
      name: 'PERMA Well-Being Profiler',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Seligman PERMA model — Positive emotion, Engagement, Relationships, Meaning, Achievement',
      dimension: 'meaning',
      category: 'periodic',
      schedule: 'Weekly Sunday',
      service: 'nova-agent + personal-kg',
      port: 18803,
      cognitiveLoadReduction: 'high',
    },

    // D16: Habit Architecture & Behavioral Design
    {
      id: 'wf_habit_streaks',
      name: 'Habit Streak Tracker',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Track active habit streaks, celebrate milestones, alert on breaks (BJ Fogg tiny habits)',
      dimension: 'habits',
      category: 'periodic',
      schedule: 'Daily 9:00 PM',
      service: 'personal-kg + ios-companion',
      port: 8765,
      cognitiveLoadReduction: 'high',
    },
    {
      id: 'wf_habit_decay_detection',
      name: 'Habit Decay Early Warning',
      status: 'pending',
      lastUpdate: now,
      details: 'Planned: Flag declining adherence before habits break completely (Gollwitzer implementation intentions)',
      dimension: 'habits',
      category: 'periodic',
      schedule: 'Weekly',
      service: 'personal-kg',
      port: 8765,
      cognitiveLoadReduction: 'medium',
    },
  ];

  return workflows;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WorkflowStatus[] | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { dimension, category, status: filterStatus } = req.query;
    let workflows = await buildWorkflowRegistry();

    if (dimension && typeof dimension === 'string') {
      workflows = workflows.filter(w => w.dimension === dimension);
    }
    if (category && typeof category === 'string') {
      workflows = workflows.filter(w => w.category === category);
    }
    if (filterStatus && typeof filterStatus === 'string') {
      workflows = workflows.filter(w => w.status === filterStatus);
    }

    return res.status(200).json(workflows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch workflows' });
  }
}
