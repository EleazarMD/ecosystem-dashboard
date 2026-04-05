import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormHelperText,
  Switch,
  Divider,
  Badge,
  Tooltip,
  Icon,
  Collapse,
  Button,
  useDisclosure,
  useBreakpointValue,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FiInfo, FiChevronDown, FiChevronUp, FiImage, FiZap } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { ImageStudioProvider, useImageStudio } from '@/contexts/ImageStudioContext';

interface ImageGenerationSettings {
  model: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed: number;
  sampler: string;
  scheduler: string;
}

const AVAILABLE_MODELS = [
  { id: 'hidream-i1-full-nf4', name: 'HiDream I1 Full (nf4)', description: 'Text-to-image, artistic', vram: '12GB', installed: true },
  { id: 'sd15', name: 'Stable Diffusion 1.5', description: 'Fast, versatile', vram: '4GB', installed: false },
  { id: 'sdxl', name: 'SDXL 1.0', description: 'High quality, detailed', vram: '8GB', installed: false },
  { id: 'flux-schnell', name: 'FLUX Schnell', description: 'Ultra fast', vram: '12GB', installed: false },
  { id: 'flux-dev', name: 'FLUX Dev', description: 'Best quality', vram: '16GB', installed: false },
];

const INSTALLED_MODELS = AVAILABLE_MODELS.filter(m => m.installed);

const SAMPLERS = [
  'euler', 'euler_ancestral', 'heun', 'dpm_2', 'dpm_2_ancestral',
  'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde',
  'dpmpp_2m', 'dpmpp_2m_sde', 'ddim', 'uni_pc', 'uni_pc_bh2'
];

const SCHEDULERS = ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform'];

const ASPECT_RATIOS = [
  { label: '16:9 Wide', width: 1360, height: 768 },
  { label: '1:1 Square HD', width: 1024, height: 1024 },
  { label: '4:3 Landscape', width: 1168, height: 880 },
  { label: '3:4 Portrait', width: 880, height: 1168 },
  { label: '16:9 Wide (Alt)', width: 1024, height: 576 },
  { label: '9:16 Tall', width: 768, height: 1360 },
  { label: '2:3 Photo', width: 832, height: 1248 },
  { label: '3:2 Photo', width: 1248, height: 832 },
  { label: '1:1 Square', width: 512, height: 512 },
];

