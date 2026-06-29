/**
 * Learning Kit — Brilliant-style, theme-aware learning primitives.
 * Drop these into any child studio for consistent gamification + interactivity.
 */

export {
  MasteryBar,
  StreakFlame,
  DailyGoalRing,
  LevelChip,
  XPBurst,
  InteractiveLessonCard,
} from './LearningKit';
export type {
  MasteryBarProps,
  StreakFlameProps,
  DailyGoalRingProps,
  LevelChipProps,
  XPBurstProps,
  InteractiveLessonCardProps,
  LessonStatus,
} from './LearningKit';

export { ConceptCheckCard } from './ConceptCheckCard';
export type {
  ConceptCheckCardProps,
  ConceptChoice,
  ConceptCheckOutcome,
} from './ConceptCheckCard';

export { HintCard, ExampleCard, CelebrationCard, PassageCard } from './RichMessageCards';

export { CardPlayer, buildCardSetFromStep } from './CardPlayer';
export type {
  CardPlayerProps,
  CardPlayerResult,
  LearningCard,
  CardSet,
  CardType,
  TryCard,
  SeeCard,
  ExplainCard,
  PlayCard,
  CheckCard,
} from './CardPlayer';

export { StudioReturnBanner } from './StudioReturnBanner';

export { DailyMissionCard } from './DailyMissionCard';
export type { DailyMissionData } from './DailyMissionCard';

export { SkillMap } from './SkillMap';
export type { SkillMapData, SkillMapDomain, SkillMapSkill } from './SkillMap';

export { ReflectionCard } from './ReflectionCard';
export type { ReflectionCardProps } from './ReflectionCard';

export {
  TrailContainer,
  TrailHeader,
  TrailPath,
  TrailCard,
  TrailGuide,
  TrailProgress,
  TrailStartBar,
  TrailSectionBanner,
  adjustColor,
} from './BrilliantTrail';
export type {
  TrailItem,
  TrailSection,
  TrailGuideProps,
} from './BrilliantTrail';
