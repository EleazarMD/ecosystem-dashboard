/**
 * Fine-tuning Panel
 * Interface for LoRA, QLoRA, PEFT fine-tuning operations
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Button,
  Badge,
  Icon,
  Select,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Textarea,
  useToast,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Code,
  Divider,
} from '@chakra-ui/react';
import {
  WrenchScrewdriverIcon,
  RocketLaunchIcon,
  DocumentTextIcon,
  CpuChipIcon,
  BeakerIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface FineTuneConfig {
  baseModel: string;
  method: 'lora' | 'qlora' | 'full';
  datasetPath: string;
  outputDir: string;
  loraRank: number;
  loraAlpha: number;
  loraDropout: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
  gradientAccumulation: number;
  warmupSteps: number;
  maxSeqLength: number;
  quantization: '4bit' | '8bit' | 'none';
  targetModules: string[];
  useGradientCheckpointing: boolean;
}

const defaultConfig: FineTuneConfig = {
  baseModel: 'meta-llama/Llama-3.1-8B',
  method: 'lora',
  datasetPath: '',
  outputDir: './output/fine-tuned-model',
  loraRank: 16,
  loraAlpha: 32,
  loraDropout: 0.05,
  learningRate: 2e-4,
  batchSize: 4,
  epochs: 3,
  gradientAccumulation: 4,
  warmupSteps: 100,
  maxSeqLength: 2048,
  quantization: '4bit',
  targetModules: ['q_proj', 'v_proj', 'k_proj', 'o_proj'],
  useGradientCheckpointing: true,
};

const popularModels = [
  { value: 'meta-llama/Llama-3.1-8B', label: 'Llama 3.1 8B' },
  { value: 'meta-llama/Llama-3.1-70B', label: 'Llama 3.1 70B' },
  { value: 'mistralai/Mistral-7B-v0.3', label: 'Mistral 7B v0.3' },
  { value: 'google/gemma-2-9b', label: 'Gemma 2 9B' },
  { value: 'Qwen/Qwen2.5-7B', label: 'Qwen 2.5 7B' },
  { value: 'microsoft/phi-3-mini-4k-instruct', label: 'Phi-3 Mini' },
];

export const FineTuningPanel: React.FC = () => {
  const [config, setConfig] = useState<FineTuneConfig>(defaultConfig);
  const [isStarting, setIsStarting] = useState(false);
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');

  const updateConfig = (key: keyof FineTuneConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleStartFineTuning = async () => {
    if (!config.datasetPath) {
      toast({
        title: 'Dataset Required',
        description: 'Please specify a dataset path',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsStarting(true);
    // TODO: Real API call to start fine-tuning
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsStarting(false);

    toast({
      title: 'Fine-tuning Started',
      description: `Training ${config.baseModel} with ${config.method.toUpperCase()}`,
      status: 'success',
      duration: 5000,
    });
  };

  const estimatedVRAM = () => {
    const baseVRAM =
      config.quantization === '4bit' ? 8 : config.quantization === '8bit' ? 16 : 32;
    const loraOverhead = config.method === 'full' ? 0 : config.loraRank * 0.1;
    return Math.round(baseVRAM + loraOverhead);
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
            Fine-tuning Studio
          </Text>
          <Text fontSize="sm" color={textSecondary}>
            Configure and launch LoRA, QLoRA, or full fine-tuning jobs
          </Text>
        </Box>
        <Badge colorScheme="purple" fontSize="sm" px={3} py={1}>
          PEFT Enabled
        </Badge>
      </HStack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Configuration Panel */}
        <GlassPanel p={6}>
          <Text fontSize="lg" fontWeight="bold" color={textPrimary} mb={4}>
            Configuration
          </Text>

          <Tabs variant="soft-rounded" colorScheme="purple" size="sm">
            <TabList mb={4}>
              <Tab>Model</Tab>
              <Tab>LoRA</Tab>
              <Tab>Training</Tab>
              <Tab>Advanced</Tab>
            </TabList>

            <TabPanels>
              {/* Model Tab */}
              <TabPanel p={0}>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel color={textPrimary}>Base Model</FormLabel>
                    <Select
                      value={config.baseModel}
                      onChange={(e) => updateConfig('baseModel', e.target.value)}
                    >
                      {popularModels.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </Select>
                    <FormHelperText>Select a pre-trained model to fine-tune</FormHelperText>
                  </FormControl>

                  <FormControl>
                    <FormLabel color={textPrimary}>Fine-tuning Method</FormLabel>
                    <HStack spacing={3}>
                      {(['lora', 'qlora', 'full'] as const).map((method) => (
                        <Badge
                          key={method}
                          px={4}
                          py={2}
                          cursor="pointer"
                          colorScheme={config.method === method ? 'purple' : 'gray'}
                          onClick={() => updateConfig('method', method)}
                          fontSize="sm"
                        >
                          {method.toUpperCase()}
                        </Badge>
                      ))}
                    </HStack>
                    <FormHelperText>
                      {config.method === 'lora' && 'Low-Rank Adaptation - efficient fine-tuning'}
                      {config.method === 'qlora' && 'Quantized LoRA - memory efficient'}
                      {config.method === 'full' && 'Full parameter fine-tuning - most expensive'}
                    </FormHelperText>
                  </FormControl>

                  <FormControl>
                    <FormLabel color={textPrimary}>Dataset Path</FormLabel>
                    <Input
                      placeholder="/path/to/dataset or huggingface/dataset"
                      value={config.datasetPath}
                      onChange={(e) => updateConfig('datasetPath', e.target.value)}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color={textPrimary}>Output Directory</FormLabel>
                    <Input
                      value={config.outputDir}
                      onChange={(e) => updateConfig('outputDir', e.target.value)}
                    />
                  </FormControl>
                </VStack>
              </TabPanel>

              {/* LoRA Tab */}
              <TabPanel p={0}>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel color={textPrimary}>
                      LoRA Rank (r): {config.loraRank}
                    </FormLabel>
                    <Slider
                      value={config.loraRank}
                      min={4}
                      max={128}
                      step={4}
                      onChange={(v) => updateConfig('loraRank', v)}
                    >
                      <SliderTrack>
                        <SliderFilledTrack bg="purple.500" />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <FormHelperText>Higher = more parameters, better quality</FormHelperText>
                  </FormControl>

                  <FormControl>
                    <FormLabel color={textPrimary}>
                      LoRA Alpha: {config.loraAlpha}
                    </FormLabel>
                    <Slider
                      value={config.loraAlpha}
                      min={8}
                      max={128}
                      step={8}
                      onChange={(v) => updateConfig('loraAlpha', v)}
                    >
                      <SliderTrack>
                        <SliderFilledTrack bg="purple.500" />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <FormHelperText>Scaling factor (typically 2x rank)</FormHelperText>
                  </FormControl>

                  <FormControl>
                    <FormLabel color={textPrimary}>
                      Dropout: {config.loraDropout}
                    </FormLabel>
                    <Slider
                      value={config.loraDropout}
                      min={0}
                      max={0.3}
                      step={0.01}
                      onChange={(v) => updateConfig('loraDropout', v)}
                    >
                      <SliderTrack>
                        <SliderFilledTrack bg="purple.500" />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                  </FormControl>

                  <FormControl>
                    <FormLabel color={textPrimary}>Target Modules</FormLabel>
                    <HStack flexWrap="wrap" spacing={2}>
                      {['q_proj', 'v_proj', 'k_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'].map(
                        (module) => (
                          <Badge
                            key={module}
                            px={2}
                            py={1}
                            cursor="pointer"
                            colorScheme={config.targetModules.includes(module) ? 'purple' : 'gray'}
                            onClick={() => {
                              const modules = config.targetModules.includes(module)
                                ? config.targetModules.filter((m) => m !== module)
                                : [...config.targetModules, module];
                              updateConfig('targetModules', modules);
                            }}
                          >
                            {module}
                          </Badge>
                        )
                      )}
                    </HStack>
                  </FormControl>
                </VStack>
              </TabPanel>

              {/* Training Tab */}
              <TabPanel p={0}>
                <VStack spacing={4} align="stretch">
                  <SimpleGrid columns={2} spacing={4}>
                    <FormControl>
                      <FormLabel color={textPrimary}>Learning Rate</FormLabel>
                      <Input
                        type="number"
                        step="0.0001"
                        value={config.learningRate}
                        onChange={(e) => updateConfig('learningRate', parseFloat(e.target.value))}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel color={textPrimary}>Batch Size</FormLabel>
                      <NumberInput
                        value={config.batchSize}
                        min={1}
                        max={64}
                        onChange={(_, v) => updateConfig('batchSize', v)}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel color={textPrimary}>Epochs</FormLabel>
                      <NumberInput
                        value={config.epochs}
                        min={1}
                        max={100}
                        onChange={(_, v) => updateConfig('epochs', v)}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel color={textPrimary}>Gradient Accumulation</FormLabel>
                      <NumberInput
                        value={config.gradientAccumulation}
                        min={1}
                        max={64}
                        onChange={(_, v) => updateConfig('gradientAccumulation', v)}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>
                  </SimpleGrid>

                  <FormControl>
                    <FormLabel color={textPrimary}>Max Sequence Length</FormLabel>
                    <Select
                      value={config.maxSeqLength}
                      onChange={(e) => updateConfig('maxSeqLength', parseInt(e.target.value))}
                    >
                      <option value={512}>512</option>
                      <option value={1024}>1024</option>
                      <option value={2048}>2048</option>
                      <option value={4096}>4096</option>
                      <option value={8192}>8192</option>
                    </Select>
                  </FormControl>
                </VStack>
              </TabPanel>

              {/* Advanced Tab */}
              <TabPanel p={0}>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel color={textPrimary}>Quantization</FormLabel>
                    <HStack spacing={3}>
                      {(['4bit', '8bit', 'none'] as const).map((q) => (
                        <Badge
                          key={q}
                          px={4}
                          py={2}
                          cursor="pointer"
                          colorScheme={config.quantization === q ? 'purple' : 'gray'}
                          onClick={() => updateConfig('quantization', q)}
                        >
                          {q === 'none' ? 'FP16' : q.toUpperCase()}
                        </Badge>
                      ))}
                    </HStack>
                  </FormControl>

                  <FormControl display="flex" alignItems="center">
                    <FormLabel color={textPrimary} mb={0}>
                      Gradient Checkpointing
                    </FormLabel>
                    <Switch
                      colorScheme="purple"
                      isChecked={config.useGradientCheckpointing}
                      onChange={(e) =>
                        updateConfig('useGradientCheckpointing', e.target.checked)
                      }
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color={textPrimary}>Warmup Steps</FormLabel>
                    <NumberInput
                      value={config.warmupSteps}
                      min={0}
                      max={1000}
                      onChange={(_, v) => updateConfig('warmupSteps', v)}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </GlassPanel>

        {/* Preview & Start Panel */}
        <VStack spacing={4} align="stretch">
          {/* Resource Estimate */}
          <GlassPanel p={5}>
            <Text fontSize="md" fontWeight="bold" color={textPrimary} mb={3}>
              Resource Estimate
            </Text>
            <SimpleGrid columns={2} spacing={3}>
              <Box>
                <Text fontSize="xs" color={textSecondary}>
                  Est. VRAM Required
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="purple.400">
                  ~{estimatedVRAM()} GB
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color={textSecondary}>
                  Effective Batch Size
                </Text>
                <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
                  {config.batchSize * config.gradientAccumulation}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color={textSecondary}>
                  Trainable Params
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="green.400">
                  {config.method === 'full' ? '~7B' : '~0.1%'}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color={textSecondary}>
                  Est. Training Time
                </Text>
                <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
                  ~{config.epochs * 2}h
                </Text>
              </Box>
            </SimpleGrid>
          </GlassPanel>

          {/* Config Preview */}
          <GlassPanel p={5}>
            <Text fontSize="md" fontWeight="bold" color={textPrimary} mb={3}>
              Configuration Preview
            </Text>
            <Code
              display="block"
              whiteSpace="pre"
              overflowX="auto"
              p={3}
              borderRadius="md"
              fontSize="xs"
              bg={surfaceElevated}
              color={textPrimary}
            >
              {JSON.stringify(
                {
                  model: config.baseModel,
                  method: config.method,
                  lora_r: config.loraRank,
                  lora_alpha: config.loraAlpha,
                  learning_rate: config.learningRate,
                  batch_size: config.batchSize,
                  epochs: config.epochs,
                  quantization: config.quantization,
                },
                null,
                2
              )}
            </Code>
          </GlassPanel>

          {/* Start Button */}
          <Button
            size="lg"
            colorScheme="purple"
            leftIcon={<Icon as={RocketLaunchIcon} boxSize={5} />}
            onClick={handleStartFineTuning}
            isLoading={isStarting}
            loadingText="Initializing..."
          >
            Start Fine-tuning
          </Button>

          <Text fontSize="xs" color={textSecondary} textAlign="center">
            Training will be scheduled on the next available GPU resource
          </Text>
        </VStack>
      </SimpleGrid>
    </VStack>
  );
};

export default FineTuningPanel;
