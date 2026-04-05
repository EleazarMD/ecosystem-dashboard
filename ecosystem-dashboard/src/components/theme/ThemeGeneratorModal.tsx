import React, { useState, useRef } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    VStack,
    Text,
    Box,
    Image as ChakraImage,
    useToast,
    Input,
    FormControl,
    FormLabel,
    HStack,
    Spinner,
} from '@chakra-ui/react';
import { ThemePreset } from '../../theme/types';
import { generateThemeFromImage } from '../../utils/theme-generator';
import { ThemePreview } from './ThemePreview';

interface ThemeGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyTheme: (theme: ThemePreset) => void;
}

export const ThemeGeneratorModal: React.FC<ThemeGeneratorModalProps> = ({
    isOpen,
    onClose,
    onApplyTheme,
}) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [generatedTheme, setGeneratedTheme] = useState<ThemePreset | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [unsplashLoading, setUnsplashLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    const handleGenerate = async () => {
        if (!imageUrl) return;

        setIsGenerating(true);
        try {
            const theme = await generateThemeFromImage(imageUrl);
            setGeneratedTheme(theme);
            toast({
                title: 'Theme Generated',
                description: 'Preview your new theme below.',
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            console.error(error);
            toast({
                title: 'Generation Failed',
                description: 'Could not extract colors from the image.',
                status: 'error',
                duration: 4000,
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUnsplashSurprise = async () => {
        setUnsplashLoading(true);
        try {
            // Dynamic import to avoid circular dependencies if any
            const { unsplashService } = await import('../../services/unsplash');
            const photo = await unsplashService.getRandomBackground();

            setImageUrl(photo.urls.regular);

            // Trigger download tracking
            unsplashService.trackDownload(photo.links.download_location);

            toast({
                title: 'Image Found',
                description: `Photo by ${photo.user.name} from Unsplash`,
                status: 'success',
                duration: 2000,
            });

            // Auto-generate theme after a short delay to allow image to load
            setTimeout(() => {
                // We need to wait for the image to be set in state and loaded in the DOM
                // But for now, we can just let the user click "Generate" or trigger it if we had a way to know it's loaded.
                // Better UX: Just set the URL and let the user click Generate, or auto-click.
                // We'll let the user click Generate to confirm they like the image.
            }, 500);

        } catch (error: any) {
            console.error('Unsplash Error:', error);
            toast({
                title: 'Unsplash Error',
                description: error.message || 'Failed to fetch image',
                status: 'error',
                duration: 4000,
            });
        } finally {
            setUnsplashLoading(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleApply = () => {
        if (generatedTheme) {
            onApplyTheme(generatedTheme);
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay backdropFilter="blur(10px)" />
            <ModalContent bg="gray.900" borderColor="whiteAlpha.200" borderWidth="1px">
                <ModalHeader>Theme Generator</ModalHeader>
                <ModalBody>
                    <VStack spacing={6} align="stretch">
                        <Text color="gray.400" fontSize="sm">
                            Upload an image, paste a URL, or grab a random one from Unsplash to generate a cohesive theme.
                        </Text>

                        <FormControl>
                            <FormLabel>Image Source</FormLabel>
                            <HStack>
                                <Input
                                    placeholder="https://example.com/image.jpg"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    bg="blackAlpha.400"
                                    border="none"
                                />
                                <Button onClick={() => fileInputRef.current?.click()}>
                                    Upload
                                </Button>
                                <Button
                                    colorScheme="purple"
                                    variant="outline"
                                    isLoading={unsplashLoading}
                                    onClick={handleUnsplashSurprise}
                                    leftIcon={<Box as="span">🎲</Box>}
                                >
                                    Surprise Me
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    hidden
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                            </HStack>
                        </FormControl>

                        {imageUrl && (
                            <Box
                                borderRadius="md"
                                overflow="hidden"
                                maxH="200px"
                                position="relative"
                            >
                                <ChakraImage
                                    src={imageUrl}
                                    objectFit="cover"
                                    w="100%"
                                    h="100%"
                                    opacity={0.7}
                                />
                                <Button
                                    position="absolute"
                                    top="50%"
                                    left="50%"
                                    transform="translate(-50%, -50%)"
                                    colorScheme="blue"
                                    onClick={handleGenerate}
                                    isLoading={isGenerating}
                                    loadingText="Analyzing..."
                                >
                                    Generate Theme
                                </Button>
                            </Box>
                        )}

                        {generatedTheme && (
                            <Box>
                                <Text mb={2} fontWeight="bold">Preview</Text>
                                <ThemePreview preset={generatedTheme} />
                            </Box>
                        )}
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        colorScheme="green"
                        onClick={handleApply}
                        isDisabled={!generatedTheme}
                    >
                        Apply Theme
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
