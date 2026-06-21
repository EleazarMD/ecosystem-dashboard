export interface FamilyLearningSubjectStats {
  subject: string;
  attempts: number;
  correct: number;
}

export interface FamilyLearningSnapshotInput {
  sessionsCompleted: number;
  bySubject: FamilyLearningSubjectStats[];
}

export interface RankedFamilySubject extends FamilyLearningSubjectStats {
  accuracy: number;
}

export interface FamilyLearningSnapshot {
  strongest: RankedFamilySubject | null;
  support: RankedFamilySubject | null;
  consistencyProgress: number;
  sessionGoal: number;
  recommendations: string[];
}

function buildRecommendations(input: {
  strongest: RankedFamilySubject | null;
  support: RankedFamilySubject | null;
  sessionsCompleted: number;
  sessionGoal: number;
}): string[] {
  const recommendations: string[] = [];

  if (input.sessionsCompleted < input.sessionGoal) {
    recommendations.push('Schedule one short guided session to keep the weekly rhythm.');
  } else {
    recommendations.push('Celebrate consistency and keep the same learning cadence next week.');
  }

  if (input.support) {
    recommendations.push(
      `Ask your child to explain one ${input.support.subject} strategy out loud to build confidence.`,
    );
  }

  if (input.strongest) {
    recommendations.push(
      `Reinforce momentum in ${input.strongest.subject} with one slightly harder challenge.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Start with one guided activity and celebrate effort over speed.');
  }

  return recommendations.slice(0, 3);
}

export function buildFamilyLearningSnapshot(
  input: FamilyLearningSnapshotInput,
  sessionGoal = 3,
): FamilyLearningSnapshot {
  const subjectsWithAttempts = input.bySubject.filter((subject) => subject.attempts > 0);
  const rankedSubjects = [...subjectsWithAttempts]
    .map((subject) => ({
      ...subject,
      accuracy: Math.round((subject.correct / subject.attempts) * 100),
    }))
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts);

  const strongest = rankedSubjects[0] ?? null;
  const support = rankedSubjects.length > 1 ? rankedSubjects[rankedSubjects.length - 1] : null;
  const consistencyProgress = Math.min(100, Math.round((input.sessionsCompleted / sessionGoal) * 100));
  const recommendations = buildRecommendations({
    strongest,
    support,
    sessionsCompleted: input.sessionsCompleted,
    sessionGoal,
  });

  return {
    strongest,
    support,
    consistencyProgress,
    sessionGoal,
    recommendations,
  };
}
