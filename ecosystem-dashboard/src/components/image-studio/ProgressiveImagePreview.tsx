import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Progress,
    Image,
    Center,
    Icon,
    Spinner,
} from '@chakra-ui/react';
import { FiImage, FiZap } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ProgressData {
    type: 'start' | 'progress' | 'preview' | 'executing' | 'executed' | 'complete' | 'error' | 'blocked';
    promptId?: string;
    step?: number;
    maxSteps?: number;
    percent?: number;
    preview?: string; // Base64 preview image
    node?: string;
    error?: string;
    images?: Array<{ url: string; filename: string }>;
}

interface ProgressiveImagePreviewProps {
    isGenerating: boolean;
    jobId?: string;
    onComplete?: (result: any) => void;
    onError?: (error: string) => void;
    streamUrl?: string;
    fallbackImage?: string;
}

const MotionBox = motion(Box);
const MotionImage = motion(Image);

export const ProgressiveImagePreview: React.FC<ProgressiveImagePreviewProps> = ({
    isGenerating,
    jobId,
    onComplete,
    onError,
    streamUrl,
    fallbackImage,
}) => {
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const [maxSteps, setMaxSteps] = useState(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Initializing...');
    const [finalImage, setFinalImage] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const surfaceHover = useSemanticToken('surface.hover');
    const accentColor = useSemanticToken('interactive.primary');

    // Clean up SSE connection on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    // Connect to SSE stream when generating starts
    useEffect(() => {
        if (!isGenerating || !streamUrl) {
            return;
        }

        // Reset state
        setProgress(0);
        setCurrentStep(0);
        setMaxSteps(0);
        setPreviewImage(null);
        setFinalImage(null);
        setStatus('Connecting...');

        // For SSE with POST, we need to use fetch instead of EventSource
        const controller = new AbortController();
        
        const connectToStream = async () => {
            try {
                const response = await fetch(streamUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream',
                    },
                    body: JSON.stringify({}), // Will be populated by parent
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();

                if (!reader) {
                    throw new Error('No response body');
                }

                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    let currentEvent = '';
                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            currentEvent = line.slice(7);
                        } else if (line.startsWith('data: ')) {
                            try {
                                const data: ProgressData = JSON.parse(line.slice(6));
                                handleProgressEvent(currentEvent, data);
                            } catch (e) {
                                console.warn('Failed to parse SSE data:', line);
                            }
                        }
                    }
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('SSE connection error:', error);
                    onError?.(error.message);
                }
            }
        };

        connectToStream();

        return () => {
            controller.abort();
        };
    }, [isGenerating, streamUrl]);

    const handleProgressEvent = useCallback((event: string, data: ProgressData) => {
        switch (event || data.type) {
            case 'start':
                setStatus('Starting generation...');
                break;

            case 'progress':
                if (data.step !== undefined && data.maxSteps !== undefined) {
                    setCurrentStep(data.step);
                    setMaxSteps(data.maxSteps);
                    setProgress(data.percent || Math.round((data.step / data.maxSteps) * 100));
                    setStatus(`Step ${data.step}/${data.maxSteps}`);
                }
                break;

            case 'preview':
                if (data.preview) {
                    setPreviewImage(data.preview);
                    setStatus('Refining details...');
                }
                break;

            case 'executing':
                setStatus(`Processing node ${data.node}...`);
                break;

            case 'complete':
            case 'executed':
                if (data.images && data.images.length > 0) {
                    setFinalImage(data.images[0].url);
                    setProgress(100);
                    setStatus('Complete!');
                    onComplete?.(data);
                }
                break;

            case 'error':
                setStatus('Error');
                onError?.(data.error || 'Generation failed');
                break;

            case 'blocked':
                setStatus('Blocked');
                onError?.(data.error || 'Content blocked');
                break;
        }
    }, [onComplete, onError]);

    // Determine what to show
    const displayImage = finalImage || previewImage || fallbackImage;
    const isComplete = progress >= 100 && finalImage;

    return (
        <Box position="relative" w="100%" h="100%">
            <AnimatePresence mode="wait">
                {isGenerating && !displayImage ? (
                    // Initial loading state with animated gradient
                    <MotionBox
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        position="absolute"
                        inset={0}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        bg={surfaceHover}
                    >
                        <VStack spacing={4}>
                            <Box position="relative">
                                <Spinner
                                    size="xl"
                                    color={accentColor}
                                    thickness="3px"
                                    speed="0.8s"
                                />
                                <Icon
                                    as={FiZap}
                                    position="absolute"
                                    top="50%"
                                    left="50%"
                                    transform="translate(-50%, -50%)"
                                    color={accentColor}
                                    boxSize={6}
                                />
                            </Box>
                            <Text fontSize="sm" color="gray.500">{status}</Text>
                            {maxSteps > 0 && (
                                <VStack spacing={1} w="200px">
                                    <Progress
                                        value={progress}
                                        size="sm"
                                        colorScheme="blue"
                                        borderRadius="full"
                                        w="100%"
                                        hasStripe
                                        isAnimated
                                    />
                                    <Text fontSize="xs" color="gray.400">
                                        {currentStep}/{maxSteps} steps ({progress}%)
                                    </Text>
                                </VStack>
                            )}
                        </VStack>
                    </MotionBox>
                ) : displayImage ? (
                    // Progressive image reveal
                    <MotionBox
                        key="image"
                        initial={{ opacity: 0, filter: 'blur(20px)' }}
                        animate={{ 
                            opacity: 1, 
                            filter: isComplete ? 'blur(0px)' : `blur(${Math.max(0, 15 - progress / 7)}px)` 
                        }}
                        transition={{ duration: 0.3 }}
                        position="absolute"
                        inset={0}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Image
                            src={displayImage}
                            alt="Generated preview"
                            objectFit="contain"
                            maxH="100%"
                            maxW="100%"
                            borderRadius="md"
                        />
                        
                        {/* Progress overlay while generating */}
                        {isGenerating && !isComplete && (
                            <Box
                                position="absolute"
                                bottom={4}
                                left="50%"
                                transform="translateX(-50%)"
                                bg="blackAlpha.700"
                                px={4}
                                py={2}
                                borderRadius="full"
                            >
                                <HStack spacing={3}>
                                    <Spinner size="sm" color="white" />
                                    <Text fontSize="sm" color="white" fontWeight="medium">
                                        {status}
                                    </Text>
                                    {maxSteps > 0 && (
                                        <Text fontSize="sm" color="whiteAlpha.700">
                                            {progress}%
                                        </Text>
                                    )}
                                </HStack>
                            </Box>
                        )}
                    </MotionBox>
                ) : (
                    // Empty state
                    <Center w="100%" h="100%" bg={surfaceHover} flexDirection="column" p={8}>
                        <Icon as={FiImage} boxSize={12} color="gray.600" mb={4} />
                        <Text color="gray.500">Your masterpiece will appear here</Text>
                    </Center>
                )}
            </AnimatePresence>
        </Box>
    );
};

export default ProgressiveImagePreview;
