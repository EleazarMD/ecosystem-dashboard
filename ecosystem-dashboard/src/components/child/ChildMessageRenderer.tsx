/**
 * Child Message Renderer
 * 
 * Renders AI chat messages with child-friendly formatting:
 * - Large, readable fonts
 * - Colorful headers and sections
 * - Emoji support
 * - Interactive elements
 * - Story-like formatting
 */

import React, { useState } from 'react';
import {
  Box,
  Text,
  Heading,
  VStack,
  HStack,
  Divider,
  List,
  ListItem,
  ListIcon,
  Badge,
  useColorModeValue,
  Button,
} from '@chakra-ui/react';
import { FiStar, FiHeart, FiZap, FiBook, FiAward } from 'react-icons/fi';
import StoryBookletV2 from './StoryBookletV2';

interface ChildMessageRendererProps {
  content: string;
  theme?: string;
  fontSize?: string;
  characterName?: string;
  characterEmoji?: string;
  characterColor?: string;
  // Story continuation support
  messageId?: string;
  onContinueStory?: () => Promise<string | null>;
  isLoadingContinuation?: boolean;
  onUpdateContent?: (newContent: string) => void;
}

// Detect if content is primarily a story (long narrative text)
export const isStoryContent = (content: string): boolean => {
  // Story indicators:
  // 1. Long content (more than 300 characters)
  // 2. Contains narrative phrases like "Once upon", "One day", story-like language
  // 3. Has multiple sentences without list markers or headers
  
  const storyPhrases = [
    'once upon',
    'one day',
    'long ago',
    'in a land',
    'there was',
    'there lived',
    'adventure',
    'journey',
    'story',
    'tale',
    'magical',
    'suddenly',
    'meanwhile',
    'happily ever',
    'the end',
    'to be continued',
  ];
  
  const lowerContent = content.toLowerCase();
  const hasStoryPhrase = storyPhrases.some(phrase => lowerContent.includes(phrase));
  const isLongEnough = content.length > 300;
  const hasMultipleSentences = (content.match(/[.!?]/g) || []).length >= 3;
  const hasNoListMarkers = !/^[-*•]\s|^\d+[.)]\s/m.test(content);
  const hasNoHeaders = !/^#{1,3}\s/m.test(content);
  
  // It's a story if it has story phrases and is long enough, or if it's very long narrative
  return (hasStoryPhrase && isLongEnough) || 
         (isLongEnough && hasMultipleSentences && hasNoListMarkers && hasNoHeaders && content.length > 500);
};

// Fun bullet icons based on content type
const getBulletIcon = (index: number) => {
  const icons = [FiStar, FiHeart, FiZap, FiBook, FiAward];
  return icons[index % icons.length];
};

// Split long text into paragraphs for better readability
const splitIntoParagraphs = (text: string, maxSentences: number = 3): string[] => {
  // Split by sentence endings
  const sentences = text.split(/(?<=[.!?])\s+/);
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  
  for (const sentence of sentences) {
    currentParagraph.push(sentence);
    if (currentParagraph.length >= maxSentences) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [];
    }
  }
  
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '));
  }
  
  return paragraphs;
};

