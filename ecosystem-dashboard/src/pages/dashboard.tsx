import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  VStack,
  Container,
  Grid,
  GridItem,
  useToast,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AICommandCenter from '@/components/dashboard/AICommandCenter';
import IntelligentProjectGrid from '@/components/dashboard/IntelligentProjectGrid';
import SmartSystemHealth from '@/components/dashboard/SmartSystemHealth';
import KnowledgeInsights from '@/components/dashboard/KnowledgeInsights';
import { useDashboardAgentInit } from '@/hooks/useDashboardAgentInit';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const MotionBox = motion(Box);
const MotionGridItem = motion(GridItem);

interface AgentInsight {
  id: string;
  agent: string;
  type: 'opportunity' | 'warning' | 'success' | 'action';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export default function ModernDashboard() {
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const bg = useSemanticToken('surface.base');

  // Initialize DashboardAIAgent for ADK UI registration
  const { agent, isRegistered, error, isReady } = useDashboardAgentInit();

  useEffect(() => {
    // Simulate initial data loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Log agent registration status
  useEffect(() => {
    if (isReady) {
      console.log('🎯 DashboardAIAgent is ready and registered for ADK UI');
      toast({
        title: 'AI Agent Ready',
        description: 'Dashboard AI Coordinator is now available in Agentic Control',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
    if (error) {
      console.error('❌ DashboardAIAgent initialization error:', error);
    }
  }, [isReady, error, toast]);

  const handleInsightAction = (insight: AgentInsight) => {
    toast({
      title: `Taking action on: ${insight.title}`,
      description: `${insight.agent} recommendation in progress...`,
      status: 'info',
      duration: 3000,
    });
  };

  const handleProjectAction = (projectId: string, action: string) => {
    toast({
      title: `Project Action: ${action}`,
      description: `Executing ${action} on project ${projectId}`,
      status: 'success',
      duration: 3000,
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxW="container.2xl" py={8}>
          <VStack spacing={8} align="center" justify="center" minH="60vh">
            <MotionBox
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <Text fontSize="2xl" fontWeight="bold" color={useSemanticToken('interactive.primary')}>
                Initializing AI Command Center...
              </Text>
            </MotionBox>
          </VStack>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box bg={bg} minH="100vh">
        <Container maxW="container.2xl" py={6}>
          <VStack spacing={8} align="stretch">
            {/* AI Command Center Header */}
            <MotionBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <AICommandCenter onTakeAction={handleInsightAction} />
            </MotionBox>

            {/* Main Content Grid */}
            <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={8}>
              {/* Left Column - Projects */}
              <MotionGridItem
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <IntelligentProjectGrid onProjectAction={handleProjectAction} />
              </MotionGridItem>

              {/* Right Column - System Health */}
              <MotionGridItem
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <SmartSystemHealth />
              </MotionGridItem>
            </Grid>

            {/* Bottom Section - Knowledge Insights */}
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <KnowledgeInsights />
            </MotionBox>

            {/* Footer Insights */}
            <MotionBox
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              textAlign="center"
              py={4}
            >
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                AI Homelab Ecosystem Dashboard • Powered by Agentic Intelligence •
                Last updated: {new Date().toLocaleTimeString()}
              </Text>
            </MotionBox>
          </VStack>
        </Container>
      </Box>
    </DashboardLayout>
  );
}
