import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
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
  Alert,
  AlertIcon,
  useBreakpointValue,
} from '@chakra-ui/react';
import { FiInfo, FiImage, FiZap } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ImageEditingSettings {
  guidanceScale: number;
  imgGuidanceScale: number;
  steps: number;
  seed: number;
}

export const ImageEditingSettingsPanel: React.FC = () => {
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.muted');
  const surfaceBg = useSemanticToken('surface.raised');
  
  // Mobile-responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const panelPadding = useBreakpointValue({ base: 3, md: 4 });
  const spacing = useBreakpointValue({ base: 4, md: 5 });
  const labelSize = useBreakpointValue({ base: 'xs', md: 'sm' });
  
  const [settings, setSettings] = useState<ImageEditingSettings>({
    guidanceScale: 3.0,
    imgGuidanceScale: 1.5,
    steps: 28,
    seed: -1,
  });

  const [useRandomSeed, setUseRandomSeed] = useState(true);

  const updateSetting = <K extends keyof ImageEditingSettings>(
    key: K,
    value: ImageEditingSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Emit event for ImageEditingPanel to pick up
    window.dispatchEvent(new CustomEvent('image-edit-settings-change', { 
      detail: { ...settings, [key]: value }
    }));
  };

  // Handle random seed toggle
  useEffect(() => {
    if (useRandomSeed) {
      const randomSeed = Math.floor(Math.random() * 2147483647);
      updateSetting('seed', randomSeed);
    }
  }, [useRandomSeed]);

  return (
    <Box 
      h="100%" 
      overflowY="auto" 
      p={panelPadding}
      pb={{ base: 'calc(env(safe-area-inset-bottom) + 16px)', md: 4 }}
      css={{
        WebkitOverflowScrolling: 'touch',
        '&::-webkit-scrollbar': {
          width: isMobile ? '0px' : '8px',
        },
      }}
    >
      <VStack spacing={spacing} align="stretch">
        {/* Model Info */}
        <Alert status="info" borderRadius="md" variant="left-accent">
          <AlertIcon />
          <Box>
            <Text fontSize="sm" fontWeight="semibold">HiDream E1.1 (Image Editing)</Text>
            <Text fontSize="xs" color={mutedText}>Instruction-based image editing model</Text>
          </Box>
        </Alert>

        <Divider />

        {/* Guidance Scale - Text Prompt Adherence */}
        <FormControl>
          <HStack justify="space-between" mb={1}>
            <FormLabel fontSize={labelSize} mb={0}>
              <Tooltip label="Controls how closely the edit follows your text instruction. Higher = more literal interpretation">
                <HStack spacing={1}>
                  <Text>Guidance Scale</Text>
                  <Icon as={FiInfo} boxSize={3} color={mutedText} />
                </HStack>
              </Tooltip>
            </FormLabel>
            <Badge colorScheme="purple">{settings.guidanceScale.toFixed(1)}</Badge>
          </HStack>
          <Slider
            value={settings.guidanceScale}
            min={1.0}
            max={10.0}
            step={0.5}
            onChange={(val) => updateSetting('guidanceScale', val)}
          >
            <SliderTrack>
              <SliderFilledTrack bg="purple.500" />
            </SliderTrack>
            <SliderThumb boxSize={5} />
          </Slider>
          <HStack justify="space-between" fontSize="xs" color={mutedText} mt={1}>
            <Text>Loose</Text>
            <Text>Strict</Text>
          </HStack>
          <FormHelperText fontSize="xs">
            Default: 3.0 (recommended for most edits)
          </FormHelperText>
        </FormControl>

        {/* Image Guidance Scale - Original Image Preservation */}
        <FormControl>
          <HStack justify="space-between" mb={1}>
            <FormLabel fontSize={labelSize} mb={0}>
              <Tooltip label="Controls how much of the original image to preserve. Higher = more preservation of original structure">
                <HStack spacing={1}>
                  <Text>Image Guidance</Text>
                  <Icon as={FiInfo} boxSize={3} color={mutedText} />
                </HStack>
              </Tooltip>
            </FormLabel>
            <Badge colorScheme="blue">{settings.imgGuidanceScale.toFixed(1)}</Badge>
          </HStack>
          <Slider
            value={settings.imgGuidanceScale}
            min={0.5}
            max={3.0}
            step={0.1}
            onChange={(val) => updateSetting('imgGuidanceScale', val)}
          >
            <SliderTrack>
              <SliderFilledTrack bg="blue.500" />
            </SliderTrack>
            <SliderThumb boxSize={5} />
          </Slider>
          <HStack justify="space-between" fontSize="xs" color={mutedText} mt={1}>
            <Text>Less Original</Text>
            <Text>More Original</Text>
          </HStack>
          <FormHelperText fontSize="xs">
            Default: 1.5 (balances edit and preservation)
          </FormHelperText>
        </FormControl>

        <Divider />

        {/* Steps */}
        <FormControl>
          <HStack justify="space-between" mb={1}>
            <FormLabel fontSize={labelSize} mb={0}>
              <Tooltip label="Number of denoising steps. More steps = higher quality but slower">
                <HStack spacing={1}>
                  <Text>Steps</Text>
                  <Icon as={FiInfo} boxSize={3} color={mutedText} />
                </HStack>
              </Tooltip>
            </FormLabel>
            <Badge>{settings.steps}</Badge>
          </HStack>
          <Slider
            value={settings.steps}
            min={10}
            max={50}
            step={1}
            onChange={(val) => updateSetting('steps', val)}
          >
            <SliderTrack>
              <SliderFilledTrack bg="green.500" />
            </SliderTrack>
            <SliderThumb boxSize={5} />
          </Slider>
          <HStack justify="space-between" fontSize="xs" color={mutedText} mt={1}>
            <Text>Fast</Text>
            <Text>Quality</Text>
          </HStack>
          <FormHelperText fontSize="xs">
            Default: 28 (good balance of speed and quality)
          </FormHelperText>
        </FormControl>

        <Divider />

        {/* Seed */}
        <FormControl>
          <HStack justify="space-between" mb={2}>
            <FormLabel fontSize={labelSize} mb={0}>Seed</FormLabel>
            <Switch
              size="sm"
              isChecked={useRandomSeed}
              onChange={(e) => setUseRandomSeed(e.target.checked)}
            />
          </HStack>
          <NumberInput
            value={useRandomSeed ? 'Random' : settings.seed}
            isDisabled={useRandomSeed}
            min={-1}
            max={2147483647}
            onChange={(_, val) => !useRandomSeed && updateSetting('seed', val)}
            bg={surfaceBg}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <FormHelperText fontSize="xs">
            Use same seed for reproducible edits
          </FormHelperText>
        </FormControl>

        {/* Info Box */}
        <Box 
          p={3} 
          borderRadius="md" 
          bg={surfaceBg}
          borderWidth="1px"
          borderColor={borderColor}
        >
          <HStack spacing={2} mb={2}>
            <Icon as={FiZap} color="yellow.500" />
            <Text fontSize="xs" fontWeight="semibold">Editing Tips</Text>
          </HStack>
          <VStack align="stretch" spacing={1}>
            <Text fontSize="xs" color={mutedText}>
              • Use specific instructions (e.g., "Change shirt to blue")
            </Text>
            <Text fontSize="xs" color={mutedText}>
              • Higher guidance = more literal interpretation
            </Text>
            <Text fontSize="xs" color={mutedText}>
              • Lower image guidance = more creative freedom
            </Text>
            <Text fontSize="xs" color={mutedText}>
              • Edit strength in main panel controls overall intensity
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};
