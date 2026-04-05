import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Sample data - replace with actual data fetched from API
const sampleData = [
  { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
  { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
  { name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
  { name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
  { name: 'Page E', uv: 1890, pv: 4800, amt: 2181 },
  { name: 'Page F', uv: 2390, pv: 3800, amt: 2500 },
  { name: 'Page G', uv: 3490, pv: 4300, amt: 2100 },
];

interface TimeSeriesChartProps {
  data?: Array<{ [key: string]: any }>; // Data should be an array of objects
  xDataKey: string; // Key for X-axis data (e.g., 'timestamp')
  lineDataKeys: Array<{ key: string; color: string }>; // Array of keys for Y-axis lines and their colors
  title?: string;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ 
  data = sampleData, // Default to sample data for now
  xDataKey = 'name', 
  lineDataKeys = [{ key: 'uv', color: '#8884d8' }, { key: 'pv', color: '#82ca9d' }],
  title
}) => {
  return (
    <div style={{ width: '100%', height: 300 }}>
      {title && <h3>{title}</h3>}
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xDataKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {lineDataKeys.map(line => (
            <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} activeDot={{ r: 8 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimeSeriesChart;
