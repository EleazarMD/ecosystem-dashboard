import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AgenticControlDashboard from '@/components/agentic-control/AgenticControlDashboard';

export default function AgenticControlPage() {
  return (
    <DashboardLayout>
      <AgenticControlDashboard />
    </DashboardLayout>
  );
}
