/**
 * Child Workspace Page
 * 
 * Productivity-focused workspace with:
 * - Document creation and editing
 * - Book exploration with GraphRAG
 * - Math tutoring
 * - Writing assistance
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Textarea,
  Button,
  SimpleGrid,
  IconButton,
  useToast,
  Progress,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  Divider,
  Spinner,
  Select,
  Collapse,
  Tooltip,
  Flex,
} from '@chakra-ui/react';
import { 
  FiArrowLeft, 
  FiClock, 
  FiEdit3, 
  FiCheck, 
  FiZap, 
  FiBookOpen,
  FiFileText,
  FiHash,
  FiPlus,
  FiSave,
  FiTrash2,
  FiFolder,
  FiMaximize2,
  FiMinimize2,
  FiChevronRight,
  FiChevronLeft,
} from 'react-icons/fi';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useRouter } from 'next/router';
import { authOptions } from '../api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { BackgroundContextMenu, getBackgroundStyles, BackgroundMode } from '@/components/child/BackgroundContextMenu';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { StudentProgressProvider, useStudentProgress } from '@/contexts/StudentProgressContext';

// Workspace modes
type WorkspaceMode = 'writing' | 'books' | 'math' | 'documents';

interface Document {
  id: string;
  title: string;
  content: string;
  type: 'story' | 'essay' | 'poem' | 'homework' | 'notes';
  lastEdited: Date;
}

const WORKSPACE_TABS = [
  { id: 'writing', emoji: '✍️', label: 'Writing Lab', color: 'blue' },
  { id: 'books', emoji: '📚', label: 'Book Explorer', color: 'purple' },
  { id: 'math', emoji: '🧮', label: 'Math Tutor', color: 'green' },
  { id: 'documents', emoji: '📁', label: 'My Documents', color: 'orange' },
];

const WRITING_TOOLS = [
  { emoji: '✨', text: 'New Story', action: 'new-story' },
  { emoji: '📝', text: 'Improve Writing', action: 'improve' },
  { emoji: '✓', text: 'Check Spelling', action: 'check' },
  { emoji: '💡', text: 'Get Ideas', action: 'ideas' },
];

const INTEGRATION_TOOLS = [
  { 
    emoji: '🎨', 
    text: 'Create Story Image', 
    description: 'Generate an illustration for your story',
    action: 'create-image',
    service: 'art-studio'
  },
  { 
    emoji: '📅', 
    text: 'Add to Planner', 
    description: 'Save homework deadline or task',
    action: 'add-to-planner',
    service: 'planner'
  },
  { 
    emoji: '💬', 
    text: 'Research This', 
    description: 'Continue exploring in Chat',
    action: 'research-chat',
    service: 'chat'
  },
  { 
    emoji: '📧', 
    text: 'Share via Email', 
    description: 'Send your work to someone',
    action: 'share-email',
    service: 'email'
  },
  { 
    emoji: '📚', 
    text: 'Find Related Books', 
    description: 'Discover books about this topic',
    action: 'find-books',
    service: 'books'
  },
];

const BOOK_ACTIONS = [
  { emoji: '📋', text: 'Summarize', action: 'summary' },
  { emoji: '👥', text: 'Characters', action: 'characters' },
  { emoji: '📚', text: 'Vocabulary', action: 'vocabulary' },
  { emoji: '❓', text: 'Quiz Me', action: 'quiz' },
];

const MATH_TOPICS = [
  { emoji: '➕', text: 'Addition', level: 'easy' },
  { emoji: '➖', text: 'Subtraction', level: 'easy' },
  { emoji: '✖️', text: 'Multiplication', level: 'medium' },
  { emoji: '➗', text: 'Division', level: 'medium' },
  { emoji: '🍕', text: 'Fractions', level: 'hard' },
  { emoji: '📐', text: 'Geometry', level: 'medium' },
];

function WorkspacePageContent() {
  const router = useRouter();
  const toast = useToast();
  const { colors, childExtras } = useChildTheme();
  const { setContext, setIsOpen } = useRightPanel();
  const { 
    progress, 
    recordMathPractice, 
    recordBookProgress,
    getHomeworkSuggestions,
    getWritingPrompts,
    getMathRecommendations,
  } = useStudentProgress();

  // Core state
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('writing');
  const [content, setContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [usageMinutes, setUsageMinutes] = useState(0);
  const [limitMinutes, setLimitMinutes] = useState(120);
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Book Explorer state
  const [bookTitle, setBookTitle] = useState('');
  const [bookAnalysis, setBookAnalysis] = useState('');

  // Math Tutor state
  const [mathProblem, setMathProblem] = useState('');
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathFeedback, setMathFeedback] = useState('');
  const [selectedMathTopic, setSelectedMathTopic] = useState('');

  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const backgroundImages = childExtras?.decorations?.backgroundImages;
  const backgroundImage = backgroundImages?.default;
  
  // Background mode state
  const [bgMode, setBgMode] = useState<BackgroundMode>('cover');
  
  useEffect(() => {
    const saved = localStorage.getItem('childBgMode');
    if (saved) setBgMode(saved as BackgroundMode);
  }, []);
  
  const handleBgModeChange = (mode: BackgroundMode) => {
    setBgMode(mode);
    localStorage.setItem('childBgMode', mode);
  };
  
  const bgStyles = getBackgroundStyles(bgMode);

  // Set right panel context - keep closed by default
  // Only run on mount to avoid closing panel when user opens it
  useEffect(() => {
    setContext('child-workspace');
    setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchUsage();
    loadDocuments();
  }, []);

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/child/dashboard');
      const data = await res.json();
      if (res.ok) {
        setUsageMinutes(data.todayUsageMinutes);
        setLimitMinutes(data.dailyLimitMinutes);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  };

  const loadDocuments = async () => {
    setDocsLoading(true);
    try {
      const res = await fetch('/api/child/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      // Mock data for now
      setDocuments([
        { id: '1', title: 'My Adventure Story', content: '', type: 'story', lastEdited: new Date() },
        { id: '2', title: 'Science Report', content: '', type: 'homework', lastEdited: new Date() },
      ]);
    } finally {
      setDocsLoading(false);
    }
  };

  const generateMathProblem = (topic: string) => {
    setSelectedMathTopic(topic);
    setMathFeedback('');
    setMathAnswer('');
    
    const problems: Record<string, string[]> = {
      'Addition': ['5 + 3 = ?', '12 + 8 = ?', '24 + 37 = ?'],
      'Subtraction': ['10 - 4 = ?', '25 - 13 = ?', '50 - 28 = ?'],
      'Multiplication': ['3 × 4 = ?', '7 × 8 = ?', '12 × 5 = ?'],
      'Division': ['20 ÷ 4 = ?', '56 ÷ 8 = ?', '144 ÷ 12 = ?'],
      'Fractions': ['1/2 + 1/4 = ?', '3/4 - 1/2 = ?', '2/3 × 3 = ?'],
      'Geometry': ['Area of square with side 5 = ?', 'Perimeter of rectangle 4×6 = ?'],
    };
    
    const topicProblems = problems[topic] || problems['Addition'];
    setMathProblem(topicProblems[Math.floor(Math.random() * topicProblems.length)]);
  };

  const handleAction = async (action: string, customMessage?: string) => {
    if (loading) return;

    if ((action === 'improve' || action === 'continue' || action === 'check') && !content.trim()) {
      toast({
        title: '📝 Write something first!',
        description: 'Add some text to your workspace, then I can help!',
        status: 'info',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    setAiResponse('');

    try {
      const res = await fetch('/api/child/services/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          content: content.trim(),
          message: customMessage || action,
        }),
      });

      const data = await res.json();

      if (data.blocked) {
        toast({
          title: '🌟 Let\'s try something else!',
          description: data.message,
          status: 'warning',
          duration: 5000,
        });
        return;
      }

      if (data.response) {
        setAiResponse(data.response);
        if (data.remainingMinutes !== undefined) {
          setUsageMinutes(limitMinutes - data.remainingMinutes);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Oops!',
        description: 'Something went wrong. Try again!',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = () => {
    if (aiResponse) {
      setContent(prev => prev + '\n\n' + aiResponse);
      setAiResponse('');
      toast({
        title: '✨ Added!',
        status: 'success',
        duration: 2000,
      });
    }
  };

  const handleIntegrationTool = async (action: string, service: string) => {
    if (!content.trim() && action !== 'add-to-planner') {
      toast({
        title: '📝 Write something first!',
        description: 'Add some content to your document before using this tool.',
        status: 'info',
        duration: 3000,
      });
      return;
    }

    switch (action) {
      case 'create-image':
        // Extract key elements from the story for image generation
        const prompt = content.substring(0, 500); // First 500 chars as context
        toast({
          title: '🎨 Creating your story image...',
          description: 'Opening Art Studio with your story context',
          status: 'info',
          duration: 3000,
        });
        // Store context in localStorage for Art Studio to pick up
        localStorage.setItem('artStudio_context', JSON.stringify({
          source: 'workspace',
          documentTitle,
          prompt: `Illustration for: ${documentTitle}. Story context: ${prompt}`,
          timestamp: Date.now()
        }));
        router.push('/child/art-studio');
        break;

      case 'add-to-planner':
        // Extract potential homework info from document
        const homeworkInfo = {
          title: documentTitle || 'Untitled Assignment',
          description: content.substring(0, 200),
          source: 'workspace'
        };
        localStorage.setItem('planner_newTask', JSON.stringify(homeworkInfo));
        toast({
          title: '📅 Opening Planner...',
          description: 'Add this as a task or homework assignment',
          status: 'info',
          duration: 3000,
        });
        router.push('/child/planner');
        break;

      case 'research-chat':
        // Create a research question from the content
        const topic = documentTitle || content.split('.')[0];
        localStorage.setItem('chat_context', JSON.stringify({
          source: 'workspace',
          topic,
          initialMessage: `I'm writing about "${topic}". Can you help me learn more about this?`,
          documentContent: content.substring(0, 300)
        }));
        toast({
          title: '💬 Opening Chat...',
          description: 'Continue researching this topic',
          status: 'info',
          duration: 3000,
        });
        router.push('/child/chat');
        break;

      case 'share-email':
        localStorage.setItem('email_draft', JSON.stringify({
          subject: documentTitle,
          body: content,
          source: 'workspace'
        }));
        toast({
          title: '📧 Opening Email...',
          description: 'Share your work with someone',
          status: 'info',
          duration: 3000,
        });
        router.push('/child/email');
        break;

      case 'find-books':
        const searchTopic = documentTitle || content.substring(0, 100);
        localStorage.setItem('books_search', JSON.stringify({
          query: searchTopic,
          source: 'workspace'
        }));
        toast({
          title: '📚 Finding books...',
          description: 'Discover related reading materials',
          status: 'info',
          duration: 3000,
        });
        // Assuming there's a books/library page
        router.push('/child/home'); // Or /child/books if it exists
        break;

      default:
        toast({
          title: 'Coming soon!',
          description: 'This feature is being built',
          status: 'info',
          duration: 2000,
        });
    }
  };

  const usagePercent = Math.min(100, (usageMinutes / limitMinutes) * 100);
  const remainingMinutes = Math.max(0, limitMinutes - usageMinutes);

  // Calculate word and character count
  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(w => w.length > 0).length;
  }, [content]);

  const characterCount = useMemo(() => {
    return content.length;
  }, [content]);

  return (
    <ChildDashboardLayout pageType="workspace">
      <BackgroundContextMenu onModeChange={handleBgModeChange} currentMode={bgMode}>
      <Box
        minH="calc(100vh - 60px)"
        bg={colors?.background || '#e0f7fa'}
        backgroundImage={backgroundImage ? `url(${backgroundImage})` : undefined}
        backgroundRepeat={bgStyles.backgroundRepeat}
        backgroundSize={bgStyles.backgroundSize}
        backgroundPosition={bgStyles.backgroundPosition}
        backgroundAttachment={bgStyles.backgroundAttachment}
        position="relative"
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(255, 255, 255, 0.85)"
        />
        <Box position="relative" zIndex={1} py={6}>
        <Container maxW={isToolsOpen ? "container.xl" : "container.lg"} transition="all 0.3s ease">
          <VStack spacing={6} align="stretch">
            {/* Header */}
            <HStack justify="space-between" wrap="wrap" gap={4}>
              <HStack spacing={3}>
                <IconButton
                  icon={<FiArrowLeft />}
                  aria-label="Back"
                  variant="ghost"
                  onClick={() => router.push('/child/home')}
                  borderRadius="full"
                />
                <Text fontSize="3xl">📝</Text>
                <Text fontWeight="bold" fontSize="xl">My Workspace</Text>
              </HStack>
              
              <HStack spacing={4}>
                <HStack spacing={2}>
                  <FiClock />
                  <Text fontSize="sm" fontWeight="medium">
                    {remainingMinutes}m left
                  </Text>
                </HStack>
                <Box w="100px">
                  <Progress
                    value={usagePercent}
                    size="sm"
                    colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'orange' : 'green'}
                    borderRadius="full"
                  />
                </Box>
              </HStack>
            </HStack>

            {/* Today's Tasks from Planner - Contextual Integration */}
            {progress.upcomingHomework.length > 0 && (
              <Box bg="white" borderRadius="xl" p={4} boxShadow="md">
                <HStack justify="space-between" mb={3}>
                  <HStack>
                    <Text fontSize="lg">📋</Text>
                    <Text fontWeight="bold" fontSize="sm">Today's Tasks</Text>
                    <Badge colorScheme="purple" fontSize="2xs">From Planner</Badge>
                  </HStack>
                  <Button 
                    size="xs" 
                    variant="ghost" 
                    colorScheme="purple"
                    onClick={() => router.push('/child/planner')}
                  >
                    View All
                  </Button>
                </HStack>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={2}>
                  {progress.upcomingHomework.slice(0, 3).map((task) => (
                    <HStack
                      key={task.id}
                      p={2}
                      bg={task.type === 'homework' ? 'orange.50' : 'blue.50'}
                      borderRadius="lg"
                      fontSize="sm"
                      cursor="pointer"
                      _hover={{ bg: task.type === 'homework' ? 'orange.100' : 'blue.100' }}
                      onClick={() => {
                        if (task.type === 'homework') {
                          setDocumentTitle(task.title);
                          setActiveMode('writing');
                        }
                      }}
                    >
                      <Text>
                        {task.type === 'homework' ? '📚' : task.type === 'activity' ? '🎯' : '📝'}
                      </Text>
                      <Box flex={1}>
                        <Text fontWeight="medium" noOfLines={1} fontSize="xs">{task.title}</Text>
                        <Text fontSize="2xs" color="gray.500">
                          {task.subject || 'Due: ' + task.date}
                        </Text>
                      </Box>
                      {task.type === 'homework' && (
                        <Badge colorScheme="orange" fontSize="2xs">Work on it</Badge>
                      )}
                    </HStack>
                  ))}
                </SimpleGrid>
                {progress.completedToday > 0 && (
                  <HStack mt={2} justify="center">
                    <Text fontSize="xs" color="green.600">
                      ✅ {progress.completedToday} task{progress.completedToday > 1 ? 's' : ''} completed today!
                    </Text>
                    {progress.dailyStreak > 1 && (
                      <Badge colorScheme="orange" fontSize="2xs">🔥 {progress.dailyStreak} day streak</Badge>
                    )}
                  </HStack>
                )}
              </Box>
            )}

            {/* Workspace Mode Tabs */}
            <Tabs 
              variant="soft-rounded" 
              colorScheme="blue"
              index={WORKSPACE_TABS.findIndex(t => t.id === activeMode)}
              onChange={(index) => setActiveMode(WORKSPACE_TABS[index].id as WorkspaceMode)}
            >
              <TabList bg="white" p={2} borderRadius="xl" boxShadow="md" flexWrap="wrap" gap={2}>
                {WORKSPACE_TABS.map((tab) => {
                  // Map tab to themed icon
                  const tabIconMap: Record<string, keyof typeof childExtras.serviceIcons> = {
                    'writing': 'writing',
                    'books': 'books',
                    'math': 'planner',
                    'documents': 'writing'
                  };
                  const iconKey = tabIconMap[tab.id];
                  const themedIcon = iconKey && childExtras?.serviceIcons?.[iconKey];

                  return (
                    <Tab 
                      key={tab.id}
                      _selected={{ bg: `${tab.color}.500`, color: 'white' }}
                      borderRadius="lg"
                      fontWeight="medium"
                    >
                      <HStack spacing={2}>
                        {themedIcon ? (
                          <Box w="20px" h="20px" position="relative">
                            <img 
                              src={themedIcon} 
                              alt={tab.label}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          </Box>
                        ) : (
                          <Text>{tab.emoji}</Text>
                        )}
                        <Text display={{ base: 'none', md: 'block' }}>{tab.label}</Text>
                      </HStack>
                    </Tab>
                  );
                })}
              </TabList>

              <TabPanels mt={4}>
                {/* Writing Lab - Enhanced Full-Width Layout */}
                <TabPanel p={0}>
                  <Box position="relative" w="100%">
                    {/* Main Writing Area - Full Width */}
                    <Box 
                      w="100%"
                      h="calc(100vh - 400px)" 
                      minH="500px"
                      bg="white" 
                      borderRadius="2xl" 
                      boxShadow="xl"
                      display="flex"
                      flexDirection="column"
                      overflow="hidden"
                      transition="all 0.3s ease"
                      mr={isToolsOpen ? "340px" : "0"}
                    >
                      {/* Top Toolbar */}
                      {!isFocusMode && (
                        <HStack 
                          px={6} 
                          py={3} 
                          borderBottom="1px" 
                          borderColor="gray.200"
                          justify="space-between"
                          bg="white"
                        >
                          {/* Document Title */}
                          <Input
                            value={documentTitle}
                            onChange={(e) => setDocumentTitle(e.target.value)}
                            variant="unstyled"
                            fontWeight="bold"
                            fontSize="lg"
                            placeholder="Untitled Document"
                            maxW="400px"
                          />

                          {/* Stats and Controls */}
                          <HStack spacing={4}>
                            <HStack spacing={3} fontSize="sm" color="gray.600">
                              <Text>{wordCount} words</Text>
                              <Text>•</Text>
                              <Text>{characterCount} characters</Text>
                            </HStack>
                            
                            <Tooltip label={isFocusMode ? "Exit Focus Mode" : "Focus Mode"}>
                              <IconButton
                                aria-label="Focus Mode"
                                icon={isFocusMode ? <FiMinimize2 /> : <FiMaximize2 />}
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsFocusMode(!isFocusMode)}
                              />
                            </Tooltip>

                            <Tooltip label="Writing Tools">
                              <IconButton
                                aria-label="Toggle Tools"
                                icon={isToolsOpen ? <FiChevronRight /> : <FiChevronLeft />}
                                size="sm"
                                colorScheme={isToolsOpen ? "blue" : "gray"}
                                variant={isToolsOpen ? "solid" : "ghost"}
                                onClick={() => setIsToolsOpen(!isToolsOpen)}
                              />
                            </Tooltip>

                            <IconButton
                              icon={<FiSave />}
                              aria-label="Save"
                              size="sm"
                              colorScheme="green"
                              variant="ghost"
                            />
                          </HStack>
                        </HStack>
                      )}

                      {/* Writing Canvas - Maximum Space */}
                      <Box
                        flex="1"
                        overflowY="auto"
                        px={{ base: 4, md: isFocusMode ? 12 : 8, lg: isFocusMode ? 20 : 12 }}
                        py={isFocusMode ? 12 : 6}
                        maxW={isFocusMode ? "900px" : "100%"}
                        mx="auto"
                        w="100%"
                      >
                        <Textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Start writing your masterpiece... ✍️

