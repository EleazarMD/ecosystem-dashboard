/**
 * Perplexity Tool Selector for Workspace AI
 * 
 * Provides 2 additional icon buttons that dynamically load Goose recipes:
 * - ⚡ Quick Ask (BoltIcon)
 * - 💡 Reasoning (LightBulbIcon)
 * 
 * Note: Web Search (GlobeAltIcon) and Deep Research (BeakerIcon) use existing toggles
 */

import React from 'react';
import { HStack, IconButton, Tooltip } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import {
  BoltIcon as BoltIconOutline,
  LightBulbIcon as LightBulbIconOutline
} from '@heroicons/react/24/outline';
import {
  BoltIcon as BoltIconSolid,
  LightBulbIcon as LightBulbIconSolid
} from '@heroicons/react/24/solid';

export type PerplexityTool = 'quickAsk' | 'reasoning' | null;

interface PerplexityToolSelectorProps {
  selectedTool: PerplexityTool;
  onToolSelect: (tool: PerplexityTool) => void;
  isDisabled?: boolean;
}

export const PerplexityToolSelector: React.FC<PerplexityToolSelectorProps> = ({
  selectedTool,
  onToolSelect,
  isDisabled = false,
}) => {
  const buttonActiveBg = useSemanticToken('surface.hover');
  const activeColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');

  const tools = [
    {
      id: 'quickAsk' as const,
      iconOutline: BoltIconOutline,
      iconSolid: BoltIconSolid,
      label: 'Quick Ask',
      tooltip: 'Fast factual answers with citations',
      recipe: 'perplexity-quick-ask',
    },
    {
      id: 'reasoning' as const,
      iconOutline: LightBulbIconOutline,
      iconSolid: LightBulbIconSolid,
      label: 'Reasoning',
      tooltip: 'Systematic decision analysis with trade-offs',
      recipe: 'perplexity-reasoning',
    },
  ];

  return (
    <HStack spacing={0}>
      {tools.map((tool) => (
        <Tooltip
          key={tool.id}
          label={`${tool.tooltip} ${selectedTool === tool.id ? '(Active)' : ''}`}
          hasArrow
          bg={useSemanticToken('surface.elevated')}
          color={useSemanticToken('text.primary')}
          fontSize="xs"
          py={1}
          px={2}
          borderRadius="md"
        >
          <IconButton
            aria-label={tool.label}
            icon={
              selectedTool === tool.id ? (
                <tool.iconSolid width={20} height={20} />
              ) : (
                <tool.iconOutline width={20} height={20} />
              )
            }
            size="sm"
            variant="ghost"
            color={selectedTool === tool.id ? activeColor : mutedColor}
            bg={selectedTool === tool.id ? buttonActiveBg : 'transparent'}
            onClick={() => {
              // Toggle: if clicking the same tool, deselect it
              if (selectedTool === tool.id) {
                onToolSelect(null);
              } else {
                onToolSelect(tool.id);
              }
            }}
            _hover={{ bg: buttonActiveBg }}
            _active={{ bg: buttonActiveBg }}
            isDisabled={isDisabled}
            data-recipe={tool.recipe}
            transition="all 0.2s"
            sx={{
              '& svg': {
                stroke: selectedTool === tool.id ? activeColor : mutedColor,
                fill: selectedTool === tool.id ? activeColor : 'none',
                transition: 'all 0.2s',
              },
            }}
          />
        </Tooltip>
      ))}
    </HStack>
  );
};
