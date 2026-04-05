import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { OpenClawDashboard } from '@/components/openclaw';

export default function OpenClawPage() {
  return (
    <DashboardLayout>
      <OpenClawDashboard />
    </DashboardLayout>
  );
}