Ideas to get you started:
• Write a story about an adventure
• Create a poem about nature  
• Write a letter to a friend
• Work on your homework

Tip: Use the tools on the right to get help with spelling, ideas, and improving your writing!"
                          minH="100%"
                          resize="none"
                          border="none"
                          _focus={{ outline: 'none', boxShadow: 'none' }}
                          fontSize={{ base: 'md', md: 'lg' }}
                          lineHeight="tall"
                          p={0}
                        />
                      </Box>

                      {/* Focus Mode Exit Button */}
                      {isFocusMode && (
                        <IconButton
                          aria-label="Exit Focus Mode"
                          icon={<FiMinimize2 />}
                          position="fixed"
                          top={4}
                          right={4}
                          size="sm"
                          variant="ghost"
                          opacity={0.5}
                          _hover={{ opacity: 1 }}
                          onClick={() => setIsFocusMode(false)}
                          zIndex={20}
                        />
                      )}
                    </Box>

                    {/* Collapsible Writing Tools Sidebar - Absolute Positioned */}
                    {isToolsOpen && !isFocusMode && (
                      <Box
                        position="absolute"
                        right="0"
                        top="0"
                        w="320px"
                        h="100%"
                        bg="gray.50"
                        borderRadius="2xl"
                        overflowY="auto"
                        boxShadow="xl"
                        zIndex={10}
                        transition="all 0.3s ease"
                      >
                        <VStack align="stretch" spacing={0} p={4}>
                          {/* Header */}
                          <HStack justify="space-between" mb={4}>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold" fontSize="lg">Quick Actions</Text>
                              <Text fontSize="xs" color="gray.500">Connect to other tools</Text>
                            </VStack>
                            <IconButton
                              aria-label="Close tools"
                              icon={<FiChevronRight />}
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsToolsOpen(false)}
                            />
                          </HStack>

                          {/* Cross-Service Integration Tools */}
                          <VStack align="stretch" spacing={2}>
                            <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" mb={1}>
                              Use Your Work In
                            </Text>
                            
                            {INTEGRATION_TOOLS.map((tool, i) => {
                              // Map service to themed icon
                              const iconMap: Record<string, keyof typeof childExtras.serviceIcons> = {
                                'art-studio': 'art',
                                'planner': 'planner',
                                'chat': 'chat',
                                'email': 'email',
                                'books': 'books'
                              };
                              const iconKey = iconMap[tool.service];
                              const themedIcon = iconKey && childExtras?.serviceIcons?.[iconKey];

                              return (
                                <Button
                                  key={i}
                                  size="sm"
                                  variant="outline"
                                  justifyContent="flex-start"
                                  onClick={() => handleIntegrationTool(tool.action, tool.service)}
                                  leftIcon={
                                    themedIcon ? (
                                      <Box w="24px" h="24px" position="relative">
                                        <img 
                                          src={themedIcon} 
                                          alt={tool.text}
                                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                      </Box>
                                    ) : (
                                      <Text fontSize="lg">{tool.emoji}</Text>
                                    )
                                  }
                                  _hover={{ bg: 'white', borderColor: 'blue.400' }}
                                  height="auto"
                                  py={3}
                                  px={3}
                                >
                                  <VStack align="start" spacing={0} flex={1}>
                                    <Text fontSize="sm" fontWeight="600" textAlign="left">
                                      {tool.text}
                                    </Text>
                                    <Text fontSize="xs" color="gray.500" textAlign="left">
                                      {tool.description}
                                    </Text>
                                  </VStack>
                                </Button>
                              );
                            })}
                          </VStack>

                          <Divider my={4} />

                          {/* Document Stats */}
                          <VStack align="stretch" spacing={2}>
                            <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" mb={1}>
                              Document Info
                            </Text>
                            
                            <Box bg="white" p={3} borderRadius="lg">
                              <SimpleGrid columns={2} spacing={3}>
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="xs" color="gray.500">Words</Text>
                                  <Text fontSize="lg" fontWeight="bold" color="blue.600">{wordCount}</Text>
                                </VStack>
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="xs" color="gray.500">Characters</Text>
                                  <Text fontSize="lg" fontWeight="bold" color="green.600">{characterCount}</Text>
                                </VStack>
                              </SimpleGrid>
                            </Box>
                          </VStack>

                          <Divider my={4} />

                          {/* Quick Tips */}
                          <VStack align="stretch" spacing={2}>
                            <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" mb={1}>
                              Writing Tips
                            </Text>
                            
                            <Box
                              p={3}
                              bg="blue.50"
                              borderRadius="md"
                              borderLeft="3px solid"
                              borderColor="blue.400"
                            >
                              <Text fontSize="xs" fontWeight="600" mb={1}>
                                💡 Start with your main idea
                              </Text>
                              <Text fontSize="2xs" color="gray.600">
                                Write the most important thing first.
                              </Text>
                            </Box>

                            <Box
                              p={3}
                              bg="green.50"
                              borderRadius="md"
                              borderLeft="3px solid"
                              borderColor="green.400"
                            >
                              <Text fontSize="xs" fontWeight="600" mb={1}>
                                🎨 Use the tools above
                              </Text>
                              <Text fontSize="2xs" color="gray.600">
                                Create images, add tasks, or research topics!
                              </Text>
                            </Box>
                          </VStack>
                        </VStack>
                      </Box>
                    )}
                  </Box>
                </TabPanel>

                {/* Book Explorer */}
                <TabPanel p={0}>
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                    <Box bg="white" borderRadius="2xl" p={5} boxShadow="xl">
                      <Text fontWeight="bold" mb={3}>📚 Book Explorer</Text>
                      <HStack mb={4}>
                        <Input
                          value={bookTitle}
                          onChange={(e) => setBookTitle(e.target.value)}
                          placeholder="Enter a book title..."
                        />
                        <Button colorScheme="purple" onClick={() => handleAction('book-search', bookTitle)}>
                          Explore
                        </Button>
                      </HStack>
                      <Divider mb={4} />
                      <Text fontWeight="medium" mb={2}>What would you like to know?</Text>
                      <SimpleGrid columns={2} spacing={2}>
                        {BOOK_ACTIONS.map((action, i) => (
                          <Button
                            key={i}
                            size="sm"
                            variant="outline"
                            colorScheme="purple"
                            leftIcon={<Text>{action.emoji}</Text>}
                            isDisabled={!bookTitle}
                            onClick={() => handleAction(action.action, bookTitle)}
                          >
                            {action.text}
                          </Button>
                        ))}
                      </SimpleGrid>
                    </Box>
                    <Box bg="white" borderRadius="2xl" p={5} boxShadow="xl">
                      <Text fontWeight="bold" mb={3}>📖 Book Analysis</Text>
                      {loading ? (
                        <VStack py={12}><Spinner color="purple.500" /><Text fontSize="sm">Analyzing...</Text></VStack>
                      ) : bookAnalysis || aiResponse ? (
                        <Box bg="purple.50" p={4} borderRadius="lg" minH="250px">
                          <Text whiteSpace="pre-wrap">{bookAnalysis || aiResponse}</Text>
                        </Box>
                      ) : (
                        <VStack py={12} color="gray.400">
                          <FiBookOpen size={48} />
                          <Text textAlign="center">Enter a book title and explore!</Text>
                        </VStack>
                      )}
                    </Box>
                  </SimpleGrid>
                </TabPanel>

                {/* Math Tutor */}
                <TabPanel p={0}>
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                    <Box bg="white" borderRadius="2xl" p={5} boxShadow="xl">
                      <Text fontWeight="bold" mb={3}>🧮 Choose a Topic</Text>
                      <SimpleGrid columns={2} spacing={2}>
                        {MATH_TOPICS.map((topic, i) => (
                          <Button
                            key={i}
                            size="md"
                            variant={selectedMathTopic === topic.text ? 'solid' : 'outline'}
                            colorScheme="green"
                            leftIcon={<Text>{topic.emoji}</Text>}
                            onClick={() => generateMathProblem(topic.text)}
                          >
                            {topic.text}
                          </Button>
                        ))}
                      </SimpleGrid>
                    </Box>
                    <Box bg="white" borderRadius="2xl" p={5} boxShadow="xl">
                      <Text fontWeight="bold" mb={3}>🎯 Practice Problem</Text>
                      {mathProblem ? (
                        <VStack spacing={4} align="stretch">
                          <Box bg="green.50" p={4} borderRadius="lg" textAlign="center">
                            <Text fontSize="2xl" fontWeight="bold">{mathProblem}</Text>
                          </Box>
                          <HStack>
                            <Input
                              value={mathAnswer}
                              onChange={(e) => setMathAnswer(e.target.value)}
                              placeholder="Your answer..."
                              size="lg"
                            />
                            <Button colorScheme="green" size="lg" onClick={() => handleAction('check-math', mathAnswer)}>
                              Check
                            </Button>
                          </HStack>
                          {mathFeedback && (
                            <Box bg={mathFeedback.includes('Correct') ? 'green.100' : 'orange.100'} p={3} borderRadius="lg">
                              <Text>{mathFeedback}</Text>
                            </Box>
                          )}
                          <Button variant="outline" onClick={() => generateMathProblem(selectedMathTopic)}>
                            New Problem
                          </Button>
                        </VStack>
                      ) : (
                        <VStack py={12} color="gray.400">
                          <FiHash size={48} />
                          <Text textAlign="center">Select a topic to start practicing!</Text>
                        </VStack>
                      )}
                    </Box>
                  </SimpleGrid>
                </TabPanel>

                {/* My Documents */}
                <TabPanel p={0}>
                  <Box bg="white" borderRadius="2xl" p={5} boxShadow="xl">
                    <HStack justify="space-between" mb={4}>
                      <Text fontWeight="bold">📁 My Documents</Text>
                      <Button size="sm" colorScheme="blue" leftIcon={<FiPlus />}>
                        New Document
                      </Button>
                    </HStack>
                    {docsLoading ? (
                      <VStack py={8}><Spinner /></VStack>
                    ) : documents.length === 0 ? (
                      <VStack py={12} color="gray.400">
                        <FiFolder size={48} />
                        <Text>No documents yet. Create your first one!</Text>
                      </VStack>
                    ) : (
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                        {documents.map((doc) => (
                          <Box
                            key={doc.id}
                            p={4}
                            bg="gray.50"
                            borderRadius="lg"
                            cursor="pointer"
                            _hover={{ bg: 'blue.50', transform: 'translateY(-2px)' }}
                            transition="all 0.2s"
                          >
                            <HStack mb={2}>
                              <Text fontSize="xl">
                                {doc.type === 'story' ? '📖' : doc.type === 'essay' ? '📝' : doc.type === 'poem' ? '🎭' : '📄'}
                              </Text>
                              <Text fontWeight="medium" noOfLines={1}>{doc.title}</Text>
                            </HStack>
                            <Text fontSize="xs" color="gray.500">
                              Last edited: {new Date(doc.lastEdited).toLocaleDateString()}
                            </Text>
                          </Box>
                        ))}
                      </SimpleGrid>
                    )}
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        </Container>
        </Box>
      </Box>
      </BackgroundContextMenu>
    </ChildDashboardLayout>
  );
}

export default function ChildWorkspacePage() {
  return (
    <ChildDashboardLayout pageType="workspace">
      <StudentProgressProvider>
        <WorkspacePageContent />
      </StudentProgressProvider>
    </ChildDashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const user = session.user as any;
  if (user.accountType !== 'child') {
    return {
      redirect: {
        destination: '/workspace',
        permanent: false,
      },
    };
  }

  return { props: {} };
};
