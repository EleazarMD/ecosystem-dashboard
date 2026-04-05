/**
 * Enhanced Writing Canvas
 * 
 * Student-focused writing interface with:
 * - Maximum screen real estate for writing
 * - Collapsible tools sidebar
 * - Focus mode for distraction-free writing
 * - Quick-access toolbar
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  IconButton,
  Button,
  Text,
  Tooltip,
  Collapse,
  Divider,
  useColorModeValue,
  Flex,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Portal,
} from '@chakra-ui/react';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckIcon,
  StarIcon,
  ChatIcon,
  SettingsIcon,
} from '@chakra-ui/icons';
import { 
  MdSpellcheck, 
  MdLightbulbOutline, 
  MdFullscreen, 
  MdFullscreenExit,
  MdFormatBold,
  MdFormatItalic,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdCode,
  MdImage,
} from 'react-icons/md';

interface EnhancedWritingCanvasProps {
  children: React.ReactNode;
  onSpellCheck?: () => void;
  onGetIdeas?: () => void;
  onImproveWriting?: () => void;
  onCheckCounting?: () => void;
  onAIHelper?: () => void;
  showWordCount?: boolean;
  wordCount?: number;
  characterCount?: number;
}

export const EnhancedWritingCanvas: React.FC<EnhancedWritingCanvasProps> = ({
  children,
  onSpellCheck,
  onGetIdeas,
  onImproveWriting,
  onCheckCounting,
  onAIHelper,
  showWordCount = true,
  wordCount = 0,
  characterCount = 0,
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const toolsBg = useColorModeValue('gray.50', 'gray.900');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');

  return (
    <Flex h="100%" w="100%" position="relative">
      {/* Main Writing Area - Full Width */}
      <Box
        flex="1"
        display="flex"
        flexDirection="column"
        h="100%"
        bg={bgColor}
        position="relative"
        transition="all 0.3s ease"
      >
        {/* Top Toolbar - Minimal and Clean */}
        {!isFocusMode && (
          <HStack
            px={6}
            py={3}
            borderBottom="1px"
            borderColor={borderColor}
            justify="space-between"
            bg={bgColor}
            position="sticky"
            top={0}
            zIndex={10}
          >
            {/* Left: Quick Format Tools */}
            <HStack spacing={1}>
              <Tooltip label="Bold (⌘B)">
                <IconButton
                  aria-label="Bold"
                  icon={<Box as={MdFormatBold} />}
                  size="sm"
                  variant="ghost"
                />
              </Tooltip>
              <Tooltip label="Italic (⌘I)">
                <IconButton
                  aria-label="Italic"
                  icon={<Box as={MdFormatItalic} />}
                  size="sm"
                  variant="ghost"
                />
              </Tooltip>
              <Divider orientation="vertical" h="20px" mx={1} />
              <Tooltip label="Bullet List">
                <IconButton
                  aria-label="Bullet List"
                  icon={<Box as={MdFormatListBulleted} />}
                  size="sm"
                  variant="ghost"
                />
              </Tooltip>
              <Tooltip label="Numbered List">
                <IconButton
                  aria-label="Numbered List"
                  icon={<Box as={MdFormatListNumbered} />}
                  size="sm"
                  variant="ghost"
                />
              </Tooltip>
              <Divider orientation="vertical" h="20px" mx={1} />
              <Tooltip label="Code Block">
                <IconButton
                  aria-label="Code"
                  icon={<Box as={MdCode} />}
                  size="sm"
                  variant="ghost"
                />
              </Tooltip>
              <Tooltip label="Add Image">
                <IconButton
                  aria-label="Image"
                  icon={<Box as={MdImage} />}
                  size="sm"
                  variant="ghost"
                />
              </Tooltip>
            </HStack>

            {/* Right: Stats and Tools */}
            <HStack spacing={3}>
              {showWordCount && (
                <HStack spacing={4} fontSize="sm" color="gray.600">
                  <Text>{wordCount} words</Text>
                  <Text>{characterCount} characters</Text>
                </HStack>
              )}
              
              <Tooltip label={isFocusMode ? "Exit Focus Mode" : "Focus Mode"}>
                <IconButton
                  aria-label="Focus Mode"
                  icon={<Box as={isFocusMode ? MdFullscreenExit : MdFullscreen} />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsFocusMode(!isFocusMode)}
                />
              </Tooltip>

              <Tooltip label="Writing Tools">
                <IconButton
                  aria-label="Toggle Tools"
                  icon={isToolsOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                  size="sm"
                  colorScheme={isToolsOpen ? "blue" : "gray"}
                  variant={isToolsOpen ? "solid" : "ghost"}
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                />
              </Tooltip>
            </HStack>
          </HStack>
        )}

        {/* Writing Canvas - Maximum Space */}
        <Box
          flex="1"
          overflowY="auto"
          overflowX="hidden"
          px={{ base: 4, md: isFocusMode ? 12 : 8, lg: isFocusMode ? 20 : 12 }}
          py={isFocusMode ? 12 : 6}
          maxW={isFocusMode ? "900px" : "100%"}
          mx="auto"
          w="100%"
        >
          {children}
        </Box>

        {/* Focus Mode Exit Button */}
        {isFocusMode && (
          <IconButton
            aria-label="Exit Focus Mode"
            icon={<Box as={MdFullscreenExit} />}
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

      {/* Collapsible Writing Tools Sidebar */}
      <Collapse in={isToolsOpen && !isFocusMode} animateOpacity>
        <Box
          w="320px"
          h="100%"
          bg={toolsBg}
          borderLeft="1px"
          borderColor={borderColor}
          overflowY="auto"
          flexShrink={0}
        >
          <VStack align="stretch" spacing={0} p={4}>
            {/* Header */}
            <HStack justify="space-between" mb={4}>
              <Text fontWeight="bold" fontSize="lg">Writing Tools</Text>
              <IconButton
                aria-label="Close tools"
                icon={<ChevronRightIcon />}
                size="sm"
                variant="ghost"
                onClick={() => setIsToolsOpen(false)}
              />
            </HStack>

            {/* AI Writing Assistant */}
            <VStack align="stretch" spacing={2} mb={6}>
              <Text fontSize="sm" fontWeight="600" color="gray.600" mb={2}>
                AI Assistant
              </Text>
              
              <Button
                leftIcon={<Box as={MdSpellcheck} />}
                size="md"
                variant="outline"
                justifyContent="flex-start"
                onClick={onSpellCheck}
                _hover={{ bg: hoverBg }}
              >
                Check Spelling
              </Button>

              <Button
                leftIcon={<Box as={MdLightbulbOutline} />}
                size="md"
                variant="outline"
                justifyContent="flex-start"
                onClick={onGetIdeas}
                _hover={{ bg: hoverBg }}
              >
                Get Ideas
                <Badge ml="auto" colorScheme="purple" fontSize="2xs">AI</Badge>
              </Button>

              <Button
                leftIcon={<StarIcon />}
                size="md"
                variant="outline"
                justifyContent="flex-start"
                onClick={onImproveWriting}
                _hover={{ bg: hoverBg }}
              >
                Improve Writing
                <Badge ml="auto" colorScheme="purple" fontSize="2xs">AI</Badge>
              </Button>

              <Button
                leftIcon={<CheckIcon />}
                size="md"
                variant="outline"
                justifyContent="flex-start"
                onClick={onCheckCounting}
                _hover={{ bg: hoverBg }}
              >
                Check Counting
              </Button>

              <Button
                leftIcon={<ChatIcon />}
                size="md"
                variant="solid"
                colorScheme="blue"
                justifyContent="flex-start"
                onClick={onAIHelper}
              >
                AI Helper
              </Button>
            </VStack>

            <Divider my={4} />

            {/* Writing Tips */}
            <VStack align="stretch" spacing={2}>
              <Text fontSize="sm" fontWeight="600" color="gray.600" mb={2}>
                Quick Tips
              </Text>
              
              <Box
                p={3}
                bg={bgColor}
                borderRadius="md"
                borderLeft="3px solid"
                borderColor="blue.400"
              >
                <Text fontSize="sm" fontWeight="600" mb={1}>
                  💡 Start with your main idea
                </Text>
                <Text fontSize="xs" color="gray.600">
                  Write down the most important thing you want to say first.
                </Text>
              </Box>

              <Box
                p={3}
                bg={bgColor}
                borderRadius="md"
                borderLeft="3px solid"
                borderColor="green.400"
              >
                <Text fontSize="sm" fontWeight="600" mb={1}>
                  ✍️ Don't worry about perfection
                </Text>
                <Text fontSize="xs" color="gray.600">
                  Get your ideas down first, then edit and improve later.
                </Text>
              </Box>

              <Box
                p={3}
                bg={bgColor}
                borderRadius="md"
                borderLeft="3px solid"
                borderColor="purple.400"
              >
                <Text fontSize="sm" fontWeight="600" mb={1}>
                  📝 Use the AI Helper
                </Text>
                <Text fontSize="xs" color="gray.600">
                  Ask questions or get suggestions to improve your writing.
                </Text>
              </Box>
            </VStack>
          </VStack>
        </Box>
      </Collapse>
    </Flex>
  );
};

export default EnhancedWritingCanvas;
