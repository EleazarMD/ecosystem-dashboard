import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface DataPoint {
  timestamp: string;
  requests: number;
  errors: number;
}

interface RequestFlowChartProps {
  data: DataPoint[];
}

export const RequestFlowChart: React.FC<RequestFlowChartProps> = ({ data }) => {
  const gridColor = '#a0aec0';
  const textColor = '#718096';
  const tooltipBg = '#ffffff';

  return (
    <Box width="100%" height="100%">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="timestamp"
            stroke={textColor}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }}
          />
          <YAxis stroke={textColor} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${gridColor}`,
              borderRadius: '8px',
            }}
            labelFormatter={(value) => new Date(value).toLocaleString()}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="requests"
            stroke="#3182ce"
            strokeWidth={2}
            dot={false}
            name="Requests"
          />
          <Line
            type="monotone"
            dataKey="errors"
            stroke="#e53e3e"
            strokeWidth={2}
            dot={false}
            name="Errors"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};
