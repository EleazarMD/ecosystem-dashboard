/**
 * Unit tests for the Assignment Service (Phase 4)
 */

import { AssignmentService } from '@/lib/kids-pic/assignment-service';

// Mock Pool that always reports table absent → exercises in-memory fallback
const mockPool = {
  query: jest.fn().mockResolvedValue({ rows: [{ reg: null }] }),
} as any;

describe('AssignmentService (in-memory fallback)', () => {
  let service: AssignmentService;

  beforeEach(() => {
    service = new AssignmentService(mockPool);
    // Reset in-memory store by creating a fresh service instance
    // (the store is module-level, so we just clear it via cancellation)
  });

  it('creates an assignment and returns it with status "assigned"', async () => {
    const a = await service.createAssignment({
      childId: 'child-1',
      parentUserId: 'parent-1',
      skillCode: 'math.addition',
      title: 'Practice adding',
    });
    expect(a.status).toBe('assigned');
    expect(a.skillCode).toBe('math.addition');
    expect(a.title).toBe('Practice adding');
    expect(a.completedAt).toBeNull();
  });

  it('lists assignments filtered by child and status', async () => {
    await service.createAssignment({
      childId: 'child-2',
      parentUserId: 'parent-1',
      skillCode: 'math.sub',
    });
    await service.createAssignment({
      childId: 'child-1',
      parentUserId: 'parent-1',
      skillCode: 'reading.comp',
    });

    const all = await service.listAssignments('child-1');
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.every((a) => a.childId === 'child-1')).toBe(true);

    const active = await service.listAssignments('child-1', { status: 'assigned' });
    expect(active.every((a) => a.status === 'assigned')).toBe(true);
  });

  it('updates assignment status to completed and sets completedAt', async () => {
    const a = await service.createAssignment({
      childId: 'child-3',
      parentUserId: 'parent-1',
      skillCode: 'math.mult',
    });

    const updated = await service.updateAssignment(a.id, { status: 'completed' });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('completed');
    expect(updated!.completedAt).not.toBeNull();
  });

  it('cancels an assignment', async () => {
    const a = await service.createAssignment({
      childId: 'child-4',
      parentUserId: 'parent-1',
      skillCode: 'reading.vocab',
    });

    const updated = await service.updateAssignment(a.id, { status: 'cancelled' });
    expect(updated!.status).toBe('cancelled');
  });

  it('auto-completes assignments on correct answer for matching skill', async () => {
    await service.createAssignment({
      childId: 'child-5',
      parentUserId: 'parent-1',
      skillCode: 'math.addition',
    });
    await service.createAssignment({
      childId: 'child-5',
      parentUserId: 'parent-1',
      skillCode: 'math.subtraction',
    });

    const count = await service.completeOnCorrectAnswer('child-5', 'math.addition');
    expect(count).toBe(1);

    const remaining = await service.getActiveSkillCodes('child-5', 10);
    expect(remaining).not.toContain('math.addition');
    expect(remaining).toContain('math.subtraction');
  });

  it('getActiveSkillCodes deduplicates and caps at limit', async () => {
    await service.createAssignment({
      childId: 'child-6',
      parentUserId: 'parent-1',
      skillCode: 'math.a',
    });
    await service.createAssignment({
      childId: 'child-6',
      parentUserId: 'parent-1',
      skillCode: 'math.a',
    });
    await service.createAssignment({
      childId: 'child-6',
      parentUserId: 'parent-1',
      skillCode: 'math.b',
    });

    const codes = await service.getActiveSkillCodes('child-6', 1);
    expect(codes).toHaveLength(1);
  });

  it('returns null for non-existent assignment on get', async () => {
    const result = await service.getAssignment('non-existent-id');
    expect(result).toBeNull();
  });

  it('returns null for non-existent assignment on update', async () => {
    const result = await service.updateAssignment('non-existent-id', { status: 'completed' });
    expect(result).toBeNull();
  });

  it('throws on missing required fields for create', async () => {
    await expect(
      service.createAssignment({ childId: '', parentUserId: '', skillCode: '' })
    ).rejects.toThrow();
  });
});
