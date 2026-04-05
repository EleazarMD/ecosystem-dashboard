/**
 * Intelligent Clusters Page
 * 
 * Main page for AI-driven cluster management with intelligent recommendations,
 * automated scheduling, and learning capabilities.
 */

import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { Box, Container, Typography } from '@mui/material';
import KubernetesIntelligentClusterDashboard from '@/components/infrastructure/KubernetesIntelligentClusterDashboard';

const IntelligentClustersPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Intelligent Cluster Management - AI Homelab Dashboard</title>
        <meta 
          name="description" 
          content="AI-driven cluster lifecycle management with intelligent scheduling, resource optimization, and predictive scaling" 
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container maxWidth={false} sx={{ py: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Intelligent Cluster Management
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            AI-powered infrastructure lifecycle management with predictive scaling and cost optimization
          </Typography>
        </Box>

        <KubernetesIntelligentClusterDashboard />
      </Container>
    </>
  );
};

export default IntelligentClustersPage;
