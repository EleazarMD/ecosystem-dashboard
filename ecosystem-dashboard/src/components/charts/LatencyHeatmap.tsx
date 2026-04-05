import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface LatencyData {
  provider: string;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
}

interface LatencyHeatmapProps {
  data: LatencyData[];
}

export const LatencyHeatmap: React.FC<LatencyHeatmapProps> = ({ data }) => {
  const gridColor = '#a0aec0';
  const textColor = '#718096';
  const tooltipBg = '#ffffff';

  const getLatencyColor = (latency: number) => {
    if (latency < 500) return '#48bb78'; // green
    if (latency < 1000) return '#ecc94b'; // yellow
    if (latency < 2000) return '#ed8936'; // orange
    return '#e53e3e'; // red
  };

  return (
    <Box width="100%" height="100%">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="provider"
            stroke={textColor}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke={textColor}
            tick={{ fontSize: 12 }}
            label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${gridColor}`,
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar dataKey="avgLatency" name="Average" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getLatencyColor(entry.avgLatency)} />
            ))}
          </Bar>
          <Bar dataKey="p95" name="P95" fill="#805ad5" radius={[8, 8, 0, 0]} />
          <Bar dataKey="p99" name="P99" fill="#e53e3e" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};