// Parse markdown-like content into styled sections
const parseContent = (content: string) => {
  const sections: Array<{
    type: 'paragraph' | 'header' | 'list' | 'quote' | 'action' | 'emoji-header' | 'story-paragraph';
    content: string;
    items?: string[];
    level?: number;
  }> = [];

  const lines = content.split('\n');
  let currentList: string[] = [];
  let inList = false;
  let storyBuffer = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (inList && currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: [...currentList] });
        currentList = [];
        inList = false;
      }
      // If we have story content buffered, flush it
      if (storyBuffer) {
        const paragraphs = splitIntoParagraphs(storyBuffer, 3);
        paragraphs.forEach(p => sections.push({ type: 'story-paragraph', content: p }));
        storyBuffer = '';
      }
      continue;
    }

    // Headers with emoji (e.g., "🌟 Title" or "## Title")
    if (/^#{1,3}\s/.test(line)) {
      if (inList && currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: [...currentList] });
        currentList = [];
        inList = false;
      }
      const level = (line.match(/^#+/) || [''])[0].length;
      const text = line.replace(/^#+\s*/, '');
      sections.push({ type: 'header', content: text, level });
      continue;
    }

    // Emoji headers (line starting with emoji followed by text)
    // Check for common emoji patterns at start of line
    const emojiPattern = /^(?:[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])/;
    if (emojiPattern.test(line) && line.length < 100) {
      if (inList && currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: [...currentList] });
        currentList = [];
        inList = false;
      }
      sections.push({ type: 'emoji-header', content: line });
      continue;
    }

    // List items (- or * or numbered)
    if (/^[-*•]\s/.test(line) || /^\d+[.)]\s/.test(line)) {
      inList = true;
      const text = line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '');
      currentList.push(text);
      continue;
    }

    // Quotes (> text)
    if (/^>\s/.test(line)) {
      if (inList && currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: [...currentList] });
        currentList = [];
        inList = false;
      }
      sections.push({ type: 'quote', content: line.replace(/^>\s*/, '') });
      continue;
    }

    // Action prompts (text ending with ? or containing "choose" "pick" "select")
    if (/\?$/.test(line) || /choose|pick|select|would you like/i.test(line)) {
      if (inList && currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: [...currentList] });
        currentList = [];
        inList = false;
      }
      sections.push({ type: 'action', content: line });
      continue;
    }

    // Regular paragraph - accumulate into story buffer for long content
    if (inList && currentList.length > 0) {
      sections.push({ type: 'list', content: '', items: [...currentList] });
      currentList = [];
      inList = false;
    }
    
    // Accumulate text into story buffer
    storyBuffer += (storyBuffer ? ' ' : '') + line;
  }

  // Flush any remaining story buffer
  if (storyBuffer) {
    // If it's a long story (more than 200 chars), split into paragraphs
    if (storyBuffer.length > 200) {
      const paragraphs = splitIntoParagraphs(storyBuffer, 3);
      paragraphs.forEach(p => sections.push({ type: 'story-paragraph', content: p }));
    } else {
      sections.push({ type: 'paragraph', content: storyBuffer });
    }
  }

  // Don't forget remaining list items
  if (currentList.length > 0) {
    sections.push({ type: 'list', content: '', items: currentList });
  }

  return sections;
};

