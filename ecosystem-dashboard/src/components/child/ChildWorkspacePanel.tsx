/**
 * Child Workspace Right Panel
 * 
 * Notion-inspired workspace panel with:
 * - Writing tools (grammar, spelling, suggestions)
 * - Quick Actions (integrations with journal, planner, chat)
 * - Document info and stats
 * - Templates and page management
 * - Page Builder Agent for AI-assisted page structuring
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  IconButton,
  Badge,
  Divider,
  SimpleGrid,
  Select,
  FormControl,
  FormLabel,
  Spinner,
  Progress,
  Textarea,
  Switch,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { 
  FiEdit3, 
  FiCheck, 
  FiBookOpen, 
  FiHash, 
  FiFolder, 
  FiPlus,
  FiFileText,
  FiSend,
  FiRefreshCw,
  FiStar,
  FiClock,
  FiCalendar,
  FiMessageCircle,
  FiBook,
  FiImage,
  FiMail,
  FiExternalLink,
  FiCpu,
  FiZap,
  FiLayout,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useStudentProgress } from '@/contexts/StudentProgressContext';

interface Document {
  id: string;
  title: string;
  type: 'story' | 'essay' | 'poem' | 'homework' | 'notes';
  lastEdited: string;
  wordCount: number;
}

interface WritingTool {
  id: string;
  emoji: string;
  name: string;
  description: string;
  action: string;
}

interface MathTopic {
  id: string;
  emoji: string;
  name: string;
  grade: string;
}

const WRITING_TOOLS: WritingTool[] = [
  { id: 'spelling', emoji: '✓', name: 'Check Spelling', description: 'Find spelling mistakes', action: 'check-spelling' },
  { id: 'grammar', emoji: '📝', name: 'Fix Grammar', description: 'Improve sentences', action: 'check-grammar' },
  { id: 'improve', emoji: '✨', name: 'Make Better', description: 'Improve your writing', action: 'improve' },
  { id: 'shorten', emoji: '📏', name: 'Make Shorter', description: 'Summarize text', action: 'shorten' },
  { id: 'expand', emoji: '📖', name: 'Add More', description: 'Expand your ideas', action: 'expand' },
  { id: 'simplify', emoji: '🎯', name: 'Simplify', description: 'Make easier to read', action: 'simplify' },
];

// Quick Actions for integrations
const QUICK_ACTIONS = [
  { 
    id: 'create-image', 
    emoji: '🎨', 
    name: 'Create Story Image', 
    description: 'Generate an illustration for your story',
    path: '/child/art-studio',
    color: 'pink'
  },
  { 
    id: 'add-to-planner', 
    emoji: '📅', 
    name: 'Add to Planner', 
    description: 'Save homework deadline or task',
    path: '/child/planner',
    color: 'purple'
  },
  { 
    id: 'research-chat', 
    emoji: '💬', 
    name: 'Research This', 
    description: 'Continue exploring in Chat',
    path: '/child/chat',
    color: 'blue'
  },
  { 
    id: 'share-email', 
    emoji: '📧', 
    name: 'Share via Email', 
    description: 'Send your work to someone',
    path: '/child/email',
    color: 'green'
  },
  { 
    id: 'find-books', 
    emoji: '📚', 
    name: 'Find Related Books', 
    description: 'Discover books about this topic',
    path: '/child/books',
    color: 'orange'
  },
  { 
    id: 'add-to-journal', 
    emoji: '📔', 
    name: 'Save to Journal', 
    description: 'Add a reflection about your work',
    path: '/child/journal',
    color: 'yellow'
  },
];

const BOOK_FEATURES = [
  { id: 'summary', emoji: '📋', name: 'Book Summary', description: 'Get a quick overview' },
  { id: 'characters', emoji: '👥', name: 'Characters', description: 'Who is in the story?' },
  { id: 'vocabulary', emoji: '📚', name: 'Vocabulary', description: 'Learn new words' },
  { id: 'themes', emoji: '💡', name: 'Themes', description: 'Main ideas & lessons' },
  { id: 'quiz', emoji: '❓', name: 'Quiz Me', description: 'Test your knowledge' },
];

const MATH_TOPICS: MathTopic[] = [
  { id: 'addition', emoji: '➕', name: 'Addition', grade: 'K-2' },
  { id: 'subtraction', emoji: '➖', name: 'Subtraction', grade: 'K-2' },
  { id: 'multiplication', emoji: '✖️', name: 'Multiplication', grade: '2-4' },
  { id: 'division', emoji: '➗', name: 'Division', grade: '3-5' },
  { id: 'fractions', emoji: '🍕', name: 'Fractions', grade: '3-5' },
  { id: 'decimals', emoji: '🔢', name: 'Decimals', grade: '4-6' },
  { id: 'geometry', emoji: '📐', name: 'Shapes', grade: '2-5' },
  { id: 'wordproblems', emoji: '📝', name: 'Word Problems', grade: '2-6' },
];

const DOCUMENT_TEMPLATES = [
  { id: 'story', emoji: '📖', name: 'Story', description: 'Write an adventure' },
  { id: 'essay', emoji: '📝', name: 'Essay', description: 'Share your thoughts' },
  { id: 'poem', emoji: '🎭', name: 'Poem', description: 'Express with words' },
  { id: 'report', emoji: '📊', name: 'Book Report', description: 'Analyze a book' },
  { id: 'letter', emoji: '✉️', name: 'Letter', description: 'Write to someone' },
];

// Page Builder Agent suggestion types
interface PageSuggestion {
  type: 'heading_1' | 'heading_2' | 'paragraph' | 'bulleted_list' | 'numbered_list' | 'to_do' | 'callout' | 'divider';
  content: string;
  properties?: Record<string, any>;
}

interface PageBuilderResponse {
  title: string;
  icon: string;
  blocks: PageSuggestion[];
}

interface ChildWorkspacePanelProps {
  activeTab: string;
  onToolAction?: (action: string, data?: any) => void;
  onPageBuilderCreate?: (response: PageBuilderResponse) => void;
  documentTitle?: string;
  wordCount?: number;
  characterCount?: number;
  currentPageContent?: string;
  // Current page context for AI agent awareness
  currentPageId?: string | null;
  currentPageTitle?: string;
  currentPageIcon?: string;
  currentPageBlocks?: any[];
  onPageUpdate?: (blocks: any[]) => void;
}

export function ChildWorkspacePanel({ 
  activeTab,
  onToolAction,
  onPageBuilderCreate,
  documentTitle = '',
  wordCount = 0,
  characterCount = 0,
  currentPageContent = '',
  // Current page context
  currentPageId = null,
  currentPageTitle = '',
  currentPageIcon = '📄',
  currentPageBlocks = [],
  onPageUpdate,
}: ChildWorkspacePanelProps) {
  const router = useRouter();
  const toast = useToast();
  const { progress } = useStudentProgress();
  
  // Track if we came from planner with a prompt
  const [plannerPrompt, setPlannerPrompt] = useState<{
    prompt: string;
    fromPlanner: boolean;
    plannerItem?: any;
  } | null>(null);
  
  // Writing state
  const [selectedText, setSelectedText] = useState('');
  const [writingLoading, setWritingLoading] = useState(false);

  // Books state
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [bookLoading, setBookLoading] = useState(false);

  // Math state
  const [mathDifficulty, setMathDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [currentProblem, setCurrentProblem] = useState<string | null>(null);
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathLoading, setMathLoading] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // Page Builder Agent state
  const [builderPrompt, setBuilderPrompt] = useState('');
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderSuggestion, setBuilderSuggestion] = useState<PageBuilderResponse | null>(null);
  const [builderHistory, setBuilderHistory] = useState<string[]>([]);

  // Check for planner prompt on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('workspacePagePrompt');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setPlannerPrompt(data);
        setBuilderPrompt(data.prompt);
        sessionStorage.removeItem('workspacePagePrompt');
        
        // Show toast notification
        toast({
          title: '📋 From Planner',
          description: `Creating page for: ${data.plannerItem?.title || data.prompt}`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      } catch (e) {
        console.error('Failed to parse planner prompt:', e);
      }
    }
  }, [toast]);

  // Handle quick action navigation
  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    router.push(action.path);
  };

  // Load documents
  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments();
    }
  }, [activeTab]);

  const loadDocuments = async () => {
    setDocsLoading(true);
    try {
      const res = await fetch('/api/child/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      // Mock data
      setDocuments([
        { id: '1', title: 'My Adventure Story', type: 'story', lastEdited: '2024-12-24', wordCount: 342 },
        { id: '2', title: 'Science Report', type: 'homework', lastEdited: '2024-12-23', wordCount: 156 },
      ]);
    } finally {
      setDocsLoading(false);
    }
  };

  // Handle writing tool action
  const handleWritingTool = async (tool: WritingTool) => {
    if (onToolAction) {
      onToolAction(tool.action);
    }
  };

  // Handle book search
  const handleBookSearch = async () => {
    if (!bookSearch.trim()) return;
    setBookLoading(true);
    // Simulate search
    setTimeout(() => {
      setSelectedBook(bookSearch);
      setBookLoading(false);
    }, 1000);
  };

  // Generate math problem
  const generateMathProblem = () => {
    setMathLoading(true);
    setTimeout(() => {
      const problems = {
        easy: ['5 + 3 = ?', '10 - 4 = ?', '2 × 3 = ?'],
        medium: ['24 + 37 = ?', '15 × 4 = ?', '56 ÷ 8 = ?'],
        hard: ['3/4 + 1/2 = ?', '0.5 × 0.3 = ?', '144 ÷ 12 = ?'],
      };
      const levelProblems = problems[mathDifficulty];
      setCurrentProblem(levelProblems[Math.floor(Math.random() * levelProblems.length)]);
      setMathAnswer('');
      setMathLoading(false);
    }, 500);
  };

  // Page Builder Agent - Generate page structure from prompt
  const handlePageBuilder = async () => {
    if (!builderPrompt.trim()) {
      toast({
        title: 'Please describe what you want to create',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setBuilderLoading(true);
    setBuilderSuggestion(null);

    try {
      const res = await fetch('/api/child/workspace/page-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: builderPrompt }),
      });

      if (res.ok) {
        const data = await res.json();
        setBuilderSuggestion(data);
        setBuilderHistory(prev => [builderPrompt, ...prev.slice(0, 4)]);
      } else {
        throw new Error('Failed to generate');
      }
    } catch (error) {
      // Fallback: Generate a basic structure locally
      const suggestion = generateLocalPageStructure(builderPrompt);
      setBuilderSuggestion(suggestion);
      setBuilderHistory(prev => [builderPrompt, ...prev.slice(0, 4)]);
    } finally {
      setBuilderLoading(false);
    }
  };

  // Local fallback for page structure generation
  const generateLocalPageStructure = (prompt: string): PageBuilderResponse => {
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect type of page from prompt
    if (lowerPrompt.includes('story') || lowerPrompt.includes('adventure') || lowerPrompt.includes('tale')) {
      return {
        title: prompt.split(' ').slice(0, 4).join(' '),
        icon: '📖',
        blocks: [
          { type: 'heading_1', content: prompt },
          { type: 'callout', content: 'Characters: (Add your characters here)', properties: { icon: '👥', color: 'blue' } },
          { type: 'callout', content: 'Setting: (Where does your story take place?)', properties: { icon: '🗺️', color: 'green' } },
          { type: 'divider', content: '' },
          { type: 'heading_2', content: 'The Beginning' },
          { type: 'paragraph', content: 'Start your story here... What happens first?' },
          { type: 'heading_2', content: 'The Middle' },
          { type: 'paragraph', content: 'What challenges do your characters face?' },
          { type: 'heading_2', content: 'The End' },
          { type: 'paragraph', content: 'How does your story conclude?' },
        ],
      };
    }
    
    if (lowerPrompt.includes('list') || lowerPrompt.includes('shopping') || lowerPrompt.includes('todo') || lowerPrompt.includes('checklist')) {
      return {
        title: prompt.split(' ').slice(0, 4).join(' '),
        icon: '📋',
        blocks: [
          { type: 'heading_1', content: prompt },
          { type: 'callout', content: 'Check off items as you complete them!', properties: { icon: '✅', color: 'green' } },
          { type: 'divider', content: '' },
          { type: 'heading_2', content: 'Items' },
          { type: 'to_do', content: 'First item', properties: { checked: false } },
          { type: 'to_do', content: 'Second item', properties: { checked: false } },
          { type: 'to_do', content: 'Third item', properties: { checked: false } },
          { type: 'to_do', content: 'Add more items...', properties: { checked: false } },
        ],
      };
    }
    
    if (lowerPrompt.includes('trip') || lowerPrompt.includes('travel') || lowerPrompt.includes('vacation') || lowerPrompt.includes('packing')) {
      return {
        title: prompt.split(' ').slice(0, 4).join(' '),
        icon: '🧳',
        blocks: [
          { type: 'heading_1', content: prompt },
          { type: 'callout', content: 'Destination: (Where are you going?)', properties: { icon: '✈️', color: 'blue' } },
          { type: 'divider', content: '' },
          { type: 'heading_2', content: 'Clothes 👕' },
          { type: 'to_do', content: 'Shirts', properties: { checked: false } },
          { type: 'to_do', content: 'Pants/Shorts', properties: { checked: false } },
          { type: 'to_do', content: 'Pajamas', properties: { checked: false } },
          { type: 'heading_2', content: 'Fun Stuff 🎮' },
          { type: 'to_do', content: 'Books/Games', properties: { checked: false } },
          { type: 'to_do', content: 'Tablet/Electronics', properties: { checked: false } },
          { type: 'heading_2', content: 'Important Things 🔑' },
          { type: 'to_do', content: 'Toothbrush', properties: { checked: false } },
          { type: 'to_do', content: 'Chargers', properties: { checked: false } },
        ],
      };
    }
    
    if (lowerPrompt.includes('project') || lowerPrompt.includes('science') || lowerPrompt.includes('experiment')) {
      return {
        title: prompt.split(' ').slice(0, 4).join(' '),
        icon: '🔬',
        blocks: [
          { type: 'heading_1', content: prompt },
          { type: 'callout', content: 'Question: What are you trying to find out?', properties: { icon: '❓', color: 'purple' } },
          { type: 'divider', content: '' },
          { type: 'heading_2', content: 'My Hypothesis 🤔' },
          { type: 'paragraph', content: 'I think... (what do you predict will happen?)' },
          { type: 'heading_2', content: 'Materials Needed 🧪' },
          { type: 'bulleted_list', content: 'Item 1' },
          { type: 'bulleted_list', content: 'Item 2' },
          { type: 'bulleted_list', content: 'Item 3' },
          { type: 'heading_2', content: 'Steps 📋' },
          { type: 'numbered_list', content: 'First step' },
          { type: 'numbered_list', content: 'Second step' },
          { type: 'numbered_list', content: 'Third step' },
          { type: 'heading_2', content: 'Results 📊' },
          { type: 'paragraph', content: '(Record what happened here)' },
        ],
      };
    }
    
    if (lowerPrompt.includes('homework') || lowerPrompt.includes('assignment') || lowerPrompt.includes('report')) {
      return {
        title: prompt.split(' ').slice(0, 4).join(' '),
        icon: '📚',
        blocks: [
          { type: 'heading_1', content: prompt },
          { type: 'callout', content: 'Due Date: (When is this due?)', properties: { icon: '📅', color: 'red' } },
          { type: 'divider', content: '' },
          { type: 'heading_2', content: 'Instructions' },
          { type: 'paragraph', content: 'What do you need to do?' },
          { type: 'heading_2', content: 'My Work' },
          { type: 'paragraph', content: 'Start writing here...' },
          { type: 'heading_2', content: 'Questions I Have' },
          { type: 'bulleted_list', content: 'Any questions about the assignment?' },
        ],
      };
    }
    
    // Default generic page structure
    return {
      title: prompt.split(' ').slice(0, 4).join(' '),
      icon: '📄',
      blocks: [
        { type: 'heading_1', content: prompt },
        { type: 'paragraph', content: 'Start writing here...' },
        { type: 'divider', content: '' },
        { type: 'heading_2', content: 'Section 1' },
        { type: 'paragraph', content: 'Add your content...' },
        { type: 'heading_2', content: 'Section 2' },
        { type: 'paragraph', content: 'Add more content...' },
      ],
    };
  };

  // Apply the page builder suggestion
  const applyPageSuggestion = () => {
    if (builderSuggestion && onPageBuilderCreate) {
      onPageBuilderCreate(builderSuggestion);
      toast({
        title: 'Page created! 🎉',
        description: 'Your new page is ready to edit',
        status: 'success',
        duration: 2000,
      });
      setBuilderPrompt('');
      setBuilderSuggestion(null);
    }
  };

  // Render Writing tab
  const renderWriting = () => (
    <VStack spacing={3} align="stretch">
      <HStack>
        <Text fontSize="2xl">✍️</Text>
        <Box>
          <Text fontWeight="bold" fontSize="sm">Writing Tools</Text>
          <Text fontSize="xs" color="gray.500">Make your writing amazing!</Text>
        </Box>
      </HStack>

      <Divider />

      {/* Quick Tools Grid */}
      <SimpleGrid columns={2} spacing={2}>
        {WRITING_TOOLS.map((tool) => (
          <Button
            key={tool.id}
            size="sm"
            variant="outline"
            h="auto"
            py={2}
            onClick={() => handleWritingTool(tool)}
            isLoading={writingLoading}
            _hover={{ bg: 'blue.50', borderColor: 'blue.300' }}
          >
            <VStack spacing={0}>
              <Text fontSize="lg">{tool.emoji}</Text>
              <Text fontSize="xs" fontWeight="medium">{tool.name}</Text>
            </VStack>
          </Button>
        ))}
      </SimpleGrid>

      <Divider />

      {/* Word Count & Stats */}
      <Box p={3} bg="blue.50" borderRadius="lg">
        <Text fontWeight="bold" fontSize="xs" mb={2}>📊 Writing Stats</Text>
        <SimpleGrid columns={2} spacing={2}>
          <Box textAlign="center" p={2} bg="white" borderRadius="md">
            <Text fontSize="lg" fontWeight="bold" color="blue.500">{wordCount}</Text>
            <Text fontSize="2xs" color="gray.500">Words</Text>
          </Box>
          <Box textAlign="center" p={2} bg="white" borderRadius="md">
            <Text fontSize="lg" fontWeight="bold" color="purple.500">{characterCount}</Text>
            <Text fontSize="2xs" color="gray.500">Characters</Text>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Writing Tips */}
      <Box p={2} bg="yellow.50" borderRadius="lg">
        <Text fontSize="xs" color="yellow.800">
          💡 <strong>Tip:</strong> Select text in your document, then click a tool to improve it!
        </Text>
      </Box>
    </VStack>
  );

  // Render Quick Actions tab (integrations)
  const renderQuickActions = () => (
    <VStack spacing={3} align="stretch">
      <HStack>
        <Text fontSize="2xl">⚡</Text>
        <Box>
          <Text fontWeight="bold" fontSize="sm">Quick Actions</Text>
          <Text fontSize="xs" color="gray.500">Connect to other tools</Text>
        </Box>
      </HStack>

      <Text fontWeight="bold" fontSize="xs" color="gray.600">USE YOUR WORK IN</Text>

      <VStack spacing={2} align="stretch">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant="outline"
            justifyContent="flex-start"
            h="auto"
            py={2}
            px={3}
            onClick={() => handleQuickAction(action)}
            _hover={{ bg: `${action.color}.50`, borderColor: `${action.color}.300` }}
          >
            <HStack spacing={3} w="full">
              <Text fontSize="xl">{action.emoji}</Text>
              <Box textAlign="left" flex={1}>
                <Text fontSize="sm" fontWeight="medium">{action.name}</Text>
                <Text fontSize="xs" color="gray.500">{action.description}</Text>
              </Box>
              <FiExternalLink size={14} color="gray" />
            </HStack>
          </Button>
        ))}
      </VStack>

      <Divider />

      {/* Document Info */}
      <Box p={3} bg="gray.50" borderRadius="lg">
        <Text fontWeight="bold" fontSize="xs" mb={2}>📄 DOCUMENT INFO</Text>
        <SimpleGrid columns={2} spacing={2}>
          <Box>
            <Text fontSize="2xs" color="gray.500">Words</Text>
            <Text fontSize="sm" fontWeight="bold">{wordCount}</Text>
          </Box>
          <Box>
            <Text fontSize="2xs" color="gray.500">Characters</Text>
            <Text fontSize="sm" fontWeight="bold">{characterCount}</Text>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Writing Tips */}
      <Box p={2} bg="blue.50" borderRadius="lg">
        <Text fontWeight="bold" fontSize="xs" mb={1}>✏️ WRITING TIPS</Text>
        <VStack align="stretch" spacing={1}>
          <Text fontSize="xs" color="blue.700">• Start with your main idea</Text>
          <Text fontSize="xs" color="blue.700">• Add details to paint a picture</Text>
          <Text fontSize="xs" color="blue.700">• Read it out loud to check flow</Text>
        </VStack>
      </Box>
    </VStack>
  );

  // Render Books tab
  const renderBooks = () => (
    <VStack spacing={3} align="stretch">
      <HStack>
        <Text fontSize="2xl">📚</Text>
        <Box>
          <Text fontWeight="bold" fontSize="sm">Book Helper</Text>
          <Text fontSize="xs" color="gray.500">Explore and understand books!</Text>
        </Box>
      </HStack>

      {/* Book Search */}
      <HStack>
        <Input
          placeholder="Search for a book..."
          size="sm"
          value={bookSearch}
          onChange={(e) => setBookSearch(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleBookSearch()}
        />
        <IconButton
          icon={<FiBookOpen />}
          aria-label="Search"
          size="sm"
          colorScheme="purple"
          onClick={handleBookSearch}
          isLoading={bookLoading}
        />
      </HStack>

      <Divider />

      {/* Book Features */}
      <Text fontWeight="bold" fontSize="xs">📖 What would you like to know?</Text>
      <VStack spacing={2} align="stretch">
        {BOOK_FEATURES.map((feature) => (
          <Button
            key={feature.id}
            size="sm"
            variant="outline"
            justifyContent="flex-start"
            leftIcon={<Text>{feature.emoji}</Text>}
            isDisabled={!selectedBook}
            _hover={{ bg: 'purple.50' }}
          >
            <Box textAlign="left">
              <Text fontSize="xs" fontWeight="medium">{feature.name}</Text>
              <Text fontSize="2xs" color="gray.500">{feature.description}</Text>
            </Box>
          </Button>
        ))}
      </VStack>

      {/* Currently Reading */}
      {selectedBook && (
        <Box p={3} bg="purple.50" borderRadius="lg">
          <Text fontWeight="bold" fontSize="xs" mb={1}>📖 Currently Exploring</Text>
          <Text fontSize="sm">{selectedBook}</Text>
        </Box>
      )}

      {/* GraphRAG Integration Note */}
      <Box p={2} bg="blue.50" borderRadius="lg">
        <Text fontSize="xs" color="blue.700">
          🔗 <strong>Smart Analysis:</strong> Uses AI to understand book connections!
        </Text>
      </Box>
    </VStack>
  );

  // Render Math tab
  const renderMath = () => (
    <VStack spacing={3} align="stretch">
      <HStack>
        <Text fontSize="2xl">🧮</Text>
        <Box>
          <Text fontWeight="bold" fontSize="sm">Math Helper</Text>
          <Text fontSize="xs" color="gray.500">Practice and learn math!</Text>
        </Box>
      </HStack>

      {/* Difficulty Selection */}
      <FormControl>
        <FormLabel fontSize="xs" fontWeight="bold">⭐ Difficulty</FormLabel>
        <SimpleGrid columns={3} spacing={2}>
          {(['easy', 'medium', 'hard'] as const).map((level) => (
            <Button
              key={level}
              size="sm"
              variant={mathDifficulty === level ? 'solid' : 'outline'}
              colorScheme={level === 'easy' ? 'green' : level === 'medium' ? 'yellow' : 'red'}
              onClick={() => setMathDifficulty(level)}
            >
              {level === 'easy' ? '🌱' : level === 'medium' ? '🌿' : '🌳'}
            </Button>
          ))}
        </SimpleGrid>
      </FormControl>

      <Divider />

      {/* Practice Problem */}
      <Box p={3} bg="green.50" borderRadius="lg">
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="bold" fontSize="xs">🎯 Practice Problem</Text>
          <Button size="xs" leftIcon={<FiRefreshCw />} onClick={generateMathProblem} isLoading={mathLoading}>
            New
          </Button>
        </HStack>
        {currentProblem ? (
          <VStack spacing={2}>
            <Text fontSize="xl" fontWeight="bold" textAlign="center">{currentProblem}</Text>
            <HStack w="full">
              <Input
                placeholder="Your answer"
                size="sm"
                value={mathAnswer}
                onChange={(e) => setMathAnswer(e.target.value)}
              />
              <Button size="sm" colorScheme="green" leftIcon={<FiCheck />}>
                Check
              </Button>
            </HStack>
          </VStack>
        ) : (
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Click "New" to get a problem!
          </Text>
        )}
      </Box>

      <Divider />

      {/* Math Topics */}
      <Text fontWeight="bold" fontSize="xs">📐 Topics</Text>
      <SimpleGrid columns={2} spacing={2} maxH="150px" overflowY="auto">
        {MATH_TOPICS.map((topic) => (
          <Button
            key={topic.id}
            size="xs"
            variant="outline"
            h="auto"
            py={1}
            justifyContent="flex-start"
          >
            <HStack spacing={1}>
              <Text>{topic.emoji}</Text>
              <Box textAlign="left">
                <Text fontSize="2xs">{topic.name}</Text>
                <Text fontSize="3xs" color="gray.400">{topic.grade}</Text>
              </Box>
            </HStack>
          </Button>
        ))}
      </SimpleGrid>

      {/* Help Button */}
      <Button size="sm" colorScheme="blue" variant="outline" leftIcon={<FiSend />}>
        Ask for help with homework
      </Button>
    </VStack>
  );

  // Render Documents tab
  const renderDocuments = () => (
    <VStack spacing={3} align="stretch">
      <HStack justify="space-between">
        <HStack>
          <Text fontSize="2xl">📁</Text>
          <Box>
            <Text fontWeight="bold" fontSize="sm">My Documents</Text>
            <Text fontSize="xs" color="gray.500">Your saved work</Text>
          </Box>
        </HStack>
        <IconButton
          icon={<FiRefreshCw />}
          aria-label="Refresh"
          size="xs"
          variant="ghost"
          onClick={loadDocuments}
          isLoading={docsLoading}
        />
      </HStack>

      {/* New Document */}
      <Button size="sm" colorScheme="blue" leftIcon={<FiPlus />} w="full">
        New Document
      </Button>

      <Divider />

      {/* Templates */}
      <Text fontWeight="bold" fontSize="xs">📋 Templates</Text>
      <SimpleGrid columns={3} spacing={2}>
        {DOCUMENT_TEMPLATES.slice(0, 3).map((template) => (
          <Button
            key={template.id}
            size="xs"
            variant="outline"
            h="auto"
            py={2}
          >
            <VStack spacing={0}>
              <Text fontSize="lg">{template.emoji}</Text>
              <Text fontSize="2xs">{template.name}</Text>
            </VStack>
          </Button>
        ))}
      </SimpleGrid>

      <Divider />

      {/* Recent Documents */}
      <Text fontWeight="bold" fontSize="xs">🕐 Recent</Text>
      {docsLoading ? (
        <Box textAlign="center" py={4}>
          <Spinner size="sm" />
        </Box>
      ) : documents.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Text fontSize="3xl" mb={1}>📄</Text>
          <Text fontSize="xs" color="gray.500">No documents yet</Text>
        </Box>
      ) : (
        <VStack spacing={2} align="stretch" maxH="180px" overflowY="auto">
          {documents.map((doc) => (
            <HStack
              key={doc.id}
              p={2}
              bg="gray.50"
              borderRadius="md"
              cursor="pointer"
              _hover={{ bg: 'blue.50' }}
            >
              <Text fontSize="lg">
                {doc.type === 'story' ? '📖' : 
                 doc.type === 'essay' ? '📝' : 
                 doc.type === 'poem' ? '🎭' : 
                 doc.type === 'homework' ? '📚' : '📄'}
              </Text>
              <Box flex={1}>
                <Text fontSize="xs" fontWeight="medium" noOfLines={1}>{doc.title}</Text>
                <HStack spacing={2}>
                  <Text fontSize="2xs" color="gray.500">{doc.wordCount} words</Text>
                  <Text fontSize="2xs" color="gray.400">•</Text>
                  <Text fontSize="2xs" color="gray.500">{doc.lastEdited}</Text>
                </HStack>
              </Box>
            </HStack>
          ))}
        </VStack>
      )}
    </VStack>
  );

  // Render Page Builder Agent tab - Now uses conversational agent
  const renderPageBuilder = () => {
    // Import and use the new conversational PageBuilderAgent
    const PageBuilderAgent = require('./PageBuilderAgent').default;
    
    return (
      <Box h="400px">
        <PageBuilderAgent
          onPageCreate={(page: any) => {
            if (onPageBuilderCreate) {
              onPageBuilderCreate(page);
            }
            toast({
              title: 'Page created! 🎉',
              description: page.title,
              status: 'success',
              duration: 2000,
            });
          }}
          // Current page context for AI agent awareness
          currentPageId={currentPageId}
          currentPageTitle={currentPageTitle}
          currentPageIcon={currentPageIcon}
          currentPageBlocks={currentPageBlocks}
          onPageUpdate={onPageUpdate}
          isMinecraft={false}
          isPusheen={false}
          primaryColor="purple.500"
        />
      </Box>
    );
  };

  // Legacy Page Builder (kept for fallback)
  const renderLegacyPageBuilder = () => (
    <VStack spacing={3} align="stretch">
      <HStack>
        <Text fontSize="2xl">🤖</Text>
        <Box>
          <Text fontWeight="bold" fontSize="sm">Page Builder Agent</Text>
          <Text fontSize="xs" color="gray.500">I'll help structure your page!</Text>
        </Box>
      </HStack>

      <Divider />

      {/* Prompt Input */}
      <Box>
        <Text fontWeight="bold" fontSize="xs" mb={2}>✨ What would you like to create?</Text>
        <Textarea
          placeholder="Describe your page... e.g., 'A story about a dragon adventure' or 'Packing list for beach trip' or 'Science project about plants'"
          size="sm"
          value={builderPrompt}
          onChange={(e) => setBuilderPrompt(e.target.value)}
          rows={3}
          resize="none"
        />
        <Button
          mt={2}
          size="sm"
          colorScheme="purple"
          leftIcon={<FiZap />}
          onClick={handlePageBuilder}
          isLoading={builderLoading}
          loadingText="Creating..."
          w="full"
        >
          Build My Page
        </Button>
      </Box>

      {/* From Planner - Show if we have planner items */}
      {progress?.plannerItems && progress.plannerItems.filter(i => !i.completed).length > 0 && (
        <Box p={3} bg="blue.50" borderRadius="lg">
          <HStack mb={2}>
            <FiCalendar />
            <Text fontWeight="bold" fontSize="xs">📅 From Your Planner</Text>
          </HStack>
          <VStack align="stretch" spacing={1} maxH="100px" overflowY="auto">
            {progress.plannerItems
              .filter(i => !i.completed)
              .slice(0, 3)
              .map((item) => (
                <Button
                  key={item.id}
                  size="xs"
                  variant="outline"
                  justifyContent="flex-start"
                  onClick={() => {
                    const prompt = item.type === 'homework' 
                      ? `${item.subject || 'Homework'}: ${item.title}`
                      : item.title;
                    setBuilderPrompt(prompt);
                  }}
                  _hover={{ bg: 'blue.100' }}
                  bg="white"
                >
                  <HStack spacing={2}>
                    <Text>
                      {item.type === 'homework' ? '📚' : 
                       item.type === 'activity' ? '🎯' : 
                       item.type === 'goal' ? '⭐' : '📝'}
                    </Text>
                    <Text fontSize="xs" noOfLines={1}>{item.title}</Text>
                  </HStack>
                </Button>
              ))}
          </VStack>
          <Button
            size="xs"
            variant="link"
            colorScheme="blue"
            mt={1}
            onClick={() => router.push('/child/planner')}
          >
            View all in Planner →
          </Button>
        </Box>
      )}

      {/* Quick Suggestions */}
      <Box>
        <Text fontWeight="bold" fontSize="xs" mb={2}>💡 Quick Ideas</Text>
        <SimpleGrid columns={2} spacing={1}>
          {[
            { label: '📖 Story', prompt: 'A creative story' },
            { label: '📋 List', prompt: 'A checklist' },
            { label: '🧳 Trip', prompt: 'Travel packing list' },
            { label: '🔬 Project', prompt: 'Science experiment' },
            { label: '📚 Homework', prompt: 'Homework assignment' },
            { label: '🎯 Goals', prompt: 'My goals tracker' },
          ].map((idea) => (
            <Button
              key={idea.label}
              size="xs"
              variant="outline"
              onClick={() => setBuilderPrompt(idea.prompt)}
              _hover={{ bg: 'purple.50' }}
            >
              {idea.label}
            </Button>
          ))}
        </SimpleGrid>
      </Box>

      {/* Generated Suggestion Preview */}
      {builderSuggestion && (
        <Box p={3} bg="green.50" borderRadius="lg" border="1px solid" borderColor="green.200">
          <HStack mb={2}>
            <Text fontSize="xl">{builderSuggestion.icon}</Text>
            <Text fontWeight="bold" fontSize="sm">{builderSuggestion.title}</Text>
          </HStack>
          
          <Text fontSize="xs" color="gray.600" mb={2}>
            Preview ({builderSuggestion.blocks.length} blocks):
          </Text>
          
          <VStack align="stretch" spacing={1} maxH="150px" overflowY="auto" mb={3}>
            {builderSuggestion.blocks.slice(0, 6).map((block, idx) => (
              <HStack key={idx} fontSize="xs" color="gray.600">
                <Text>
                  {block.type === 'heading_1' ? '📌' :
                   block.type === 'heading_2' ? '📎' :
                   block.type === 'paragraph' ? '📝' :
                   block.type === 'bulleted_list' ? '•' :
                   block.type === 'numbered_list' ? '1.' :
                   block.type === 'to_do' ? '☑️' :
                   block.type === 'callout' ? '💡' :
                   block.type === 'divider' ? '—' : '📄'}
                </Text>
                <Text noOfLines={1} flex={1}>
                  {Array.isArray(block.content) 
                    ? block.content.map(c => c.text || c).join('') 
                    : block.content || '(divider)'}
                </Text>
              </HStack>
            ))}
            {builderSuggestion.blocks.length > 6 && (
              <Text fontSize="xs" color="gray.400">
                +{builderSuggestion.blocks.length - 6} more blocks...
              </Text>
            )}
          </VStack>

          <HStack>
            <Button
              size="sm"
              colorScheme="green"
              leftIcon={<FiCheck />}
              onClick={applyPageSuggestion}
              flex={1}
            >
              Create Page
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBuilderSuggestion(null)}
            >
              Cancel
            </Button>
          </HStack>
        </Box>
      )}

      {/* Recent Prompts */}
      {builderHistory.length > 0 && !builderSuggestion && (
        <Box>
          <Text fontWeight="bold" fontSize="xs" mb={2}>🕐 Recent</Text>
          <VStack align="stretch" spacing={1}>
            {builderHistory.map((prompt, idx) => (
              <Button
                key={idx}
                size="xs"
                variant="ghost"
                justifyContent="flex-start"
                onClick={() => setBuilderPrompt(prompt)}
                _hover={{ bg: 'gray.100' }}
              >
                <Text fontSize="xs" noOfLines={1}>{prompt}</Text>
              </Button>
            ))}
          </VStack>
        </Box>
      )}

      {/* Tips */}
      <Box p={2} bg="purple.50" borderRadius="lg">
        <Text fontSize="xs" color="purple.700">
          🎯 <strong>Tip:</strong> Be specific! Instead of "a list", try "shopping list for birthday party supplies"
        </Text>
      </Box>
    </VStack>
  );

  return (
    <Box p={3} h="full" overflowY="auto">
      {activeTab === 'writing' && renderWriting()}
      {activeTab === 'actions' && renderQuickActions()}
      {activeTab === 'books' && renderBooks()}
      {activeTab === 'math' && renderMath()}
      {activeTab === 'documents' && renderDocuments()}
      {activeTab === 'builder' && renderPageBuilder()}
    </Box>
  );
}

export default ChildWorkspacePanel;
