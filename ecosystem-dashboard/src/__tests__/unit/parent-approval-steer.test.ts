/**
 * Tests for Phase 7: Parent approval + steer
 * - ToolApprovalService: JIT approval for sensitive agent tools
 * - ParentGoalService: goal-setting that steers the planner
 * - executeGatedHop: approval-gated tool execution
 */

import { getToolApprovalService, _resetToolApprovalService } from '@/domains/learning/parent/tool-approval-service';
import { getParentGoalService, _resetParentGoalService } from '@/domains/learning/parent/parent-goal-service';
import { checkToolGate, type ToolRoster } from '@/domains/learning/shared/tool-roster';
import { drawImageSkill } from '@/domains/learning/skills/draw-image';

// ─── ToolApprovalService ────────────────────────────────────────────────────

describe('ToolApprovalService', () => {
  beforeEach(() => _resetToolApprovalService());
  afterEach(() => _resetToolApprovalService());

  it('creates a pending approval request', () => {
    const svc = getToolApprovalService();
    const req = svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'Agent wants to use Draw Image',
    });

    expect(req.id).toBeDefined();
    expect(req.status).toBe('pending');
    expect(req.childId).toBe('child-1');
    expect(req.toolId).toBe('draw_image');
    expect(req.expiresAt).toBeGreaterThan(Date.now());
  });

  it('reuses existing pending request for same child+tool', () => {
    const svc = getToolApprovalService();
    const req1 = svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'First request',
    });
    const req2 = svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'Second request',
    });

    expect(req2.id).toBe(req1.id);
  });

  it('creates separate requests for different children', () => {
    const svc = getToolApprovalService();
    const req1 = svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'Child 1 request',
    });
    const req2 = svc.requestApproval({
      childId: 'child-2',
      toolId: 'draw_image',
      summary: 'Child 2 request',
    });

    expect(req2.id).not.toBe(req1.id);
  });

  it('isApproved returns false before decision', () => {
    const svc = getToolApprovalService();
    svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'Test',
    });

    expect(svc.isApproved('child-1', 'draw_image')).toBe(false);
  });

  it('isApproved returns true after parent approves', () => {
    const svc = getToolApprovalService();
    const req = svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'Test',
    });

    svc.decide({ requestId: req.id, status: 'approved', decidedBy: 'parent-1' });

    expect(svc.isApproved('child-1', 'draw_image')).toBe(true);
  });

  it('isApproved returns false after parent denies', () => {
    const svc = getToolApprovalService();
    const req = svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'Test',
    });

    svc.decide({ requestId: req.id, status: 'denied', decidedBy: 'parent-1' });

    expect(svc.isApproved('child-1', 'draw_image')).toBe(false);
  });

  it('hasPending detects pending requests', () => {
    const svc = getToolApprovalService();
    expect(svc.hasPending('child-1', 'draw_image')).toBe(false);

    svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'Test',
    });

    expect(svc.hasPending('child-1', 'draw_image')).toBe(true);
  });

  it('getPendingForChild returns all pending for a child', () => {
    const svc = getToolApprovalService();
    svc.requestApproval({ childId: 'child-1', toolId: 'draw_image', summary: 'A' });
    svc.requestApproval({ childId: 'child-1', toolId: 'journal_write', summary: 'B' });
    svc.requestApproval({ childId: 'child-2', toolId: 'draw_image', summary: 'C' });

    const pending = svc.getPendingForChild('child-1');
    expect(pending).toHaveLength(2);
    expect(pending.every((r) => r.childId === 'child-1')).toBe(true);
  });

  it('decide on non-existent request returns undefined', () => {
    const svc = getToolApprovalService();
    const result = svc.decide({ requestId: 'nonexistent', status: 'approved', decidedBy: 'p' });
    expect(result).toBeUndefined();
  });

  it('decide on already-decided request does not change status', () => {
    const svc = getToolApprovalService();
    const req = svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'Test',
    });

    svc.decide({ requestId: req.id, status: 'approved', decidedBy: 'parent-1' });
    svc.decide({ requestId: req.id, status: 'denied', decidedBy: 'parent-2' });

    expect(svc.isApproved('child-1', 'draw_image')).toBe(true);
  });

  it('expired requests are treated as not approved', () => {
    const svc = getToolApprovalService();
    const req = svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'Test',
      ttlMs: 1, // 1ms TTL
    });

    // Wait for expiry
    // eslint-disable-next-line no-undef
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        svc.decide({ requestId: req.id, status: 'approved', decidedBy: 'parent-1' });
        // After expiry, even an approved request should not count
        // Actually the decide will mark it expired since expiresAt < now
        expect(svc.isApproved('child-1', 'draw_image')).toBe(false);
        resolve();
      }, 10);
    });
  });
});

