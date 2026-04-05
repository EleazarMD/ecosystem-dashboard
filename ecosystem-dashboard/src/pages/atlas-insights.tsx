/**
 * Atlas Insights Dashboard
 * 
 * A comprehensive, modern dashboard for viewing AI-generated insights from your
 * Personal Context and Knowledge Graph. Features:
 * - Beautiful insight cards with rich content
 * - Advanced filtering by type, confidence, date
 * - Statistical visualizations
 * - Semantic search
 * - Real-time refresh and manual trigger
 * - Related goals and frameworks integration
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, VStack, HStack, Heading, Text, Divider,
  Button, Badge, IconButton, useToast, useDisclosure,
  Input, Textarea, Select, Switch, FormControl, FormLabel,
  Grid, GridItem, Stat, StatLabel, StatNumber, StatHelpText,
  SimpleGrid, Collapse, Progress, Tooltip, Tag, TagLabel,
  TagCloseButton, Wrap, WrapItem, Tabs, TabList, TabPanels, Tab, TabPanel,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Alert, AlertIcon, AlertTitle, AlertDescription,
  Skeleton, SkeletonText, Flex, Spacer, Avatar, AvatarGroup,
  useColorModeValue, keyframes,
} from '@chakra-ui/react';
import {
  FiZap, FiRefreshCw, FiSearch, FiFilter, FiTrendingUp, FiActivity,
  FiTarget, FiLayers, FiBrain, FiClock, FiCheckCircle, FiXCircle,
  FiChevronDown, FiChevronUp, FiMaximize2, FiMinimize2, FiPlay,
  FiLightbulb, FiBarChart2, FiPieChart, FiList, FiGrid, FiExternalLink,
  FiCopy, FiMoreHorizontal, FiCalendar, FiTag,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';

const ATLAS_API = '/api/atlas';
const PIC_API = '/api/pic';

// Animation keyframes
const pulseAnimation = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(66, 153, 225, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(66, 153, 225, 0); }
  100% { box-shadow: 0 0 0 0 rgba(66, 153, 225, 0); }
`;

// Insight type definitions
const INSIGHT_TYPES = {
  pattern: {
    label: 'Pattern',
    color: 'blue',
    icon: FiTrendingUp,
    description: 'Goal distribution and behavioral patterns',
  },
  framework_match: {
    label: 'Framework Match',
    color: 'purple',
    icon: FiLayers,
    description: 'Mental models applicable to your goals',
  },
  abstraction: {
    label: 'Abstraction',
    color: 'green',
    icon: FiBrain,
    description: 'Higher-level insights and meta-analysis',
  },
};

const AtlasInsightsDashboard = () => {
  const [insights, setInsights] = useState([]);
  const [filteredInsights, setFilteredInsights] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const toast = useToast();
  const bgGradient = useColorModeValue(
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)'
  );

  // Colors
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    loadInsights();
    loadStats();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isGenerating) {
        loadInsights(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const loadInsights = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${PIC_API}/insights?limit=100`);
      if (!response.ok) throw new Error('Failed to fetch insights');
      const data = await response.json();
      setInsights(data.insights || []);
    } catch (error) {
      console.error('Failed to load insights:', error);
      if (!silent) {
        toast({
          title: 'Failed to load insights',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${PIC_API}/insights/stats/summary`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${ATLAS_API}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to trigger insight generation');
      const data = await response.json();
      
      toast({
        title: 'Insights Generated',
        description: `Generated ${data.generated || 0} insights, stored ${data.stored || 0}`,
        status: 'success',
        duration: 5000,
      });
      
      // Refresh after a short delay
      setTimeout(() => {
        loadInsights();
        loadStats();
      }, 2000);
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter and sort insights
  useEffect(() => {
    let filtered = [...insights];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (insight) =>
          insight.title?.toLowerCase().includes(query) ||
          insight.content?.toLowerCase().includes(query) ||
          insight.summary?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((insight) =>
        selectedTypes.includes(insight.insight_type)
      );
    }

    // Confidence filter
    if (confidenceFilter !== 'all') {
      const [min, max] = confidenceFilter.split('-').map(Number);
      filtered = filtered.filter(
        (insight) =>
          insight.confidence_score >= min && insight.confidence_score <= max
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      switch (dateFilter) {
        case 'today':
          cutoff.setDate(now.getDate() - 1);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }
      filtered = filtered.filter(
        (insight) => new Date(insight.created_at) >= cutoff
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'confidence':
          return b.confidence_score - a.confidence_score;
        default:
          return 0;
      }
    });

    setFilteredInsights(filtered);
  }, [insights, searchQuery, selectedTypes, confidenceFilter, dateFilter, sortBy]);

  const toggleTypeFilter = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.9) return 'green';
    if (score >= 0.8) return 'blue';
    if (score >= 0.7) return 'yellow';
    return 'orange';
  };

  const getConfidenceLabel = (score) => {
    if (score >= 0.9) return 'Very High';
    if (score >= 0.8) return 'High';
    if (score >= 0.7) return 'Moderate';
    return 'Low';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleCopyInsight = (insight) => {
    const text = `${insight.title}\n\n${insight.content}\n\nConfidence: ${(insight.confidence_score * 100).toFixed(0)}%`;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
    });
  };

  const openInsightModal = (insight) => {
    setSelectedInsight(insight);
    onOpen();
  };

  return (
    <DashboardLayout>
      <Box minH="100vh">
        {/* Hero Header */}
        <Box
          bgGradient={bgGradient}
          py={8}
          px={6}
          mb={6}
          position="relative"
          overflow="hidden"
        >
          <Container maxW="container.xl">
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between" align="flex-start">
                <Box>
                  <Heading size="xl" color="white" mb={2}>
                    Atlas Insights
                  </Heading>
                  <Text color="whiteAlpha.900" fontSize="lg">
                    AI-generated intelligence from your goals, context, and knowledge graph
                  </Text>
                </Box>
                <HStack spacing={3}>
                  <Tooltip label="Refresh data">
                    <IconButton
                      icon={<FiRefreshCw />}
                      onClick={() => loadInsights()}
                      isLoading={loading}
                      variant="ghost"
                      colorScheme="whiteAlpha"
                      size="lg"
                    />
                  </Tooltip>
                  <Button
                    leftIcon={<FiZap />}
                    onClick={handleGenerateInsights}
                    isLoading={isGenerating}
                    loadingText="Generating..."
                    colorScheme="yellow"
                    size="lg"
                    boxShadow="0 4px 14px 0 rgba(236, 201, 75, 0.39)"
                    _hover={{ transform: 'translateY(-2px)', boxShadow: '0 6px 20px 0 rgba(236, 201, 75, 0.23)' }}
                    transition="all 0.2s"
                  >
                    Generate Now
                  </Button>
                </HStack>
              </HStack>

              {/* Quick Stats */}
              {stats && (
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mt={4}>
                  <GlassPanel p={4}>
                    <Stat size="sm">
                      <StatLabel fontSize="xs" color="whiteAlpha.800">Total Insights</StatLabel>
                      <StatNumber fontSize="2xl" color="white">
                        {stats.total_insights || insights.length}
                      </StatNumber>
                    </Stat>
                  </GlassPanel>
                  <GlassPanel p={4}>
                    <Stat size="sm">
                      <StatLabel fontSize="xs" color="whiteAlpha.800">This Week</StatLabel>
                      <StatNumber fontSize="2xl" color="white">
                        {stats.this_week || 0}
                      </StatNumber>
                    </Stat>
                  </GlassPanel>
                  <GlassPanel p={4}>
                    <Stat size="sm">
                      <StatLabel fontSize="xs" color="whiteAlpha.800">Avg Confidence</StatLabel>
                      <StatNumber fontSize="2xl" color="white">
                        {stats.avg_confidence
                          ? `${(stats.avg_confidence * 100).toFixed(0)}%`
                          : 'N/A'}
                      </StatNumber>
                    </Stat>
                  </GlassPanel>
                  <GlassPanel p={4}>
                    <Stat size="sm">
                      <StatLabel fontSize="xs" color="whiteAlpha.800">Last Generated</StatLabel>
                      <StatNumber fontSize="lg" color="white">
                        {stats.last_run
                          ? formatDate(stats.last_run)
                          : 'Never'}
                      </StatNumber>
                    </Stat>
                  </GlassPanel>
                </SimpleGrid>
              )}
            </VStack>
          </Container>
        </Box>

        <Container maxW="container.xl" pb={8}>
          {/* Filters and Search Bar */}
          <GlassPanel p={4} mb={6} borderWidth="1px" borderColor={borderColor}>
            <VStack spacing={4} align="stretch">
              {/* Top Row: Search and View Toggle */}
              <HStack spacing={4} flexWrap="wrap">
                <Input
                  placeholder="Search insights..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<FiSearch />}
                  maxW="400px"
                />
                <Spacer />
                <HStack spacing={2}>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    w="150px"
                    size="sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="confidence">Highest Confidence</option>
                  </Select>
                  <HStack spacing={1}>
                    <IconButton
                      icon={<FiGrid />}
                      size="sm"
                      colorScheme={viewMode === 'cards' ? 'blue' : 'gray'}
                      onClick={() => setViewMode('cards')}
                      aria-label="Card view"
                    />
                    <IconButton
                      icon={<FiList />}
                      size="sm"
                      colorScheme={viewMode === 'list' ? 'blue' : 'gray'}
                      onClick={() => setViewMode('list')}
                      aria-label="List view"
                    />
                  </HStack>
                </HStack>
              </HStack>

              <Divider />

              {/* Filter Row */}
              <Flex flexWrap="wrap" gap={4} align="center">
                {/* Type Filters */}
                <HStack spacing={2}>
                  <Text fontSize="sm" fontWeight="medium" color={textSecondary}>
                    <FiFilter style={{ display: 'inline', marginRight: 4 }} />
                    Types:
                  </Text>
                  {Object.entries(INSIGHT_TYPES).map(([type, config]) => (
                    <Tag
                      key={type}
                      size="md"
                      colorScheme={selectedTypes.includes(type) ? config.color : 'gray'}
                      variant={selectedTypes.includes(type) ? 'solid' : 'subtle'}
                      cursor="pointer"
                      onClick={() => toggleTypeFilter(type)}
                      _hover={{ transform: 'scale(1.05)' }}
                      transition="all 0.2s"
                    >
                      <config.icon style={{ marginRight: 4 }} />
                      {config.label}
                    </Tag>
                  ))}
                </HStack>

                <Spacer />

                {/* Confidence Filter */}
                <Select
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value)}
                  w="160px"
                  size="sm"
                >
                  <option value="all">All Confidence</option>
                  <option value="0.9-1.0">Very High (90%+)</option>
                  <option value="0.8-1.0">High (80%+)</option>
                  <option value="0.7-0.9">Moderate (70%+)</option>
                  <option value="0.0-0.7">Below 70%</option>
                </Select>

                {/* Date Filter */}
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  w="140px"
                  size="sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </Select>
              </Flex>
            </VStack>
          </GlassPanel>

          {/* Active Filters Display */}
          {(selectedTypes.length > 0 || searchQuery) && (
            <HStack mb={4} spacing={2} flexWrap="wrap">
              <Text fontSize="sm" color={textSecondary}>Active filters:</Text>
              {searchQuery && (
                <Tag size="sm" colorScheme="blue">
                  Search: {searchQuery}
                  <TagCloseButton onClick={() => setSearchQuery('')} />
                </Tag>
              )}
              {selectedTypes.map((type) => (
                <Tag key={type} size="sm" colorScheme={INSIGHT_TYPES[type].color}>
                  {INSIGHT_TYPES[type].label}
                  <TagCloseButton onClick={() => toggleTypeFilter(type)} />
                </Tag>
              ))}
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  setSelectedTypes([]);
                  setSearchQuery('');
                  setConfidenceFilter('all');
                  setDateFilter('all');
                }}
              >
                Clear all
              </Button>
            </HStack>
          )}

          {/* Results Count */}
          <Text mb={4} color={textSecondary}>
            Showing {filteredInsights.length} of {insights.length} insights
          </Text>

          {/* Insights Grid/List */}
          {loading ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} height="300px" borderRadius="lg" />
              ))}
            </SimpleGrid>
          ) : filteredInsights.length === 0 ? (
            <GlassPanel p={12} textAlign="center">
              <VStack spacing={4}>
                <FiLightbulb size={48} color="#718096" />
                <Heading size="md" color={textSecondary}>
                  No insights found
                </Heading>
                <Text color={textSecondary}>
                  {insights.length === 0
                    ? "Generate your first insights by clicking the 'Generate Now' button"
                    : "Try adjusting your filters to see more results"}
                </Text>
                {insights.length === 0 && (
                  <Button
                    leftIcon={<FiZap />}
                    onClick={handleGenerateInsights}
                    isLoading={isGenerating}
                    colorScheme="blue"
                    mt={4}
                  >
                    Generate Insights
                  </Button>
                )}
              </VStack>
            </GlassPanel>
          ) : viewMode === 'cards' ? (
            <Grid
              templateColumns={{
                base: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              }}
              gap={6}
            >
              {filteredInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onExpand={() =>
                    setExpandedInsight(
                      expandedInsight === insight.id ? null : insight.id
                    )
                  }
                  isExpanded={expandedInsight === insight.id}
                  onCopy={() => handleCopyInsight(insight)}
                  onViewDetails={() => openInsightModal(insight)}
                  getConfidenceColor={getConfidenceColor}
                  getConfidenceLabel={getConfidenceLabel}
                  formatDate={formatDate}
                />
              ))}
            </Grid>
          ) : (
            <VStack spacing={3} align="stretch">
              {filteredInsights.map((insight) => (
                <InsightListItem
                  key={insight.id}
                  insight={insight}
                  onViewDetails={() => openInsightModal(insight)}
                  getConfidenceColor={getConfidenceColor}
                  formatDate={formatDate}
                />
              ))}
            </VStack>
          )}
        </Container>
      </Box>

      {/* Insight Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>
            <HStack>
              {selectedInsight && (
                <>
                  <Badge
                    colorScheme={INSIGHT_TYPES[selectedInsight.insight_type]?.color || 'gray'}
                  >
                    {INSIGHT_TYPES[selectedInsight.insight_type]?.label}
                  </Badge>
                  <Text>{selectedInsight.title}</Text>
                </>
              )}
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedInsight && (
              <VStack spacing={6} align="stretch">
                {/* Confidence and Date */}
                <HStack spacing={4}>
                  <Badge
                    colorScheme={getConfidenceColor(selectedInsight.confidence_score)}
                    fontSize="md"
                    px={3}
                    py={1}
                  >
                    {getConfidenceLabel(selectedInsight.confidence_score)} Confidence:{' '}
                    {(selectedInsight.confidence_score * 100).toFixed(0)}%
                  </Badge>
                  <Text color={textSecondary}>
                    <FiClock style={{ display: 'inline', marginRight: 4 }} />
                    {formatDate(selectedInsight.created_at)}
                  </Text>
                </HStack>

                {/* Content */}
                <Box>
                  <Text fontWeight="bold" mb={2}>
                    Summary
                  </Text>
                  <Text>{selectedInsight.summary}</Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>
                    Full Analysis
                  </Text>
                  <Text whiteSpace="pre-wrap">{selectedInsight.content}</Text>
                </Box>

                {/* Evidence */}
                {selectedInsight.evidence && selectedInsight.evidence.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      Evidence
                    </Text>
                    <SimpleGrid columns={2} spacing={3}>
                      {selectedInsight.evidence.map((ev, idx) => (
                        <GlassPanel key={idx} p={3}>
                          <Text fontSize="sm" fontWeight="medium">
                            {ev.description}
                          </Text>
                          <Text fontSize="sm" color={textSecondary}>
                            {typeof ev.value === 'object'
                              ? JSON.stringify(ev.value)
                              : ev.value}
                          </Text>
                        </GlassPanel>
                      ))}
                    </SimpleGrid>
                  </Box>
                )}

                {/* Suggested Actions */}
                {selectedInsight.suggested_actions &&
                  selectedInsight.suggested_actions.length > 0 && (
                    <Box>
                      <Text fontWeight="bold" mb={2}>
                        Suggested Actions
                      </Text>
                      <VStack align="stretch" spacing={2}>
                        {selectedInsight.suggested_actions.map((action, idx) => (
                          <HStack key={idx} p={3} bg="blue.50" borderRadius="md">
                            <FiCheckCircle color="blue" />
                            <Text>{action}</Text>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  )}

                {/* Related Goals */}
                {selectedInsight.related_goals &&
                  selectedInsight.related_goals.length > 0 && (
                    <Box>
                      <Text fontWeight="bold" mb={2}>
                        Related Goals
                      </Text>
                      <HStack spacing={2} flexWrap="wrap">
                        {selectedInsight.related_goals.map((goalId, idx) => (
                          <Tag key={idx} size="sm" colorScheme="green">
                            <FiTarget style={{ marginRight: 4 }} />
                            {goalId.substring(0, 8)}...
                          </Tag>
                        ))}
                      </HStack>
                    </Box>
                  )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              leftIcon={<FiCopy />}
              onClick={() => handleCopyInsight(selectedInsight)}
              mr={3}
            >
              Copy
            </Button>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
};

// Insight Card Component
const InsightCard = ({
  insight,
  onExpand,
  isExpanded,
  onCopy,
  onViewDetails,
  getConfidenceColor,
  getConfidenceLabel,
  formatDate,
}) => {
  const typeConfig = INSIGHT_TYPES[insight.insight_type] || INSIGHT_TYPES.pattern;
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <GlassPanel
      p={0}
      overflow="hidden"
      borderWidth="1px"
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-4px)', boxShadow: 'xl' }}
      cursor="pointer"
      onClick={onExpand}
    >
      {/* Header */}
      <Box p={5} bgGradient={`linear(135deg, ${typeConfig.color}.500 0%, ${typeConfig.color}.600 100%)`}>
        <HStack justify="space-between" mb={3}>
          <Badge colorScheme="whiteAlpha" variant="solid">
            <HStack spacing={1}>
              <typeConfig.icon />
              <Text>{typeConfig.label}</Text>
            </HStack>
          </Badge>
          <Text fontSize="xs" color="whiteAlpha.900">
            {formatDate(insight.created_at)}
          </Text>
        </HStack>
        <Heading size="md" color="white" noOfLines={2}>
          {insight.title}
        </Heading>
      </Box>

      {/* Content */}
      <Box p={5}>
        <Text color="gray.600" noOfLines={isExpanded ? undefined : 3} mb={4}>
          {insight.summary || insight.content}
        </Text>

        {/* Confidence Progress */}
        <Box mb={4}>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" fontWeight="medium">
              Confidence
            </Text>
            <Text fontSize="xs" color={`${getConfidenceColor(insight.confidence_score)}.500`}>
              {(insight.confidence_score * 100).toFixed(0)}%
            </Text>
          </HStack>
          <Progress
            value={insight.confidence_score * 100}
            colorScheme={getConfidenceColor(insight.confidence_score)}
            size="sm"
            borderRadius="full"
          />
        </Box>

        {/* Actions */}
        <HStack spacing={2} justify="space-between">
          <HStack spacing={2}>
            {insight.related_goals && insight.related_goals.length > 0 && (
              <Tooltip label={`${insight.related_goals.length} related goals`}>
                <Tag size="sm" colorScheme="green">
                  <FiTarget style={{ marginRight: 4 }} />
                  {insight.related_goals.length}
                </Tag>
              </Tooltip>
            )}
            {insight.suggested_actions && insight.suggested_actions.length > 0 && (
              <Tooltip label={`${insight.suggested_actions.length} actions`}>
                <Tag size="sm" colorScheme="blue">
                  <FiActivity style={{ marginRight: 4 }} />
                  {insight.suggested_actions.length}
                </Tag>
              </Tooltip>
            )}
          </HStack>
          <HStack spacing={1}>
            <IconButton
              icon={<FiCopy />}
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              aria-label="Copy insight"
            />
            <IconButton
              icon={isExpanded ? <FiMinimize2 /> : <FiMaximize2 />}
              size="sm"
              variant="ghost"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            />
            <IconButton
              icon={<FiExternalLink />}
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              aria-label="View details"
            />
          </HStack>
        </HStack>

        {/* Expanded Content */}
        <Collapse in={isExpanded}>
          <Divider my={4} />
          <VStack align="stretch" spacing={3}>
            {insight.suggested_actions && insight.suggested_actions.length > 0 && (
              <Box>
                <Text fontWeight="medium" fontSize="sm" mb={2}>
                  Suggested Actions
                </Text>
                {insight.suggested_actions.slice(0, 3).map((action, idx) => (
                  <Text key={idx} fontSize="sm" color="gray.600" pl={2} borderLeftWidth="2px" borderLeftColor="blue.300" mb={1}>
                    {action}
                  </Text>
                ))}
              </Box>
            )}
            {insight.evidence && insight.evidence.length > 0 && (
              <Box>
                <Text fontWeight="medium" fontSize="sm" mb={2}>
                  Evidence
                </Text>
                {insight.evidence.slice(0, 2).map((ev, idx) => (
                  <Text key={idx} fontSize="sm" color="gray.600">
                    • {ev.description}: {typeof ev.value === 'object' ? JSON.stringify(ev.value) : ev.value}
                  </Text>
                ))}
              </Box>
            )}
          </VStack>
        </Collapse>
      </Box>
    </GlassPanel>
  );
};

// Insight List Item Component
const InsightListItem = ({
  insight,
  onViewDetails,
  getConfidenceColor,
  formatDate,
}) => {
  const typeConfig = INSIGHT_TYPES[insight.insight_type] || INSIGHT_TYPES.pattern;

  return (
    <GlassPanel
      p={4}
      borderWidth="1px"
      _hover={{ borderColor: 'blue.300', cursor: 'pointer' }}
      onClick={onViewDetails}
      transition="all 0.2s"
    >
      <HStack spacing={4} align="center">
        <Box
          p={3}
          borderRadius="lg"
          bg={`${typeConfig.color}.100`}
          color={`${typeConfig.color}.600`}
        >
          <typeConfig.icon size={24} />
        </Box>
        <Box flex={1}>
          <HStack spacing={2} mb={1}>
            <Badge colorScheme={typeConfig.color}>{typeConfig.label}</Badge>
            <Text fontSize="xs" color="gray.500">
              {formatDate(insight.created_at)}
            </Text>
          </HStack>
          <Text fontWeight="medium" noOfLines={1}>
            {insight.title}
          </Text>
          <Text fontSize="sm" color="gray.600" noOfLines={1}>
            {insight.summary}
          </Text>
        </Box>
        <Badge colorScheme={getConfidenceColor(insight.confidence_score)}>
          {(insight.confidence_score * 100).toFixed(0)}%
        </Badge>
        <IconButton
          icon={<FiChevronUp />}
          size="sm"
          variant="ghost"
          transform="rotate(90deg)"
          aria-label="View details"
        />
      </HStack>
    </GlassPanel>
  );
};

export default AtlasInsightsDashboard;
