/**
 * Notion-Style Home Page
 * Clean, minimal design with sections for recently visited, tables, learn, templates
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  SimpleGrid,
  Image,
  Icon,
  Badge,
  Flex,
  Button,
} from '@chakra-ui/react';
import {
  FiClock,
  FiTable,
  FiBookOpen,
  FiStar,
  FiFile,
  FiZap,
  FiMic,
  FiShare2,
  FiCpu,
  FiSearch,
  FiRadio
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRouter } from 'next/router';

interface PageCardProps {
  id: string;
  title: string;
  icon?: string;
  cover?: string;
  updated_at: string;
  onClick: (id: string) => void;
}

interface NotionHomeProps {
  recentPages: PageCardProps[];
  onPageClick: (pageId: string) => void;
  userName?: string;
}

function PageCard({ title, icon, cover, updated_at, onClick, id }: PageCardProps) {
  const timeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const days = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Box
      onClick={() => onClick(id)}
      cursor="pointer"
      borderRadius="md"
      overflow="hidden"
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
      bg={useSemanticToken('surface.elevated')}
      border="1px solid"
      borderColor={useSemanticToken('border.default')}
    >
      {/* Thumbnail */}
      <Box
        h="100px"
        bg={cover || useSemanticToken('surface.base')}
        backgroundImage={cover ? `url(${cover})` : undefined}
        backgroundSize="cover"
        backgroundPosition="center"
        position="relative"
      >
        {!cover && (
          <Flex align="center" justify="center" h="100%">
            <Icon as={FiFile} boxSize={8} color={useSemanticToken('text.tertiary')} />
          </Flex>
        )}
      </Box>

      {/* Content */}
      <Box p={3}>
        <HStack spacing={2} mb={1}>
          {icon && <Text fontSize="sm">{icon}</Text>}
          <Text fontSize="sm" fontWeight="500" noOfLines={1} color={useSemanticToken('text.primary')}>
            {title}
          </Text>
        </HStack>
        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
          {timeAgo(updated_at)}
        </Text>
      </Box>
    </Box>
  );
}

function TemplateCard({
  title,
  description,
  icon
}: {
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Box
      p={4}
      border="1px solid"
      borderColor={useSemanticToken('border.default')}
      borderRadius="md"
      bg={useSemanticToken('surface.elevated')}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{ borderColor: 'blue.300', boxShadow: 'sm' }}
    >
      <Icon as={icon} boxSize={5} color={useSemanticToken('text.secondary')} mb={2} />
      <Text fontSize="sm" fontWeight="600" mb={1}>
        {title}
      </Text>
      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
        {description}
      </Text>
    </Box>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  color,
  onClick
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}) {
  const bg = useSemanticToken('surface.elevated');
  const border = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  return (
    <Box
      p={5}
      border="1px solid"
      borderColor={border}
      borderRadius="lg"
      bg={bg}
      cursor="pointer"
      transition="all 0.2s"
      onClick={onClick}
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: 'md',
        borderColor: color
      }}
    >
      <Flex justify="space-between" align="start" mb={3}>
        <Flex
          w={10}
          h={10}
          align="center"
          justify="center"
          borderRadius="md"
          bg={`${color}15`} // 15% opacity
          color={color}
        >
          <Icon as={icon} boxSize={5} />
        </Flex>
        <Icon as={FiShare2} boxSize={4} color="gray.400" transform="rotate(-45deg)" />
      </Flex>
      <Text fontSize="md" fontWeight="600" mb={1}>
        {title}
      </Text>
      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
        {description}
      </Text>
    </Box>
  );
}

import { PortalTransition } from '@/components/ui/PortalTransition';
import { useState } from 'react';

// ... (imports remain the same)