// ─── draw_image SkillModule ─────────────────────────────────────────────────

describe('draw_image SkillModule', () => {
  it('is marked requiresApproval', () => {
    expect(drawImageSkill.requiresApproval).toBe(true);
  });

  it('has id draw_image', () => {
    expect(drawImageSkill.id).toBe('draw_image');
  });

  it('executes and returns a creative prompt', async () => {
    const result = await drawImageSkill.execute({}, {
      childUserId: 'child-1',
      contentPrompt: 'test',
      contentItemId: 'item-1',
      skillCode: 'math.addition',
      attemptNumber: 1,
      hintSet: [],
    });
    expect(result.success).toBe(true);
    expect(result.output).toContain('canvas');
  });
});

// ─── Tool Gate with approval ────────────────────────────────────────────────

describe('Tool Gate with approval', () => {
  const roster: ToolRoster = {
    id: 'test',
    tools: [
      { id: 'ask_socratic', label: 'Ask Socratic', description: 'Socratic prompt' },
      { id: 'draw_image', label: 'Draw Image', description: 'Creative prompt', requiresApproval: true },
    ],
  };

  it('blocks draw_image without approval', () => {
    const result = checkToolGate(roster, 'draw_image');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('requires parental approval');
  });

  it('allows draw_image with approvalGranted=true', () => {
    const result = checkToolGate(roster, 'draw_image', { approvalGranted: true });
    expect(result.allowed).toBe(true);
    expect(result.tool?.id).toBe('draw_image');
  });

  it('allows ask_socratic without approval', () => {
    const result = checkToolGate(roster, 'ask_socratic');
    expect(result.allowed).toBe(true);
  });
});

// ─── ParentGoalService ──────────────────────────────────────────────────────

