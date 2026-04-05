/**
 * Theme Selector Component
 * 
 * Visual theme selector with preview cards
 * Can be added to right panel or settings modal
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import { FiCheck, FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '@/theme/ThemeProvider';
import { getAllThemePresets, themePresets } from '@/theme/presets';
import { ThemePreset } from '@/theme/types';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { ThemeGeneratorModal } from '../theme/ThemeGeneratorModal';
import { useDisclosure, Button, useToast } from '@chakra-ui/react';
import { FiImage } from 'react-icons/fi';

interface ThemeCardProps {
  theme: ThemePreset;
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeCard({ theme, isSelected, onSelect }: ThemeCardProps) {
  const borderColor = useSemanticToken('border.default');

  return (
    <Tooltip label={theme.description} placement="top">
      <Box
        position="relative"
        borderWidth="2px"
        borderColor={isSelected ? theme.colors.primary : borderColor}
        borderRadius="md"
        overflow="hidden"
        cursor="pointer"
        onClick={onSelect}
        transition="all 0.2s"
        _hover={{
          borderColor: theme.primary,
          transform: 'translateY(-2px)',
          shadow: 'md',
        }}
      >
        {/* Theme Preview */}
        <Box
          h="80px"
          bg={theme.background}
          position="relative"
          overflow="hidden"
        >
          {/* Background gradient */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bgGradient={`linear(135deg, ${theme.colors.background} 0%, ${theme.colors.backgroundSecondary} 100%)`}
          />

          {/* Sample elements */}
          <VStack
            position="relative"
            zIndex={1}
            spacing={1}
            align="stretch"
            p={2}
            h="full"
          >
            {/* Sample header bar */}
            <Box
              h="8px"
              borderRadius="full"
              bg={theme.primary}
              opacity={0.8}
            />

            {/* Sample content boxes */}
            <HStack spacing={1} flex={1}>
              <Box
                flex={1}
                bg={theme.colors.glassBackground}
                backdropFilter={`blur(${theme.glassBlur})`}
                border={theme.colors.glassBorder}
                borderRadius="sm"
              />
              <Box
                flex={1}
                bg={theme.colors.accent}
                opacity={0.3}
                borderRadius="sm"
              />
            </HStack>
          </VStack>

          {/* Selected indicator */}
          {isSelected && (
            <Box
              position="absolute"
              top={2}
              right={2}
              bg={theme.primary}
              color={useSemanticToken('text.inverse')}
              borderRadius="full"
              p={1}
            >
              <FiCheck size={12} />
            </Box>
          )}
        </Box>

        {/* Theme info */}
        <Box p={2} bg={useSemanticToken('surface.elevated')}>
          <HStack justify="space-between">
            <VStack align="start" spacing={0} flex={1}>
              <Text fontSize="sm" fontWeight="medium">
                {theme.name}
              </Text>
              <HStack spacing={1}>
                <Badge
                  colorScheme={theme.mode === 'dark' ? 'purple' : 'yellow'}
                  fontSize="xs"
                  variant="subtle"
                >
                  <HStack spacing={1}>
                    {theme.mode === 'dark' ? <FiMoon size={10} /> : <FiSun size={10} />}
                    <Text>{theme.mode}</Text>
                  </HStack>
                </Badge>
              </HStack>
            </VStack>
          </HStack>
        </Box>
      </Box>
    </Tooltip>
  );
}



export function ThemeSelector() {
  const { currentTheme, setTheme, themeEnabled } = useTheme();
  const allThemes = getAllThemePresets();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const handleApplyGeneratedTheme = (newTheme: ThemePreset) => {
    // Register the new theme in the global registry
    // Note: This persists only for the session
    themePresets[newTheme.id] = newTheme;
    setTheme(newTheme.id);

    toast({
      title: 'Theme Applied',
      description: `Switched to ${newTheme.name}`,
      status: 'success',
      duration: 2000,
    });
  };

  if (!themeEnabled) {
    return (
      <Box p={4} textAlign="center">
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
          Theme system is disabled. Enable via feature flags.
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={1}>
            Select Theme
          </Text>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
            Choose a theme that matches your workflow
          </Text>
        </Box>
        <Button
          size="xs"
          leftIcon={<FiImage />}
          onClick={onOpen}
          colorScheme="blue"
          variant="ghost"
        >
          Generate
        </Button>
      </HStack>

      <SimpleGrid columns={2} spacing={3}>
        {allThemes.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={currentTheme.id === theme.id}
            onSelect={() => setTheme(theme.id)}
          />
        ))}
      </SimpleGrid>

      <Box
        p={3}
        bg={useSemanticToken('surface.highlight')}
        borderRadius="md"
        fontSize="xs"
      >
        <Text fontWeight="medium" mb={1}>
          💡 Current Theme: {currentTheme.name}
        </Text>
        <Text color={useSemanticToken('text.secondary')}>
          {currentTheme.description}
        </Text>
      </Box>

      <ThemeGeneratorModal
        isOpen={isOpen}
        onClose={onClose}
        onApplyTheme={handleApplyGeneratedTheme}
      />
    </VStack>
  );
}

// Compact version for smaller spaces
export function ThemeSelectorCompact() {
  const { currentTheme, setTheme, themeEnabled } = useTheme();
  const allThemes = getAllThemePresets();

  if (!themeEnabled) {
    return null;
  }

  const handleThemeClick = (themeId: string, themeName: string) => {
    console.log('[ThemeSelectorCompact] Theme clicked:', themeName, themeId);
    setTheme(themeId);
  };

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.secondary')}>
        Theme
      </Text>

      <SimpleGrid columns={3} spacing={2}>
        {allThemes.map(theme => (
          <Tooltip key={theme.id} label={theme.name} placement="top">
            <Box
              w="full"
              h="40px"
              bg={theme.colors.background}
              borderWidth="2px"
              borderColor={currentTheme.id === theme.id ? theme.colors.primary : 'transparent'}
              borderRadius="md"
              cursor="pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleThemeClick(theme.id, theme.name);
              }}
              position="relative"
              overflow="hidden"
              transition="all 0.2s"
              _hover={{
                borderColor: theme.colors.primary,
                transform: 'scale(1.05)',
              }}
              zIndex={1}
            >
              <Box
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                h="4px"
                bg={theme.colors.primary}
              />
              {currentTheme.id === theme.id && (
                <Box
                  position="absolute"
                  top={1}
                  right={1}
                  bg={theme.colors.primary}
                  color={useSemanticToken('text.inverse')}
                  borderRadius="full"
                  p="2px"
                >
                  <FiCheck size={8} />
                </Box>
              )}
            </Box>
          </Tooltip>
        ))}
      </SimpleGrid>
    </VStack>
  );
}