export function NotionHome({ recentPages, onPageClick, userName = 'User' }: NotionHomeProps) {
  const router = useRouter();
  const [isWarping, setIsWarping] = useState(false);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);

  const handleQuickAction = (route: string) => {
    setTargetRoute(route);
    setIsWarping(true);
  };

  const handleWarpComplete = () => {
    if (targetRoute) {
      router.push(targetRoute);
      // Reset state after a delay to allow page transition to happen behind whiteout
      setTimeout(() => {
        setIsWarping(false);
        setTargetRoute(null);
      }, 500);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const learningResources = [
    {
      title: 'Learn about your first visit',
      description: 'Get started with pages and blocks',
      image: '/api/placeholder/200/120',
    },
    {
      title: 'The ultimate guide to better templates',
      description: 'Create reusable templates for your workflow',
      image: '/api/placeholder/200/120',
    },
    {
      title: 'Customize & style your content',
      description: 'Make your pages beautiful and organized',
      image: '/api/placeholder/200/120',
    },
  ];

  return (
    <Box bg={useSemanticToken('surface.elevated')} minH="100vh" px={8} py={8}>
      <PortalTransition
        isActive={isWarping}
        onComplete={handleWarpComplete}
      />

      <VStack align="stretch" spacing={10} maxW="1200px" mx="auto">
        {/* Greeting */}
        <Box>
          <Heading size="lg" fontWeight="600" color={useSemanticToken('text.primary')} mb={2}>
            {getGreeting()}, {userName}
          </Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Welcome to your AI Homelab workspace.
          </Text>
        </Box>

        {/* Quick Actions - Productivity Hub */}
        <Box>
          <HStack mb={4} spacing={2}>
            <Icon as={FiZap} boxSize={4} color={useSemanticToken('text.secondary')} />
            <Text fontSize="sm" fontWeight="600" color={useSemanticToken('text.secondary')} textTransform="uppercase" letterSpacing="wide">
              Quick Actions
            </Text>
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}>
            <QuickActionCard
              title="AI Research"
              description="Start a deep research session or chat with AI"
              icon={FiSearch}
              color="#8B5CF6" // Purple
              onClick={() => handleQuickAction('/ai-research')}
            />
            <QuickActionCard
              title="Podcast Studio"
              description="Create and manage your AI-generated podcasts"
              icon={FiRadio}
              color="#EC4899" // Pink
              onClick={() => handleQuickAction('/podcast-studio')}
            />
            <QuickActionCard
              title="Knowledge Graph"
              description="Visualize connections in your second brain"
              icon={FiCpu}
              color="#10B981" // Emerald
              onClick={() => handleQuickAction('/knowledge-graph')}
            />
          </SimpleGrid>
        </Box>

        {/* Recently Visited */}
        {recentPages.length > 0 && (
          <Box>
            <HStack mb={3} spacing={2}>
              <Icon as={FiClock} boxSize={4} color={useSemanticToken('text.secondary')} />
              <Text fontSize="sm" fontWeight="500" color={useSemanticToken('text.secondary')}>
                Recently visited
              </Text>
            </HStack>
            <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={3}>
              {recentPages.slice(0, 6).map((page) => (
                <PageCard
                  key={page.id}
                  {...page}
                  onClick={onPageClick}
                />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Learn Section */}
        <Box>
          <HStack mb={3} spacing={2}>
            <Icon as={FiBookOpen} boxSize={4} color={useSemanticToken('text.secondary')} />
            <Text fontSize="sm" fontWeight="500" color={useSemanticToken('text.secondary')}>
              Learn
            </Text>
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            {learningResources.map((resource, idx) => (
              <Box
                key={idx}
                border="1px solid"
                borderColor={useSemanticToken('border.default')}
                borderRadius="md"
                overflow="hidden"
                bg={useSemanticToken('surface.elevated')}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ borderColor: useSemanticToken('border.subtle'), boxShadow: 'sm' }}
              >
                <Box h="120px" bg={useSemanticToken('surface.base')}>
                  <Flex align="center" justify="center" h="100%">
                    <Icon as={FiBookOpen} boxSize={10} color={useSemanticToken('text.tertiary')} />
                  </Flex>
                </Box>
                <Box p={3}>
                  <Text fontSize="sm" fontWeight="500" mb={1} noOfLines={1} color={useSemanticToken('text.primary')}>
                    {resource.title}
                  </Text>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={2}>
                    {resource.description}
                  </Text>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* Featured Templates */}
        <Box>
          <HStack mb={3} spacing={2}>
            <Icon as={FiStar} boxSize={4} color={useSemanticToken('text.secondary')} />
            <Text fontSize="sm" fontWeight="500" color={useSemanticToken('text.secondary')}>
              Featured templates
            </Text>
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={3}>
            <TemplateCard
              icon={FiFile}
              title="Meeting Notes"
              description="Capture important discussions and action items"
            />
            <TemplateCard
              icon={FiTable}
              title="Project Tracker"
              description="Organize tasks and track progress"
            />
            <TemplateCard
              icon={FiBookOpen}
              title="Knowledge Base"
              description="Document processes and best practices"
            />
            <TemplateCard
              icon={FiStar}
              title="Weekly Review"
              description="Reflect on accomplishments and goals"
            />
          </SimpleGrid>
        </Box>
      </VStack>
    </Box>
  );
}