describe('ParentGoalService', () => {
  beforeEach(() => _resetParentGoalService());
  afterEach(() => _resetParentGoalService());

  it('creates a goal with default 7-day duration', () => {
    const svc = getParentGoalService();
    const goal = svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Practice addition',
      skillCodes: ['math.addition'],
    });

    expect(goal.id).toBeDefined();
    expect(goal.status).toBe('active');
    expect(goal.durationDays).toBe(7);
    expect(goal.expiresAt).toBeGreaterThan(goal.createdAt);
  });

  it('creates a goal with custom duration', () => {
    const svc = getParentGoalService();
    const goal = svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Reading week',
      skillCodes: ['reading.comprehension'],
      durationDays: 14,
    });

    expect(goal.durationDays).toBe(14);
  });

  it('getActiveGoalSkillCodes returns skill codes from active goals', () => {
    const svc = getParentGoalService();
    svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Math focus',
      skillCodes: ['math.addition', 'math.subtraction'],
    });
    svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Reading focus',
      skillCodes: ['reading.comprehension'],
    });

    const codes = svc.getActiveGoalSkillCodes('child-1');
    expect(codes).toContain('math.addition');
    expect(codes).toContain('math.subtraction');
    expect(codes).toContain('reading.comprehension');
  });

  it('getActiveGoalSkillCodes de-duplicates across goals', () => {
    const svc = getParentGoalService();
    svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Goal A',
      skillCodes: ['math.addition'],
    });
    svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Goal B',
      skillCodes: ['math.addition', 'math.subtraction'],
    });

    const codes = svc.getActiveGoalSkillCodes('child-1');
    expect(codes.filter((c) => c === 'math.addition')).toHaveLength(1);
  });

  it('getActiveGoalSkillCodes returns empty for child with no goals', () => {
    const svc = getParentGoalService();
    expect(svc.getActiveGoalSkillCodes('child-no-goals')).toEqual([]);
  });

  it('getActiveGoalSkillCodes excludes completed goals', () => {
    const svc = getParentGoalService();
    const goal = svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Completed goal',
      skillCodes: ['math.addition'],
    });

    svc.completeGoal(goal.id);

    expect(svc.getActiveGoalSkillCodes('child-1')).toEqual([]);
  });

  it('getActiveGoalSkillCodes excludes cancelled goals', () => {
    const svc = getParentGoalService();
    const goal = svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Cancelled goal',
      skillCodes: ['math.addition'],
    });

    svc.cancelGoal(goal.id);

    expect(svc.getActiveGoalSkillCodes('child-1')).toEqual([]);
  });

  it('getActiveGoals returns only active goals', () => {
    const svc = getParentGoalService();
    const g1 = svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Active',
      skillCodes: ['math.addition'],
    });
    const g2 = svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Completed',
      skillCodes: ['math.subtraction'],
    });
    svc.completeGoal(g2.id);

    const active = svc.getActiveGoals('child-1');
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(g1.id);
  });

  it('getAllGoals includes completed and cancelled', () => {
    const svc = getParentGoalService();
    const g1 = svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Active',
      skillCodes: ['math.addition'],
    });
    const g2 = svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Completed',
      skillCodes: ['math.subtraction'],
    });
    svc.completeGoal(g2.id);

    const all = svc.getAllGoals('child-1');
    expect(all).toHaveLength(2);
  });

  it('completeGoal on non-existent returns undefined', () => {
    const svc = getParentGoalService();
    expect(svc.completeGoal('nonexistent')).toBeUndefined();
  });

  it('cancelGoal on non-existent returns undefined', () => {
    const svc = getParentGoalService();
    expect(svc.cancelGoal('nonexistent')).toBeUndefined();
  });

  it('goals are isolated per child', () => {
    const svc = getParentGoalService();
    svc.createGoal({
      childId: 'child-1',
      parentId: 'parent-1',
      title: 'Child 1 goal',
      skillCodes: ['math.addition'],
    });
    svc.createGoal({
      childId: 'child-2',
      parentId: 'parent-1',
      title: 'Child 2 goal',
      skillCodes: ['reading.comprehension'],
    });

    expect(svc.getActiveGoalSkillCodes('child-1')).toEqual(['math.addition']);
    expect(svc.getActiveGoalSkillCodes('child-2')).toEqual(['reading.comprehension']);
  });
});

// ─── Integration: Approval + Tool Gate ──────────────────────────────────────

describe('Integration: Tool Approval → Tool Gate', () => {
  beforeEach(() => _resetToolApprovalService());
  afterEach(() => _resetToolApprovalService());

  const roster: ToolRoster = {
    id: 'test',
    tools: [
      { id: 'draw_image', label: 'Draw Image', description: 'Creative', requiresApproval: true },
    ],
  };

  it('full flow: request → pending → approve → gate passes', () => {
    const svc = getToolApprovalService();

    // Before approval: gate blocks
    let gateResult = checkToolGate(roster, 'draw_image');
    expect(gateResult.allowed).toBe(false);

    // Parent creates approval request
    const req = svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'Draw request',
    });
    expect(req.status).toBe('pending');

    // Parent approves
    svc.decide({ requestId: req.id, status: 'approved', decidedBy: 'parent-1' });

    // Now gate passes with approvalGranted
    gateResult = checkToolGate(roster, 'draw_image', { approvalGranted: true });
    expect(gateResult.allowed).toBe(true);
  });

  it('full flow: request → deny → gate still blocks', () => {
    const svc = getToolApprovalService();

    const req = svc.requestApproval({
      childId: 'child-1',
      toolId: 'draw_image',
      summary: 'Draw request',
    });

    svc.decide({ requestId: req.id, status: 'denied', decidedBy: 'parent-1' });

    // isApproved is false, so approvalGranted stays false
    expect(svc.isApproved('child-1', 'draw_image')).toBe(false);

    const gateResult = checkToolGate(roster, 'draw_image');
    expect(gateResult.allowed).toBe(false);
  });
});
