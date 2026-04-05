import React from 'react';
import {
  Box,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Container,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';

// Import our visualization components
import ProjectProgressChart from '@/components/visualization/ProjectProgressChart';
import ArchitectureVisualization from '@/components/visualization/ArchitectureVisualization';
import DocumentationStats from '@/components/visualization/DocumentationStats';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const VisualizationPage: React.FC = () => {
  const bgColor = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="container.xl">
        <Box mb={8}>
          <Heading as="h1" size="xl" mb={2}>AI Homelab Ecosystem Visualization</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Comprehensive visualization of ecosystem progress, architecture, and documentation metrics
          </Text>
          <Divider my={4} />
          
          <Alert status="info" mb={6} borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Integration with AHIS</AlertTitle>
              <AlertDescription>
                This dashboard visualizes data from the AHIS (AI Homelab Infrastructure Server) using the standardized AIHDS tracking system.
                All inter-service communication follows the service mesh architecture pattern through the AI Gateway.
              </AlertDescription>
            </Box>
          </Alert>
        </Box>

        <Tabs variant="enclosed" colorScheme="blue" isLazy>
          <TabList>
            <Tab>Project Progress</Tab>
            <Tab>Architecture</Tab>
            <Tab>Documentation</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Box 
                p={6} 
                bg={useSemanticToken('surface.elevated')} 
                boxShadow="sm" 
                borderRadius="lg" 
                borderWidth="1px" 
                borderColor={borderColor}
              >
                <ProjectProgressChart />
              </Box>
            </TabPanel>

            <TabPanel>
              <Box 
                p={6} 
                bg={useSemanticToken('surface.elevated')} 
                boxShadow="sm" 
                borderRadius="lg" 
                borderWidth="1px" 
                borderColor={borderColor}
              >
                <ArchitectureVisualization height={700} />
              </Box>
            </TabPanel>

            <TabPanel>
              <Box 
                p={6} 
                bg={useSemanticToken('surface.elevated')} 
                boxShadow="sm" 
                borderRadius="lg" 
                borderWidth="1px" 
                borderColor={borderColor}
              >
                <DocumentationStats />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Box>
  );
};

export default VisualizationPage;