// Format text with inline styles (bold, italic, emoji emphasis)
const formatInlineText = (text: string, baseSize: string) => {
  // Split by bold markers **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text as="span" key={i} fontWeight="bold" color="purple.600">
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

export const ChildMessageRenderer: React.FC<ChildMessageRendererProps> = ({
  content,
  theme = 'default',
  fontSize = 'md',
  characterName = 'Storyteller',
  characterEmoji = '📖',
  characterColor,
  messageId,
  onContinueStory,
  isLoadingContinuation = false,
  onUpdateContent,
}) => {
  const [showAsBooklet, setShowAsBooklet] = useState(() => isStoryContent(content));
  const sections = parseContent(content);
  
  // Determine color based on theme
  const themeColor = characterColor || (
    theme === 'pusheen' ? 'pink' : 
    theme === 'minecraft' ? 'green' : 
    theme === 'space' ? 'purple' : 'blue'
  );
  
  // If content is detected as a story and showAsBooklet is true, render as booklet
  if (showAsBooklet && isStoryContent(content)) {
    return (
      <VStack spacing={3} w="100%">
        <StoryBookletV2
          content={content}
          characterName={characterName}
          characterEmoji={characterEmoji}
          characterColor={themeColor}
          messageId={messageId}
          onContinueStory={onContinueStory}
          isLoadingContinuation={isLoadingContinuation}
          enableImages={true}
        />
        <Button
          size="xs"
          variant="ghost"
          colorScheme="gray"
          onClick={() => setShowAsBooklet(false)}
          fontSize="xs"
        >
          📜 View as text
        </Button>
      </VStack>
    );
  }
  
  // Theme-based colors
  const headerColor = useColorModeValue(
    theme === 'pusheen' ? 'pink.600' : 
    theme === 'minecraft' ? 'green.600' : 
    theme === 'space' ? 'purple.600' : 'blue.600',
    'white'
  );
  
  const accentBg = useColorModeValue(
    theme === 'pusheen' ? 'pink.50' : 
    theme === 'minecraft' ? 'green.50' : 
    theme === 'space' ? 'purple.50' : 'blue.50',
    'gray.700'
  );

  const quoteBg = useColorModeValue('yellow.50', 'yellow.900');
  const quoteBorder = useColorModeValue('yellow.400', 'yellow.600');
  
  const actionBg = useColorModeValue(
    theme === 'pusheen' ? 'pink.100' : 
    theme === 'minecraft' ? 'green.100' : 
    theme === 'space' ? 'purple.100' : 'blue.100',
    'gray.600'
  );

  // Font sizes based on prop
  const sizes = {
    sm: { base: 'sm', header: 'md', subheader: 'sm' },
    md: { base: 'md', header: 'lg', subheader: 'md' },
    lg: { base: 'lg', header: 'xl', subheader: 'lg' },
  };
  const sizeConfig = sizes[fontSize as keyof typeof sizes] || sizes.md;

  return (
    <VStack align="stretch" spacing={3} w="100%">
      {sections.map((section, index) => {
        switch (section.type) {
          case 'header':
            return (
              <Heading
                key={index}
                as={section.level === 1 ? 'h3' : section.level === 2 ? 'h4' : 'h5'}
                size={section.level === 1 ? sizeConfig.header : sizeConfig.subheader}
                color={headerColor}
                fontFamily="'Comic Neue', 'Nunito', sans-serif"
                mt={index > 0 ? 2 : 0}
              >
                {section.content}
              </Heading>
            );

          case 'emoji-header':
            // Extract emoji using surrogate pair pattern
            const emojiMatch = section.content.match(/^(?:[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])/);
            const emoji = emojiMatch ? emojiMatch[0] : '';
            const headerText = section.content.replace(/^(?:[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])/, '').trim();
            return (
              <HStack key={index} spacing={2} mt={index > 0 ? 2 : 0}>
                <Text fontSize="xl">{emoji}</Text>
                <Text
                  fontWeight="bold"
                  fontSize={sizeConfig.header}
                  color={headerColor}
                  fontFamily="'Comic Neue', 'Nunito', sans-serif"
                >
                  {headerText}
                </Text>
              </HStack>
            );

          case 'list':
            return (
              <Box key={index} pl={2}>
                <List spacing={2}>
                  {section.items?.map((item, itemIndex) => (
                    <ListItem key={itemIndex} display="flex" alignItems="flex-start">
                      <ListIcon
                        as={getBulletIcon(itemIndex)}
                        color={headerColor}
                        mt={1}
                      />
                      <Text fontSize={sizeConfig.base} lineHeight="tall">
                        {formatInlineText(item, sizeConfig.base)}
                      </Text>
                    </ListItem>
                  ))}
                </List>
              </Box>
            );

          case 'quote':
            return (
              <Box
                key={index}
                bg={quoteBg}
                borderLeft="4px solid"
                borderColor={quoteBorder}
                px={4}
                py={3}
                borderRadius="md"
                fontStyle="italic"
              >
                <Text fontSize={sizeConfig.base} lineHeight="tall">
                  "{section.content}"
                </Text>
              </Box>
            );

          case 'action':
            return (
              <Box
                key={index}
                bg={actionBg}
                px={4}
                py={3}
                borderRadius="xl"
                border="2px dashed"
                borderColor={headerColor}
              >
                <HStack spacing={2}>
                  <Text fontSize="lg">🤔</Text>
                  <Text fontSize={sizeConfig.base} fontWeight="medium" color={headerColor}>
                    {section.content}
                  </Text>
                </HStack>
              </Box>
            );

          case 'story-paragraph':
            return (
              <Text
                key={index}
                fontSize={sizeConfig.base}
                lineHeight="1.8"
                fontFamily="'Georgia', 'Nunito', serif"
                textIndent="1.5em"
                mb={2}
              >
                {formatInlineText(section.content, sizeConfig.base)}
              </Text>
            );

          case 'paragraph':
          default:
            return (
              <Text
                key={index}
                fontSize={sizeConfig.base}
                lineHeight="tall"
                fontFamily="'Nunito', 'Segoe UI', sans-serif"
              >
                {formatInlineText(section.content, sizeConfig.base)}
              </Text>
            );
        }
      })}
      
      {/* Show button to switch to booklet view if content is a story */}
      {isStoryContent(content) && !showAsBooklet && (
        <Button
          size="xs"
          variant="ghost"
          colorScheme={themeColor}
          onClick={() => setShowAsBooklet(true)}
          fontSize="xs"
          leftIcon={<FiBook />}
        >
          📖 View as storybook
        </Button>
      )}
    </VStack>
  );
};

export default ChildMessageRenderer;
