/**
 * Dynamic Theme Generator
 * Upload images, extract colors, and generate custom themes
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  Image,
  Input,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  useToast,
  Grid,
  GridItem,
  Badge,
  IconButton,
  Tooltip,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  Code,
} from '@chakra-ui/react';
import { FiUpload, FiRefreshCw, FiCheck, FiCopy, FiDownload } from 'react-icons/fi';
import {
  extractColorsFromImage,
  generateThemePalette,
  suggestThemeMode,
  checkContrast,
} from '@/lib/color-extractor';
import type { ThemePreset } from '@/theme/presets';

interface GeneratedTheme extends Partial<ThemePreset> {
  palette: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
}

export const ThemeGenerator: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<'light' | 'dark'>('dark');
  const [generatedTheme, setGeneratedTheme] = useState<GeneratedTheme | null>(null);
  const [themeName, setThemeName] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();

  // Handle image upload
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  // Extract colors from image
  const extractColors = useCallback(async () => {
    if (!imageFile) return;

    setIsProcessing(true);
    try {
      const colors = await extractColorsFromImage(imageFile, 6);
      setExtractedColors(colors);

      // Auto-suggest theme mode
      const suggestedMode = suggestThemeMode(colors);
      setSelectedMode(suggestedMode);

      toast({
        title: 'Colors extracted!',
        description: `Found ${colors.length} dominant colors`,
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Extraction failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, toast]);

  // Generate theme from extracted colors
  const generateTheme = useCallback(() => {
    if (extractedColors.length === 0) return;

    const palette = generateThemePalette(extractedColors, selectedMode);

    // Calculate contrast ratios
    const textContrast = checkContrast(palette.text, palette.background);
    const primaryContrast = checkContrast(palette.primary, palette.background);

    const theme: GeneratedTheme = {
      id: themeName.toLowerCase().replace(/\s+/g, '-') || 'custom-theme',
      name: themeName || 'Custom Theme',
      description: themeDescription || `Generated from uploaded image`,
      mode: selectedMode,
      primary: palette.primary,
      primaryHover: palette.primaryHover,
      primaryActive: palette.primaryActive,
      accent: palette.accent,
      accentHover: palette.accentHover,
      background: palette.background,
      backgroundSecondary: palette.backgroundSecondary,
      backgroundTertiary: palette.backgroundTertiary,
      text: palette.text,
      textSecondary: palette.textSecondary,
      textMuted: palette.textMuted,
      border: palette.border,
      borderHover: palette.borderHover,
      glassBlur: '16px',
      glassBorder: `rgba(${selectedMode === 'dark' ? '255,255,255' : '0,0,0'}, 0.1)`,
      glassBackground: `${palette.backgroundSecondary}CC`,
      shadow: '0 8px 32px rgba(0,0,0,0.1)',
      shadowHover: '0 16px 48px rgba(0,0,0,0.15)',
      palette: {
        primary: palette.primary,
        accent: palette.accent,
        background: palette.background,
        text: palette.text,
      },
    };

    setGeneratedTheme(theme);

    // Check WCAG compliance
    if (textContrast < 4.5) {
      toast({
        title: 'Contrast Warning',
        description: `Text contrast ratio (${textContrast.toFixed(2)}) is below WCAG AA standard (4.5:1)`,
        status: 'warning',
        duration: 5000,
      });
    }

    toast({
      title: 'Theme generated!',
      description: `Created "${theme.name}" theme`,
      status: 'success',
      duration: 2000,
    });
  }, [extractedColors, selectedMode, themeName, themeDescription, toast]);

  // Copy theme to clipboard
  const copyThemeCode = useCallback(() => {
    if (!generatedTheme) return;

    const code = `export const ${generatedTheme.id.replace(/-/g, '_')}: ThemePreset = ${JSON.stringify(generatedTheme, null, 2)};`;

    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: 'Theme code copied to clipboard',
      status: 'success',
      duration: 2000,
    });
  }, [generatedTheme, toast]);

  // Download theme as JSON
  const downloadTheme = useCallback(() => {
    if (!generatedTheme) return;

    const blob = new Blob([JSON.stringify(generatedTheme, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedTheme.id}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded!',
      description: 'Theme saved as JSON',
      status: 'success',
      duration: 2000,
    });
  }, [generatedTheme, toast]);

  return (
    <Box p={6} bg="bgSecondary" borderRadius="xl" maxW="1200px" mx="auto">
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>Dynamic Theme Generator</Heading>
          <Text color="textSecondary" fontSize="sm">
            Upload an image to extract colors and generate a custom theme
          </Text>
        </Box>

        <Divider />

        {/* Step 1: Upload Image */}
        <VStack spacing={4} align="stretch">
          <Heading size="md">Step 1: Upload Image</Heading>

          <HStack spacing={4}>
            <FormControl>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                display="none"
                id="image-upload"
              />
              <Button
                as="label"
                htmlFor="image-upload"
                leftIcon={<FiUpload />}
                colorScheme="brand"
                cursor="pointer"
              >
                Choose Image
              </Button>
            </FormControl>

            {imageFile && (
              <Button
                leftIcon={<FiRefreshCw />}
                onClick={extractColors}
                isLoading={isProcessing}
                loadingText="Extracting..."
              >
                Extract Colors
              </Button>
            )}
          </HStack>

          {imagePreview && (
            <Box borderRadius="lg" overflow="hidden" maxH="300px">
              <Image
                src={imagePreview}
                alt="Upload preview"
                objectFit="cover"
                w="100%"
                h="auto"
              />
            </Box>
          )}
        </VStack>

        {/* Step 2: Extracted Colors */}
        {extractedColors.length > 0 && (
          <>
            <Divider />
            <VStack spacing={4} align="stretch">
              <Heading size="md">Step 2: Extracted Colors</Heading>

              <Grid templateColumns="repeat(6, 1fr)" gap={4}>
                {extractedColors.map((color, index) => (
                  <GridItem key={index}>
                    <VStack spacing={2}>
                      <Box
                        w="100%"
                        h="60px"
                        bg={color}
                        borderRadius="lg"
                        border="2px solid"
                        borderColor="borderDefault"
                      />
                      <Code fontSize="xs">{color}</Code>
                    </VStack>
                  </GridItem>
                ))}
              </Grid>

              <FormControl>
                <FormLabel>Theme Mode</FormLabel>
                <RadioGroup value={selectedMode} onChange={(value: 'light' | 'dark') => setSelectedMode(value)}>
                  <Stack direction="row" spacing={4}>
                    <Radio value="dark">Dark Mode</Radio>
                    <Radio value="light">Light Mode</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>
            </VStack>
          </>
        )}

        {/* Step 3: Theme Details */}
        {extractedColors.length > 0 && (
          <>
            <Divider />
            <VStack spacing={4} align="stretch">
              <Heading size="md">Step 3: Theme Details</Heading>

              <FormControl>
                <FormLabel>Theme Name</FormLabel>
                <Input
                  placeholder="e.g., Ocean Breeze"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  placeholder="e.g., Calming ocean-inspired palette"
                  value={themeDescription}
                  onChange={(e) => setThemeDescription(e.target.value)}
                />
              </FormControl>

              <Button
                leftIcon={<FiCheck />}
                colorScheme="brand"
                size="lg"
                onClick={generateTheme}
              >
                Generate Theme
              </Button>
            </VStack>
          </>
        )}

        {/* Step 4: Preview & Export */}
        {generatedTheme && (
          <>
            <Divider />
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Heading size="md">Step 4: Preview & Export</Heading>
                <HStack>
                  <Tooltip label="Copy code">
                    <IconButton
                      aria-label="Copy code"
                      icon={<FiCopy />}
                      onClick={copyThemeCode}
                      size="sm"
                    />
                  </Tooltip>
                  <Tooltip label="Download JSON">
                    <IconButton
                      aria-label="Download"
                      icon={<FiDownload />}
                      onClick={downloadTheme}
                      size="sm"
                    />
                  </Tooltip>
                </HStack>
              </HStack>

              {/* Theme Preview */}
              <Box
                p={6}
                bg={generatedTheme.background}
                color={generatedTheme.text}
                borderRadius="xl"
                border="2px solid"
                borderColor={generatedTheme.border}
              >
                <VStack spacing={4} align="stretch">
                  <Heading size="lg" color={generatedTheme.text}>
                    {generatedTheme.name}
                  </Heading>
                  <Text color={generatedTheme.textSecondary}>
                    {generatedTheme.description}
                  </Text>

                  <HStack spacing={2}>
                    <Badge bg={generatedTheme.primary} color="whiteAlpha.900">Primary</Badge>
                    <Badge bg={generatedTheme.accent} color="whiteAlpha.900">Accent</Badge>
                    <Badge bg={generatedTheme.backgroundSecondary} color={generatedTheme.text}>
                      Secondary BG
                    </Badge>
                  </HStack>

                  <Box
                    p={4}
                    bg={generatedTheme.backgroundSecondary}
                    borderRadius="lg"
                  >
                    <Text color={generatedTheme.textSecondary} fontSize="sm">
                      This is a preview of your custom theme. Text should be readable with
                      proper contrast ratios.
                    </Text>
                  </Box>
                </VStack>
              </Box>

              {/* Color Palette Grid */}
              <Grid templateColumns="repeat(4, 1fr)" gap={3}>
                <GridItem>
                  <VStack spacing={1}>
                    <Box w="100%" h="40px" bg={generatedTheme.primary} borderRadius="md" />
                    <Text fontSize="xs" color="textSecondary">Primary</Text>
                  </VStack>
                </GridItem>
                <GridItem>
                  <VStack spacing={1}>
                    <Box w="100%" h="40px" bg={generatedTheme.accent} borderRadius="md" />
                    <Text fontSize="xs" color="textSecondary">Accent</Text>
                  </VStack>
                </GridItem>
                <GridItem>
                  <VStack spacing={1}>
                    <Box w="100%" h="40px" bg={generatedTheme.backgroundSecondary} borderRadius="md" />
                    <Text fontSize="xs" color="textSecondary">BG Secondary</Text>
                  </VStack>
                </GridItem>
                <GridItem>
                  <VStack spacing={1}>
                    <Box w="100%" h="40px" bg={generatedTheme.text} borderRadius="md" />
                    <Text fontSize="xs" color="textSecondary">Text</Text>
                  </VStack>
                </GridItem>
              </Grid>
            </VStack>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default ThemeGenerator;
