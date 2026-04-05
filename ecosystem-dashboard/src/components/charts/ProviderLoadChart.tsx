import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface LoadData {
  provider: string;
  requests: number;
  percentage: number;
}

interface ProviderLoadChartProps {
  data: LoadData[];
}

const COLORS = ['#3182ce', '#805ad5', '#38b2ac', '#ed8936', '#e53e3e', '#48bb78'];

export const ProviderLoadChart: React.FC<ProviderLoadChartProps> = ({ data }) => {
  const textColor = '#718096';
  const tooltipBg = '#ffffff';

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    if (percent < 0.05) return null; // Don't show label if less than 5%

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Box width="100%" height="100%">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="requests"
            nameKey="provider"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value} requests (${props.payload.percentage.toFixed(1)}%)`,
              props.payload.provider,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: textColor }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};
