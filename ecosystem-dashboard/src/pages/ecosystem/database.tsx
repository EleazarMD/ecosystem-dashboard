import React from 'react';
import { NextPage } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Use dynamic imports to prevent SSR issues with Material UI
// This ensures all MUI styling is done client-side only
const DatabasePageContent = dynamic(
  () => import('@/components/ecosystem/DatabasePageContent'),
  { ssr: false, loading: () => <div>Loading database interface...</div> }
);

/**
 * Database Page Component
 * 
 * Provides a visual interface for exploring the MCP server's PostgreSQL database.
 * All actual functionality is in the client-side only DatabasePageContent component
 * to prevent MUI styling issues during SSR/static generation.
 */
const DatabasePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Database | MCP Dashboard</title>
        <meta name="description" content="MCP Database Explorer" />
      </Head>
      <DatabasePageContent />
    </>
  );
};

// Add getLayout property for the Next.js layout system
type PageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode
};

(DatabasePage as PageWithLayout).getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default DatabasePage;
