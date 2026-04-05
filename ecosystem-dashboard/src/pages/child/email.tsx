/**
 * Child Email Page
 * 
 * Child-friendly email assistant interface
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Textarea,
  Input,
  Button,
  SimpleGrid,
  IconButton,
  useToast,
  Progress,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { FiArrowLeft, FiClock, FiMail, FiSend, FiEdit2, FiCheck } from 'react-icons/fi';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useRouter } from 'next/router';
import { authOptions } from '../api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { BackgroundContextMenu, getBackgroundStyles, BackgroundMode } from '@/components/child/BackgroundContextMenu';
import { useRightPanel } from '@/contexts/RightPanelContext';

const EMAIL_TEMPLATES = [
  { emoji: '👩‍🏫', text: 'Write to my teacher', recipient: 'my teacher' },
  { emoji: '💝', text: 'Thank you note', recipient: 'someone special' },
  { emoji: '👨‍👩‍👧', text: 'Message to family', recipient: 'my family' },
  { emoji: '🎉', text: 'Birthday message', recipient: 'my friend' },
];

function EmailPageContent() {
  const router = useRouter();
  const toast = useToast();
  const { colors, childExtras } = useChildTheme();
  const { setContext, setIsOpen } = useRightPanel();

  // Set right panel context - keep closed by default
  // Only run on mount to avoid closing panel when user opens it
  useEffect(() => {
    setContext('child-email');
    setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [usageMinutes, setUsageMinutes] = useState(0);
  const [limitMinutes, setLimitMinutes] = useState(120);

  const backgroundImages = childExtras?.decorations?.backgroundImages;
  const backgroundImage = backgroundImages?.email || backgroundImages?.default;
  
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

  useEffect(() => {
    fetchUsage();
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

  const handleGetHelp = async (action: string) => {
    if (loading) return;

    setLoading(true);
    setAiSuggestion('');

    try {
      const res = await fetch('/api/child/services/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          recipient,
          subject,
          body,
          message: action === 'compose' ? `Help me write an email to ${recipient}` : body,
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
        setAiSuggestion(data.response);
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

  const handleUseTemplate = (template: typeof EMAIL_TEMPLATES[0]) => {
    setRecipient(template.recipient);
    setSubject('');
    setBody('');
    setAiSuggestion('');
  };

  const handleApplySuggestion = () => {
    if (aiSuggestion) {
      setBody(aiSuggestion);
      setAiSuggestion('');
      toast({
        title: '✨ Applied!',
        status: 'success',
        duration: 2000,
      });
    }
  };

  const usagePercent = Math.min(100, (usageMinutes / limitMinutes) * 100);
  const remainingMinutes = Math.max(0, limitMinutes - usageMinutes);

  return (
    <ChildDashboardLayout pageType="email">
      <BackgroundContextMenu onModeChange={handleBgModeChange} currentMode={bgMode}>
      <Box
        minH="calc(100vh - 60px)"
        bg={colors?.background || '#e8f5e9'}
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
        <Container maxW="container.lg">
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
                <Text fontSize="3xl">✉️</Text>
                <Text fontWeight="bold" fontSize="xl">Email Helper</Text>
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

            {/* Quick Templates */}
            <Box bg="white" borderRadius="2xl" p={4} boxShadow="lg">
              <Text fontWeight="bold" mb={3}>Quick Start ✨</Text>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                {EMAIL_TEMPLATES.map((template, i) => (
                  <Button
                    key={i}
                    size="md"
                    variant="outline"
                    borderRadius="xl"
                    h="auto"
                    py={3}
                    onClick={() => handleUseTemplate(template)}
                    _hover={{ bg: 'green.50' }}
                  >
                    <VStack spacing={1}>
                      <Text fontSize="xl">{template.emoji}</Text>
                      <Text fontSize="xs">{template.text}</Text>
                    </VStack>
                  </Button>
                ))}
              </SimpleGrid>
            </Box>

            {/* Email Composer */}
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              {/* Write Email */}
              <Box bg="white" borderRadius="2xl" p={6} boxShadow="xl">
                <HStack mb={4}>
                  <FiMail />
                  <Text fontWeight="bold">Write Your Email</Text>
                </HStack>

                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={1}>To:</Text>
                    <Input
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="Who is this email for?"
                      borderRadius="lg"
                      border="2px solid"
                      borderColor="green.200"
                      _focus={{ borderColor: 'green.500' }}
                    />
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={1}>Subject:</Text>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What is your email about?"
                      borderRadius="lg"
                      border="2px solid"
                      borderColor="green.200"
                      _focus={{ borderColor: 'green.500' }}
                    />
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={1}>Message:</Text>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write your message here..."
                      minH="200px"
                      borderRadius="lg"
                      border="2px solid"
                      borderColor="green.200"
                      _focus={{ borderColor: 'green.500' }}
                    />
                  </Box>

                  <HStack spacing={3}>
                    <Button
                      colorScheme="green"
                      leftIcon={<FiEdit2 />}
                      onClick={() => handleGetHelp('compose')}
                      isLoading={loading}
                      borderRadius="full"
                      flex={1}
                    >
                      Help me write
                    </Button>
                    <Button
                      colorScheme="blue"
                      leftIcon={<FiCheck />}
                      onClick={() => handleGetHelp('check')}
                      isLoading={loading}
                      borderRadius="full"
                      flex={1}
                    >
                      Check it
                    </Button>
                  </HStack>
                </VStack>
              </Box>

              {/* AI Suggestions */}
              <Box bg="white" borderRadius="2xl" p={6} boxShadow="xl">
                <HStack justify="space-between" mb={4}>
                  <HStack>
                    <Text fontSize="xl">🤖</Text>
                    <Text fontWeight="bold">AI Suggestions</Text>
                  </HStack>
                  {aiSuggestion && (
                    <Button
                      size="sm"
                      colorScheme="green"
                      leftIcon={<FiCheck />}
                      onClick={handleApplySuggestion}
                      borderRadius="full"
                    >
                      Use this
                    </Button>
                  )}
                </HStack>

                {loading ? (
                  <VStack py={12} spacing={4}>
                    <Box
                      w="60px"
                      h="60px"
                      borderRadius="full"
                      bg="green.100"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontSize="2xl">✍️</Text>
                    </Box>
                    <Text color="gray.500">Writing...</Text>
                  </VStack>
                ) : aiSuggestion ? (
                  <Box
                    bg="green.50"
                    p={4}
                    borderRadius="xl"
                    border="2px solid"
                    borderColor="green.200"
                    minH="250px"
                  >
                    <Text whiteSpace="pre-wrap" lineHeight="tall">
                      {aiSuggestion}
                    </Text>
                  </Box>
                ) : (
                  <VStack py={12} spacing={4} color="gray.400">
                    <FiMail size={48} />
                    <Text textAlign="center">
                      Fill in your email and click "Help me write" for suggestions!
                    </Text>
                  </VStack>
                )}
              </Box>
            </SimpleGrid>
          </VStack>
        </Container>
        </Box>
      </Box>
      </BackgroundContextMenu>
    </ChildDashboardLayout>
  );
}

export default function ChildEmailPage() {
  return (
    <ChildDashboardLayout pageType="email">
      <EmailPageContent />
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
        destination: '/email',
        permanent: false,
      },
    };
  }

  return { props: {} };
};
