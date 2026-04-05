/**
 * Basic Knowledge Graph Page - Minimal Version
 * Uses client-side only rendering to avoid MUI styling issues during SSR
 */

import React from 'react';
import { NextPage } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Use dynamic imports to prevent SSR issues with Material UI
const BasicContent = dynamic(
  () => import('@/components/knowledge/BasicContent'),
  { ssr: false, loading: () => <div>Loading basic knowledge graph interface...</div> }
);

/**
 * Basic Knowledge Graph Page
 * 
 * A minimal version for testing purposes.
 * All MUI components are rendered client-side only.
 */
const BasicKnowledgeGraphPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Basic Knowledge Graph</title>
      </Head>
      <BasicContent />
    </>
  );
};

// Add getLayout property for the Next.js layout system
type PageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode
};

(BasicKnowledgeGraphPage as PageWithLayout).getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default BasicKnowledgeGraphPage;
