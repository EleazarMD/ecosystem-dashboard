import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  Tabs, 
  TabList, 
  Tab, 
  TabPanels, 
  TabPanel,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Card,
  CardBody
} from '@chakra-ui/react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AgentRegistrySummary from '@/components/agent-registry/AgentRegistrySummary';
import AgentManagement from '@/components/agent-registry/AgentManagement';
import ComplianceDashboard from '@/components/agent-registry/ComplianceDashboard';
import CapabilitiesExplorer from '@/components/agent-registry/CapabilitiesExplorer';
import { useSemanticToken } from '@/hooks/useSemanticToken';

/**
 * Agent Registry Dashboard Page
 * 
 * Main page for the Agent Registry Service integration with the AI Homelab Dashboard.
 * Provides tabbed navigation between different views of the Agent Registry data.
 */
const AgentRegistryDashboard: NextPage = () => {
  // State for active tab
  const [activeTab, setActiveTab] = useState(0);
  
  // Tab change is handled directly by Chakra UI's onChange prop
  
  return (
    <>
      <Head>
        <title>Agent Registry | AI Homelab Dashboard</title>
        <meta name="description" content="Agent Registry Service dashboard for the AI Homelab Ecosystem" />
      </Head>
      <DashboardLayout>
        <Container maxW="container.xl">
          {/* Breadcrumbs */}
          <Breadcrumb mb={4}>
            <BreadcrumbItem>
              <Link href="/">
                <BreadcrumbLink>Dashboard</BreadcrumbLink>
              </Link>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Text>Agent Registry</Text>
            </BreadcrumbItem>
          </Breadcrumb>
          
          {/* Page Header */}
          <Box mb={6}>
            <Heading as="h1" size="xl" mb={2}>
              Agent Registry Dashboard
            </Heading>
            <Text color={useSemanticToken('text.secondary')}>
              Monitor and manage agents, platforms, and capabilities across the AI Homelab Ecosystem
            </Text>
          </Box>
          
          {/* Tab Navigation and Content */}
          <Card>
            <CardBody>
              <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed" colorScheme="blue">
                <TabList>
                  <Tab>Overview</Tab>
                  <Tab>Agent Management</Tab>
                  <Tab>Compliance</Tab>
                  <Tab>Capabilities</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <AgentRegistrySummary />
                  </TabPanel>
                  <TabPanel>
                    <AgentManagement />
                  </TabPanel>
                  <TabPanel>
                    <ComplianceDashboard />
                  </TabPanel>
                  <TabPanel>
                    <CapabilitiesExplorer />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>
        </Container>
      </DashboardLayout>
    </>
  );
};

export default AgentRegistryDashboard;
