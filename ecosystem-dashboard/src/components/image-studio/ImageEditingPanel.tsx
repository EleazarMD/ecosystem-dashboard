import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Textarea,
    Button,
    Icon,
    IconButton,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Center,
    Spinner,
    Image,
    useToast,
    Alert,
    AlertIcon,
    AlertDescription,
    Badge,
    useBreakpointValue,
    Input,
    FormControl,
    FormLabel,
    Tooltip,
    Flex,
} from '@chakra-ui/react';
import {
    FiUpload,
    FiEdit3,
    FiImage,
    FiDownload,
    FiTrash2,
    FiAlertTriangle,
    FiLock,
    FiZap,
    FiRefreshCw,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';
import ImageEditingUpgradePrompt from '@/components/subscription/ImageEditingUpgradePrompt';

interface GeneratedImage {
    url: string;
    filename: string;
}

interface EditResult {
    success: boolean;
    images?: Array<{ url: string; filename: string }>;
    error?: string;
    message?: string;
    blocked?: boolean;
    seed?: number;
    generationTime?: number;
    strength?: number;
    model?: string;
    backend?: string;
}

interface ImageEditingPanelProps {
    isPremium: boolean;
    onUpgradeClick?: () => void;
}

export const ImageEditingPanel: React.FC<ImageEditingPanelProps> = ({ 
    isPremium, 
    onUpgradeClick 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [strength, setStrength] = useState(0.3); // Optimized for HiDream E1.1 instruction-based editing
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourcePreview, setSourcePreview] = useState<string | null>(null);
    const [editedImage, setEditedImage] = useState<GeneratedImage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    // Edit settings from right panel
    const [editSettings, setEditSettings] = useState({
        guidanceScale: 3.0,
        imgGuidanceScale: 1.5,
        steps: 28,
        seed: -1,
    });

    // Listen for settings changes from right panel
    useEffect(() => {
        const handleSettingsChange = (event: CustomEvent) => {
            setEditSettings(event.detail);
        };
        window.addEventListener('image-edit-settings-change', handleSettingsChange as EventListener);
        return () => {
            window.removeEventListener('image-edit-settings-change', handleSettingsChange as EventListener);
        };
    }, []);

    const surfaceHover = useSemanticToken('surface.hover');
    const borderColor = useSemanticToken('border.subtle');
    const accentColor = useSemanticToken('interactive.primary');
    
    // Mobile-responsive values
    const isMobile = useBreakpointValue({ base: true, md: false });
    const promptMinHeight = useBreakpointValue({ base: '60px', md: '80px' });
    const buttonSize = useBreakpointValue({ base: 'md', md: 'lg' });

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Invalid File',
                description: 'Please select an image file (PNG, JPG, etc.)',
                status: 'error',
                duration: 3000,
            });
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: 'File Too Large',
                description: 'Please select an image under 10MB',
                status: 'error',
                duration: 3000,
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setSourceImage(dataUrl);
            setSourcePreview(dataUrl);
            setEditedImage(null);
            setError(null);
        };
        reader.readAsDataURL(file);
    }, [toast]);

    const handleEdit = async () => {
        if (!sourceImage) {
            toast({
                title: 'No Image Selected',
                description: 'Please upload an image to edit',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        if (!prompt || prompt.trim().length === 0) {
            toast({
                title: 'Prompt Required',
                description: 'Please describe how you want to edit the image',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        setIsEditing(true);
        setError(null);
        setIsBlocked(false);
        setEditedImage(null);

        try {
            const response = await fetch('/api/image-studio/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceImage,
                    prompt,
                    negativePrompt,
                    strength,
                    width: 512,
                    height: 512,
                    steps: editSettings.steps,
                    cfgScale: editSettings.guidanceScale,
                    imgGuidanceScale: editSettings.imgGuidanceScale,
                    seed: editSettings.seed,
                }),
            });

            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('[ImageEditingPanel] Non-JSON response:', response.status, text.substring(0, 500));
                throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}`);
            }

            const result: EditResult = await response.json();

            if (result.blocked) {
                setIsBlocked(true);
                setError(result.message || 'Content blocked by safety filter');
                toast({
                    title: 'Content Blocked',
                    description: 'Your prompt contains content that is not allowed.',
                    status: 'warning',
                    duration: 5000,
                });
            } else if (!result.success) {
                setError(result.message || result.error || 'Edit failed');
                toast({
                    title: 'Edit Failed',
                    description: result.message || 'Please try again',
                    status: 'error',
                    duration: 5000,
                });
            } else if (result.images && result.images.length > 0) {
                setEditedImage(result.images[0]);
                const modelName = result.model || result.backend || 'HiDream E1.1';
                toast({
                    title: 'Image Edited!',
                    description: `${modelName} - Edited in ${Math.round((result.generationTime || 0) / 1000)}s`,
                    status: 'success',
                    duration: 3000,
                });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Network error';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 5000,
            });
        } finally {
            setIsEditing(false);
        }
    };

    const handleDownload = () => {
        if (editedImage?.url) {
            const link = document.createElement('a');
            link.href = editedImage.url;
            link.download = editedImage.filename || 'edited-image.png';
            link.click();
        }
    };

    const handleClear = () => {
        setSourceImage(null);
        setSourcePreview(null);
        setEditedImage(null);
        setError(null);
        setIsBlocked(false);
        setPrompt('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Fetch current tier for upgrade prompt
    const [currentTier, setCurrentTier] = useState('free');
    
    useEffect(() => {
        const fetchTier = async () => {
            try {
                const res = await fetch('/api/user/subscription');
                if (res.ok) {
                    const data = await res.json();
                    setCurrentTier(data.tier || 'free');
                }
            } catch (e) {
                console.warn('Failed to fetch subscription tier');
            }
        };
        if (!isPremium) {
            fetchTier();
        }
    }, [isPremium]);

    // Premium gate - show upgrade prompt if not premium
    if (!isPremium) {
        return (
            <Box h="100%" overflow="auto" p={{ base: 2, md: 4 }}>
                <GlassPanel p={{ base: 4, md: 8 }} maxW="800px" mx="auto">
                    <ImageEditingUpgradePrompt 
                        currentTier={currentTier}
                        onClose={onUpgradeClick}
                    />
                </GlassPanel>
            </Box>
        );
    }

    return (
        <VStack 
            h="100%" 
            spacing={{ base: 2, md: 4 }} 
            align="stretch"
            p={{ base: 2, md: 0 }}
            pb={{ base: 'env(safe-area-inset-bottom)', md: 0 }}
        >
            {/* Model Info Banner */}
            <Alert status="info" borderRadius="md" bg="purple.900" borderColor="purple.500" borderWidth="1px" py={2}>
                <AlertIcon color="purple.300" boxSize={4} />
                <Text fontSize="xs" color="purple.200">
                    Using <Text as="span" fontWeight="semibold" color="purple.100">HiDream E1.1</Text> (Image Editing Model)
                </Text>
            </Alert>

            {/* Image Preview Area */}
            <Box flex={1} position="relative" minH={{ base: '300px', md: '400px' }}>
                <GlassPanel h="100%" p={0} overflow="hidden">
                    <Flex h="100%" direction={{ base: 'column', md: 'row' }}>
                        {/* Source Image */}
                        <Box 
                            flex={1} 
                            borderRight={{ base: 'none', md: '1px solid' }}
                            borderBottom={{ base: '1px solid', md: 'none' }}
                            borderColor={borderColor}
                            position="relative"
                            minH={{ base: '200px', md: '300px' }}
                            overflow="hidden"
                        >
                            <Text 
                                position="absolute" 
                                top={2} 
                                left={2} 
                                fontSize="xs" 
                                color="gray.500"
                                bg="blackAlpha.600"
                                px={2}
                                py={0.5}
                                borderRadius="md"
                                zIndex={1}
                            >
                                Original
                            </Text>
                            {sourcePreview ? (
                                <Box w="100%" h="100%" display="flex" alignItems="center" justifyContent="center" bg={surfaceHover} p={2}>
                                    <img 
                                        src={sourcePreview} 
                                        alt="Source image"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                        }}
                                        onError={(e) => {
                                            console.error('Image failed to load:', sourcePreview?.substring(0, 100));
                                        }}
                                    />
                                </Box>
                            ) : (
                                <Center 
                                    h="100%" 
                                    bg={surfaceHover} 
                                    cursor="pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                    _hover={{ bg: 'whiteAlpha.100' }}
                                    transition="background 0.2s"
                                >
                                    <VStack spacing={2}>
                                        <Icon as={FiUpload} boxSize={8} color="gray.400" />
                                        <Text color="gray.400" fontSize="sm">
                                            Click to upload image
                                        </Text>
                                        <Text color="gray.500" fontSize="xs">
                                            PNG, JPG up to 10MB
                                        </Text>
                                    </VStack>
                                </Center>
                            )}
                        </Box>

                        {/* Edited Image */}
                        <Box flex={1} position="relative" minH={{ base: '150px', md: 'auto' }}>
                            <Text 
                                position="absolute" 
                                top={2} 
                                left={2} 
                                fontSize="xs" 
                                color="gray.500"
                                bg="blackAlpha.600"
                                px={2}
                                py={0.5}
                                borderRadius="md"
                                zIndex={1}
                            >
                                Edited
                            </Text>
                            {isEditing ? (
                                <Center h="100%" bg={surfaceHover}>
                                    <VStack spacing={2}>
                                        <Spinner size="xl" color={accentColor} thickness="3px" />
                                        <Text fontSize="sm" color="gray.500">Editing...</Text>
                                    </VStack>
                                </Center>
                            ) : isBlocked ? (
                                <Center h="100%" bg={surfaceHover} flexDirection="column" p={4}>
                                    <Icon as={FiAlertTriangle} boxSize={8} color="orange.400" mb={2} />
                                    <Text color="orange.400" fontWeight="medium" fontSize="sm">
                                        Content Blocked
                                    </Text>
                                </Center>
                            ) : editedImage ? (
                                <Box w="100%" h="100%" display="flex" alignItems="center" justifyContent="center" bg={surfaceHover} p={2}>
                                    <img 
                                        src={editedImage.url} 
                                        alt="Edited image"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                        }}
                                    />
                                </Box>
                            ) : (
                                <Center h="100%" bg={surfaceHover}>
                                    <VStack spacing={2}>
                                        <Icon as={FiImage} boxSize={8} color="gray.400" />
                                        <Text color="gray.400" fontSize="sm">
                                            Edited image will appear here
                                        </Text>
                                    </VStack>
                                </Center>
                            )}
                        </Box>
                    </Flex>
                </GlassPanel>
            </Box>

            {/* Controls */}
            <GlassPanel p={{ base: 3, md: 4 }}>
                <VStack spacing={3} align="stretch">
                    {/* Strength Slider */}
                    <FormControl>
                        <HStack justify="space-between" mb={1}>
                            <FormLabel fontSize="sm" mb={0}>
                                Edit Strength
                                <Badge ml={2} colorScheme="purple" fontSize="xs">HiDream E1.1</Badge>
                            </FormLabel>
                            <Badge colorScheme={strength > 0.7 ? 'red' : strength > 0.4 ? 'yellow' : 'green'}>
                                {Math.round(strength * 100)}%
                            </Badge>
                        </HStack>
                        <Tooltip 
                            label="HiDream E1.1: Lower values (20-40%) work best for instruction-based editing"
                            placement="top"
                        >
                            <Box>
                                <Slider
                                    value={strength}
                                    min={0.1}
                                    max={1.0}
                                    step={0.05}
                                    onChange={setStrength}
                                >
                                    <SliderTrack>
                                        <SliderFilledTrack bg={accentColor} />
                                    </SliderTrack>
                                    <SliderThumb boxSize={5} />
                                </Slider>
                            </Box>
                        </Tooltip>
                        <HStack justify="space-between" fontSize="xs" color="gray.500">
                            <Text>Subtle</Text>
                            <Text>Dramatic</Text>
                        </HStack>
                    </FormControl>

                    {/* Prompt Input */}
                    <HStack spacing={2} align="flex-end">
                        <Box flex={1}>
                            <Textarea
                                placeholder="Instruction for editing (e.g., 'Convert to Ghibli style', 'Make it look like a watercolor painting', 'Add snow to the scene')"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                minH={promptMinHeight}
                                resize="none"
                                fontSize={{ base: 'sm', md: 'md' }}
                                _focus={{ borderColor: accentColor }}
                            />
                        </Box>
                        <VStack spacing={1}>
                            <Button
                                colorScheme="purple"
                                size={buttonSize}
                                onClick={handleEdit}
                                isLoading={isEditing}
                                loadingText="Editing"
                                isDisabled={!sourceImage || !prompt}
                                leftIcon={<FiEdit3 />}
                                minW={{ base: '100px', md: '120px' }}
                            >
                                Edit
                            </Button>
                        </VStack>
                    </HStack>

                    {/* Action Buttons */}
                    <HStack spacing={2} justify="space-between">
                        <HStack spacing={2}>
                            <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<FiUpload />}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Upload
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<FiTrash2 />}
                                onClick={handleClear}
                                isDisabled={!sourceImage}
                            >
                                Clear
                            </Button>
                        </HStack>
                        <HStack spacing={2}>
                            {editedImage && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    leftIcon={<FiDownload />}
                                    onClick={handleDownload}
                                >
                                    Download
                                </Button>
                            )}
                            {editedImage && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    leftIcon={<FiRefreshCw />}
                                    onClick={() => {
                                        setSourceImage(editedImage.url);
                                        setSourcePreview(editedImage.url);
                                        setEditedImage(null);
                                    }}
                                >
                                    Use as Source
                                </Button>
                            )}
                        </HStack>
                    </HStack>

                    {/* Error Display */}
                    {error && !isBlocked && (
                        <Alert status="error" borderRadius="md" size="sm">
                            <AlertIcon />
                            <AlertDescription fontSize="sm">{error}</AlertDescription>
                        </Alert>
                    )}
                </VStack>
            </GlassPanel>

            {/* Hidden File Input */}
            <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                display="none"
            />
        </VStack>
    );
};

export default ImageEditingPanel;
