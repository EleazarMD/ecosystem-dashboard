/**
 * Quick Access Widget
 * Provides quick access to frequently used portal integrations
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Button,
  SimpleGrid,
  Badge,
} from '@chakra-ui/react';
import {
  FiMessageCircle,
  FiMail,
  FiFileText,
  FiMic,
  FiImage,
  FiCode,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';

interface QuickAccessItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  color: string;
  badge?: string;
}

const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    id: 'chat',
    label: 'AI Chat',
    icon: FiMessageCircle,
    href: '/openclaw',
    color: 'blue',
  },
  {
    id: 'voice',
    label: 'Voice Agent',
    icon: FiMic,
    href: '/voice-agent',
    color: 'purple',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: FiFileText,
    href: '/workspace',
    color: 'green',
  },
  {
    id: 'email',
    label: 'Email',
    icon: FiMail,
    href: '/email',
    color: 'orange',
  },
  {
    id: 'image',
    label: 'Image Studio',
    icon: FiImage,
    href: '/image-studio',
    color: 'pink',
  },
  {
    id: 'code',
    label: 'Code Assistant',
    icon: FiCode,
    href: '/code-assistant',
    color: 'cyan',
  },
];

export default function QuickAccessWidget() {
  const textSecondary = useSemanticToken('text.secondary');
  const bgHover = useSemanticToken('surface.hover');

  return (
    <GlassPanel variant="light" p={6}>
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">Quick Access</Text>

        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
          {QUICK_ACCESS_ITEMS.map((item) => (
            <Button
              key={item.id}
              as={NextLink}
              href={item.href}
              variant="outline"
              size="md"
              h="auto"
              py={4}
              _hover={{ bg: bgHover }}
            >
              <VStack spacing={2}>
                <Icon as={item.icon} boxSize={6} color={`${item.color}.500`} />
                <Text fontSize="sm" fontWeight="medium">{item.label}</Text>
                {item.badge && (
                  <Badge colorScheme={item.color} fontSize="xs">
                    {item.badge}
                  </Badge>
                )}
              </VStack>
            </Button>
          ))}
        </SimpleGrid>
      </VStack>
    </GlassPanel>
  );
}
