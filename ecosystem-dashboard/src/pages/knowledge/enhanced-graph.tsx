/**
 * Enhanced Knowledge Graph Dashboard Page
 * 
 * This page provides a modern, comprehensive interface for interacting with
 * the Knowledge Graph, featuring AI-powered queries, advanced visualization,
 * and real-time data exploration capabilities.
 *
 * Uses client-side only rendering to avoid Chakra UI styling issues during SSR
 */

import React from 'react';
import { NextPage } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Use dynamic imports to prevent SSR issues with Chakra UI
const EnhancedGraphContent = dynamic(
  () => import('@/components/knowledge/EnhancedGraphContent'),
  { ssr: false, loading: () => <div>Loading enhanced knowledge graph interface...</div> }
);

/**
 * Enhanced Knowledge Graph Page
 * 
 * Provides a modern, comprehensive dashboard for interacting with
 * the Knowledge Graph, featuring AI-powered queries, advanced visualization,
 * and real-time data exploration capabilities.
 * All Chakra UI components are rendered client-side only.
 */
const EnhancedKnowledgeGraphPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Enhanced Knowledge Graph</title>
      </Head>
      <EnhancedGraphContent />
    </>
  );
};

// Add getLayout property for the Next.js layout system
type PageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode
};

(EnhancedKnowledgeGraphPage as PageWithLayout).getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default EnhancedKnowledgeGraphPage;
