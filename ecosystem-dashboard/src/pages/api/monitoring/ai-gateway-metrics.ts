import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface ParsedMetrics {
  [key: string]: number | string;
}

// Helper function to parse Prometheus text format
// This is a simplified parser. For complex scenarios, a dedicated library might be better.
const parsePrometheusTextFormat = (text: string): ParsedMetrics => {
  const metrics: ParsedMetrics = {};
  const lines = text.split('\n');
  lines.forEach(line => {
    if (line.startsWith('#') || line.trim() === '') {
      return; // Skip comments and empty lines
    }
    const parts = line.split(' ');
    const nameAndLabels = parts[0];
    const value = parseFloat(parts[1]);

    // Simple parsing: extract metric name, ignore labels for now for simplicity
    // Example: http_requests_total{method="POST",route="/api/data",status_code="200"} 1027
    // We'll take 'http_requests_total' as the key for simplicity in this basic parser.
    // A more robust parser would handle labels properly.
    const metricNameMatch = nameAndLabels.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)/);
    if (metricNameMatch) {
      const metricName = metricNameMatch[0];
      // For metrics that might appear multiple times with different labels (like auth_attempts_total),
      // we might want to sum them up or handle them based on labels.
      // For this simplified version, we'll just take the first occurrence or sum if it's a simple counter.
      if (metrics[metricName] && typeof metrics[metricName] === 'number' && !isNaN(value)) {
        (metrics[metricName] as number) += value; // Sum if already exists (e.g. for counters with different labels)
      } else if (!isNaN(value)) {
        metrics[metricName] = value;
      }
    }
  });
  return metrics;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const aiGatewayMetricsUrl = 'http://localhost:3000/metrics'; // As per PORT_REGISTRY.yml

  try {
    const response = await axios.get(aiGatewayMetricsUrl);
    if (response.status !== 200) {
      throw new Error(`Failed to fetch metrics from AI Gateway: ${response.status}`);
    }

    const rawMetrics = response.data;
    const parsedMetrics = parsePrometheusTextFormat(rawMetrics);
    
    // Select specific metrics we want to expose to the dashboard
    // This can be expanded based on what's needed
    const dashboardMetrics = {
      auth_attempts_total: parsedMetrics.auth_attempts_total || 0,
      http_rate_limited_requests_total: parsedMetrics.http_rate_limited_requests_total || 0,
      process_cpu_seconds_total: parsedMetrics.process_cpu_seconds_total || 0,
      process_resident_memory_bytes: parsedMetrics.process_resident_memory_bytes || 0,
      // Add other relevant metrics here
    };

    res.status(200).json(dashboardMetrics);
  } catch (error: any) {
    console.error('Error fetching or parsing AI Gateway metrics:', error);
    res.status(500).json({ message: 'Error fetching AI Gateway metrics', error: error.message });
  }
}
