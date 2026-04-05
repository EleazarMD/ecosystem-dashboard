import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '100.108.41.22',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ai_homelab',
  user: process.env.POSTGRES_USER || 'eleazar',
  password: process.env.POSTGRES_PASSWORD,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    // Log agentic activity from OpenClaw
    try {
      const { skill_name, success, duration_ms, input_summary, output_summary, error_message } = req.body;
      const client = await pool.connect();
      
      try {
        await client.query(
          `INSERT INTO clinical_kb_agentic_activity 
           (skill_name, success, duration_ms, input_summary, output_summary, error_message)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [skill_name, success, duration_ms, JSON.stringify(input_summary || {}), JSON.stringify(output_summary || {}), error_message]
        );
        res.status(200).json({ success: true });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
      res.status(500).json({ error: 'Failed to log activity' });
    }
  } else if (req.method === 'GET') {
    // Get activity summary
    try {
      const { hours = 24 } = req.query;
      const client = await pool.connect();
      
      try {
        // Get activity counts by skill
        const skillCounts = await client.query(`
          SELECT skill_name, 
                 COUNT(*) as total,
                 SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
                 AVG(duration_ms) as avg_duration_ms
          FROM clinical_kb_agentic_activity
          WHERE timestamp > NOW() - INTERVAL '${parseInt(hours as string)} hours'
          GROUP BY skill_name
          ORDER BY total DESC
        `);
        
        // Get recent activity
        const recentActivity = await client.query(`
          SELECT timestamp, skill_name, success, duration_ms, error_message
          FROM clinical_kb_agentic_activity
          WHERE timestamp > NOW() - INTERVAL '${parseInt(hours as string)} hours'
          ORDER BY timestamp DESC
          LIMIT 50
        `);
        
        // Get hourly activity for chart
        const hourlyActivity = await client.query(`
          SELECT date_trunc('hour', timestamp) as hour,
                 COUNT(*) as total,
                 SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful
          FROM clinical_kb_agentic_activity
          WHERE timestamp > NOW() - INTERVAL '${parseInt(hours as string)} hours'
          GROUP BY date_trunc('hour', timestamp)
          ORDER BY hour
        `);
        
        res.status(200).json({
          by_skill: skillCounts.rows,
          recent: recentActivity.rows,
          hourly: hourlyActivity.rows
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to get activity:', error);
      res.status(500).json({ error: 'Failed to get activity' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
