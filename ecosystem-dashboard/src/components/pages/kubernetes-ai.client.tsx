/**
 * Kubernetes AI Agent Page
 * 
 * Dedicated page for demonstrating and interacting with the Kubernetes AI Agent.
 * Showcases the integration between the AI Homelab Dashboard Agent Development Kit
 * and the Kubernetes Intelligent Cluster Management system.
 */

import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import {
  Container,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  // Grid, // Replaced with SafeGrid to fix forEach error
  Chip
} from '@mui/material';
import { SafeGrid } from '@/components/SafeGrid';
import {
  Psychology as AIIcon,
  Cloud as KubernetesIcon,
  AutoAwesome as IntelligentIcon
} from '@mui/icons-material';

import KubernetesAIAgentDemo from '@/components/agent/KubernetesAIAgentDemo';

const KubernetesAIPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Kubernetes AI Agent - AI Homelab Dashboard</title>
        <meta name="description" content="Intelligent Kubernetes cluster management through AI-powered natural language interactions" />
      </Head>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 2,
              mb: 2
            }}
          >
            <AIIcon sx={{ fontSize: 48 }} color="primary" />
            <KubernetesIcon sx={{ fontSize: 48 }} color="secondary" />
            Kubernetes AI Agent
          </Typography>
          
          <Typography variant="h5" color="textSecondary" gutterBottom>
            Intelligent Infrastructure Management through Natural Language
          </Typography>
          
          <Typography variant="body1" sx={{ maxWidth: 800, mx: 'auto', mb: 3 }}>
            Experience the power of AI-driven Kubernetes management. This agent combines the 
            AI Homelab Dashboard's Agent Development Kit with our Kubernetes Intelligent Cluster 
            Operator to provide natural language interactions, intelligent recommendations, 
            and automated infrastructure operations.
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip icon={<IntelligentIcon />} label="AI-Powered Decisions" color="primary" />
            <Chip icon={<KubernetesIcon />} label="Native K8s Integration" color="secondary" />
            <Chip label="Natural Language Interface" variant="outlined" />
            <Chip label="Predictive Analytics" variant="outlined" />
            <Chip label="Automated Operations" variant="outlined" />
          </Box>
        </Box>

        {/* Features Overview */}
        <SafeGrid container spacing={3} sx={{ mb: 4 }}>
          <SafeGrid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  🎯 Intelligent Cluster Management
                </Typography>
                <Typography variant="body2">
                  Ask questions about your clusters in natural language. Get real-time status, 
                  health checks, and performance metrics with AI-powered insights.
                </Typography>
              </CardContent>
            </Card>
          </SafeGrid>
          
          <SafeGrid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="secondary">
                  🔧 Optimization Recommendations
                </Typography>
                <Typography variant="body2">
                  Receive intelligent recommendations for cost optimization, resource efficiency, 
                  and performance improvements based on machine learning analysis.
                </Typography>
              </CardContent>
            </Card>
          </SafeGrid>
          
          <SafeGrid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="success.main">
                  🤖 Automated Operations
                </Typography>
                <Typography variant="body2">
                  Execute cluster operations through conversational commands. Start, stop, 
                  scale, and optimize your infrastructure with confidence-scored actions.
                </Typography>
              </CardContent>
            </Card>
          </SafeGrid>
        </SafeGrid>

        {/* Integration Notice */}
        <Alert 
          severity="info" 
          sx={{ mb: 4 }}
          icon={<IntelligentIcon />}
        >
          <Typography variant="body2">
            <strong>AI Homelab Ecosystem Integration:</strong> This agent seamlessly integrates with 
            the Kubernetes Intelligent Cluster Operator (running on port 8081) and the AHIS server 
            (port 8895) to provide comprehensive infrastructure intelligence and automation capabilities.
          </Typography>
        </Alert>

        {/* Main Demo Component */}
        <KubernetesAIAgentDemo />

        {/* Technical Details */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom>
            Technical Architecture
          </Typography>
          
          <SafeGrid container spacing={3}>
            <SafeGrid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Agent Development Kit (ADK)
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Built on the AI Homelab Dashboard's Agent Development Kit, providing:
                  </Typography>
                  <ul>
                    <li>Natural language processing capabilities</li>
                    <li>Multi-modal interaction support</li>
                    <li>Proactive insight generation</li>
                    <li>Conversation memory and context</li>
                    <li>Action confidence scoring</li>
                  </ul>
                </CardContent>
              </Card>
            </SafeGrid>
            
            <SafeGrid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Kubernetes Intelligence
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Powered by the Kubernetes Intelligent Cluster Operator:
                  </Typography>
                  <ul>
                    <li>AI-driven decision engine with 6+ factors</li>
                    <li>Machine learning pattern recognition</li>
                    <li>Predictive scaling and optimization</li>
                    <li>Real-time metrics and cost analysis</li>
                    <li>Automated lifecycle management</li>
                  </ul>
                </CardContent>
              </Card>
            </SafeGrid>
          </SafeGrid>
        </Box>

        {/* Usage Examples */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Example Interactions
          </Typography>
          
          <Card>
            <CardContent>
              <Typography variant="body2" component="div">
                <strong>Try these natural language queries:</strong>
                <br /><br />
                
                <code>"What's the current status of my Kubernetes clusters?"</code>
                <br />
                <em>→ Get comprehensive cluster health and metrics</em>
                <br /><br />
                
                <code>"How can I optimize costs in my development environment?"</code>
                <br />
                <em>→ Receive AI-powered cost optimization recommendations</em>
                <br /><br />
                
                <code>"Start the development cluster with high priority"</code>
                <br />
                <em>→ Execute intelligent cluster startup with context awareness</em>
                <br /><br />
                
                <code>"Analyze resource utilization patterns for the last week"</code>
                <br />
                <em>→ Get predictive insights based on historical data</em>
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </>
  );
};

export default KubernetesAIPage;
