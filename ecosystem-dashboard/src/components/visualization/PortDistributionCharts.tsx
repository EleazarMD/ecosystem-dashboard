import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

interface PortDistributionChartsProps {
  byRange: Record<string, number>;
  byStatus: Record<string, number>;
}

const PortDistributionCharts: React.FC<PortDistributionChartsProps> = ({ byRange, byStatus }) => {
  // Transform data for service type distribution chart
  const serviceTypeData = Object.entries(byRange || {}).map(([type, count]) => ({
    name: type,
    count: count
  }));

  // Transform data for status distribution chart
  const statusData = Object.entries(byStatus || {}).map(([status, count]) => ({
    name: status,
    value: count
  }));

  // Colors for the status pie chart
  const STATUS_COLORS = {
    active: '#38A169', // green
    planned: '#3182CE', // blue
    development: '#DD6B20', // orange
    testing: '#805AD5' // purple
  };

  return (
    <>
      <div style={{ height: '300px', marginBottom: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={serviceTypeData}
            margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
            <YAxis />
            <RechartsTooltip
              formatter={(value: any) => [`${value} ports`, "Count"]}
              labelFormatter={(label: any) => `Service Type: ${label}`}
            />
            <Bar dataKey="count" fill="#3182CE" name="Number of Ports" />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: '0.875rem', color: '#718096', marginTop: '8px', textAlign: 'center' }}>
          Distribution of ports across different service types in the ecosystem.
        </div>
      </div>

      <div style={{ height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => {
                const color = STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#CBD5E0';
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Pie>
            <RechartsTooltip formatter={(value: any) => [`${value} ports`, 'Count']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ fontSize: '0.875rem', color: '#718096', marginTop: '8px', textAlign: 'center' }}>
          Distribution of ports by their current status.
        </div>
      </div>
    </>
  );
};

export default PortDistributionCharts;
