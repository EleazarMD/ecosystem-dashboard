import type { Pool } from 'pg';

import { AIChildSafetyMonitor } from '@/lib/kids-pic/AIChildSafetyMonitor';

type InteractionRow = {
  childId: string;
  sessionId: string;
  messageCount: number;
};

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

describe('AIChildSafetyMonitor realtime interaction metrics', () => {
  it('counts tutor-turn analyzed sessions in interactionsThisWeek', async () => {
    const interactions = new Map<string, InteractionRow>();

    const query = jest.fn(async (sql: string, params: unknown[] = []) => {
      const normalized = normalizeSql(sql);

      if (normalized.includes('from sycophancy_patterns')) {
        return { rows: [] };
      }

      if (normalized.includes('insert into ai_interaction_analysis')) {
        const childId = params[0] as string;
        const sessionId = params[1] as string;
        const messageCount = Number(params[3] || 0);

        const key = `${childId}:${sessionId}`;
        const existing = interactions.get(key);
        interactions.set(
          key,
          existing
            ? {
                ...existing,
                messageCount: existing.messageCount + messageCount,
              }
            : {
                childId,
                sessionId,
                messageCount,
              },
        );

        return { rows: [] };
      }

      if (normalized.includes('select cp.display_name from child_profiles')) {
        const childId = params[0] as string;
        const parentId = params[1] as string;
        if (childId === 'child-1' && parentId === 'parent-1') {
          return { rows: [{ display_name: 'Ava' }] };
        }
        return { rows: [] };
      }

      if (normalized.includes('calculate_ai_safety_score')) {
        return { rows: [{ score: '0.9' }] };
      }

      if (normalized.includes('from ai_safety_incidents') && normalized.includes("status = 'open'")) {
        return { rows: [{ count: '0' }] };
      }

      if (normalized.includes('from ai_safety_alerts') && normalized.includes("status = 'pending'")) {
        return { rows: [{ count: '0' }] };
      }

      if (normalized.includes('from ai_safety_trends')) {
        return {
          rows: [
            {
              id: 'trend-1',
              child_id: 'child-1',
              week_start: new Date().toISOString(),
              total_interactions: '0',
              total_messages: '0',
            },
          ],
        };
      }

      if (normalized.includes('count(*)::text as interactions_this_week')) {
        const childId = params[0] as string;
        const rows = Array.from(interactions.values()).filter((row) => row.childId === childId);
        const interactionsThisWeek = rows.length;
        const messagesThisWeek = rows.reduce((sum, row) => sum + row.messageCount, 0);

        return {
          rows: [
            {
              interactions_this_week: String(interactionsThisWeek),
              messages_this_week: String(messagesThisWeek),
            },
          ],
        };
      }

      if (
        normalized.includes('select * from ai_safety_incidents') &&
        normalized.includes('order by occurred_at desc')
      ) {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    });

    const pool = { query } as unknown as Pool;
    const monitor = new AIChildSafetyMonitor(pool);

    await monitor.analyzeMessage({
      childId: 'child-1',
      sessionId: 'learn-session-1',
      childMessage: 'I think it is eight',
      aiResponse: 'Nice try. Let us check one step at a time.',
      characterId: 'learn_tutor',
      aiModel: 'deterministic_coach_v1',
      timestamp: new Date(),
    });

    await monitor.analyzeMessage({
      childId: 'child-1',
      sessionId: 'learn-session-2',
      childMessage: 'I am stuck again',
      aiResponse: 'You are doing great. What operation should we use first?',
      characterId: 'learn_tutor',
      aiModel: 'deterministic_coach_v1',
      timestamp: new Date(),
    });

    const summary = await monitor.getSafetySummary('parent-1', 'child-1');

    expect(summary.interactionsThisWeek).toBe(2);
    expect(summary.weeklyTrend?.totalInteractions).toBe(2);
    expect(summary.weeklyTrend?.totalMessages).toBe(4);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ai_interaction_analysis'),
      expect.arrayContaining(['child-1', 'learn-session-1']),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ai_interaction_analysis'),
      expect.arrayContaining(['child-1', 'learn-session-2']),
    );
  });
});
