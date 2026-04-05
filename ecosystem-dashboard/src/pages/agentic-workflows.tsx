import React from 'react';
import AgenticWorkflowsManager from '@/components/AgenticWorkflowsManager';
import Head from 'next/head';
import { withFeatureGuard } from '@/lib/auth/withFeatureGuard';

const AgenticWorkflowsPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Agentic Workflows | AI Homelab Dashboard</title>
        <meta name="description" content="Manage and monitor Agentic Workflows" />
      </Head>
      <AgenticWorkflowsManager />
    </>
  );
};

export default withFeatureGuard(AgenticWorkflowsPage, 'agentic-workflows');
