/**
 * AIHomelab Administrator Dashboard
 * Platform management and system intelligence overview
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Grid,
  GridItem,
  Button,
  Icon,
  Badge,
  useToast,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
  FiServer,
  FiSettings,
  FiAlertTriangle,
  FiTrendingUp,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PlatformOverviewWidget from '@/components/admin/PlatformOverviewWidget';
import RecentActivityWidget from '@/components/admin/RecentActivityWidget';
import UserManagementWidget from '@/components/admin/UserManagementWidget';
import AIAgentsWidget from '@/components/admin/AIAgentsWidget';
import SmartSystemHealth from '@/components/dashboard/SmartSystemHealth';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRouter } from 'next/router';
import { withAdmin } from '@/lib/auth/withAdmin';

const MotionBox = motion(Box);
const MotionGridItem = motion(GridItem);

interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

function AdminDashboard() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const router = useRouter();
  const bg = useSemanticToken('surface.base');
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    fetchSystemAlerts();
    const interval = setInterval(fetchSystemAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const fetchSystemAlerts = async () => {
    try {
      const res = await fetch('/api/admin/alerts/active');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length;

  return (
    <DashboardLayout>
      <Box bg={bg} minH="100vh">
        <Container maxW="container.2xl" py={{ base: 4, md: 8 }} px={{ base: 3, md: 6 }}>
          <VStack spacing={{ base: 6, md: 8 }} align="stretch">
            {/* Header */}
            <MotionBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <HStack justify="space-between" flexWrap="wrap" gap={4}>
                <VStack align="start" spacing={1}>
                  <HStack>
                    <Icon as={FiServer} boxSize={8} color="blue.500" />
                    <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">
                      AIHomelab Administration
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={textSecondary}>
                    Platform management and system intelligence
                  </Text>
                </VStack>
                <HStack spacing={3}>
                  {(criticalAlerts > 0 || warningAlerts > 0) && (
                    <Button
                      leftIcon={<FiAlertTriangle />}
                      size="sm"
                      colorScheme={criticalAlerts > 0 ? 'red' : 'orange'}
                      variant="outline"
                      onClick={() => router.push('/admin/alerts')}
                    >
                      {criticalAlerts > 0 && (
                        <Badge colorScheme="red" mr={2}>{criticalAlerts}</Badge>
                      )}
                      {warningAlerts > 0 && (
                        <Badge colorScheme="orange" mr={2}>{warningAlerts}</Badge>
                      )}
                      Alerts
                    </Button>
                  )}
                  <Button
                    leftIcon={<FiSettings />}
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push('/infrastructure/admin')}
                  >
                    Platform Settings
                  </Button>
                </HStack>
              </HStack>
            </MotionBox>

            {/* Platform Overview - Full Width */}
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <PlatformOverviewWidget />
            </MotionBox>

            {/* Main Grid Layout */}
            <Grid
              templateColumns={{ base: '1fr', lg: '2fr 1fr' }}
              gap={{ base: 4, md: 6 }}
            >
              {/* Left Column - Activity & Users */}
              <GridItem>
                <VStack spacing={{ base: 4, md: 6 }} align="stretch">
                  {/* Recent Activity */}
                  <MotionBox
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <RecentActivityWidget />
                  </MotionBox>

                  {/* User Management */}
                  <MotionBox
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <UserManagementWidget />
                  </MotionBox>
                </VStack>
              </GridItem>

              {/* Right Column - System & Agents */}
              <GridItem>
                <VStack spacing={{ base: 4, md: 6 }} align="stretch">
                  {/* System Health */}
                  <MotionBox
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <SmartSystemHealth />
                  </MotionBox>

                  {/* AI Agents */}
                  <MotionBox
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <AIAgentsWidget />
                  </MotionBox>
                </VStack>
              </GridItem>
            </Grid>

            {/* Quick Actions */}
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <HStack spacing={3} flexWrap="wrap">
                <Button
                  leftIcon={<FiServer />}
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/admin/tenants')}
                >
                  Manage Tenants
                </Button>
                <Button
                  leftIcon={<FiSettings />}
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/admin/quotas')}
                >
                  Resource Quotas
                </Button>
                <Button
                  leftIcon={<FiTrendingUp />}
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/admin/analytics')}
                >
                  Analytics
                </Button>
              </HStack>
            </MotionBox>

            {/* Footer */}
            <MotionBox
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              textAlign="center"
              py={4}
            >
              <Text fontSize="sm" color={textSecondary}>
                AIHomelab Administrator Dashboard • Last updated: {new Date().toLocaleTimeString()}
              </Text>
            </MotionBox>
          </VStack>
        </Container>
      </Box>
    </DashboardLayout>
  );
}

export default AdminDashboard;

export { withAdmin as getServerSideProps };
