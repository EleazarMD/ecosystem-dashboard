/**
 * Highlight-to-Define Component
 * 
 * Allows children to select/highlight any word in chat messages
 * and get an instant age-appropriate definition.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Button,
  Text,
  VStack,
  HStack,
  Spinner,
  IconButton,
  useToast,
  Portal,
} from '@chakra-ui/react';
import { FiBook, FiVolume2, FiHeart, FiX } from 'react-icons/fi';

interface DictionaryEntry {
  word: string;
  definition: string;
  pronunciation?: string;
  partOfSpeech: string;
  examples: string[];
  synonyms: string[];
  spanishTranslation?: string;
  funFact?: string;
}

interface HighlightToDefineProps {
  children: React.ReactNode;
  onDefine?: (word: string, entry: DictionaryEntry) => void;
}

export const HighlightToDefine: React.FC<HighlightToDefineProps> = ({
  children,
  onDefine,
}) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    
    // Only trigger for single words (no spaces, reasonable length)
    if (text && text.length > 1 && text.length < 30 && !/\s/.test(text) && /^[a-zA-Z]+$/.test(text)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectedWord(text.toLowerCase());
      setPopoverPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
      setIsOpen(true);
      setEntry(null);
    }
  }, []);

  const handleDefine = async () => {
    if (!selectedWord) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/child/dictionary?word=${encodeURIComponent(selectedWord)}&source=highlight`);
      if (res.ok) {
        const data = await res.json();
        setEntry(data.entry);
        if (onDefine) {
          onDefine(selectedWord, data.entry);
        }
      } else {
        toast({
          title: "Couldn't find that word",
          description: "Try selecting a different word!",
          status: 'info',
          duration: 3000,
        });
        setIsOpen(false);
      }
    } catch (error) {
      console.error('[HighlightToDefine] Error:', error);
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

  const handleSpeak = () => {
    if (!entry) return;
    const utterance = new SpeechSynthesisUtterance(entry.word);
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveWord = async () => {
    if (!entry) return;
    try {
      await fetch('/api/child/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'favorite',
          word: entry.word,
          definition: entry.definition,
        }),
      });
      toast({
        title: '⭐ Word saved!',
        description: `"${entry.word}" added to your word bank!`,
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('[HighlightToDefine] Save error:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedWord(null);
    setEntry(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <Box ref={containerRef} onMouseUp={handleMouseUp} position="relative">
      {children}
      
      {isOpen && (
        <Portal>
          <Box
            position="fixed"
            left={`${popoverPosition.x}px`}
            top={`${popoverPosition.y}px`}
            transform="translate(-50%, -100%)"
            zIndex={1500}
            bg="white"
            borderRadius="xl"
            boxShadow="xl"
            border="2px solid"
            borderColor="purple.300"
            maxW="320px"
            minW="200px"
          >
            {/* Close button */}
            <IconButton
              icon={<FiX />}
              aria-label="Close"
              size="xs"
              position="absolute"
              top={1}
              right={1}
              variant="ghost"
              onClick={handleClose}
            />
            
            {!entry ? (
              // Initial state - show define button
              <VStack p={3} spacing={2}>
                <Text fontSize="sm" fontWeight="bold" color="purple.600">
                  📖 "{selectedWord}"
                </Text>
                <Button
                  size="sm"
                  colorScheme="purple"
                  leftIcon={<FiBook />}
                  onClick={handleDefine}
                  isLoading={loading}
                  loadingText="Looking up..."
                >
                  Define this word
                </Button>
              </VStack>
            ) : (
              // Definition view
              <VStack p={3} spacing={2} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="md" fontWeight="bold" color="purple.700">
                    📖 {entry.word}
                  </Text>
                  <HStack spacing={1}>
                    <IconButton
                      icon={<FiVolume2 />}
                      aria-label="Pronounce"
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={handleSpeak}
                    />
                    <IconButton
                      icon={<FiHeart />}
                      aria-label="Save word"
                      size="xs"
                      variant="ghost"
                      colorScheme="pink"
                      onClick={handleSaveWord}
                    />
                  </HStack>
                </HStack>
                
                {entry.pronunciation && (
                  <Text fontSize="xs" color="gray.500" fontStyle="italic">
                    {entry.pronunciation}
                  </Text>
                )}
                
                <Text fontSize="xs" color="gray.600">
                  ({entry.partOfSpeech})
                </Text>
                
                <Text fontSize="sm" lineHeight="short">
                  {entry.definition}
                </Text>
                
                {entry.examples && entry.examples.length > 0 && (
                  <Box bg="purple.50" p={2} borderRadius="md">
                    <Text fontSize="xs" fontWeight="bold" color="purple.600" mb={1}>
                      Example:
                    </Text>
                    <Text fontSize="xs" fontStyle="italic">
                      "{entry.examples[0]}"
                    </Text>
                  </Box>
                )}
                
                {entry.spanishTranslation && (
                  <HStack fontSize="xs" color="orange.600">
                    <Text>🇲🇽</Text>
                    <Text fontWeight="medium">{entry.spanishTranslation}</Text>
                  </HStack>
                )}
                
                {entry.synonyms && entry.synonyms.length > 0 && (
                  <Text fontSize="xs" color="gray.500">
                    Similar: {entry.synonyms.slice(0, 2).join(', ')}
                  </Text>
                )}
              </VStack>
            )}
            
            {/* Arrow pointing down */}
            <Box
              position="absolute"
              bottom="-8px"
              left="50%"
              transform="translateX(-50%)"
              width={0}
              height={0}
              borderLeft="8px solid transparent"
              borderRight="8px solid transparent"
              borderTop="8px solid"
              borderTopColor="purple.300"
            />
          </Box>
        </Portal>
      )}
    </Box>
  );
};

export default HighlightToDefine;
