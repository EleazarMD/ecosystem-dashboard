/**
 * Parent Dashboard - Children's Journal Entries
 * 
 * View journal entries from children with insights and progress tracking
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Divider,
  SimpleGrid,
  Select,
  Input,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Avatar,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Progress,
  Tooltip,
} from '@chakra-ui/react';
import { 
  FiBook, 
  FiCalendar, 
  FiTrendingUp, 
  FiAward,
  FiHeart,
  FiStar,
  FiFilter,
  FiUser,
} from 'react-icons/fi';
import DashboardLayout from '@/components/DashboardLayout';

interface ChildStats {
  userId: string;
  name: string;
  avatar: string;
  entryCount: number;
  lastEntryDate: string | null;
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
}

interface JournalEntry {
  id: string;
  userId: string;
  childName: string;
  childAvatar: string;
  childTheme: string;
  type: string;
  title: string;
  content: string;
  mood: string | null;
  date: string;
  highlights: Array<{ text: string; type: string }>;
  tags: string[];
  aiEvaluation: any;
  createdAt: string;
}

const MOOD_EMOJI: Record<string, string> = {
  amazing: '🤩',
  happy: '😊',
  okay: '😐',
  sad: '😢',
  frustrated: '😤',
  excited: '🎉',
  calm: '😌',
  tired: '😴',
};

const TYPE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  daily: { label: 'Daily Journal', emoji: '📔', color: 'blue' },
  gratitude: { label: 'Gratitude', emoji: '💝', color: 'pink' },
  creative: { label: 'Creative Writing', emoji: '✨', color: 'purple' },
  learning: { label: 'Learning Log', emoji: '📚', color: 'green' },
  goals: { label: 'Goals & Dreams', emoji: '🎯', color: 'orange' },
  feelings: { label: 'Feelings Check-In', emoji: '💭', color: 'teal' },
  adventure: { label: 'Adventure Log', emoji: '🗺️', color: 'yellow' },
};

export default function ChildrenJournalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();

  const [children, setChildren] = useState<ChildStats[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, selectedChild, dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '/api/parent/children-journals?limit=50';
      if (selectedChild !== 'all') {
        url += `&childId=${selectedChild}`;
      }
      if (dateFrom) {
        url += `&dateFrom=${dateFrom}`;
      }
      if (dateTo) {
        url += `&dateTo=${dateTo}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChildren(data.children || []);
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      } else if (res.status === 403) {
        toast({
          title: 'Access Denied',
          description: 'You need to be a parent to view this page',
          status: 'error',
          duration: 5000,
        });
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch journals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load journal entries',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderChildOverview = () => (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mb={6}>
      {children.map((child) => (
        <Card key={child.userId} variant="outline">
          <CardBody>
            <HStack spacing={4} mb={3}>
              <Avatar name={child.name} size="md">
                <Text fontSize="xl">{child.avatar}</Text>
              </Avatar>
              <Box>
                <Text fontWeight="bold">{child.name}</Text>
                <Text fontSize="sm" color="gray.500">
                  {child.totalEntries} total entries
                </Text>
              </Box>
            </HStack>
            
            <SimpleGrid columns={2} spacing={2}>
              <Stat size="sm">
                <StatLabel fontSize="xs">Current Streak</StatLabel>
                <StatNumber fontSize="lg">
                  🔥 {child.currentStreak}
                </StatNumber>
                <StatHelpText fontSize="xs">days</StatHelpText>
              </Stat>
              <Stat size="sm">
                <StatLabel fontSize="xs">Best Streak</StatLabel>
                <StatNumber fontSize="lg">
                  ⭐ {child.longestStreak}
                </StatNumber>
                <StatHelpText fontSize="xs">days</StatHelpText>
              </Stat>
            </SimpleGrid>

            {child.lastEntryDate && (
              <Text fontSize="xs" color="gray.500" mt={2}>
                Last entry: {formatDate(child.lastEntryDate)}
              </Text>
            )}

            <Button
              size="sm"
              colorScheme="blue"
              variant="outline"
              mt={3}
              w="full"
              onClick={() => setSelectedChild(child.userId)}
            >
              View Entries
            </Button>
          </CardBody>
        </Card>
      ))}
    </SimpleGrid>
  );

  const renderFilters = () => (
    <Card mb={4}>
      <CardBody>
        <HStack spacing={4} flexWrap="wrap">
          <HStack>
            <FiFilter />
            <Text fontWeight="medium">Filters:</Text>
          </HStack>
          
          <Select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            maxW="200px"
            size="sm"
          >
            <option value="all">All Children</option>
            {children.map((child) => (
              <option key={child.userId} value={child.userId}>
                {child.avatar} {child.name}
              </option>
            ))}
          </Select>

          <HStack>
            <Text fontSize="sm">From:</Text>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              size="sm"
              maxW="150px"
            />
          </HStack>

          <HStack>
            <Text fontSize="sm">To:</Text>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              size="sm"
              maxW="150px"
            />
          </HStack>

          {(selectedChild !== 'all' || dateFrom || dateTo) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedChild('all');
                setDateFrom('');
                setDateTo('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </HStack>
      </CardBody>
    </Card>
  );

  const renderEntryCard = (entry: JournalEntry) => {
    const typeConfig = TYPE_LABELS[entry.type] || TYPE_LABELS.daily;
    
    return (
      <Card key={entry.id} mb={4}>
        <CardHeader pb={2}>
          <HStack justify="space-between" flexWrap="wrap">
            <HStack>
              <Text fontSize="xl">{entry.childAvatar}</Text>
              <Box>
                <Text fontWeight="bold">{entry.childName}</Text>
                <Text fontSize="xs" color="gray.500">
                  {formatDate(entry.date)}
                </Text>
              </Box>
            </HStack>
            <HStack>
              <Badge colorScheme={typeConfig.color}>
                {typeConfig.emoji} {typeConfig.label}
              </Badge>
              {entry.mood && (
                <Tooltip label={entry.mood}>
                  <Text fontSize="xl">{MOOD_EMOJI[entry.mood] || '😊'}</Text>
                </Tooltip>
              )}
            </HStack>
          </HStack>
        </CardHeader>
        
        <CardBody pt={0}>
          <Text fontWeight="semibold" fontSize="lg" mb={2}>
            {entry.title}
          </Text>
          
          <Text whiteSpace="pre-wrap" mb={3}>
            {entry.content}
          </Text>

          {entry.highlights && entry.highlights.length > 0 && (
            <Box mb={3}>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Highlights:
              </Text>
              <VStack align="start" spacing={1}>
                {entry.highlights.map((h, idx) => (
                  <HStack key={idx} fontSize="sm">
                    <Badge
                      colorScheme={
                        h.type === 'positive' ? 'green' :
                        h.type === 'challenge' ? 'orange' : 'blue'
                      }
                      size="sm"
                    >
                      {h.type === 'positive' ? '✨' : h.type === 'challenge' ? '💪' : '🎯'}
                    </Badge>
                    <Text>{h.text}</Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}

          {entry.tags && entry.tags.length > 0 && (
            <HStack flexWrap="wrap" spacing={1}>
              {entry.tags.map((tag, idx) => (
                <Badge key={idx} variant="subtle" colorScheme="gray" size="sm">
                  #{tag}
                </Badge>
              ))}
            </HStack>
          )}

          {entry.aiEvaluation && (
            <Accordion allowToggle mt={3}>
              <AccordionItem border="none">
                <AccordionButton px={0}>
                  <HStack flex={1}>
                    <FiStar />
                    <Text fontSize="sm" fontWeight="medium">
                      AI Writing Feedback
                    </Text>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel px={0}>
                  <Box bg="gray.50" p={3} borderRadius="md">
                    <Text fontSize="sm" mb={2}>
                      {entry.aiEvaluation.feedback}
                    </Text>
                    {entry.aiEvaluation.skills && (
                      <SimpleGrid columns={2} spacing={2} mt={2}>
                        {Object.entries(entry.aiEvaluation.skills).map(([skill, score]) => (
                          <Box key={skill}>
                            <Text fontSize="xs" textTransform="capitalize">
                              {skill}
                            </Text>
                            <Progress
                              value={(score as number) * 20}
                              size="sm"
                              colorScheme="green"
                              borderRadius="full"
                            />
                          </Box>
                        ))}
                      </SimpleGrid>
                    )}
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </CardBody>
      </Card>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <Container maxW="6xl" py={8}>
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text>Loading journal entries...</Text>
          </VStack>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxW="6xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box>
            <Heading size="lg" mb={2}>
              📔 Children's Journals
            </Heading>
            <Text color="gray.600">
              View your children's journal entries and track their writing progress
            </Text>
          </Box>

          {children.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              No children found. Add children to your account to see their journal entries.
            </Alert>
          ) : (
            <Tabs>
              <TabList>
                <Tab>
                  <HStack>
                    <FiUser />
                    <Text>Overview</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack>
                    <FiBook />
                    <Text>All Entries ({total})</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack>
                    <FiTrendingUp />
                    <Text>Progress</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                {/* Overview Tab */}
                <TabPanel px={0}>
                  <Heading size="md" mb={4}>
                    Your Children
                  </Heading>
                  {renderChildOverview()}
                </TabPanel>

                {/* Entries Tab */}
                <TabPanel px={0}>
                  {renderFilters()}
                  
                  {entries.length === 0 ? (
                    <Alert status="info">
                      <AlertIcon />
                      No journal entries found. Your children's shared entries will appear here.
                    </Alert>
                  ) : (
                    <VStack spacing={0} align="stretch">
                      {entries.map(renderEntryCard)}
                    </VStack>
                  )}
                </TabPanel>

                {/* Progress Tab */}
                <TabPanel px={0}>
                  <Heading size="md" mb={4}>
                    Writing Progress
                  </Heading>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {children.map((child) => (
                      <Card key={child.userId}>
                        <CardHeader>
                          <HStack>
                            <Text fontSize="2xl">{child.avatar}</Text>
                            <Text fontWeight="bold">{child.name}</Text>
                          </HStack>
                        </CardHeader>
                        <CardBody pt={0}>
                          <SimpleGrid columns={2} spacing={4}>
                            <Stat>
                              <StatLabel>Total Entries</StatLabel>
                              <StatNumber>{child.totalEntries}</StatNumber>
                            </Stat>
                            <Stat>
                              <StatLabel>Current Streak</StatLabel>
                              <StatNumber>🔥 {child.currentStreak}</StatNumber>
                            </Stat>
                            <Stat>
                              <StatLabel>Best Streak</StatLabel>
                              <StatNumber>⭐ {child.longestStreak}</StatNumber>
                            </Stat>
                            <Stat>
                              <StatLabel>Shared Entries</StatLabel>
                              <StatNumber>{child.entryCount}</StatNumber>
                            </Stat>
                          </SimpleGrid>
                          
                          <Divider my={4} />
                          
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" mb={2}>
                              Writing Consistency
                            </Text>
                            <Progress
                              value={Math.min((child.currentStreak / 7) * 100, 100)}
                              colorScheme="green"
                              borderRadius="full"
                            />
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {child.currentStreak >= 7 
                                ? '🎉 Great consistency!' 
                                : `${7 - child.currentStreak} more days to weekly goal`}
                            </Text>
                          </Box>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </VStack>
      </Container>
    </DashboardLayout>
  );
}
