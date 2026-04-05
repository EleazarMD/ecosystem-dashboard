/**
 * Child Email Right Panel
 * 
 * Kid-friendly panel with:
 * - Email writing helper (AI assistance)
 * - Pre-made templates for common emails
 * - Tips for writing good emails
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Divider,
  SimpleGrid,
  Progress,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { FiMail, FiSend, FiHeart, FiStar, FiCheck } from 'react-icons/fi';

interface EmailTemplate {
  id: string;
  emoji: string;
  title: string;
  recipient: string;
  subject: string;
  body: string;
  color: string;
}

interface WritingTip {
  emoji: string;
  title: string;
  description: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'teacher',
    emoji: '👩‍🏫',
    title: 'To My Teacher',
    recipient: 'my teacher',
    subject: 'Question about homework',
    body: 'Dear Teacher,\n\nI hope you are having a great day! I wanted to ask about...\n\nThank you for your help!\n\nBest,\n[Your name]',
    color: 'blue',
  },
  {
    id: 'thank-you',
    emoji: '💝',
    title: 'Thank You Note',
    recipient: 'someone special',
    subject: 'Thank you!',
    body: 'Dear [Name],\n\nThank you so much for...\n\nIt really meant a lot to me!\n\nWith gratitude,\n[Your name]',
    color: 'pink',
  },
  {
    id: 'family',
    emoji: '👨‍👩‍👧',
    title: 'To Family',
    recipient: 'my family',
    subject: 'Hello from me!',
    body: 'Hi [Family member]!\n\nI wanted to tell you about...\n\nI miss you and hope to see you soon!\n\nLove,\n[Your name]',
    color: 'green',
  },
  {
    id: 'birthday',
    emoji: '🎂',
    title: 'Birthday Wishes',
    recipient: 'my friend',
    subject: 'Happy Birthday!',
    body: 'Dear [Friend],\n\nHappy Birthday! 🎉\n\nI hope your special day is filled with joy and fun!\n\nYour friend,\n[Your name]',
    color: 'purple',
  },
  {
    id: 'invitation',
    emoji: '🎈',
    title: 'Party Invitation',
    recipient: 'my friends',
    subject: "You're invited!",
    body: "Hi [Friend]!\n\nYou're invited to my party!\n\n📅 Date: [Date]\n⏰ Time: [Time]\n📍 Place: [Location]\n\nI hope you can come!\n\n[Your name]",
    color: 'orange',
  },
  {
    id: 'apology',
    emoji: '🙏',
    title: 'Saying Sorry',
    recipient: 'someone',
    subject: "I'm sorry",
    body: "Dear [Name],\n\nI wanted to say I'm sorry for...\n\nI didn't mean to hurt your feelings. Can we be friends again?\n\nSorry,\n[Your name]",
    color: 'teal',
  },
];

const WRITING_TIPS: WritingTip[] = [
  {
    emoji: '👋',
    title: 'Start with a greeting',
    description: 'Say "Dear" or "Hi" and the person\'s name',
  },
  {
    emoji: '📝',
    title: 'Be clear and simple',
    description: 'Say what you want to say in easy words',
  },
  {
    emoji: '😊',
    title: 'Be polite',
    description: 'Use "please" and "thank you"',
  },
  {
    emoji: '✅',
    title: 'Check your spelling',
    description: 'Read it again before sending',
  },
  {
    emoji: '👋',
    title: 'End nicely',
    description: 'Say "Best," "Thanks," or "Love" at the end',
  },
  {
    emoji: '✍️',
    title: 'Sign your name',
    description: 'Always write your name at the bottom',
  },
];

interface ChildEmailPanelProps {
  activeTab: string;
  onSelectTemplate?: (template: EmailTemplate) => void;
}

export function ChildEmailPanel({ activeTab, onSelectTemplate }: ChildEmailPanelProps) {
  const toast = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [completedTips, setCompletedTips] = useState<string[]>([]);

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template.id);
    onSelectTemplate?.(template);
    toast({
      title: `${template.emoji} Template selected!`,
      description: `Using "${template.title}" template`,
      status: 'success',
      duration: 2000,
    });
  };

  const toggleTipComplete = (title: string) => {
    setCompletedTips(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const tipsProgress = (completedTips.length / WRITING_TIPS.length) * 100;

  return (
    <Box h="100%" overflowY="auto" p={4}>
      {activeTab === 'email-helper' && (
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <HStack>
              <Text fontSize="2xl">✉️</Text>
              <Text fontWeight="bold" fontSize="lg">Email Helper</Text>
            </HStack>
            <Badge colorScheme="green" fontSize="xs">AI Powered</Badge>
          </HStack>

          <Text fontSize="sm" color="gray.600">
            I can help you write great emails! Just tell me who you want to write to and what you want to say.
          </Text>

          <Divider />

          {/* Quick Actions */}
          <Text fontWeight="bold" fontSize="sm" color="gray.700">Quick Help</Text>
          <SimpleGrid columns={2} spacing={2}>
            <Button
              size="sm"
              leftIcon={<Text>✨</Text>}
              colorScheme="purple"
              variant="outline"
              borderRadius="full"
            >
              Make it better
            </Button>
            <Button
              size="sm"
              leftIcon={<Text>📝</Text>}
              colorScheme="blue"
              variant="outline"
              borderRadius="full"
            >
              Fix spelling
            </Button>
            <Button
              size="sm"
              leftIcon={<Text>😊</Text>}
              colorScheme="pink"
              variant="outline"
              borderRadius="full"
            >
              Make it nicer
            </Button>
            <Button
              size="sm"
              leftIcon={<Text>📏</Text>}
              colorScheme="green"
              variant="outline"
              borderRadius="full"
            >
              Make it shorter
            </Button>
          </SimpleGrid>

          <Divider />

          {/* Writing Checklist */}
          <Text fontWeight="bold" fontSize="sm" color="gray.700">Before You Send ✅</Text>
          <VStack spacing={2} align="stretch">
            {['Greeting at the start?', 'Said what you need?', 'Polite words used?', 'Signed your name?'].map((item, idx) => (
              <HStack
                key={idx}
                p={2}
                bg="gray.50"
                borderRadius="lg"
                cursor="pointer"
                _hover={{ bg: 'green.50' }}
              >
                <Box
                  w={5}
                  h={5}
                  borderRadius="md"
                  border="2px solid"
                  borderColor="green.300"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <FiCheck size={12} color="green" />
                </Box>
                <Text fontSize="sm">{item}</Text>
              </HStack>
            ))}
          </VStack>
        </VStack>
      )}

      {activeTab === 'templates' && (
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack>
            <Text fontSize="2xl">📝</Text>
            <Text fontWeight="bold" fontSize="lg">Email Templates</Text>
          </HStack>

          <Text fontSize="sm" color="gray.600">
            Pick a template to get started quickly!
          </Text>

          <Divider />

          {/* Templates Grid */}
          <VStack spacing={3} align="stretch">
            {EMAIL_TEMPLATES.map((template) => (
              <Box
                key={template.id}
                p={3}
                bg={selectedTemplate === template.id ? `${template.color}.50` : 'white'}
                border="2px solid"
                borderColor={selectedTemplate === template.id ? `${template.color}.300` : 'gray.100'}
                borderRadius="xl"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  borderColor: `${template.color}.300`,
                  transform: 'translateY(-2px)',
                  boxShadow: 'md',
                }}
                onClick={() => handleSelectTemplate(template)}
              >
                <HStack justify="space-between">
                  <HStack spacing={3}>
                    <Text fontSize="2xl">{template.emoji}</Text>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold" fontSize="sm">{template.title}</Text>
                      <Text fontSize="xs" color="gray.500">To: {template.recipient}</Text>
                    </VStack>
                  </HStack>
                  {selectedTemplate === template.id && (
                    <Badge colorScheme={template.color} fontSize="2xs">Selected</Badge>
                  )}
                </HStack>
              </Box>
            ))}
          </VStack>
        </VStack>
      )}

      {activeTab === 'tips' && (
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <HStack>
              <Text fontSize="2xl">💡</Text>
              <Text fontWeight="bold" fontSize="lg">Writing Tips</Text>
            </HStack>
            <Badge colorScheme="yellow" fontSize="xs">
              {completedTips.length}/{WRITING_TIPS.length} learned
            </Badge>
          </HStack>

          {/* Progress */}
          <Box>
            <Progress
              value={tipsProgress}
              size="sm"
              colorScheme="yellow"
              borderRadius="full"
              bg="gray.100"
            />
            <Text fontSize="xs" color="gray.500" mt={1} textAlign="center">
              {tipsProgress === 100 ? '🌟 You learned all the tips!' : 'Tap tips to mark as learned'}
            </Text>
          </Box>

          <Divider />

          {/* Tips List */}
          <VStack spacing={3} align="stretch">
            {WRITING_TIPS.map((tip, idx) => {
              const isCompleted = completedTips.includes(tip.title);
              return (
                <Box
                  key={idx}
                  p={3}
                  bg={isCompleted ? 'green.50' : 'white'}
                  border="2px solid"
                  borderColor={isCompleted ? 'green.200' : 'gray.100'}
                  borderRadius="xl"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ borderColor: 'green.300' }}
                  onClick={() => toggleTipComplete(tip.title)}
                >
                  <HStack spacing={3}>
                    <Box
                      w={10}
                      h={10}
                      borderRadius="full"
                      bg={isCompleted ? 'green.100' : 'gray.100'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <Text fontSize="xl">{isCompleted ? '✅' : tip.emoji}</Text>
                    </Box>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold" fontSize="sm" color={isCompleted ? 'green.700' : 'gray.800'}>
                        {tip.title}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {tip.description}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              );
            })}
          </VStack>

          {/* Fun Fact */}
          <Box
            p={4}
            bg="purple.50"
            borderRadius="xl"
            border="2px solid"
            borderColor="purple.200"
          >
            <HStack spacing={2} mb={2}>
              <Text fontSize="lg">🌟</Text>
              <Text fontWeight="bold" fontSize="sm" color="purple.700">Fun Fact!</Text>
            </HStack>
            <Text fontSize="sm" color="purple.600">
              The first email was sent in 1971 by Ray Tomlinson. He also invented the @ symbol for email addresses!
            </Text>
          </Box>
        </VStack>
      )}
    </Box>
  );
}

export default ChildEmailPanel;
