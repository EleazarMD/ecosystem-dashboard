import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Select,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  Flex,
  Link,
  Divider,
  Badge,
  Tooltip,
  IconButton,
  useToast,
} from '@chakra-ui/react';
import { ExternalLink, RefreshCw, Lock } from 'react-feather';
import { useAuth } from '@/context/AuthContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface GrafanaDashboard {
  id: string;
  uid: string;
  title: string;
  description: string;
  tags: string[];
  url: string;
  category: string;
}

interface GrafanaDashboardsProps {
  height?: number;
  standalone?: boolean;
}

const GrafanaDashboards: React.FC<GrafanaDashboardsProps> = ({ 
  height = 800,
  standalone = true
}): React.ReactElement => {
  const [dashboards, setDashboards] = useState<GrafanaDashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [authUrl, setAuthUrl] = useState<string>('');
  const [selectedDashboardData, setSelectedDashboardData] = useState<GrafanaDashboard | null>(null);

  // Get authentication context
  const { isAuthenticated, token, user } = useAuth();
  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Mock data for development - in production, this would come from the API
  const mockDashboards: GrafanaDashboard[] = [
    {
      id: '1',
      uid: 'system-overview',
      title: 'System Overview',
      description: 'Overview of system metrics including CPU, memory, and disk usage',
      tags: ['system', 'overview'],
      url: 'http://localhost:9876/d/system-overview',
      category: 'System'
    },
    {
      id: '2',
      uid: 'aihds-metrics',
      title: 'AIHDS Metrics',
      description: 'AI Homelab Development System metrics and progress tracking',
      tags: ['aihds', 'progress'],
      url: 'http://localhost:9876/d/aihds-metrics',
      category: 'AIHDS'
    },
    {
      id: '3',
      uid: 'mcp-server',
      title: 'MCP Server',
      description: 'MCP Server performance metrics and request statistics',
      tags: ['mcp', 'server'],
      url: 'http://localhost:9876/d/mcp-server',
      category: 'Infrastructure'
    },
    {
      id: '4',
      uid: 'ai-gateway',
      title: 'AI Gateway',
      description: 'AI Gateway metrics including request routing and service mesh statistics',
      tags: ['gateway', 'service-mesh'],
      url: 'http://localhost:9876/d/ai-gateway',
      category: 'Infrastructure'
    },
    {
      id: '5',
      uid: 'documentation-metrics',
      title: 'Documentation Metrics',
      description: 'Documentation coverage and quality metrics across the ecosystem',
      tags: ['documentation', 'metrics'],
      url: 'http://localhost:9876/d/documentation-metrics',
      category: 'Documentation'
    },
    {
      id: '6',
      uid: 'postgres-metrics',
      title: 'PostgreSQL Metrics',
      description: 'PostgreSQL database performance and health metrics',
      tags: ['postgres', 'database'],
      url: 'http://localhost:9876/d/postgres-metrics',
      category: 'Database'
    },
  ];

  // Generate Grafana authentication URL
  useEffect(() => {
    const generateAuthUrl = async (): Promise<void> => {
      if (isAuthenticated && token) {
        try {
          // Request a Grafana authentication URL through our API Gateway
          // This follows the service mesh pattern required by the ecosystem
          const response = await axios.post('/api/grafana/auth', {
            // Include user information for proper token exchange
            userId: user?.id,
            email: user?.email,
            // Include timestamp for security
            timestamp: new Date().toISOString()
          }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.data.authUrl) {
            setAuthUrl(response.data.authUrl);
            console.log('Successfully generated Grafana auth URL');
          } else {
            throw new Error('No auth URL returned from API');
          }
        } catch (error) {
          console.error('Error generating Grafana auth URL:', error);
          // Fallback to direct URL if API fails, but with better error handling
          const grafanaHost = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:9876';
          setAuthUrl(`${grafanaHost}/login/generic_oauth`);
          
          toast({
            title: 'Authentication URL Error',
            description: 'Using fallback authentication method. Some features may be limited.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }
      } else {
        setAuthUrl('');
      }
    };

    generateAuthUrl();
  }, [isAuthenticated, token, user, toast]);

  // Fetch dashboards from the API
  const fetchDashboards = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      if (isAuthenticated && token) {
        // In a real implementation, we would fetch from the API
        // Following the ecosystem-first development principle by using the AI Gateway
        try {
          const response = await axios.get('/api/grafana/dashboards', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          setDashboards(response.data);
          
          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set(response.data.map((d: GrafanaDashboard) => d.category))
          ) as string[];
          setCategories(uniqueCategories);
          
          // Set initial selected dashboard if none selected
          if (!selectedDashboard && response.data.length > 0) {
            setSelectedDashboard(response.data[0].uid);
          }
        } catch (error) {
          console.error('Error fetching dashboards from API:', error);
          // Fallback to mock data on API error
          setDashboards(mockDashboards);
          
          const uniqueCategories = Array.from(
            new Set(mockDashboards.map((d: GrafanaDashboard) => d.category))
          ) as string[];
          setCategories(uniqueCategories);
          
          if (!selectedDashboard && mockDashboards.length > 0) {
            setSelectedDashboard(mockDashboards[0].uid);
          }
          
          toast({
            title: 'API Connection Error',
            description: 'Using cached dashboard data. Some information may be outdated.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }
      } else {
        // Handle unauthenticated state
        setDashboards(mockDashboards.filter((d: GrafanaDashboard) => !d.tags.includes('restricted')));
        const uniqueCategories = Array.from(
          new Set(mockDashboards.map((d: GrafanaDashboard) => d.category))
        ) as string[];
        setCategories(uniqueCategories);
        
        if (!selectedDashboard && mockDashboards.length > 0) {
          setSelectedDashboard(mockDashboards[0].uid);
        }
      }
    } catch (error) {
      console.error('Error in dashboard fetching process:', error);
      setError('Failed to load dashboards. Please try again later.');
      
      toast({
        title: 'Error',
        description: 'Failed to load dashboards. Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, selectedDashboard, toast]);

  // Fetch dashboards on component mount and when authentication state changes
  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  // Update selected dashboard data when selection changes
  useEffect(() => {
    if (selectedDashboard && dashboards.length > 0) {
      const dashboard = dashboards.find(d => d.uid === selectedDashboard);
      setSelectedDashboardData(dashboard || null);
    } else {
      setSelectedDashboardData(null);
    }
  }, [selectedDashboard, dashboards]);

  // Handle refresh button click
  const handleRefresh = (): void => {
    setLoading(true);
    fetchDashboards();
  };

  // Filter dashboards by category
  const filteredDashboards = selectedCategory === 'all' 
    ? dashboards 
    : dashboards.filter(dashboard => dashboard.category === selectedCategory);

  return (
    <Box>
      {standalone && (
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="lg">Grafana Dashboards</Heading>
          <Flex>
            <Select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              mr={2}
              size="sm"
              width="auto"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
            <Tooltip label="Refresh dashboards">
              <IconButton
                aria-label="Refresh dashboards"
                icon={<RefreshCw size={16} />}
                size="sm"
                onClick={handleRefresh}
                isLoading={loading}
              />
            </Tooltip>
          </Flex>
        </Flex>
      )}

      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mb={6}>
        {filteredDashboards.map(dashboard => (
          <Card 
            key={dashboard.uid} 
            borderWidth="1px" 
            borderRadius="lg" 
            borderColor={dashboard.uid === selectedDashboard ? 'blue.400' : borderColor}
            bg={bgColor}
            boxShadow={dashboard.uid === selectedDashboard ? 'md' : 'sm'}
            cursor="pointer"
            onClick={() => setSelectedDashboard(dashboard.uid)}
            _hover={{ borderColor: 'blue.400', transform: 'translateY(-2px)', transition: '0.2s' }}
          >
            <CardHeader pb={2}>
              <Flex justify="space-between" align="center">
                <Heading size="sm">{dashboard.title}</Heading>
                <Badge colorScheme="blue">{dashboard.category}</Badge>
              </Flex>
            </CardHeader>
            <CardBody pt={0}>
              <Text fontSize="sm" noOfLines={2} mb={2}>{dashboard.description}</Text>
              <Flex>
                {dashboard.tags.map(tag => (
                  <Badge key={tag} mr={1} colorScheme="gray" fontSize="xs">{tag}</Badge>
                ))}
              </Flex>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {selectedDashboardData && (
        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          borderColor={borderColor}
          overflow="hidden"
          bg={bgColor}
        >
          <Flex justify="space-between" align="center" p={4} borderBottomWidth="1px" borderColor={borderColor}>
            <Box>
              <Heading size="md">{selectedDashboardData.title}</Heading>
              <Text color={useSemanticToken('text.secondary')} fontSize="sm">{selectedDashboardData.description}</Text>
            </Box>
            <Flex gap={2}>
              {isAuthenticated ? (
                <Link href={authUrl} isExternal>
                  <Button leftIcon={<Lock size={16} />} size="sm" colorScheme="green" variant="outline">
                    Authenticate with Grafana
                  </Button>
                </Link>
              ) : null}
              <Link href={selectedDashboardData.url} isExternal>
                <Button rightIcon={<ExternalLink size={16} />} size="sm" colorScheme="blue" variant="outline">
                  Open in Grafana
                </Button>
              </Link>
            </Flex>
          </Flex>
          
          <Box height={`${height}px`} position="relative">
            {loading && (
              <Flex 
                position="absolute" 
                top="0" 
                left="0" 
                right="0" 
                bottom="0" 
                bg={useSemanticToken('glass.background')} 
                zIndex="1" 
                justify="center" 
                align="center"
              >
                <Spinner size="xl" />
              </Flex>
            )}
            
            {!isAuthenticated && (
              <Flex 
                position="absolute"
                top="0"
                left="0"
                right="0"
                bottom="0"
                bg={useSemanticToken('glass.background')}
                zIndex="1"
                justify="center"
                align="center"
                flexDirection="column"
                p={6}
              >
                <Alert status="info" borderRadius="md" mb={4}>
                  <AlertIcon />
                  <Box>
                    <Heading size="sm">Authentication Required</Heading>
                    <Text fontSize="sm">For full access to Grafana dashboards, please sign in with your Authentik credentials.</Text>
                  </Box>
                </Alert>
                <Text fontSize="sm" mb={4} textAlign="center">
                  You're currently viewing Grafana in anonymous mode with limited access. 
                  For full administrative access, please authenticate.
                </Text>
              </Flex>
            )}
            
            <iframe 
              src={`${selectedDashboardData.url}?kiosk&theme=light&auth=false&embed=true`} 
              width="100%" 
              height="100%" 
              frameBorder="0"
              title={selectedDashboardData.title}
              allow="fullscreen"
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default GrafanaDashboards;
