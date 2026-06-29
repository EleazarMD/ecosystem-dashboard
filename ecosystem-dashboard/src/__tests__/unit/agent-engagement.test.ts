import {
  coerceConversationHistory,
  coerceMastery,
  coerceSessionPhase,
  validateTutorTurnPayload,
} from '../../pages/api/learn/tutor/turn';

describe('Agent engagement: coercion helpers', () => {
  describe('coerceConversationHistory', () => {
    it('returns undefined for non-array input', () => {
      expect(coerceConversationHistory(null)).toBeUndefined();
      expect(coerceConversationHistory('hello')).toBeUndefined();
      expect(coerceConversationHistory({})).toBeUndefined();
    });

    it('returns undefined for empty array', () => {
      expect(coerceConversationHistory([])).toBeUndefined();
    });

    it('coerces valid turns', () => {
      const result = coerceConversationHistory([
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: 'Let us count together.' },
      ]);
      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({ role: 'user', content: 'What is 2+2?' });
      expect(result![1]).toEqual({ role: 'assistant', content: 'Let us count together.' });
    });

    it('filters out invalid roles', () => {
      const result = coerceConversationHistory([
        { role: 'system', content: 'system prompt' },
        { role: 'user', content: 'hello' },
        { role: 'invalid', content: 'bad role' },
      ]);
      expect(result).toHaveLength(1);
      expect(result![0].role).toBe('user');
    });

    it('filters out empty content', () => {
      const result = coerceConversationHistory([
        { role: 'user', content: '' },
        { role: 'assistant', content: 'valid' },
      ]);
      expect(result).toHaveLength(1);
      expect(result![0].content).toBe('valid');
    });

    it('preserves timestamp and toolsUsed', () => {
      const result = coerceConversationHistory([
        { role: 'user', content: 'hi', timestamp: 12345, toolsUsed: ['give_hint'] },
      ]);
      expect(result![0].timestamp).toBe(12345);
      expect(result![0].toolsUsed).toEqual(['give_hint']);
    });

    it('caps to last 20 turns', () => {
      const input = Array.from({ length: 25 }, (_, i) => ({
        role: 'user' as const,
        content: `msg ${i}`,
      }));
      const result = coerceConversationHistory(input);
      expect(result).toHaveLength(20);
      expect(result![0].content).toBe('msg 5');
      expect(result![19].content).toBe('msg 24');
    });

    it('truncates content to 500 chars', () => {
      const longContent = 'x'.repeat(600);
      const result = coerceConversationHistory([
        { role: 'user', content: longContent },
      ]);
      expect(result![0].content).toHaveLength(500);
    });
  });

  describe('coerceMastery', () => {
    it('returns undefined for non-object input', () => {
      expect(coerceMastery(null)).toBeUndefined();
      expect(coerceMastery('string')).toBeUndefined();
      expect(coerceMastery(42)).toBeUndefined();
    });

    it('returns undefined for empty object', () => {
      expect(coerceMastery({})).toBeUndefined();
    });

    it('coerces valid mastery signals', () => {
      const result = coerceMastery({
        skillMastery: { 'math.add': 0.8, 'math.sub': 0.3 },
        currentSkill: 'math.add',
        sessionCorrect: 5,
        sessionAttempts: 8,
        currentStreak: 3,
      });
      expect(result).toEqual({
        skillMastery: { 'math.add': 0.8, 'math.sub': 0.3 },
        currentSkill: 'math.add',
        sessionCorrect: 5,
        sessionAttempts: 8,
        currentStreak: 3,
      });
    });

    it('filters out mastery scores outside 0-1 range', () => {
      const result = coerceMastery({
        skillMastery: { valid: 0.5, tooHigh: 1.5, tooLow: -0.3 },
      });
      expect(result!.skillMastery).toEqual({ valid: 0.5 });
    });

    it('handles partial mastery objects', () => {
      const result = coerceMastery({ currentStreak: 2 });
      expect(result).toEqual({ currentStreak: 2 });
    });
  });

  describe('coerceSessionPhase', () => {
    it('returns undefined for non-string input', () => {
      expect(coerceSessionPhase(null)).toBeUndefined();
      expect(coerceSessionPhase(123)).toBeUndefined();
      expect(coerceSessionPhase({})).toBeUndefined();
    });

    it('returns undefined for invalid phase strings', () => {
      expect(coerceSessionPhase('invalid')).toBeUndefined();
      expect(coerceSessionPhase('')).toBeUndefined();
      expect(coerceSessionPhase('OPENING')).toBeUndefined();
    });

    it('returns valid phase strings', () => {
      expect(coerceSessionPhase('opening')).toBe('opening');
      expect(coerceSessionPhase('coaching')).toBe('coaching');
      expect(coerceSessionPhase('celebrating')).toBe('celebrating');
      expect(coerceSessionPhase('closing')).toBe('closing');
      expect(coerceSessionPhase('free_chat')).toBe('free_chat');
    });
  });
});

describe('Agent engagement: validateTutorTurnPayload with new fields', () => {
  it('accepts conversationHistory, mastery, sessionPhase, and correct', () => {
    const result = validateTutorTurnPayload({
      childId: 'child-1',
      contentItemId: 'item-1',
      message: 'I got it right!',
      attemptNumber: 1,
      conversationHistory: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ],
      mastery: { sessionCorrect: 3, sessionAttempts: 5, currentStreak: 2 },
      sessionPhase: 'celebrating',
      correct: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.conversationHistory).toHaveLength(2);
      expect(result.value.mastery?.sessionCorrect).toBe(3);
      expect(result.value.sessionPhase).toBe('celebrating');
      expect(result.value.correct).toBe(true);
    }
  });

  it('accepts request without optional engagement fields', () => {
    const result = validateTutorTurnPayload({
      childId: 'child-1',
      contentItemId: 'item-1',
      message: 'help me',
      attemptNumber: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.conversationHistory).toBeUndefined();
      expect(result.value.mastery).toBeUndefined();
      expect(result.value.sessionPhase).toBeUndefined();
      expect(result.value.correct).toBeUndefined();
    }
  });

  it('coerces invalid sessionPhase to undefined', () => {
    const result = validateTutorTurnPayload({
      childId: 'child-1',
      contentItemId: 'item-1',
      message: 'help',
      attemptNumber: 1,
      sessionPhase: 'bogus_phase',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sessionPhase).toBeUndefined();
    }
  });

  it('coerces invalid conversation history to undefined', () => {
    const result = validateTutorTurnPayload({
      childId: 'child-1',
      contentItemId: 'item-1',
      message: 'help',
      attemptNumber: 1,
      conversationHistory: 'not an array',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.conversationHistory).toBeUndefined();
    }
  });
});
