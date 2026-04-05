/**
 * API Key Configuration Fields Component
 * Provider, key, limits, and settings fields
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  FormControl,
  FormLabel,
  Input,
  Select,
  Text,
  NumberInput,
  NumberInputField,
  Switch,
  HStack,
} from '@chakra-ui/react';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'unsplash', label: 'Unsplash' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
];

interface APIKeyConfigFieldsProps {
  provider: string;
  apiKey: string;
  displayName: string;
  rateLimitPerMinute: number;
  costLimitDaily: number;
  isPrimary: boolean;
  onProviderChange: (provider: string) => void;
  onApiKeyChange: (key: string) => void;
  onDisplayNameChange: (name: string) => void;
  onRateLimitChange: (limit: number) => void;
  onCostLimitChange: (limit: number) => void;
  onPrimaryChange: (isPrimary: boolean) => void;
}

export function APIKeyConfigFields({
  provider,
  apiKey,
  displayName,
  rateLimitPerMinute,
  costLimitDaily,
  isPrimary,
  onProviderChange,
  onApiKeyChange,
  onDisplayNameChange,
  onRateLimitChange,
  onCostLimitChange,
  onPrimaryChange,
}: APIKeyConfigFieldsProps) {
  return (
    <>
      <FormControl isRequired>
        <FormLabel>Provider</FormLabel>
        <Select value={provider} onChange={(e) => onProviderChange(e.target.value)}>
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl isRequired>
        <FormLabel>API Key</FormLabel>
        <Input
          type="password"
          placeholder="Enter API key"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          fontFamily="mono"
        />
        <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
          The key will be encrypted and stored securely
        </Text>
      </FormControl>

      <FormControl>
        <FormLabel>Display Name (Optional)</FormLabel>
        <Input
          placeholder="e.g., Production Key"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Rate Limit (requests/minute)</FormLabel>
        <NumberInput
          value={rateLimitPerMinute}
          onChange={(_, val) => onRateLimitChange(val)}
          min={1}
          max={1000}
        >
          <NumberInputField />
        </NumberInput>
      </FormControl>

      <FormControl>
        <FormLabel>Daily Cost Limit ($)</FormLabel>
        <NumberInput
          value={costLimitDaily}
          onChange={(_, val) => onCostLimitChange(val)}
          min={0}
          precision={2}
        >
          <NumberInputField />
        </NumberInput>
      </FormControl>

      <FormControl>
        <HStack justify="space-between" width="full">
          <FormLabel mb={0}>Set as Primary Key</FormLabel>
          <Switch isChecked={isPrimary} onChange={(e) => onPrimaryChange(e.target.checked)} />
        </HStack>
        <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
          Primary keys are used by default for this service
        </Text>
      </FormControl>
    </>
  );
}
