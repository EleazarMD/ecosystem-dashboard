/**
 * ChartConfigModal - Configuration dialog for chart generation
 * Allows users to select dataset, chart type, style, and dimensions
 * Calls MCP tools to generate charts via Claude Code
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Select,
  Input,
  Textarea,
  Radio,
  RadioGroup,
  Stack,
  Text,
  useToast,
  Divider,
  HStack,
  Icon,
  Box,
  Badge,
} from '@chakra-ui/react';
import { FiUpload, FiDatabase, FiBarChart2, FiTrendingUp } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface ChartConfig {
  datasetPath?: string;
  datasetType: 'upload' | 'database' | 'path';
  chartType: 'auto' | 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'histogram';
  format: 'static' | 'interactive' | 'both';
  dimensions: 'default' | 'email' | 'social' | 'presentation';
  style: 'professional' | 'nyt' | 'colorful' | 'dark' | 'minimal';
  title?: string;
  narrative?: string;
}

export interface ChartConfigModalProps {
  isOpen: boolean;
  blockId: string;
  blockType: 'static_chart' | 'plotly_chart' | 'data_story';
  onClose: () => void;
  onGenerate: (blockId: string, config: ChartConfig) => Promise<void>;
}

const CHART_TYPES = [
  { value: 'auto', label: 'Auto (Let Claude decide)', icon: '🤖' },
  { value: 'bar', label: 'Bar Chart', icon: '📊' },
  { value: 'line', label: 'Line Chart', icon: '📈' },
  { value: 'pie', label: 'Pie Chart', icon: '🥧' },
  { value: 'scatter', label: 'Scatter Plot', icon: '⚪' },
  { value: 'heatmap', label: 'Heatmap', icon: '🔥' },
  { value: 'histogram', label: 'Histogram', icon: '📊' },
];

const STYLES = [
  { value: 'professional', label: 'Professional', description: 'Clean, minimal, business-ready' },
  { value: 'nyt', label: 'NYT Style', description: 'New York Times inspired' },
  { value: 'colorful', label: 'Colorful', description: 'Vibrant colors and gradients' },
  { value: 'dark', label: 'Dark Theme', description: 'Dark background for presentations' },
  { value: 'minimal', label: 'Minimal', description: 'Ultra-minimal, data-first' },
];

const DIMENSIONS = [
  { value: 'default', label: 'Default (800x600)', use: 'General purpose' },
  { value: 'email', label: 'Email (600x400)', use: 'Email newsletters' },
  { value: 'social', label: 'Social (1200x630)', use: 'LinkedIn, Twitter' },
  { value: 'presentation', label: 'Presentation (1920x1080)', use: 'Slides, HD' },
];

const SAMPLE_DATASETS = [
  { path: '/Users/eleazar/Projects/AIHomelab/datasets/customer_churn_synthetic.csv', name: 'Customer Churn Data' },
  { path: '/Users/eleazar/Projects/AIHomelab/datasets/sales_data.csv', name: 'Sales Data' },
  { path: '/Users/eleazar/Projects/AIHomelab/datasets/user_engagement.csv', name: 'User Engagement' },
];

export function ChartConfigModal({
  isOpen,
  blockId,
  blockType,
  onClose,
  onGenerate,
}: ChartConfigModalProps) {
  const toast = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Configuration state
  const [config, setConfig] = useState<ChartConfig>({
    datasetType: 'path',
    chartType: 'auto',
    format: blockType === 'plotly_chart' ? 'interactive' : 'static',
    dimensions: 'default',
    style: 'professional',
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setConfig({ ...config, datasetType: 'upload' });
    }
  };

  const handleGenerate = async () => {
    // Validation
    if (!config.datasetPath && !uploadedFile) {
      toast({
        title: 'Dataset required',
        description: 'Please select or upload a dataset',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsGenerating(true);

    try {
      // If file was uploaded, we'd handle upload here
      // For now, assume dataset path is set

      await onGenerate(blockId, config);

      toast({
        title: 'Chart generated!',
        description: 'Your chart has been created successfully',
        status: 'success',
        duration: 5000,
      });

      onClose();
    } catch (error: any) {
      toast({
        title: 'Chart generation failed',
        description: error.message || 'An error occurred',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Icon as={FiBarChart2} />
            <Text>Configure Chart</Text>
            <Badge colorScheme="blue">{blockType.replace('_', ' ')}</Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Dataset Selection */}
            <FormControl isRequired>
              <FormLabel fontWeight="bold">Dataset</FormLabel>
              <RadioGroup
                value={config.datasetType}
                onChange={(value) => setConfig({ ...config, datasetType: value as any })}
              >
                <Stack spacing={3}>
                  <Radio value="path">
                    <HStack>
                      <Icon as={FiDatabase} />
                      <Text>Select from existing datasets</Text>
                    </HStack>
                  </Radio>
                  {config.datasetType === 'path' && (
                    <Select
                      placeholder="Choose a dataset"
                      ml={6}
                      value={config.datasetPath}
                      onChange={(e) => setConfig({ ...config, datasetPath: e.target.value })}
                    >
                      {SAMPLE_DATASETS.map((ds) => (
                        <option key={ds.path} value={ds.path}>
                          {ds.name}
                        </option>
                      ))}
                    </Select>
                  )}

                  <Radio value="upload">
                    <HStack>
                      <Icon as={FiUpload} />
                      <Text>Upload CSV file</Text>
                    </HStack>
                  </Radio>
                  {config.datasetType === 'upload' && (
                    <Input
                      type="file"
                      accept=".csv"
                      ml={6}
                      onChange={handleFileUpload}
                    />
                  )}
                </Stack>
              </RadioGroup>
            </FormControl>

            <Divider />

            {/* Chart Type */}
            <FormControl>
              <FormLabel fontWeight="bold">Chart Type</FormLabel>
              <Select
                value={config.chartType}
                onChange={(e) => setConfig({ ...config, chartType: e.target.value as any })}
              >
                {CHART_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </Select>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                "Auto" lets Claude choose the best chart type for your data
              </Text>
            </FormControl>

            {/* Title (Optional) */}
            <FormControl>
              <FormLabel>Chart Title (Optional)</FormLabel>
              <Input
                placeholder="e.g., Customer Churn Analysis"
                value={config.title || ''}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
              />
            </FormControl>

            <Divider />

            {/* Style */}
            <FormControl>
              <FormLabel fontWeight="bold">Style</FormLabel>
              <RadioGroup
                value={config.style}
                onChange={(value) => setConfig({ ...config, style: value as any })}
              >
                <Stack spacing={2}>
                  {STYLES.map((style) => (
                    <Box key={style.value}>
                      <Radio value={style.value}>
                        <Text fontWeight="medium">{style.label}</Text>
                      </Radio>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} ml={6}>
                        {style.description}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              </RadioGroup>
            </FormControl>

            <Divider />

            {/* Dimensions */}
            <FormControl>
              <FormLabel fontWeight="bold">Dimensions</FormLabel>
              <RadioGroup
                value={config.dimensions}
                onChange={(value) => setConfig({ ...config, dimensions: value as any })}
              >
                <Stack spacing={2}>
                  {DIMENSIONS.map((dim) => (
                    <Box key={dim.value}>
                      <Radio value={dim.value}>
                        <Text fontWeight="medium">{dim.label}</Text>
                      </Radio>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} ml={6}>
                        Best for: {dim.use}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              </RadioGroup>
            </FormControl>

            {blockType === 'data_story' && (
              <>
                <Divider />
                {/* Narrative (for data stories) */}
                <FormControl>
                  <FormLabel fontWeight="bold">Story Theme (Optional)</FormLabel>
                  <Textarea
                    placeholder="e.g., Analyze customer churn patterns and identify at-risk segments"
                    value={config.narrative || ''}
                    onChange={(e) => setConfig({ ...config, narrative: e.target.value })}
                    rows={3}
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    Claude will use this to create a narrative around your data
                  </Text>
                </FormControl>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isGenerating}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleGenerate}
            isLoading={isGenerating}
            loadingText="Generating chart..."
            leftIcon={<Icon as={FiTrendingUp} />}
          >
            Generate Chart with Claude
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ChartConfigModal;
