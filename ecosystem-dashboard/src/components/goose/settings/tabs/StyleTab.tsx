/**
 * Style Tab Component
 * 
 * Configure agent communication style (tone, verbosity, emojis, greeting)
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  VStack, HStack, FormControl, FormLabel, Select, Textarea,
  Text, Switch, Box,
} from '@chakra-ui/react';

interface StyleTabProps {
  value: {
    tone: string;
    verbosity: string;
    useEmojis: boolean;
    greetingMessage: string;
  };
  onChange: (value: any) => void;
}

export default function StyleTab({ value, onChange }: StyleTabProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const codeBg = useSemanticToken('surface.base');
  const previewBg = 'blue.50';
  const borderColor = useSemanticToken('border.default');

  return (
    <VStack spacing={6} align="stretch" p={6}>
      {/* Tone */}
      <FormControl>
        <FormLabel>Tone</FormLabel>
        <Select
          value={value.tone}
          onChange={(e) => onChange({ ...value, tone: e.target.value })}
          size="lg"
        >
          <option value="professional">💼 Professional</option>
          <option value="friendly">😊 Friendly</option>
          <option value="casual">👋 Casual</option>
          <option value="technical">🔧 Technical</option>
        </Select>
        <Text fontSize="xs" color={mutedColor} mt={1}>
          Overall communication tone
        </Text>
      </FormControl>

      {/* Verbosity */}
      <FormControl>
        <FormLabel>Verbosity</FormLabel>
        <Select
          value={value.verbosity}
          onChange={(e) => onChange({ ...value, verbosity: e.target.value })}
          size="lg"
        >
          <option value="concise">✂️ Concise</option>
          <option value="balanced">⚖️ Balanced</option>
          <option value="detailed">📚 Detailed</option>
        </Select>
        <Text fontSize="xs" color={mutedColor} mt={1}>
          Response length preference
        </Text>
      </FormControl>

      {/* Use Emojis */}
      <FormControl>
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontWeight="medium">Use Emojis</Text>
            <Text fontSize="xs" color={mutedColor}>
              Include emojis in responses
            </Text>
          </VStack>
          <Switch
            size="lg"
            colorScheme="blue"
            isChecked={value.useEmojis}
            onChange={(e) => onChange({ ...value, useEmojis: e.target.checked })}
          />
        </HStack>
      </FormControl>

      {/* Greeting Message */}
      <FormControl>
        <FormLabel>Greeting Message</FormLabel>
        <Textarea
          value={value.greetingMessage}
          onChange={(e) => onChange({ ...value, greetingMessage: e.target.value })}
          rows={3}
          placeholder="👋 Hi! I'm Homelab Assistant. How can I help with your AI Homelab today?"
        />
        <Text fontSize="xs" color={mutedColor} mt={1}>
          First message shown to users
        </Text>
      </FormControl>

      {/* Preview */}
      <Box
        p={4}
        bg={previewBg}
        borderRadius="md"
        borderWidth="1px"
        borderColor={borderColor}
      >
        <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={2}>
          Preview
        </Text>
        <Box
          p={3}
          bg={codeBg}
          borderRadius="md"
          borderLeftWidth="3px"
          borderLeftColor="blue.500"
        >
          <Text fontSize="sm" color={textColor}>
            {value.greetingMessage || '(No greeting message set)'}
          </Text>
        </Box>
      </Box>

      {/* Style Guide */}
      <Box
        p={4}
        bg={codeBg}
        borderRadius="md"
        borderWidth="1px"
        borderColor={borderColor}
      >
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          💡 Style Tips
        </Text>
        <VStack align="start" spacing={1} fontSize="xs" color={mutedColor}>
          <Text>• Professional tone works best for technical tasks</Text>
          <Text>• Friendly tone is great for general assistance</Text>
          <Text>• Concise responses are faster to read</Text>
          <Text>• Detailed responses provide more context</Text>
          <Text>• Emojis can make interactions more engaging</Text>
        </VStack>
      </Box>
    </VStack>
  );
}
