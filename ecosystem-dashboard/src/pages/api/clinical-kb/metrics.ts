import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// PostgreSQL connection for persistent storage
const pool = new Pool({
  host: process.env.POSTGRES_HOST || '100.108.41.22',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ai_homelab',
  user: process.env.POSTGRES_USER || 'eleazar',
  password: process.env.POSTGRES_PASSWORD,
});

// Initialize tables if they don't exist
async function initTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS clinical_kb_metrics (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        domain VARCHAR(50) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_value JSONB NOT NULL,
        metadata JSONB DEFAULT '{}'
      );
      
      CREATE INDEX IF NOT EXISTS idx_clinical_kb_metrics_domain 
        ON clinical_kb_metrics(domain, timestamp DESC);
      
      CREATE INDEX IF NOT EXISTS idx_clinical_kb_metrics_name 
        ON clinical_kb_metrics(metric_name, timestamp DESC);
      
      CREATE TABLE IF NOT EXISTS clinical_kb_health_reports (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(100) UNIQUE NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        health_score DECIMAL(5,2),
        report_data JSONB NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_clinical_kb_health_reports_timestamp 
        ON clinical_kb_health_reports(timestamp DESC);
      
      CREATE TABLE IF NOT EXISTS clinical_kb_agentic_activity (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        skill_name VARCHAR(100) NOT NULL,
        success BOOLEAN NOT NULL,
        duration_ms INTEGER,
        input_summary JSONB,
        output_summary JSONB,
        error_message TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_clinical_kb_agentic_activity_timestamp 
        ON clinical_kb_agentic_activity(timestamp DESC);
    `);
  } finally {
    client.release();
  }
}

// Initialize on first request
let initialized = false;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!initialized) {
    try {
      await initTables();
      initialized = true;
    } catch (error) {
      console.error('Failed to initialize tables:', error);
    }
  }

  if (req.method === 'POST') {
    // Store metrics from OpenClaw
    try {
      const { domain, metrics, timestamp } = req.body;
      const client = await pool.connect();
      
      try {
        for (const [metricName, metricValue] of Object.entries(metrics)) {
          await client.query(
            `INSERT INTO clinical_kb_metrics (timestamp, domain, metric_name, metric_value)
             VALUES ($1, $2, $3, $4)`,
            [timestamp || new Date(), domain, metricName, JSON.stringify(metricValue)]
          );
        }
        res.status(200).json({ success: true, stored: Object.keys(metrics).length });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to store metrics:', error);
      res.status(500).json({ error: 'Failed to store metrics' });
    }
  } else if (req.method === 'GET') {
    // Retrieve metrics with optional filters
    try {
      const { domain, metric, hours = 24, limit = 100 } = req.query;
      const client = await pool.connect();
      
      try {
        let query = `
          SELECT timestamp, domain, metric_name, metric_value
          FROM clinical_kb_metrics
          WHERE timestamp > NOW() - INTERVAL '${parseInt(hours as string)} hours'
        `;
        const params: any[] = [];
        
        if (domain) {
          params.push(domain);
          query += ` AND domain = $${params.length}`;
        }
        if (metric) {
          params.push(metric);
          query += ` AND metric_name = $${params.length}`;
        }
        
        query += ` ORDER BY timestamp DESC LIMIT ${parseInt(limit as string)}`;
        
        const result = await client.query(query, params);
        res.status(200).json({ metrics: result.rows });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to retrieve metrics:', error);
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
