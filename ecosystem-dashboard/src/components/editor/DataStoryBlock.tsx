/**
 * DataStoryBlock - Multi-chart narrative dashboard
 * Phase 3: NYT-style data storytelling with multiple visualizations
 */

'use client';

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  SimpleGrid,
  Divider,
  Badge,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FiEdit, FiRefreshCw } from 'react-icons/fi';
import { StaticChartBlock } from './StaticChartBlock';
import { PlotlyChartBlock } from './PlotlyChartBlock';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface DataStorySection {
  type: 'hero_stat' | 'narrative' | 'chart' | 'chart_grid';
  content: any;
}

export interface HeroStatContent {
  metric: string;
  value: string | number;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  context?: string;
}

export interface NarrativeContent {
  text: string;
  author?: string;
}

export interface ChartContent {
  chartBlockId: string;
  chartType: 'static' | 'plotly';
  chartData: any;
  title?: string;
}

export interface DataStoryBlockProps {
  blockId: string;
  storyTitle: string;
  storyTheme?: string;
  sections: DataStorySection[];
  layout?: 'vertical' | 'grid' | 'hero';
  theme?: {
    colors?: {
      primary?: string;
      accent?: string;
    };
    fonts?: {
      heading?: string;
      body?: string;
    };
  };
  metadata?: {
    createdByAgent?: string;
    audience?: string;
    template?: string;
    insights?: string[];
  };
  editable?: boolean;
  onEdit?: () => void;
  onRefresh?: () => void;
}

export function DataStoryBlock({
  blockId,
  storyTitle,
  storyTheme,
  sections,
  layout = 'vertical',
  theme,
  metadata,
  editable = false,
  onEdit,
  onRefresh,
}: DataStoryBlockProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const mutedColor = useSemanticToken('text.secondary');

  const renderHeroStat = (content: HeroStatContent) => {
    const getChangeColor = (direction?: string) => {
      if (!direction) return 'gray';
      return direction === 'up' ? 'green' : direction === 'down' ? 'red' : 'gray';
    };

    return (
      <Box
        p={8}
        bg={useSemanticToken('surface.highlight')}
        borderRadius="lg"
        textAlign="center"
      >
        <Text fontSize="sm" fontWeight="semibold" color={mutedColor} mb={2}>
          {content.metric}
        </Text>
        <Heading size="3xl" color={theme?.colors?.primary || 'blue.600'}>
          {content.value}
        </Heading>
        {content.change && (
          <Badge
            mt={3}
            colorScheme={getChangeColor(content.changeDirection)}
            fontSize="md"
            px={3}
            py={1}
          >
            {content.change}
          </Badge>
        )}
        {content.context && (
          <Text mt={4} fontSize="sm" color={mutedColor}>
            {content.context}
          </Text>
        )}
      </Box>
    );
  };

  const renderNarrative = (content: NarrativeContent) => {
    return (
      <Box py={4}>
        <Text fontSize="md" lineHeight="tall" color={mutedColor}>
          {content.text}
        </Text>
        {content.author && (
          <Text mt={2} fontSize="sm" fontStyle="italic" color={mutedColor}>
            — {content.author}
          </Text>
        )}
      </Box>
    );
  };

  const renderChart = (content: ChartContent) => {
    if (content.chartType === 'plotly') {
      return (
        <PlotlyChartBlock
          blockId={content.chartBlockId}
          plotlyConfig={content.chartData}
          title={content.title}
          editable={false}
        />
      );
    } else {
      return (
        <StaticChartBlock
          blockId={content.chartBlockId}
          imageUrl={content.chartData.imageUrl}
          imageData={content.chartData.imageData}
          title={content.title}
          editable={false}
        />
      );
    }
  };

  const renderChartGrid = (content: { charts: ChartContent[] }) => {
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {content.charts.map((chart, idx) => (
          <Box key={idx}>{renderChart(chart)}</Box>
        ))}
      </SimpleGrid>
    );
  };

  const renderSection = (section: DataStorySection, index: number) => {
    switch (section.type) {
      case 'hero_stat':
        return <Box key={index}>{renderHeroStat(section.content)}</Box>;
      case 'narrative':
        return <Box key={index}>{renderNarrative(section.content)}</Box>;
      case 'chart':
        return <Box key={index}>{renderChart(section.content)}</Box>;
      case 'chart_grid':
        return <Box key={index}>{renderChartGrid(section.content)}</Box>;
      default:
        return null;
    }
  };

  return (
    <Box
      borderWidth="2px"
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
    >
      {/* Story Header */}
      <Box
        px={6}
        py={4}
        borderBottomWidth="1px"
        borderColor={borderColor}
        bg={useSemanticToken('surface.base')}
      >
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={1}>
            <HStack>
              <Heading size="md">{storyTitle}</Heading>
              <Badge colorScheme="purple" fontSize="xs">
                Data Story
              </Badge>
              {metadata?.createdByAgent === 'claude_code' && (
                <Badge colorScheme="purple" fontSize="xs">
                  AI Generated
                </Badge>
              )}
            </HStack>
            {storyTheme && (
              <Text fontSize="sm" color={mutedColor}>
                {storyTheme}
              </Text>
            )}
            {metadata?.audience && (
              <Badge colorScheme="gray" fontSize="xs">
                For: {metadata.audience}
              </Badge>
            )}
          </VStack>

          {editable && (
            <HStack spacing={2}>
              {onRefresh && (
                <Tooltip label="Refresh data">
                  <IconButton
                    aria-label="Refresh"
                    icon={<FiRefreshCw />}
                    size="sm"
                    variant="ghost"
                    onClick={onRefresh}
                  />
                </Tooltip>
              )}
              {onEdit && (
                <Tooltip label="Edit story">
                  <IconButton
                    aria-label="Edit"
                    icon={<FiEdit />}
                    size="sm"
                    variant="ghost"
                    onClick={onEdit}
                  />
                </Tooltip>
              )}
            </HStack>
          )}
        </HStack>
      </Box>

      {/* Story Content */}
      <Box p={6}>
        <VStack spacing={6} align="stretch">
          {sections.map((section, index) => (
            <React.Fragment key={index}>
              {renderSection(section, index)}
              {index < sections.length - 1 && layout === 'vertical' && (
                <Divider />
              )}
            </React.Fragment>
          ))}
        </VStack>
      </Box>

      {/* Insights Footer */}
      {metadata?.insights && metadata.insights.length > 0 && (
        <Box
          px={6}
          py={4}
          borderTopWidth="1px"
          borderColor={borderColor}
          bg={useSemanticToken('surface.highlight')}
        >
          <VStack align="start" spacing={2}>
            <Heading size="xs" color={mutedColor}>
              KEY TAKEAWAYS
            </Heading>
            {metadata.insights.map((insight, idx) => (
              <HStack key={idx} align="start" spacing={2}>
                <Text fontSize="lg" color={theme?.colors?.accent || 'blue.500'}>
                  •
                </Text>
                <Text fontSize="sm" color={mutedColor}>
                  {insight}
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
}
