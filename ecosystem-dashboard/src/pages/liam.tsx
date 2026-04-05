import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Text,
  Spinner,
  HStack,
  VStack,
  Badge,
  Button,
  Flex,
  IconButton,
  SimpleGrid,
  useColorModeValue,
  Heading,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { FiRefreshCw, FiBookOpen, FiTarget, FiLayers, FiZap, FiLink, FiChevronRight, FiDatabase, FiCpu } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { WorkflowStatus } from '@/pages/api/get-workflow-status';

// ── Rich Dimension Metadata with Educational Content ─────────────────

interface DimensionDetail {
  id: string;
  label: string;
  short: string;
  icon: string;
  accent: string;
  group: 'core' | 'cognitive';
  description: string;
  whyItMatters: string;
  scientificBasis: string;
  modelThinkerModels: string[];
  keyInsights: string[];
  relatedDimensions: string[];
  status: 'operational' | 'in-progress' | 'planned' | 'future';
  workflows: { name: string; status: string }[];
}

const DIMENSIONS: DimensionDetail[] = [
  {
    id: 'clinical',
    label: 'Clinical Practice & Patient Care',
    short: 'Clinical',
    icon: '🏥',
    accent: '#E53E3E',
    group: 'core',
    description: 'Patient care, medical decisions, clinic operations, and clinical knowledge management.',
    whyItMatters: 'As a practicing physician, cognitive exhaustion by end-of-day leaves little capacity for critical patient communications. Missing an urgent message can have serious consequences.',
    scientificBasis: 'Evidence-based medicine requires continuous learning. The average physician spends 2 hours on EHR for every 1 hour of patient care (Sinsky et al., 2016). AI-assisted triage can recover 40% of this administrative time.',
    modelThinkerModels: ['Filter', 'Network', 'Threshold', 'Complementarity'],
    keyInsights: [
      'Priority scoring reduces cognitive load by 60%',
      'Literature alerts keep knowledge current without manual searching',
      'Decision support augments (not replaces) clinical judgment',
    ],
    relatedDimensions: ['research', 'health'],
    status: 'operational',
    workflows: [
      { name: 'Clinical email triage', status: 'operational' },
      { name: 'Medical literature alerts', status: 'planned' },
      { name: 'CME tracking', status: 'planned' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication & Messaging',
    short: 'Comm',
    icon: '✉️',
    accent: '#3182CE',
    group: 'core',
    description: 'Email, messaging, voice-of-Eleazar preservation, and relationship maintenance.',
    whyItMatters: 'Communication is the #1 daily energy drain. After seeing patients all day, drafting personalized replies feels impossible. This dimension eliminates that friction while preserving authentic voice.',
    scientificBasis: 'Self-determination theory (Deci & Ryan) shows authentic communication strengthens relationships. Studies show people can detect AI-generated writing—preserving voice requires learning individual communication patterns.',
    modelThinkerModels: ['Signaling', 'Game Theory', 'Markov', 'LDA'],
    keyInsights: [
      'Tone calibration per recipient improves relationship quality',
      'Batch processing reduces context-switching costs',
      'Voice preservation requires continuous learning from corrections',
    ],
    relatedDimensions: ['family', 'social_capital'],
    status: 'in-progress',
    workflows: [
      { name: 'Personalized reply drafting', status: 'in-progress' },
      { name: 'Tone calibration', status: 'in-progress' },
      { name: 'Message prioritization', status: 'operational' },
    ],
  },
  {
    id: 'family',
    label: 'Family Coordination',
    short: 'Family',
    icon: '👨‍👩‍👧‍👦',
    accent: '#D53F8C',
    group: 'core',
    description: 'Family scheduling, activities, school communications, and relationship tracking.',
    whyItMatters: 'Coordinating 3 kids across different activities creates logistical complexity. Missing a pickup time or school event has immediate family impact.',
    scientificBasis: 'Family systems theory (Bowen) emphasizes that family is an emotional unit. Research shows parental stress directly impacts child wellbeing—reducing logistics burden improves family dynamics.',
    modelThinkerModels: ['Network', 'Markov', 'Threshold', 'Diffusion'],
    keyInsights: [
      'Calendar optimization reduces conflict by 70%',
      'School communication monitoring catches important notices',
      'Milestone tracking supports developmental awareness',
    ],
    relatedDimensions: ['communication', 'health', 'goals'],
    status: 'in-progress',
    workflows: [
      { name: 'Family calendar optimization', status: 'planned' },
      { name: 'School communication monitor', status: 'planned' },
      { name: 'Kids activity tracking', status: 'in-progress' },
    ],
  },
  {
    id: 'research',
    label: 'Research & Education',
    short: 'Research',
    icon: '🔬',
    accent: '#805AD5',
    group: 'core',
    description: 'Medical research, continuing education, publications, and knowledge graph expansion.',
    whyItMatters: 'Staying current with medical literature is both professional requirement and intellectual passion. Manual searching wastes time better spent on patient care or family.',
    scientificBasis: 'The half-life of medical knowledge is ~5 years. Physicians need to process ~7,500 articles daily to stay current (Alper et al., 2004). AI-assisted filtering makes this tractable.',
    modelThinkerModels: ['Filter', 'Topic Model', 'Search', 'Recommendation'],
    keyInsights: [
      'Literature monitoring surfaces relevant papers automatically',
      'Knowledge graph expansion creates serendipitous connections',
      'Model evaluation ensures best tool for each task',
    ],
    relatedDimensions: ['clinical', 'infrastructure'],
    status: 'planned',
    workflows: [
      { name: 'Literature monitoring', status: 'planned' },
      { name: 'Research project tracking', status: 'in-progress' },
      { name: 'Knowledge graph expansion', status: 'future' },
    ],
  },
  {
    id: 'health',
    label: 'Health & Wellness',
    short: 'Health',
    icon: '💚',
    accent: '#38A169',
    group: 'core',
    description: 'Personal health, fitness, nutrition, sleep, and preventive care.',
    whyItMatters: 'Physician, heal thyself. Doctors are notoriously bad at their own health. Proactive wellness prevents burnout and models healthy behavior for family.',
    scientificBasis: 'Chronobiology research shows alignment with circadian rhythms improves cognitive performance by 20%. Sleep debt compounds—recovering from 1 hour lost takes 4+ nights.',
    modelThinkerModels: ['Threshold', 'Diffusion', 'Oscillator', 'Fitness'],
    keyInsights: [
      'Sleep pattern analysis reveals optimization opportunities',
      'Cognitive load monitoring predicts exhaustion before it hits',
      'Family health coordination tracks pediatric schedules',
    ],
    relatedDimensions: ['chronobiology', 'attention', 'family'],
    status: 'planned',
    workflows: [
      { name: 'Sleep pattern analysis', status: 'planned' },
      { name: 'Exercise tracking', status: 'operational' },
      { name: 'Cognitive load monitoring', status: 'planned' },
    ],
  },
  {
    id: 'financial',
    label: 'Financial Intelligence',
    short: 'Financial',
    icon: '💰',
    accent: '#D69E2E',
    group: 'core',
    description: 'Investments, budgeting, financial planning, and wealth optimization.',
    whyItMatters: 'MBA-level financial analysis without the spreadsheet time. Investment theses need tracking against market data to avoid emotional decisions.',
    scientificBasis: 'Behavioral finance (Kahneman, Thaler) shows investors systematically make suboptimal decisions. Automated tracking removes emotion from portfolio management.',
    modelThinkerModels: ['Discounted Cash Flow', 'CAPM', 'Monte Carlo', 'Game Theory'],
    keyInsights: [
      'Portfolio monitoring provides daily situational awareness',
      'Thesis tracking prevents drift from investment rationale',
      'NPV/IRR automation enables rapid decision-making',
    ],
    relatedDimensions: ['goals', 'infrastructure'],
    status: 'planned',
    workflows: [
      { name: 'Portfolio monitoring', status: 'planned' },
      { name: 'Investment thesis tracking', status: 'planned' },
      { name: 'NPV/IRR analysis', status: 'planned' },
    ],
  },
  {
    id: 'goals',
    label: 'Goals & Milestones',
    short: 'Goals',
    icon: '🎯',
    accent: '#DD6B20',
    group: 'core',
    description: 'Personal and professional goal tracking, quarterly reviews, and career trajectory.',
    whyItMatters: 'Without explicit goal tracking, day-to-day demands crowd out long-term priorities. Quarterly reviews prevent drift and maintain strategic focus.',
    scientificBasis: 'Locke & Latham goal-setting theory: specific hard goals produce higher performance than easy goals. Progress tracking provides motivation through visible advancement.',
    modelThinkerModels: ['Sigmoid', 'Oscillator', 'Path Dependency', 'Multi-Armed Bandit'],
    keyInsights: [
      'Goal dashboards make progress visible',
      'Quarterly reviews prevent goal drift',
      'Career trajectory modeling informs skill development',
    ],
    relatedDimensions: ['meaning', 'habits'],
    status: 'in-progress',
    workflows: [
      { name: 'Goal progress dashboard', status: 'in-progress' },
      { name: 'Quarterly goal review', status: 'planned' },
      { name: 'Career trajectory modeling', status: 'future' },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure & Tech',
    short: 'Infra',
    icon: '⚙️',
    accent: '#718096',
    group: 'core',
    description: 'Homelab, tech stack, system maintenance, and AI infrastructure management.',
    whyItMatters: 'The AI homelab is a force multiplier. Keeping systems running ensures all other dimensions have the computational foundation they need.',
    scientificBasis: 'Reliability engineering (SRE principles) emphasizes that downtime has cascading effects. Proactive monitoring prevents the 2 AM wake-up call.',
    modelThinkerModels: ['Redundancy', 'Cascade', 'Sandpile', 'Reliability'],
    keyInsights: [
      'Health monitoring catches issues before they cascade',
      'GPU allocation optimization maximizes capability',
      'Backup systems ensure continuity',
    ],
    relatedDimensions: ['research'],
    status: 'operational',
    workflows: [
      { name: 'Service health monitoring', status: 'operational' },
      { name: 'GPU resource allocation', status: 'operational' },
      { name: 'Backup automation', status: 'operational' },
    ],
  },
  // Cognitive Science Dimensions
  {
    id: 'metacognition',
    label: 'Metacognition',
    short: 'Metacog',
    icon: '🪞',
    accent: '#00B5D8',
    group: 'cognitive',
    description: 'Self-awareness, decision quality, bias detection, and thinking process optimization.',
    whyItMatters: 'Thinking about thinking is the highest-leverage intervention. Understanding your own cognitive patterns lets you compensate for weaknesses.',
    scientificBasis: 'Metacognition research (Flavell, 1979) shows experts have superior monitoring of their own comprehension. Training metacognitive skills improves learning and decision quality across domains.',
    modelThinkerModels: ['Model of Models', 'Agent-Based', 'Emergence', 'Feedback Loop'],
    keyInsights: [
      'Bias detection surfaces systematic thinking errors',
      'Decision journaling creates metacognitive data',
      'Cognitive pattern recognition reveals personal blind spots',
    ],
    relatedDimensions: ['decision_fatigue', 'attention', 'meaning'],
    status: 'planned',
    workflows: [
      { name: 'Bias detection', status: 'planned' },
      { name: 'Decision quality scoring', status: 'future' },
      { name: 'Cognitive pattern analysis', status: 'future' },
    ],
  },
  {
    id: 'decision_fatigue',
    label: 'Decision Fatigue',
    short: 'Decision',
    icon: '🔋',
    accent: '#E53E3E',
    group: 'cognitive',
    description: 'Cognitive load management, decision optimization, and ego depletion prevention.',
    whyItMatters: 'Every decision depletes the same reservoir. Saving decisions for high-stakes choices preserves judgment when it matters most.',
    scientificBasis: 'Baumeister\'s ego depletion research shows decision-making consumes self-regulatory resources. Strategic decision avoidance preserves capacity for important choices.',
    modelThinkerModels: ['Threshold', 'Satisficing', 'Heuristic', 'Conservation'],
    keyInsights: [
      'Decision load tracking predicts exhaustion',
      'Ritualization reduces daily decisions',
      'Batch processing consolidates low-stakes choices',
    ],
    relatedDimensions: ['metacognition', 'flow', 'habits'],
    status: 'planned',
    workflows: [
      { name: 'Decision load tracking', status: 'planned' },
      { name: 'Decision ritualization', status: 'future' },
      { name: 'Cognitive restoration scheduling', status: 'future' },
    ],
  },
  {
    id: 'flow',
    label: 'Flow & Deep Work',
    short: 'Flow',
    icon: '🌊',
    accent: '#3182CE',
    group: 'cognitive',
    description: 'Deep work sessions, focus optimization, and flow state engineering.',
    whyItMatters: 'Flow is the optimal state for high-value output. Protecting flow time from interruption is the highest-leverage time management intervention.',
    scientificBasis: 'Csikszentmihalyi\'s flow research shows deep immersion produces both superior output and subjective wellbeing. Flow requires clear goals, immediate feedback, and challenge-skill balance.',
    modelThinkerModels: ['Oscillator', 'Fitness', 'Control Theory', 'Reinforcement Learning'],
    keyInsights: [
      'Flow state detection identifies optimal work windows',
      'Deep work protection prevents interruption',
      'Challenge calibration maintains engagement',
    ],
    relatedDimensions: ['attention', 'chronobiology', 'habits'],
    status: 'planned',
    workflows: [
      { name: 'Flow state detection', status: 'planned' },
      { name: 'Deep work scheduling', status: 'planned' },
      { name: 'Focus environment optimization', status: 'future' },
    ],
  },
  {
    id: 'attention',
    label: 'Attention & Cognitive Load',
    short: 'Attention',
    icon: '🧠',
    accent: '#805AD5',
    group: 'cognitive',
    description: 'Cognitive load management, distraction filtering, and attention economy.',
    whyItMatters: 'Attention is the scarcest resource. Every notification is a tax on cognitive capacity. Protecting attention is protecting productivity.',
    scientificBasis: 'Attention economy (Simon, 1971): "A wealth of information creates a poverty of attention." Research shows it takes 23 minutes to refocus after interruption.',
    modelThinkerModels: ['Filter', 'Priority Queue', 'Attention Mechanism', 'Information Theory'],
    keyInsights: [
      'Notification filtering reduces context-switching',
      'Attention tracking reveals focus patterns',
      'Cognitive load balancing prevents overload',
    ],
    relatedDimensions: ['decision_fatigue', 'flow', 'chronobiology'],
    status: 'planned',
    workflows: [
      { name: 'Notification filtering', status: 'planned' },
      { name: 'Attention tracking', status: 'future' },
      { name: 'Cognitive load balancing', status: 'future' },
    ],
  },
  {
    id: 'chronobiology',
    label: 'Chronobiology',
    short: 'Chrono',
    icon: '🕐',
    accent: '#319795',
    group: 'cognitive',
    description: 'Circadian rhythms, energy management, and temporal optimization.',
    whyItMatters: 'Cognitive performance varies 20-30% across the day. Aligning task types with biological peaks maximizes output without extra effort.',
    scientificBasis: 'Circadian research shows body temperature, cortisol, and alertness follow ~24-hour rhythms. Peak performance requires matching task demands to biological state.',
    modelThinkerModels: ['Oscillator', 'Circadian', 'Temporal Dynamics', 'Optimization'],
    keyInsights: [
      'Energy mapping reveals personal peak hours',
      'Task-energy matching optimizes daily structure',
      'Light exposure optimization improves sleep quality',
    ],
    relatedDimensions: ['health', 'flow', 'attention'],
    status: 'planned',
    workflows: [
      { name: 'Energy mapping', status: 'planned' },
      { name: 'Task-energy matching', status: 'future' },
      { name: 'Sleep optimization', status: 'future' },
    ],
  },
  {
    id: 'social_capital',
    label: 'Social Capital',
    short: 'Social',
    icon: '🤝',
    accent: '#D53F8C',
    group: 'cognitive',
    description: 'Relationship intelligence, network health, and social support optimization.',
    whyItMatters: 'Social capital is the strongest predictor of wellbeing and career success. Nurturing relationships requires intentional effort that doesn\'t happen by accident.',
    scientificBasis: 'Social network research (Granovetter) shows weak ties provide novel information. Putnam\'s "Bowling Alone" documents decline in social capital—intentional cultivation counters this trend.',
    modelThinkerModels: ['Network', 'Diffusion', 'Centrality', 'Community Detection'],
    keyInsights: [
      'Relationship tracking surfaces maintenance needs',
      'Network analysis reveals structural holes',
      'Social support mapping identifies isolation risk',
    ],
    relatedDimensions: ['communication', 'meaning', 'family'],
    status: 'planned',
    workflows: [
      { name: 'Relationship tracking', status: 'planned' },
      { name: 'Network analysis', status: 'future' },
      { name: 'Social support mapping', status: 'future' },
    ],
  },
  {
    id: 'meaning',
    label: 'Meaning & Purpose',
    short: 'Meaning',
    icon: '✨',
    accent: '#D69E2E',
    group: 'cognitive',
    description: 'Purpose alignment, values clarification, and existential wellbeing.',
    whyItMatters: 'Meaning is the ultimate meta-question. Without clarity on purpose, other optimizations feel empty. Viktor Frankl: "Man\'s main concern is not to gain pleasure or to avoid pain but rather to see a meaning in his life."',
    scientificBasis: 'Logotherapy research (Frankl) shows meaning-seeking is fundamental human motivation. Positive psychology (Seligman) identifies meaning as key component of wellbeing beyond pleasure.',
    modelThinkerModels: ['Value Function', 'Multi-Objective', 'Purpose Alignment', 'Meaning Mapping'],
    keyInsights: [
      'Values clarification provides decision anchors',
      'Purpose alignment checks prevent drift',
      'Meaningful moments tracking builds gratitude',
    ],
    relatedDimensions: ['goals', 'habits', 'social_capital'],
    status: 'planned',
    workflows: [
      { name: 'Values clarification', status: 'future' },
      { name: 'Purpose alignment check', status: 'future' },
      { name: 'Meaningful moments tracking', status: 'future' },
    ],
  },
  {
    id: 'habits',
    label: 'Habit Architecture',
    short: 'Habits',
    icon: '🔄',
    accent: '#38A169',
    group: 'cognitive',
    description: 'Behavior design, habit tracking, and routine optimization.',
    whyItMatters: '40% of daily actions are habits, not decisions. Optimizing habit architecture is the highest-leverage behavior change strategy.',
    scientificBasis: 'Duhigg\'s habit loop: cue → routine → reward. Wood & Neal research shows habits persist because they become neurologically efficient. James\'s "laws of habit" provide design principles.',
    modelThinkerModels: ['Reinforcement Learning', 'Habit Loop', 'Behavior Change', 'Fogg\'s Behavior Model'],
    keyInsights: [
      'Habit stacking leverages existing routines',
      'Environment design reduces friction',
      'Reward optimization strengthens habit formation',
    ],
    relatedDimensions: ['goals', 'health', 'flow'],
    status: 'planned',
    workflows: [
      { name: 'Habit tracking', status: 'planned' },
      { name: 'Habit stacking design', status: 'future' },
      { name: 'Environment optimization', status: 'future' },
    ],
  },
];

// ── Knowledge Graph Nodes ───────────────────────────────────────────

interface KGNode {
  id: string;
  label: string;
  type: 'dimension' | 'model' | 'concept';
}

const KNOWLEDGE_GRAPH: KGNode[] = [
  // Core dimensions
  { id: 'clinical', label: 'Clinical', type: 'dimension' },
  { id: 'communication', label: 'Communication', type: 'dimension' },
  { id: 'family', label: 'Family', type: 'dimension' },
  { id: 'research', label: 'Research', type: 'dimension' },
  { id: 'health', label: 'Health', type: 'dimension' },
  { id: 'financial', label: 'Financial', type: 'dimension' },
  { id: 'goals', label: 'Goals', type: 'dimension' },
  { id: 'infrastructure', label: 'Infra', type: 'dimension' },
  // Cognitive dimensions
  { id: 'metacognition', label: 'Metacognition', type: 'dimension' },
  { id: 'decision_fatigue', label: 'Decision Fatigue', type: 'dimension' },
  { id: 'flow', label: 'Flow', type: 'dimension' },
  { id: 'attention', label: 'Attention', type: 'dimension' },
  { id: 'chronobiology', label: 'Chronobiology', type: 'dimension' },
  { id: 'social_capital', label: 'Social Capital', type: 'dimension' },
  { id: 'meaning', label: 'Meaning', type: 'dimension' },
  { id: 'habits', label: 'Habits', type: 'dimension' },
  // Key concepts
  { id: 'model_thinker', label: 'Model Thinker', type: 'concept' },
  { id: 'cognitive_load', label: 'Cognitive Load', type: 'concept' },
  { id: 'self_determination', label: 'Self-Determination', type: 'concept' },
  { id: 'habit_loop', label: 'Habit Loop', type: 'concept' },
];

// ── PIC Integration Matrix ──────────────────────────────────────────
// Shows how PIC (Personal Intelligence Context) serves each LIAM dimension

interface PICIntegration {
  dimension: string;
  picRole: 'primary' | 'significant' | 'supporting' | 'none';
  dataFlows: string[];
  picEndpoints: string[];
}

const PIC_INTEGRATIONS: PICIntegration[] = [
  {
    dimension: 'clinical',
    picRole: 'supporting',
    dataFlows: ['Clinical profile → MedGemma context', 'CME goals tracking'],
    picEndpoints: ['/api/pic/goals', '/api/pic/identity'],
  },
  {
    dimension: 'communication',
    picRole: 'primary',
    dataFlows: [
      'Relationships → Tone calibration',
      'Writing style → Voice-of-Eleazar',
      'Preferences → Reply drafting',
    ],
    picEndpoints: ['/api/pic/relationships', '/api/pic/preferences', '/api/pic/identity'],
  },
  {
    dimension: 'family',
    picRole: 'primary',
    dataFlows: [
      'Kids data → Activity tracking',
      'Family relationships → Calendar optimization',
      'Preferences → Meal planning',
    ],
    picEndpoints: ['/api/pic/family', '/api/pic/preferences', '/api/pic/goals'],
  },
  {
    dimension: 'research',
    picRole: 'significant',
    dataFlows: ['Research interests → Literature filtering', 'Learning goals → Knowledge graph'],
    picEndpoints: ['/api/pic/goals', '/api/pic/learn/observations'],
  },
  {
    dimension: 'health',
    picRole: 'significant',
    dataFlows: ['Health goals → Fitness tracking', 'Preferences → Nutrition awareness'],
    picEndpoints: ['/api/pic/goals', '/api/pic/preferences'],
  },
  {
    dimension: 'financial',
    picRole: 'supporting',
    dataFlows: ['MBA profile → NPV/IRR analysis', 'Investment goals → Thesis tracking'],
    picEndpoints: ['/api/pic/identity', '/api/pic/goals'],
  },
  {
    dimension: 'goals',
    picRole: 'primary',
    dataFlows: [
      'All goals → Progress dashboard',
      'Goal dependencies → Critical path',
      'Milestones → Quarterly reviews',
    ],
    picEndpoints: ['/api/pic/goals', '/api/pic/learn/observations'],
  },
  {
    dimension: 'infrastructure',
    picRole: 'none',
    dataFlows: [],
    picEndpoints: [],
  },
  {
    dimension: 'metacognition',
    picRole: 'primary',
    dataFlows: [
      'Decision journal → Bias detection',
      'Skill assessments → Dunning-Kruger guard',
      'Observations → Pattern recognition',
    ],
    picEndpoints: ['/api/pic/learn/observations', '/api/pic/goals'],
  },
  {
    dimension: 'decision_fatigue',
    picRole: 'significant',
    dataFlows: ['Decision count → Budget tracking', 'Preferences → Auto-delegation rules'],
    picEndpoints: ['/api/pic/preferences', '/api/pic/learn/observations'],
  },
  {
    dimension: 'flow',
    picRole: 'supporting',
    dataFlows: ['Priorities → Deep work scheduling', 'Context → Flow trigger activation'],
    picEndpoints: ['/api/pic/goals', '/api/pic/preferences'],
  },
  {
    dimension: 'attention',
    picRole: 'significant',
    dataFlows: ['Learning goals → Germane load optimization', 'Preferences → Notification filtering'],
    picEndpoints: ['/api/pic/goals', '/api/pic/preferences'],
  },
  {
    dimension: 'chronobiology',
    picRole: 'significant',
    dataFlows: ['Preferences → Chronotype profiling', 'Observations → Energy mapping'],
    picEndpoints: ['/api/pic/preferences', '/api/pic/learn/observations'],
  },
  {
    dimension: 'social_capital',
    picRole: 'primary',
    dataFlows: [
      'Relationships → Health dashboard',
      'Interaction frequency → Dunbar layers',
      'Network graph → Brokerage opportunities',
    ],
    picEndpoints: ['/api/pic/relationships', '/api/pic/learn/observations'],
  },
  {
    dimension: 'meaning',
    picRole: 'primary',
    dataFlows: [
      'Goals → Purpose alignment',
      'Values → Decision anchors',
      'Observations → PERMA profiling',
    ],
    picEndpoints: ['/api/pic/goals', '/api/pic/identity', '/api/pic/learn/observations'],
  },
  {
    dimension: 'habits',
    picRole: 'primary',
    dataFlows: [
      'Observations → Habit tracking',
      'Daily routine → Anchor habits',
      'Goals → Implementation intentions',
    ],
    picEndpoints: ['/api/pic/learn/observations', '/api/pic/preferences', '/api/pic/goals'],
  },
];

// Technology integration matrix (from Chapter 34)
interface TechIntegration {
  name: string;
  icon: string;
  dimensions: { id: string; role: 'primary' | 'significant' | 'supporting' }[];
  description: string;
}

const TECH_INTEGRATIONS: TechIntegration[] = [
  {
    name: 'PIC',
    icon: '🧠',
    dimensions: [
      { id: 'communication', role: 'primary' },
      { id: 'family', role: 'primary' },
      { id: 'goals', role: 'primary' },
      { id: 'metacognition', role: 'primary' },
      { id: 'social_capital', role: 'primary' },
      { id: 'meaning', role: 'primary' },
      { id: 'habits', role: 'primary' },
      { id: 'research', role: 'significant' },
      { id: 'health', role: 'significant' },
      { id: 'decision_fatigue', role: 'significant' },
      { id: 'attention', role: 'significant' },
      { id: 'chronobiology', role: 'significant' },
      { id: 'clinical', role: 'supporting' },
      { id: 'financial', role: 'supporting' },
    ],
    description: 'Personal Intelligence Context — the memory and identity backbone of LIAM',
  },
  {
    name: 'Hermes Core',
    icon: '✉️',
    dimensions: [
      { id: 'clinical', role: 'primary' },
      { id: 'communication', role: 'primary' },
      { id: 'attention', role: 'primary' },
      { id: 'social_capital', role: 'significant' },
      { id: 'family', role: 'supporting' },
      { id: 'research', role: 'supporting' },
    ],
    description: 'Email intelligence, priority scoring, and communication patterns',
  },
  {
    name: 'Nova Agent',
    icon: '🎙️',
    dimensions: [
      { id: 'communication', role: 'significant' },
      { id: 'family', role: 'significant' },
      { id: 'goals', role: 'significant' },
      { id: 'metacognition', role: 'significant' },
      { id: 'meaning', role: 'significant' },
      { id: 'clinical', role: 'supporting' },
      { id: 'infrastructure', role: 'supporting' },
      { id: 'habits', role: 'supporting' },
    ],
    description: 'Voice interface for weekly check-ins, goal reviews, and hands-free interaction',
  },
  {
    name: 'Model Thinker',
    icon: '📊',
    dimensions: [
      { id: 'financial', role: 'primary' },
      { id: 'goals', role: 'primary' },
      { id: 'metacognition', role: 'primary' },
      { id: 'clinical', role: 'significant' },
      { id: 'family', role: 'significant' },
      { id: 'research', role: 'significant' },
      { id: 'health', role: 'significant' },
      { id: 'infrastructure', role: 'significant' },
      { id: 'decision_fatigue', role: 'significant' },
      { id: 'attention', role: 'significant' },
    ],
    description: 'Scott Page\'s many-model thinking framework for multi-perspective analysis',
  },
  {
    name: 'Calendar API',
    icon: '📅',
    dimensions: [
      { id: 'family', role: 'primary' },
      { id: 'flow', role: 'primary' },
      { id: 'chronobiology', role: 'primary' },
      { id: 'goals', role: 'significant' },
      { id: 'decision_fatigue', role: 'significant' },
      { id: 'attention', role: 'significant' },
      { id: 'meaning', role: 'significant' },
      { id: 'habits', role: 'significant' },
    ],
    description: 'Scheduling, time blocking, and temporal optimization',
  },
];

// ── Helper Functions ─────────────────────────────────────────────────

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  operational: { bg: '#48BB78', text: '#48BB78', label: 'Operational' },
  'in-progress': { bg: '#ECC94B', text: '#ECC94B', label: 'In Progress' },
  planned: { bg: '#A0AEC0', text: '#A0AEC0', label: 'Planned' },
  future: { bg: '#805AD5', text: '#805AD5', label: 'Future' },
};

const groupColors: Record<string, string> = {
  core: '#3182CE',
  cognitive: '#9F7AEA',
};

// ── Main Component ──────────────────────────────────────────────────

type ViewMode = 'dimensions' | 'knowledge-graph' | 'pic-integration';

const LIAMPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDim, setSelectedDim] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dimensions');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [modalDimension, setModalDimension] = useState<DimensionDetail | null>(null);

  const textMuted = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const isDark = useColorModeValue(false, true);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await fetch('/api/get-workflow-status');
      if (resp.ok) setWorkflows(await resp.json());
    } catch (err) {
      console.error('Failed to fetch workflows', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  // ── Derived data ───────────────────────────────────────────
  const stats = useMemo(() => {
    const operational = DIMENSIONS.filter(d => d.status === 'operational').length;
    const inProgress = DIMENSIONS.filter(d => d.status === 'in-progress').length;
    const planned = DIMENSIONS.filter(d => d.status === 'planned').length;
    const future = DIMENSIONS.filter(d => d.status === 'future').length;
    return { total: DIMENSIONS.length, operational, inProgress, planned, future };
  }, []);

  const openDimensionModal = (dim: DimensionDetail) => {
    setModalDimension(dim);
    onOpen();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Flex align="center" justify="center" py={20} gap={3}>
          <Spinner size="md" color="purple.400" />
          <Text color={textMuted}>Loading LIAM…</Text>
        </Flex>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box p={6}>
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <VStack align="start" spacing={1}>
            <Heading size="lg" fontWeight="700">LIAM</Heading>
            <Text fontSize="sm" color={textMuted}>Life Intelligence Augmentation Matrix — 16 Dimensions</Text>
          </VStack>
          <HStack spacing={2}>
            <Button
              size="sm"
              variant={viewMode === 'knowledge-graph' ? 'solid' : 'outline'}
              colorScheme="purple"
              leftIcon={<FiLink />}
              onClick={() => setViewMode(viewMode === 'knowledge-graph' ? 'dimensions' : 'knowledge-graph')}
            >
              {viewMode === 'knowledge-graph' ? 'Show Dimensions' : 'Knowledge Graph'}
            </Button>
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw size={14} />}
              size="sm"
              variant="ghost"
              onClick={fetchWorkflows}
            />
          </HStack>
        </Flex>

        {/* Status Overview Bar */}
        <Flex
          bg={isDark ? 'whiteAlpha.50' : 'blackAlpha.30'}
          borderRadius="xl"
          p={4}
          mb={6}
          gap={6}
          flexWrap="wrap"
        >
          {[
            { label: 'Total Dimensions', value: stats.total, color: '#A0AEC0' },
            { label: 'Operational', value: stats.operational, color: '#48BB78' },
            { label: 'In Progress', value: stats.inProgress, color: '#ECC94B' },
            { label: 'Planned', value: stats.planned, color: '#A0AEC0' },
            { label: 'Future', value: stats.future, color: '#805AD5' },
          ].map(stat => (
            <VStack key={stat.label} spacing={0} minW="80px">
              <Text fontSize="xs" color={textMuted} textTransform="uppercase">{stat.label}</Text>
              <Text fontSize="2xl" fontWeight="700" color={stat.color}>{stat.value}</Text>
            </VStack>
          ))}
        </Flex>

        {/* Knowledge Graph View */}
        {viewMode === 'knowledge-graph' && (
          <Box
            bg={isDark ? 'whiteAlpha.40' : 'blackAlpha.20'}
            borderRadius="xl"
            p={6}
            border="1px solid"
            borderColor={borderColor}
            mb={6}
          >
            <Text fontSize="sm" fontWeight="600" mb={4} color={textMuted}>
              LIAM Knowledge Graph — Connections between dimensions, models, and concepts
            </Text>
            <Box position="relative" h="400px" overflow="hidden" borderRadius="lg">
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                bg={isDark ? 'blackAlpha.200' : 'white'}
                borderRadius="lg"
                p={4}
              >
                <SimpleGrid columns={4} spacing={4} h="full">
                  {KNOWLEDGE_GRAPH.map(node => (
                    <Box
                      key={node.id}
                      p={2}
                      bg={node.type === 'dimension' 
                        ? (DIMENSIONS.find(d => d.id === node.id)?.accent + '20')
                        : (node.type === 'concept' ? '#805AD520' : '#A0AEC020')
                      }
                      borderRadius="md"
                      border="1px solid"
                      borderColor={node.type === 'dimension'
                        ? DIMENSIONS.find(d => d.id === node.id)?.accent
                        : (node.type === 'concept' ? '#805AD5' : '#A0AEC0')
                      }
                      cursor="pointer"
                      onClick={() => {
                        const dim = DIMENSIONS.find(d => d.id === node.id);
                        if (dim) openDimensionModal(dim);
                      }}
                      _hover={{ transform: 'scale(1.05)' }}
                      transition="all 0.2s"
                    >
                      <Text fontSize="xs" fontWeight="600" textAlign="center">
                        {node.label}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            </Box>
            <Text fontSize="xs" color={textMuted} mt={2} textAlign="center">
              Click any node to explore its connections and scientific basis
            </Text>
          </Box>
        )}

        {/* Dimension Cards Grid */}
        {viewMode === 'dimensions' && (
          <Accordion allowMultiple>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {DIMENSIONS.map(dim => {
                const st = statusColors[dim.status];
                const isExpanded = expandedCard === dim.id;
                const relatedDims = dim.relatedDimensions.map(id => DIMENSIONS.find(d => d.id === id)).filter(Boolean);

                return (
                  <AccordionItem
                    key={dim.id}
                    border="none"
                    isExpanded={isExpanded}
                    onChange={() => setExpandedCard(isExpanded ? null : dim.id)}
                  >
                    <AccordionButton
                      p={4}
                      bg={isDark ? 'whiteAlpha.40' : 'blackAlpha.20'}
                      borderRadius="xl"
                      _hover={{ bg: isDark ? 'whiteAlpha.60' : 'blackAlpha.30' }}
                      _expanded={{ bg: `${dim.accent}15`, borderBottomRadius: 0 }}
                    >
                      <Flex flex={1} align="center" gap={3}>
                        <Text fontSize="xl">{dim.icon}</Text>
                        <VStack align="start" spacing={0} flex={1}>
                          <HStack>
                            <Text fontWeight="600" fontSize="sm">{dim.label}</Text>
                            <Badge bg={`${st.bg}20`} color={st.text} fontSize="9px">{st.label}</Badge>
                          </HStack>
                          <Text fontSize="xs" color={textMuted}>{dim.description}</Text>
                        </VStack>
                        <Badge
                          bg={groupColors[dim.group]}
                          color="white"
                          fontSize="9px"
                          px={2}
                          borderRadius="full"
                        >
                          {dim.group === 'core' ? 'Core' : 'Cognitive'}
                        </Badge>
                      </Flex>
                      <AccordionIcon ml={2} />
                    </AccordionButton>
                    <AccordionPanel
                      p={4}
                      bg={isDark ? 'whiteAlpha.30' : 'blackAlpha.10'}
                      borderBottomRadius="xl"
                    >
                      <VStack align="stretch" spacing={4}>
                        {/* Why It Matters */}
                        <Box>
                          <HStack mb={2}>
                            <FiTarget size={14} color={dim.accent} />
                            <Text fontSize="xs" fontWeight="600" color={dim.accent}>WHY IT MATTERS</Text>
                          </HStack>
                          <Text fontSize="sm" color={textMuted}>{dim.whyItMatters}</Text>
                        </Box>

                        {/* Scientific Basis */}
                        <Box>
                          <HStack mb={2}>
                            <FiBookOpen size={14} color={dim.accent} />
                            <Text fontSize="xs" fontWeight="600" color={dim.accent}>SCIENTIFIC BASIS</Text>
                          </HStack>
                          <Text fontSize="sm" color={textMuted}>{dim.scientificBasis}</Text>
                        </Box>

                        {/* Model Thinker Models */}
                        <Box>
                          <HStack mb={2}>
                            <FiLayers size={14} color={dim.accent} />
                            <Text fontSize="xs" fontWeight="600" color={dim.accent}>MODEL THINKER FOUNDATIONS</Text>
                          </HStack>
                          <Flex gap={2} flexWrap="wrap">
                            {dim.modelThinkerModels.map(model => (
                              <Badge
                                key={model}
                                bg={`${dim.accent}15`}
                                color={dim.accent}
                                fontSize="10px"
                                px={2}
                                py={1}
                                borderRadius="md"
                              >
                                {model}
                              </Badge>
                            ))}
                          </Flex>
                        </Box>

                        {/* Key Insights */}
                        <Box>
                          <HStack mb={2}>
                            <FiZap size={14} color={dim.accent} />
                            <Text fontSize="xs" fontWeight="600" color={dim.accent}>KEY INSIGHTS</Text>
                          </HStack>
                          <VStack align="start" spacing={1}>
                            {dim.keyInsights.map((insight, i) => (
                              <HStack key={i} spacing={2}>
                                <Box w="4px" h="4px" borderRadius="full" bg={dim.accent} />
                                <Text fontSize="xs" color={textMuted}>{insight}</Text>
                              </HStack>
                            ))}
                          </VStack>
                        </Box>

                        {/* PIC Integration */}
                        {(() => {
                          const picInfo = PIC_INTEGRATIONS.find(p => p.dimension === dim.id);
                          if (!picInfo || picInfo.picRole === 'none') return null;
                          const roleColors = {
                            primary: { bg: '#38A16920', text: '#38A169', label: 'Primary' },
                            significant: { bg: '#ECC94B20', text: '#ECC94B', label: 'Significant' },
                            supporting: { bg: '#A0AEC020', text: '#A0AEC0', label: 'Supporting' },
                            none: { bg: '#71809620', text: '#718096', label: 'None' },
                          };
                          const rc = roleColors[picInfo.picRole];
                          return (
                            <Box>
                              <HStack mb={2}>
                                <FiDatabase size={14} color={dim.accent} />
                                <Text fontSize="xs" fontWeight="600" color={dim.accent}>PIC INTEGRATION</Text>
                                <Badge bg={rc.bg} color={rc.text} fontSize="9px">{rc.label}</Badge>
                              </HStack>
                              <VStack align="start" spacing={1}>
                                {picInfo.dataFlows.map((flow, i) => (
                                  <HStack key={i} spacing={2}>
                                    <Box w="4px" h="4px" borderRadius="full" bg="#38A169" />
                                    <Text fontSize="xs" color={textMuted}>{flow}</Text>
                                  </HStack>
                                ))}
                              </VStack>
                            </Box>
                          );
                        })()}

                        {/* Related Dimensions */}
                        {relatedDims.length > 0 && (
                          <Box>
                            <HStack mb={2}>
                              <FiLink size={14} color={dim.accent} />
                              <Text fontSize="xs" fontWeight="600" color={dim.accent}>RELATED DIMENSIONS</Text>
                            </HStack>
                            <Flex gap={2} flexWrap="wrap">
                              {relatedDims.map((rd: DimensionDetail | undefined) => rd && (
                                <Button
                                  key={rd.id}
                                  size="xs"
                                  variant="outline"
                                  leftIcon={<Text>{rd.icon}</Text>}
                                  onClick={() => openDimensionModal(rd)}
                                  borderColor={rd.accent}
                                  color={rd.accent}
                                >
                                  {rd.short}
                                </Button>
                              ))}
                            </Flex>
                          </Box>
                        )}

                        {/* Workflows */}
                        <Box>
                          <Text fontSize="xs" fontWeight="600" color={dim.accent} mb={2}>WORKFLOWS</Text>
                          <VStack align="stretch" spacing={1}>
                            {dim.workflows.map((wf, i) => (
                              <Flex
                                key={i}
                                justify="space-between"
                                align="center"
                                p={2}
                                bg={isDark ? 'whiteAlpha.50' : 'blackAlpha.20'}
                                borderRadius="md"
                              >
                                <Text fontSize="xs">{wf.name}</Text>
                                <Badge
                                  bg={`${statusColors[wf.status].bg}20`}
                                  color={statusColors[wf.status].text}
                                  fontSize="9px"
                                >
                                  {statusColors[wf.status].label}
                                </Badge>
                              </Flex>
                            ))}
                          </VStack>
                        </Box>

                        {/* Learn More Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          rightIcon={<FiChevronRight />}
                          onClick={() => openDimensionModal(dim)}
                          color={dim.accent}
                        >
                          Explore {dim.short} in Depth
                        </Button>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                );
              })}
            </SimpleGrid>
          </Accordion>
        )}
      </Box>

      {/* Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={isDark ? 'gray.800' : 'white'}>
          {modalDimension && (
            <>
              <ModalHeader>
                <HStack spacing={3}>
                  <Text fontSize="2xl">{modalDimension.icon}</Text>
                  <VStack align="start" spacing={0}>
                    <Text>{modalDimension.label}</Text>
                    <Badge bg={statusColors[modalDimension.status].bg} color="white">
                      {statusColors[modalDimension.status].label}
                    </Badge>
                  </VStack>
                </HStack>
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody pb={6}>
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Text fontWeight="600" mb={2}>Description</Text>
                    <Text fontSize="sm" color={textMuted}>{modalDimension.description}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" mb={2}>Why It Matters</Text>
                    <Text fontSize="sm" color={textMuted}>{modalDimension.whyItMatters}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" mb={2}>Scientific Basis</Text>
                    <Text fontSize="sm" color={textMuted}>{modalDimension.scientificBasis}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" mb={2}>Model Thinker Models</Text>
                    <Flex gap={2} flexWrap="wrap">
                      {modalDimension.modelThinkerModels.map(model => (
                        <Badge key={model} colorScheme="purple">{model}</Badge>
                      ))}
                    </Flex>
                  </Box>
                  <Box>
                    <Text fontWeight="600" mb={2}>Key Insights</Text>
                    <VStack align="start" spacing={2}>
                      {modalDimension.keyInsights.map((insight, i) => (
                        <HStack key={i} spacing={2} align="start">
                          <Box mt={1.5} w="4px" h="4px" borderRadius="full" bg={modalDimension.accent} />
                          <Text fontSize="sm" color={textMuted}>{insight}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                </VStack>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
};

export default LIAMPage;
