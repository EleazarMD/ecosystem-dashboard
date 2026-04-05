/**
 * Clinical Fine-tuning Export API
 * Exports curated training examples in various formats for fine-tuning
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.CLINICAL_KB_HOST || '192.168.1.66',
  port: parseInt(process.env.CLINICAL_KB_PORT || '5435'),
  database: 'clinical_kb',
  user: 'clinical_kb',
  password: process.env.CLINICAL_KB_PASSWORD || 'clinical_kb_secure_d0de835df82a2727',
  max: 5,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { 
    setting, 
    format = 'jsonl',
    status = 'approved',
    min_quality = '3'
  } = req.query;

  try {
    let query = `
      SELECT 
        fe.query,
        fe.expected_output,
        fe.query_type,
        fe.quality_score,
        cs.name as clinical_setting
      FROM finetuning_examples fe
      LEFT JOIN clinical_settings cs ON fe.clinical_setting_id = cs.id
      WHERE fe.status = $1
        AND fe.quality_score >= $2
    `;
    
    const params: any[] = [status, parseInt(min_quality as string)];

    if (setting && setting !== 'all') {
      query += ` AND cs.name = $3`;
      params.push(setting);
    }

    query += ` ORDER BY fe.quality_score DESC, fe.created_at DESC`;

    const result = await pool.query(query, params);

    if (format === 'jsonl') {
      // OpenAI/Hugging Face fine-tuning format
      const lines = result.rows.map(row => {
        return JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a clinical decision support assistant for ${row.clinical_setting || 'primary care'} physicians. Provide evidence-based, actionable guidance.`
            },
            {
              role: 'user',
              content: row.query
            },
            {
              role: 'assistant',
              content: row.expected_output
            }
          ]
        });
      });

      res.setHeader('Content-Type', 'application/jsonl');
      res.setHeader('Content-Disposition', `attachment; filename=clinical-finetuning-${new Date().toISOString().split('T')[0]}.jsonl`);
      return res.status(200).send(lines.join('\n'));
    }

    if (format === 'alpaca') {
      // Alpaca format for instruction tuning
      const examples = result.rows.map(row => ({
        instruction: row.query,
        input: '',
        output: row.expected_output,
        metadata: {
          clinical_setting: row.clinical_setting,
          query_type: row.query_type,
          quality_score: row.quality_score
        }
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=clinical-alpaca-${new Date().toISOString().split('T')[0]}.json`);
      return res.status(200).json(examples);
    }

    if (format === 'sharegpt') {
      // ShareGPT format
      const conversations = result.rows.map((row, idx) => ({
        id: `clinical_${idx}`,
        conversations: [
          { from: 'human', value: row.query },
          { from: 'gpt', value: row.expected_output }
        ],
        metadata: {
          clinical_setting: row.clinical_setting,
          query_type: row.query_type
        }
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=clinical-sharegpt-${new Date().toISOString().split('T')[0]}.json`);
      return res.status(200).json(conversations);
    }

    // Default: raw JSON
    return res.status(200).json({
      examples: result.rows,
      count: result.rows.length,
      export_date: new Date().toISOString(),
      filters: { setting, status, min_quality }
    });

  } catch (error) {
    console.error('[Clinical Export] Error:', error);
    return res.status(500).json({ error: 'Failed to export examples' });
  }
}
