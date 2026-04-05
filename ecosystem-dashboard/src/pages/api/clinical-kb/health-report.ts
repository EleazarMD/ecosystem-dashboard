import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const REPORT_FILE = '/tmp/clinical-kb-health-report.json';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    // Store the health report from OpenClaw
    try {
      const report = req.body;
      report.received_at = new Date().toISOString();
      
      // Store in file (in production, use a database)
      fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
      
      res.status(200).json({ success: true, report_id: report.report_id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to store report' });
    }
  } else if (req.method === 'GET') {
    // Retrieve the latest health report
    try {
      if (fs.existsSync(REPORT_FILE)) {
        const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
        res.status(200).json(report);
      } else {
        // Return mock data if no report exists yet
        res.status(200).json(getMockReport());
      }
    } catch (error) {
      res.status(200).json(getMockReport());
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

function getMockReport() {
  return {
    report_id: 'kb_health_mock',
    timestamp: new Date().toISOString(),
    metrics: {
      total_pathways: 35,
      target_pathways: 250,
      coverage_percentage: 14.0,
      gap: 215,
      by_specialty: {
        hematology: 20,
        neurology: 3,
        cardiology: 3,
        pulmonology: 2,
        gastroenterology: 2,
        other: 5
      },
      by_priority: {
        P0: { target: 50, completed: 15, percentage: 30 },
        P1: { target: 100, completed: 15, percentage: 15 },
        P2: { target: 100, completed: 5, percentage: 5 }
      }
    },
    quality: {
      avg_depth_score: 3.5,
      max_depth_score: 5.0,
      pathways_below_threshold: [],
      missing_components: {
        population_stratification: ['sickle_cell', 'hemophilia_a'],
        drug_interactions: ['vte_management'],
        monitoring_schedule: ['itp_management']
      },
      enrichment_needed: 0
    },
    performance: {
      queries_24h: 156,
      hit_rate: 0.78,
      avg_response_time_ms: 245,
      cache_efficiency: 0.82,
      errors_24h: 3,
      unresolved_errors: 1
    },
    expansion_queue: {
      pending_count: 12,
      by_priority: { P0: 5, P1: 4, P2: 3 },
      oldest_item_age: '2 days'
    },
    recommendations: [
      {
        priority: 'critical',
        category: 'coverage',
        title: 'Low KB Coverage',
        description: 'Only 14.0% of target conditions have pathways. Focus on P0 conditions.',
        action: 'Run batch_pathway_generation for P0 conditions',
        impact: 'high'
      },
      {
        priority: 'high',
        category: 'expansion',
        title: 'Suggested Next Pathways',
        description: 'High-demand conditions without pathways',
        conditions: ['hypertension', 'type_2_diabetes', 'asthma', 'heart_failure', 'copd'],
        action: 'Generate pathways for these conditions',
        impact: 'high'
      },
      {
        priority: 'medium',
        category: 'balance',
        title: 'Specialty Imbalance',
        description: 'Hematology has 20 pathways while other specialties have 2-3.',
        action: 'Prioritize cardiology, pulmonology, endocrinology',
        impact: 'medium'
      }
    ],
    health_score: {
      score: 42.3,
      status: 'needs_attention',
      color: 'yellow',
      breakdown: {
        coverage: 5.6,
        quality: 21.0,
        performance: 15.6,
        operations: 0.1
      }
    }
  };
}
