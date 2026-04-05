import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const trainingPool = new Pool({
  host: process.env.TRAINING_DB_HOST || 'localhost',
  port: parseInt(process.env.TRAINING_DB_PORT || '5435'),
  database: process.env.TRAINING_DB_NAME || 'clinical_kb',
  user: process.env.TRAINING_DB_USER || 'clinical_kb',
  password: process.env.TRAINING_DB_PASSWORD || 'clinical_kb_secure_d0de835df82a2727',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = await trainingPool.connect();
  
  try {
    // Get training episodes with metrics
    const episodesQuery = await client.query(`
      SELECT 
        id,
        episode_id,
        started_at,
        completed_at,
        total_steps,
        total_reward,
        initial_score,
        final_score,
        target_reached,
        policy_version,
        avg_loss,
        avg_entropy
      FROM rl_training_episodes
      ORDER BY started_at DESC
      LIMIT 100
    `);

    // Get recent decisions for loss calculation
    const decisionsQuery = await client.query(`
      SELECT 
        decision_id,
        timestamp,
        confidence,
        value_estimate,
        reward,
        improvement
      FROM rl_agent_decisions
      ORDER BY timestamp DESC
      LIMIT 500
    `);

    // Format data for graphs
    const episodes = episodesQuery.rows.map(row => ({
      episode: row.id,
      episodeId: row.episode_id,
      timestamp: row.started_at,
      totalSteps: row.total_steps,
      totalReward: parseFloat(row.total_reward || 0),
      initialScore: parseFloat(row.initial_score || 0),
      finalScore: parseFloat(row.final_score || 0),
      improvement: parseFloat(row.final_score || 0) - parseFloat(row.initial_score || 0),
      avgLoss: parseFloat(row.avg_loss || 0),
      avgEntropy: parseFloat(row.avg_entropy || 0),
      targetReached: row.target_reached,
      policyVersion: row.policy_version,
    }));

    // Aggregate decisions by time buckets for smoother graphs
    const decisions = decisionsQuery.rows.map(row => ({
      timestamp: row.timestamp,
      confidence: parseFloat(row.confidence || 0),
      valueEstimate: parseFloat(row.value_estimate || 0),
      reward: parseFloat(row.reward || 0),
      improvement: parseFloat(row.improvement || 0),
    }));

    // Calculate moving averages
    const windowSize = 10;
    const movingAvgReward = episodes.map((ep, idx) => {
      const start = Math.max(0, idx - windowSize + 1);
      const window = episodes.slice(start, idx + 1);
      const avg = window.reduce((sum, e) => sum + e.totalReward, 0) / window.length;
      return {
        episode: ep.episode,
        timestamp: ep.timestamp,
        value: avg,
      };
    });

    const movingAvgLoss = episodes.map((ep, idx) => {
      const start = Math.max(0, idx - windowSize + 1);
      const window = episodes.slice(start, idx + 1);
      const avg = window.reduce((sum, e) => sum + e.avgLoss, 0) / window.length;
      return {
        episode: ep.episode,
        timestamp: ep.timestamp,
        value: avg,
      };
    });

    res.status(200).json({
      episodes,
      decisions,
      graphs: {
        rewardOverTime: episodes.map(ep => ({
          episode: ep.episode,
          timestamp: ep.timestamp,
          reward: ep.totalReward,
          movingAvg: movingAvgReward.find(m => m.episode === ep.episode)?.value || 0,
        })),
        lossOverTime: episodes.map(ep => ({
          episode: ep.episode,
          timestamp: ep.timestamp,
          loss: ep.avgLoss,
          movingAvg: movingAvgLoss.find(m => m.episode === ep.episode)?.value || 0,
        })),
        entropyOverTime: episodes.map(ep => ({
          episode: ep.episode,
          timestamp: ep.timestamp,
          entropy: ep.avgEntropy,
        })),
        scoreImprovement: episodes.map(ep => ({
          episode: ep.episode,
          timestamp: ep.timestamp,
          initialScore: ep.initialScore,
          finalScore: ep.finalScore,
          improvement: ep.improvement,
        })),
      },
      summary: {
        totalEpisodes: episodes.length,
        avgReward: episodes.reduce((sum, ep) => sum + ep.totalReward, 0) / episodes.length || 0,
        avgLoss: episodes.reduce((sum, ep) => sum + ep.avgLoss, 0) / episodes.length || 0,
        avgEntropy: episodes.reduce((sum, ep) => sum + ep.avgEntropy, 0) / episodes.length || 0,
        targetsReached: episodes.filter(ep => ep.targetReached).length,
        totalDecisions: decisions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching RL training metrics:', error);
    res.status(500).json({ error: 'Failed to fetch training metrics' });
  } finally {
    client.release();
  }
}
