/**
 * Regression tests for sanitizeConceptCheck — the guard that validates
 * model-produced interactive concept-checks (Brilliant "Koji" mechanic) before
 * they reach the UI. Malformed cards must be rejected, never rendered.
 */

import { sanitizeConceptCheck } from '@/domains/learning/shared/transports/picode-transport';

const validRaw = {
  question: 'What is 2 + 3?',
  choices: [
    { id: 'a', label: '4', correct: false },
    { id: 'b', label: '5', correct: true },
    { id: 'c', label: '6', correct: false },
  ],
  explanation: 'Counting up 3 from 2 lands on 5.',
  hint: 'Start at 2 and count up.',
  skillCode: 'add_within_10',
};

describe('sanitizeConceptCheck', () => {
  it('accepts a well-formed concept-check', () => {
    const result = sanitizeConceptCheck(validRaw);
    expect(result).toBeDefined();
    expect(result?.question).toBe('What is 2 + 3?');
    expect(result?.choices).toHaveLength(3);
    expect(result?.choices.filter((c) => c.correct)).toHaveLength(1);
    expect(result?.skillCode).toBe('add_within_10');
  });

  it('rejects non-object input', () => {
    expect(sanitizeConceptCheck(null)).toBeUndefined();
    expect(sanitizeConceptCheck('nope')).toBeUndefined();
    expect(sanitizeConceptCheck(42)).toBeUndefined();
  });

  it('rejects a missing question or explanation', () => {
    expect(sanitizeConceptCheck({ ...validRaw, question: '' })).toBeUndefined();
    expect(sanitizeConceptCheck({ ...validRaw, explanation: undefined })).toBeUndefined();
  });

  it('rejects fewer than 2 or more than 4 choices', () => {
    expect(
      sanitizeConceptCheck({ ...validRaw, choices: [{ id: 'a', label: '5', correct: true }] }),
    ).toBeUndefined();
    expect(
      sanitizeConceptCheck({
        ...validRaw,
        choices: Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, label: `${i}`, correct: i === 0 })),
      }),
    ).toBeUndefined();
  });

  it('rejects when not exactly one choice is correct', () => {
    expect(
      sanitizeConceptCheck({
        ...validRaw,
        choices: [
          { id: 'a', label: '4', correct: false },
          { id: 'b', label: '5', correct: false },
        ],
      }),
    ).toBeUndefined();
    expect(
      sanitizeConceptCheck({
        ...validRaw,
        choices: [
          { id: 'a', label: '4', correct: true },
          { id: 'b', label: '5', correct: true },
        ],
      }),
    ).toBeUndefined();
  });

  it('drops blank-label choices and backfills missing ids', () => {
    const result = sanitizeConceptCheck({
      ...validRaw,
      choices: [
        { label: '5', correct: true },
        { label: '6', correct: false },
        { label: '   ', correct: false },
      ],
    });
    expect(result).toBeDefined();
    expect(result?.choices).toHaveLength(2);
    expect(result?.choices[0].id).toBe('a');
    expect(result?.choices[1].id).toBe('b');
  });

  it('coerces a non-boolean correct flag to false', () => {
    const result = sanitizeConceptCheck({
      ...validRaw,
      choices: [
        { id: 'a', label: '5', correct: true },
        { id: 'b', label: '6', correct: 'yes' },
      ],
    });
    expect(result).toBeDefined();
    expect(result?.choices.filter((c) => c.correct)).toHaveLength(1);
  });
});