const ImageGenerationSettingsPanelContent: React.FC = () => {
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.muted');
  const surfaceBg = useSemanticToken('surface.raised');
  const { activeView } = useImageStudio();
  
  const { isOpen: showAdvanced, onToggle: toggleAdvanced } = useDisclosure();
  
  // Mobile-responsive values for iPhone/iOS
  const isMobile = useBreakpointValue({ base: true, md: false });
  const panelPadding = useBreakpointValue({ base: 3, md: 4 });
  const spacing = useBreakpointValue({ base: 4, md: 5 });
  const labelSize = useBreakpointValue({ base: 'xs', md: 'sm' });
  const selectSize = useBreakpointValue({ base: 'sm', md: 'sm' });
  const sliderThumbSize = useBreakpointValue({ base: 5, md: 4 });
  
  const [settings, setSettings] = useState<ImageGenerationSettings>({
    model: 'hidream-i1-full-nf4',
    width: 1360,
    height: 768,
    steps: 20,
    cfgScale: 7.0,
    seed: -1,
    sampler: 'euler_ancestral',
    scheduler: 'normal',
  });
  
  // Check if we're on Edit tab
  const isEditMode = activeView === 'edit';

  const [useRandomSeed, setUseRandomSeed] = useState(true);

  const updateSetting = <K extends keyof ImageGenerationSettings>(
    key: K,
    value: ImageGenerationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Emit event for ImageGenerationPanel to pick up
    window.dispatchEvent(new CustomEvent('image-settings-change', { 
      detail: { ...settings, [key]: value }
    }));
  };

  const handleAspectRatioChange = (ratio: typeof ASPECT_RATIOS[0]) => {
    setSettings(prev => ({ ...prev, width: ratio.width, height: ratio.height }));
    window.dispatchEvent(new CustomEvent('image-settings-change', { 
      detail: { ...settings, width: ratio.width, height: ratio.height }
    }));
  };

  const selectedModel = INSTALLED_MODELS.find(m => m.id === settings.model);

  return (
    <Box 
      h="100%" 
      overflowY="auto" 
      p={panelPadding}
      pb={{ base: 'calc(env(safe-area-inset-bottom) + 16px)', md: 4 }}
      css={{
        // iOS momentum scrolling
        WebkitOverflowScrolling: 'touch',
        // Hide scrollbar on mobile for cleaner look
        '&::-webkit-scrollbar': {
          width: isMobile ? '0px' : '8px',
        },
      }}
    >
      <VStack spacing={spacing} align="stretch">
        {/* Model Selection - Only show on Generate tab */}
        <FormControl>
          <FormLabel fontSize={labelSize} fontWeight="semibold">
            <HStack>
              <Icon as={FiImage} boxSize={{ base: 4, md: 5 }} />
              <Text>Model</Text>
            </HStack>
          </FormLabel>
          <Select
            size={selectSize}
            value={settings.model}
            onChange={(e) => updateSetting('model', e.target.value)}
            bg={surfaceBg}
            // Larger touch target on mobile
            h={{ base: '44px', md: 'auto' }}
          >
            {INSTALLED_MODELS.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </Select>
          {selectedModel && (
            <HStack mt={2} spacing={2}>
              <Badge colorScheme="blue" fontSize="xs">{selectedModel.vram}</Badge>
              <Text fontSize="xs" color={mutedText}>{selectedModel.description}</Text>
            </HStack>
          )}
        </FormControl>

        <Divider />

        {/* Aspect Ratio / Dimensions */}
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="semibold">Aspect Ratio</FormLabel>
          <Select
            size="sm"
            value={`${settings.width}x${settings.height}`}
            onChange={(e) => {
              const ratio = ASPECT_RATIOS.find(r => `${r.width}x${r.height}` === e.target.value);
              if (ratio) handleAspectRatioChange(ratio);
            }}
            bg={surfaceBg}
          >
            {ASPECT_RATIOS.map(ratio => (
              <option key={`${ratio.width}x${ratio.height}`} value={`${ratio.width}x${ratio.height}`}>
                {ratio.label} ({ratio.width}×{ratio.height})
              </option>
            ))}
          </Select>
        </FormControl>

        {/* Steps */}
        <FormControl>
          <HStack justify="space-between">
            <HStack>
              <FormLabel fontSize="sm" fontWeight="semibold" mb={0}>Steps</FormLabel>
              <Tooltip label="Number of denoising iterations. More steps = higher quality but slower. 20-30 is usually optimal.">
                <span><Icon as={FiInfo} color={mutedText} boxSize={3} /></span>
              </Tooltip>
            </HStack>
            <Badge colorScheme="purple">{settings.steps}</Badge>
          </HStack>
          <Slider
            value={settings.steps}
            min={1}
            max={50}
            step={1}
            onChange={(val) => updateSetting('steps', val)}
            mt={2}
            // Larger touch target on mobile
            h={{ base: '32px', md: '20px' }}
          >
            <SliderTrack h={{ base: '8px', md: '4px' }}>
              <SliderFilledTrack bg="purple.500" />
            </SliderTrack>
            <SliderThumb boxSize={sliderThumbSize} />
          </Slider>
          <HStack justify="space-between" mt={1}>
            <Text fontSize="xs" color={mutedText}>Fast</Text>
            <Text fontSize="xs" color={mutedText}>Quality</Text>
          </HStack>
        </FormControl>

        {/* CFG Scale */}
        <FormControl>
          <HStack justify="space-between">
            <HStack>
              <FormLabel fontSize="sm" fontWeight="semibold" mb={0}>CFG Scale</FormLabel>
              <Tooltip label="How closely to follow the prompt. Higher = more literal, lower = more creative">
                <span><Icon as={FiInfo} color={mutedText} boxSize={3} /></span>
              </Tooltip>
            </HStack>
            <Badge colorScheme="orange">{settings.cfgScale.toFixed(1)}</Badge>
          </HStack>
          <Slider
            value={settings.cfgScale}
            min={1}
            max={20}
            step={0.5}
            onChange={(val) => updateSetting('cfgScale', val)}
            mt={2}
            // Larger touch target on mobile
            h={{ base: '32px', md: '20px' }}
          >
            <SliderTrack h={{ base: '8px', md: '4px' }}>
              <SliderFilledTrack bg="orange.500" />
            </SliderTrack>
            <SliderThumb boxSize={sliderThumbSize} />
          </Slider>
          <HStack justify="space-between" mt={1}>
            <Text fontSize="xs" color={mutedText}>Creative</Text>
            <Text fontSize="xs" color={mutedText}>Precise</Text>
          </HStack>
        </FormControl>

        {/* Seed */}
        <FormControl>
          <HStack justify="space-between">
            <HStack>
              <FormLabel fontSize={labelSize} fontWeight="semibold" mb={0}>Seed</FormLabel>
              <Tooltip label="A number that determines the random starting point. Same seed + same settings = same image. Useful for reproducing results.">
                <span><Icon as={FiInfo} color={mutedText} boxSize={3} /></span>
              </Tooltip>
            </HStack>
            <Switch
              size={{ base: 'md', md: 'sm' }}
              isChecked={useRandomSeed}
              onChange={(e) => {
                setUseRandomSeed(e.target.checked);
                if (e.target.checked) {
                  updateSetting('seed', -1);
                }
              }}
            />
          </HStack>
          <Text fontSize="xs" color={mutedText} mb={2}>
            {useRandomSeed ? 'Random seed each generation' : 'Fixed seed for reproducibility'}
          </Text>
          {!useRandomSeed && (
            <NumberInput
              size="sm"
              value={settings.seed}
              min={0}
              max={2147483647}
              onChange={(_, val) => updateSetting('seed', val || 0)}
            >
              <NumberInputField bg={surfaceBg} />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          )}
        </FormControl>

        <Divider />

        {/* Advanced Settings Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAdvanced}
          rightIcon={<Icon as={showAdvanced ? FiChevronUp : FiChevronDown} />}
          justifyContent="space-between"
          w="100%"
        >
          <HStack>
            <Icon as={FiZap} />
            <Text>Advanced Settings</Text>
          </HStack>
        </Button>

        <Collapse in={showAdvanced}>
          <VStack spacing={4} align="stretch" pt={2}>
            {/* Guidance Text */}
            <Box bg="blue.900" borderRadius="md" p={3} mb={2}>
              <Text fontSize="xs" color="blue.200">
                💡 These settings control how the AI generates images. Default values work well for most cases.
              </Text>
            </Box>

            {/* Sampler */}
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="sm" fontWeight="semibold" mb={0}>Sampler</FormLabel>
                <Tooltip 
                  label="The algorithm used to generate the image. 'euler_ancestral' is fast and creative, 'dpmpp_2m' produces high quality results, 'ddim' is deterministic."
                  placement="left"
                  hasArrow
                >
                  <Box as="span" cursor="help"><Icon as={FiInfo} color={mutedText} boxSize={3} /></Box>
                </Tooltip>
              </HStack>
              <Select
                size="sm"
                value={settings.sampler}
                onChange={(e) => updateSetting('sampler', e.target.value)}
                bg={surfaceBg}
              >
                {SAMPLERS.map(sampler => (
                  <option key={sampler} value={sampler}>
                    {sampler.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </FormControl>

            {/* Scheduler */}
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="sm" fontWeight="semibold" mb={0}>Scheduler</FormLabel>
                <Tooltip 
                  label="Controls the noise schedule during generation. 'karras' often produces sharper images, 'normal' is the standard approach."
                  placement="left"
                  hasArrow
                >
                  <Box as="span" cursor="help"><Icon as={FiInfo} color={mutedText} boxSize={3} /></Box>
                </Tooltip>
              </HStack>
              <Select
                size="sm"
                value={settings.scheduler}
                onChange={(e) => updateSetting('scheduler', e.target.value)}
                bg={surfaceBg}
              >
                {SCHEDULERS.map(scheduler => (
                  <option key={scheduler} value={scheduler}>
                    {scheduler.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </FormControl>

            {/* Custom Dimensions */}
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="sm" fontWeight="semibold" mb={0}>Custom Dimensions</FormLabel>
                <Tooltip 
                  label="Override the aspect ratio with exact pixel dimensions. Larger sizes require more VRAM and take longer to generate."
                  placement="left"
                  hasArrow
                >
                  <Box as="span" cursor="help"><Icon as={FiInfo} color={mutedText} boxSize={3} /></Box>
                </Tooltip>
              </HStack>
              <HStack>
                <NumberInput
                  size="sm"
                  value={settings.width}
                  min={256}
                  max={2048}
                  step={64}
                  onChange={(_, val) => updateSetting('width', val || 512)}
                >
                  <NumberInputField bg={surfaceBg} placeholder="Width" />
                </NumberInput>
                <Text color={mutedText}>×</Text>
                <NumberInput
                  size="sm"
                  value={settings.height}
                  min={256}
                  max={2048}
                  step={64}
                  onChange={(_, val) => updateSetting('height', val || 512)}
                >
                  <NumberInputField bg={surfaceBg} placeholder="Height" />
                </NumberInput>
              </HStack>
              <FormHelperText fontSize="xs">
                Must be multiples of 64. Higher = more VRAM needed.
              </FormHelperText>
            </FormControl>
          </VStack>
        </Collapse>
      </VStack>
    </Box>
  );
};

export const ImageGenerationSettingsPanel: React.FC = () => {
  return (
    <ImageStudioProvider>
      <ImageGenerationSettingsPanelContent />
    </ImageStudioProvider>
  );
};

export default ImageGenerationSettingsPanel;
