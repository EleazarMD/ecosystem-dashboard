import React from 'react';
import {
  VStack,
  HStack,
  Text,
  RadioGroup,
  Radio,
  Box,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { FiZap, FiCheck, FiSettings, FiMessageSquare } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export type AgencyMode = 'autonomous' | 'manual' | 'smart' | 'chat';

interface AgencyModeSelectorProps {
  value: AgencyMode;
  onChange: (mode: AgencyMode) => void;
  disabled?: boolean;
}

interface ModeConfig {
  key: AgencyMode;
  label: string;
  description: string;
  icon: any;
  color: string;
}

const agencyModes: ModeConfig[] = [
  {
    key: 'autonomous',
    label: 'Autonomous',
    description: 'Full file modification capabilities, edit, create, and delete files freely.',
    icon: FiZap,
    color: 'green',
  },
  {
    key: 'manual',
    label: 'Manual',
    description: 'All tools, extensions and file modifications will require human approval',
    icon: FiCheck,
    color: 'blue',
  },
  {
    key: 'smart',
    label: 'Smart',
    description: 'Intelligently determine which actions need approval based on risk level',
    icon: FiSettings,
    color: 'purple',
  },
  {
    key: 'chat',
    label: 'Chat only',
    description: 'Engage with the selected provider without using tools or extensions.',
    icon: FiMessageSquare,
    color: 'gray',
  },
];

/**
 * Agency Mode Selector Component
 * Allows users to select Goose's level of autonomy
 * Matches the design from Goose Desktop UI
 */
export const AgencyModeSelector: React.FC<AgencyModeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  // Debug logging
  React.useEffect(() => {
    console.log('[AgencyModeSelector] Current value:', value);
  }, [value]);
  
  const bgDefault = useSemanticToken('surface.elevated');
  const bgMuted = useSemanticToken('surface.hover');
  const bgSelected = useSemanticToken('interactive.surface');
  const borderColor = useSemanticToken('border.default');
  const textMuted = useSemanticToken('text.secondary');

  // Log the comparison for debugging
  console.log('[AgencyModeSelector] Rendering with value:', value, 'type:', typeof value);
  
  return (
    <RadioGroup 
      value={value} 
      onChange={(val) => onChange(val as AgencyMode)}
      key={`agency-mode-${value}`}
    >
      <VStack align="stretch" spacing={1}>
        {agencyModes.map((mode) => {
          const isSelected = value === mode.key;
          console.log(`[AgencyModeSelector] Mode ${mode.key}: isSelected=${isSelected}, value="${value}", mode.key="${mode.key}"`);
          
          return (
            <Tooltip
              key={mode.key}
              label={mode.description}
              placement="right"
              hasArrow
            >
              <Box
                as="label"
                cursor={disabled ? 'not-allowed' : 'pointer'}
                opacity={disabled ? 0.5 : 1}
              >
                <HStack
                  px={2}
                  py={1.5}
                  borderRadius="md"
                  bg={isSelected ? bgSelected : bgDefault}
                  _hover={!disabled ? { bg: bgMuted } : {}}
                  border="1px solid"
                  borderColor={isSelected ? useSemanticToken('interactive.primary') : borderColor}
                  transition="all 0.2s"
                  spacing={1.5}
                >
                  <Icon
                    as={mode.icon}
                    boxSize={3.5}
                    color={isSelected ? useSemanticToken('interactive.primary') : textMuted}
                  />
                  
                  <Text fontWeight="600" fontSize="xs" lineHeight="1.2" flex={1}>
                    {mode.label}
                  </Text>

                  <Radio
                    value={mode.key}
                    isDisabled={disabled}
                    colorScheme={mode.color}
                    size="sm"
                  />
                </HStack>
              </Box>
            </Tooltip>
          );
        })}
      </VStack>
    </RadioGroup>
  );
};
