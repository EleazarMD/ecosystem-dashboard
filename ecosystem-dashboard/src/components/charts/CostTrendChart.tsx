import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface CostDataPoint {
  timestamp: string;
  cost: number;
  requests: number;
}

interface CostTrendChartProps {
  data: CostDataPoint[];
}

export const CostTrendChart: React.FC<CostTrendChartProps> = ({ data }) => {
  const gridColor = '#a0aec0';
  const textColor = '#718096';
  const tooltipBg = '#ffffff';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  return (
    <Box width="100%" height="100%">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#805ad5" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#805ad5" stopOpacity={0.1} />
            </linearGradient>
          </defs>
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
          <YAxis
            stroke={textColor}
            tick={{ fontSize: 12 }}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${gridColor}`,
              borderRadius: '8px',
            }}
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value: number) => [formatCurrency(value), 'Cost']}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="#805ad5"
            strokeWidth={2}
            fill="url(#costGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};
