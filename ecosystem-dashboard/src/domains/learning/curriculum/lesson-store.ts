/**
 * Lesson Store — persistence seam for lessons.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §2
 *
 * This is the swap-point for lesson persistence. The default implementation
 * is in-memory (lessons are registered at module load time). A DB-backed
 * implementation would replace this with CRUD operations.
 */

import type { Lesson } from './lesson-types';

export interface LessonStore {
  get(id: string): Lesson | undefined;
  all(): Lesson[];
  save(lesson: Lesson): void;
  remove(id: string): void;
}

class InMemoryLessonStore implements LessonStore {
  private lessons = new Map<string, Lesson>();

  get(id: string): Lesson | undefined {
    return this.lessons.get(id);
  }

  all(): Lesson[] {
    return Array.from(this.lessons.values());
  }

  save(lesson: Lesson): void {
    this.lessons.set(lesson.id, lesson);
  }

  remove(id: string): void {
    this.lessons.delete(id);
  }
}

export function createInMemoryLessonStore(): LessonStore {
  return new InMemoryLessonStore();
}
