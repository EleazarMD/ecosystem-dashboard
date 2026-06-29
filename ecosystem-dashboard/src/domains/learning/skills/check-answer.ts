import { SkillModule, ToolExecutionResult } from '../shared/skill-module';

export const checkAnswerSkill: SkillModule = {
  id: 'check_answer',
  label: 'Check Answer',
  description: 'Reason about a learner answer (authoritative grading stays server-side).',
  category: 'tutoring',
  execute(args): ToolExecutionResult {
    const learnerResponse = String(args.learnerResponse || '');
    const snippet = learnerResponse.length > 100
      ? `${learnerResponse.slice(0, 100)}...`
      : learnerResponse;
    return {
      output: `The learner proposed: "${snippet}". Grade this via /api/learn/attempt to verify correctness. Do not reveal the answer.`,
      success: true,
    };
  },
};
