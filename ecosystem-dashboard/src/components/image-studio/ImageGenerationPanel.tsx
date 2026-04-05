import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Textarea,
    Button,
    Icon,
    IconButton,
    Collapse,
    useDisclosure,
    Input,
    Center,
    Spinner,
    useToast,
    Image,
    Alert,
    AlertIcon,
    Badge,
} from '@chakra-ui/react';
import {
    FiSend,
    FiZap,
    FiMinusCircle,
    FiImage,
    FiDownload,
    FiShare2,
    FiTrash2,
    FiMaximize2,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { motion } from 'framer-motion';
import { useImageStudio } from '@/contexts/ImageStudioContext';

interface GeneratedImage {
    url: string;
    filename: string;
    seed?: number;
    model?: string;
}

interface PendingJob {
    jobId: string;
    prompt: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    createdAt: string;
}

export const ImageGenerationPanel: React.FC = () => {
    const { isOpen: showNegative, onToggle: toggleNegative } = useDisclosure();
    const [isGenerating, setIsGenerating] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [generationMode, setGenerationMode] = useState<'sync' | 'async'>('async');
    const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const { saveImage, addRecentPrompt, refreshGallery } = useImageStudio();
    const toast = useToast();

    const surfaceHover = useSemanticToken('surface.hover');
    const borderColor = useSemanticToken('border.subtle');
    const accentColor = useSemanticToken('interactive.primary');

    // Generation settings from right panel
    const [settings, setSettings] = useState({
        model: 'hidream-i1-full-nf4',
        width: 1360,
        height: 768,
        steps: 20,
        cfgScale: 7.0,
        seed: -1,
        sampler: 'euler_ancestral',
        scheduler: 'normal',
    });

    // Listen for settings changes from right panel
    useEffect(() => {
        const handleSettingsChange = (event: CustomEvent) => {
            setSettings(event.detail);
        };
        window.addEventListener('image-settings-change', handleSettingsChange as EventListener);
        return () => {
            window.removeEventListener('image-settings-change', handleSettingsChange as EventListener);
        };
    }, []);

    // Helper functions for job management
    const updateJobStatus = useCallback((jobId: string, status: PendingJob['status'], progress: number) => {
        setPendingJobs(prev => 
            prev.map(job => 
                job.jobId === jobId 
                    ? { ...job, status, progress }
                    : job
            )
        );
    }, []);

    const removeJob = useCallback((jobId: string) => {
        setPendingJobs(prev => prev.filter(job => job.jobId !== jobId));
    }, []);

    // Stream job status using Server-Sent Events (SSE)
    const streamJobStatus = useCallback(async (jobId: string) => {
        console.log(`[ImageGenerationPanel] Starting SSE stream for job ${jobId}`);
        
        const eventSource = new EventSource(`/api/image-studio/jobs/stream/${jobId}`);
        
        eventSource.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[ImageGenerationPanel] SSE message:', data);
                
                switch (data.type) {
                    case 'connected':
                        console.log(`[ImageGenerationPanel] Connected to stream for job ${data.jobId}`);
                        break;
                        
                    case 'progress':
                        updateJobStatus(data.jobId, data.status, data.progress?.percent || 0);
                        break;
                        
                    case 'completed':
                        if (data.resultUrl && data.resultFilename) {
                            setGeneratedImage({
                                url: data.resultUrl,
                                filename: data.resultFilename,
                                seed: -1,
                                model: '',
                            });
                            setCurrentJobId(null);
                            removeJob(data.jobId);
                            await refreshGallery();
                            toast({
                                title: 'Image Generated!',
                                description: `Generated in ${Math.round((data.generationTimeMs || 0) / 1000)}s`,
                                status: 'success',
                                duration: 3000,
                            });
                        }
                        eventSource.close();
                        break;
                        
                    case 'failed':
                        setError(data.errorMessage || 'Generation failed');
                        setCurrentJobId(null);
                        toast({
                            title: 'Generation Failed',
                            description: data.errorMessage || 'Please try again',
                            status: 'error',
                            duration: 5000,
                        });
                        setTimeout(() => removeJob(data.jobId), 3000);
                        eventSource.close();
                        break;
                        
                    case 'timeout':
                        setError('Generation timed out');
                        setCurrentJobId(null);
                        toast({
                            title: 'Generation Timeout',
                            description: 'The generation took too long. Please try again.',
                            status: 'error',
                            duration: 5000,
                        });
                        setTimeout(() => removeJob(data.jobId), 3000);
                        eventSource.close();
                        break;
                        
                    case 'error':
                        console.error('[ImageGenerationPanel] Stream error:', data.message);
                        setError(data.message || 'Stream error');
                        eventSource.close();
                        break;
                }
            } catch (err) {
                console.error('[ImageGenerationPanel] Error parsing SSE message:', err);
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('[ImageGenerationPanel] SSE connection error:', error);
            eventSource.close();
            // Fallback to polling if SSE fails
            console.log('[ImageGenerationPanel] Falling back to polling');
            pollJobStatusFallback(jobId);
        };
        
        // Store event source for cleanup
        return eventSource;
    }, [toast, refreshGallery, updateJobStatus, removeJob]);

    // Fallback polling method if SSE fails
    const pollJobStatusFallback = useCallback(async (jobId: string) => {
        let attempts = 0;
        const maxAttempts = 120;

        const poll = async () => {
            try {
                const response = await fetch(`/api/image-studio/jobs/${jobId}`);
                const result = await response.json();

                if (!result.success || !result.job) {
                    console.error('[ImageGenerationPanel] Job not found:', jobId);
                    updateJobStatus(jobId, 'failed', 0);
                    return;
                }

                const job = result.job;
                updateJobStatus(jobId, job.status, job.progress?.percent || 0);

                if (job.status === 'completed') {
                    if (job.resultUrl && job.resultFilename) {
                        setGeneratedImage({
                            url: job.resultUrl,
                            filename: job.resultFilename,
                            seed: job.seed,
                            model: job.model,
                        });
                        setCurrentJobId(null);
                        removeJob(jobId);
                        await refreshGallery();
                        toast({
                            title: 'Image Generated!',
                            description: `${job.model} - Generated in ${Math.round((job.generationTimeMs || 0) / 1000)}s`,
                            status: 'success',
                            duration: 3000,
                        });
                    }
                } else if (job.status === 'failed') {
                    setError(job.errorMessage || 'Generation failed');
                    setCurrentJobId(null);
                    toast({
                        title: 'Generation Failed',
                        description: job.errorMessage || 'Please try again',
                        status: 'error',
                        duration: 5000,
                    });
                    // Remove failed job after a short delay to allow user to see the error
                    setTimeout(() => removeJob(jobId), 3000);
                } else if (job.status === 'pending' || job.status === 'processing') {
                    // Continue polling
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(poll, 5000); // Poll every 5 seconds
                    } else {
                        setError('Generation timed out');
                        setCurrentJobId(null);
                        toast({
                            title: 'Generation Timeout',
                            description: 'The generation took too long. Please try again.',
                            status: 'error',
                            duration: 5000,
                        });
                        // Remove timed out job after showing error
                        setTimeout(() => removeJob(jobId), 3000);
                    }
                }
            } catch (err) {
                console.error('[ImageGenerationPanel] Polling error:', err);
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000);
                }
            }
        };

        poll();
    }, [toast, refreshGallery, updateJobStatus, removeJob]);

    // Poll job status
    const pollJobStatus = useCallback(async (jobId: string) => {
        const maxAttempts = 120; // 10 minutes with 5-second intervals
        let attempts = 0;

        const poll = async () => {
            try {
                const response = await fetch(`/api/image-studio/jobs/${jobId}`);
                const result = await response.json();

                if (!result.success || !result.job) {
                    console.error('[ImageGenerationPanel] Job not found:', jobId);
                    updateJobStatus(jobId, 'failed', 0);
                    return;
                }

                const job = result.job;
                updateJobStatus(jobId, job.status, job.progress?.percent || 0);

                if (job.status === 'completed') {
                    // Job completed - display the image
                    if (job.resultUrl && job.resultFilename) {
                        setGeneratedImage({
                            url: job.resultUrl,
                            filename: job.resultFilename,
                            seed: job.seed,
                            model: job.model,
                        });
                        setCurrentJobId(null);
                        removeJob(jobId);
                        await refreshGallery();
                        toast({
                            title: 'Image Generated!',
                            description: `${job.model} - Generated in ${Math.round((job.generationTimeMs || 0) / 1000)}s`,
                            status: 'success',
                            duration: 3000,
                        });
                    }
                } else if (job.status === 'failed') {
                    setError(job.errorMessage || 'Generation failed');
                    setCurrentJobId(null);
                    toast({
                        title: 'Generation Failed',
                        description: job.errorMessage || 'Please try again',
                        status: 'error',
                        duration: 5000,
                    });
                    // Remove failed job after a short delay to allow user to see the error
                    setTimeout(() => removeJob(jobId), 3000);
                } else if (job.status === 'pending' || job.status === 'processing') {
                    // Continue polling
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(poll, 5000); // Poll every 5 seconds
                    } else {
                        setError('Generation timed out');
                        setCurrentJobId(null);
                        toast({
                            title: 'Generation Timeout',
                            description: 'The generation took too long. Please try again.',
                            status: 'error',
                            duration: 5000,
                        });
                        // Remove timed out job after showing error
                        setTimeout(() => removeJob(jobId), 3000);
                    }
                }
            } catch (err) {
                console.error('[ImageGenerationPanel] Polling error:', err);
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000);
                }
            }
        };

        poll();
    }, [toast, refreshGallery, updateJobStatus, removeJob]);

    // Load pending jobs from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('imageStudio_pendingJobs');
        if (stored) {
            try {
                const jobs = JSON.parse(stored);
                setPendingJobs(jobs);
                // Start polling for any pending/processing jobs
                jobs.forEach((job: PendingJob) => {
                    if (job.status === 'pending' || job.status === 'processing') {
                        streamJobStatus(job.jobId);
                    }
                });
            } catch (e) {
                console.error('Failed to parse pending jobs:', e);
            }
        }
    }, [pollJobStatus, streamJobStatus]);

    // Save pending jobs to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('imageStudio_pendingJobs', JSON.stringify(pendingJobs));
    }, [pendingJobs]);

    const handleGenerate = async () => {
        if (!prompt || prompt.trim().length === 0) {
            toast({
                title: 'Prompt required',
                description: 'Please enter a prompt to generate an image',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        setIsGenerating(true);
        setError(null);
        setGeneratedImage(null);

        try {
            if (generationMode === 'async') {
                // Async mode - submit job and poll
                console.log('[ImageGenerationPanel] Submitting async job');
                const response = await fetch('/api/image-studio/jobs/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt,
                        negativePrompt,
                        width: settings.width,
                        height: settings.height,
                        steps: settings.steps,
                        cfgScale: settings.cfgScale,
                        seed: settings.seed,
                        model: settings.model,
                    }),
                });

                const result = await response.json();

                if (!result.success) {
                    setError(result.message || result.error || 'Failed to submit job');
                    toast({
                        title: 'Submission Failed',
                        description: result.message || 'Please try again',
                        status: 'error',
                        duration: 5000,
                    });
                    setIsGenerating(false);
                    return;
                }

                // Add job to pending list
                const newJob: PendingJob = {
                    jobId: result.jobId!,
                    prompt: prompt.substring(0, 100),
                    status: 'pending',
                    progress: 0,
                    createdAt: new Date().toISOString(),
                };
                setPendingJobs(prev => [...prev, newJob]);
                setCurrentJobId(result.jobId!);

                // Add to recent prompts
                addRecentPrompt(prompt);

                toast({
                    title: 'Job Queued',
                    description: 'You can navigate away. We\'ll notify you when it\'s ready.',
                    status: 'info',
                    duration: 5000,
                });

                // Start streaming
                streamJobStatus(result.jobId!);
            } else {
                // Sync mode - wait for response (streaming/live)
                console.log('[ImageGenerationPanel] Sending sync generation request:', {
                    prompt: prompt.substring(0, 50),
                    settings
                });

                const response = await fetch('/api/image-studio/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,
                    negativePrompt,
                    width: settings.width,
                    height: settings.height,
                    steps: settings.steps,
                    cfgScale: settings.cfgScale,
                    seed: settings.seed,
                    sampler: settings.sampler,
                    scheduler: settings.scheduler,
                }),
            });

            console.log('[ImageGenerationPanel] Response status:', response.status);

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('[ImageGenerationPanel] Non-JSON response:', response.status, text.substring(0, 500));
                throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}`);
            }

            const result = await response.json();
            console.log('[ImageGenerationPanel] Response data:', result);

            if (!result.success) {
                setError(result.message || result.error || 'Generation failed');
                toast({
                    title: 'Generation Failed',
                    description: result.message || 'Please try again',
                    status: 'error',
                    duration: 5000,
                });
            } else if (result.images && result.images.length > 0) {
                const image = result.images[0];
                setGeneratedImage({
                    url: image.url,
                    filename: image.filename,
                    seed: result.seed,
                    model: result.model || 'HiDream I1',
                });

                    // Save to database and add to gallery
                    await saveImage({
                        prompt,
                        negative_prompt: negativePrompt,
                        model: result.model || 'hidream-i1-full-nf4',
                        width: settings.width,
                        height: settings.height,
                        steps: settings.steps,
                        cfg_scale: settings.cfgScale,
                        seed: result.seed,
                        filename: image.filename,
                        file_path: image.url,
                    });

                    // Add to recent prompts
                    addRecentPrompt(prompt);

                    toast({
                        title: 'Image Generated!',
                        description: `${result.model || 'HiDream I1'} - Generated in ${Math.round((result.generationTime || 0) / 1000)}s`,
                        status: 'success',
                        duration: 3000,
                    });
                }
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
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (generatedImage?.url) {
            const link = document.createElement('a');
            link.href = generatedImage.url;
            link.download = generatedImage.filename || 'generated-image.png';
            link.click();
        }
    };

    return (
        <VStack h="100%" spacing={4} align="stretch">

            {/* Model Info Banner */}
            <Alert status="info" borderRadius="md" bg="purple.900" borderColor="purple.500" borderWidth="1px" py={2}>
                <AlertIcon color="purple.300" boxSize={4} />
                <Text fontSize="xs" color="purple.200">
                    Using <Text as="span" fontWeight="semibold" color="purple.100">HiDream I1 Full</Text> (Text-to-Image Model)
                </Text>
                <Badge ml="auto" colorScheme="purple" fontSize="xs">
                    {settings.width}×{settings.height}
                </Badge>
            </Alert>

            {/* Pending Jobs Display */}
            {pendingJobs.length > 0 && (
                <GlassPanel p={3}>
                    <VStack align="stretch" spacing={2}>
                        <HStack justify="space-between">
                            <Text fontSize="xs" fontWeight="semibold" color="gray.400">
                                Pending Jobs ({pendingJobs.length})
                            </Text>
                            {pendingJobs.some(j => j.status === 'failed') && (
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={() => {
                                        setPendingJobs(prev => prev.filter(j => j.status !== 'failed'));
                                    }}
                                >
                                    Clear Failed
                                </Button>
                            )}
                        </HStack>
                        {pendingJobs.map((job) => (
                            <HStack key={job.jobId} spacing={3} p={2} bg={surfaceHover} borderRadius="md">
                                {job.status === 'failed' ? (
                                    <Icon as={FiTrash2} color="red.400" boxSize={3} />
                                ) : (
                                    <Spinner size="xs" color={accentColor} />
                                )}
                                <VStack align="start" spacing={0} flex={1}>
                                    <Text fontSize="xs" noOfLines={1}>{job.prompt}</Text>
                                    <Text fontSize="xs" color={job.status === 'failed' ? 'red.400' : 'gray.500'}>
                                        {job.status === 'pending' ? 'Queued' : job.status === 'failed' ? 'Failed' : `Processing ${job.progress}%`}
                                    </Text>
                                </VStack>
                                <Badge 
                                    colorScheme={
                                        job.status === 'processing' ? 'blue' : 
                                        job.status === 'failed' ? 'red' : 
                                        'gray'
                                    } 
                                    fontSize="xs"
                                >
                                    {job.status}
                                </Badge>
                                {job.status === 'failed' && (
                                    <IconButton
                                        aria-label="Remove failed job"
                                        icon={<FiTrash2 />}
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="red"
                                        onClick={() => removeJob(job.jobId)}
                                    />
                                )}
                            </HStack>
                        ))}
                    </VStack>
                </GlassPanel>
            )}

            {/* Preview Area */}
            <Box flex={1} position="relative">
                <GlassPanel h="100%" p={0} overflow="hidden" display="flex" alignItems="center" justifyContent="center">
                    {isGenerating ? (
                        <VStack spacing={4}>
                            <Spinner size="xl" color={accentColor} thickness="3px" />
                            <Text fontSize="sm" color="gray.500">Dreaming...</Text>
                        </VStack>
                    ) : generatedImage ? (
                        <Box w="100%" h="100%" display="flex" alignItems="center" justifyContent="center" bg={surfaceHover} p={4}>
                            <Image 
                                src={generatedImage.url} 
                                alt={prompt}
                                maxW="100%"
                                maxH="100%"
                                objectFit="contain"
                            />
                        </Box>
                    ) : (
                        <Center w="100%" h="100%" bg={surfaceHover} flexDirection="column" p={8}>
                            <Icon as={FiImage} boxSize={12} color="gray.600" mb={4} />
                            <Text color="gray.500">Your masterpiece will appear here</Text>
                        </Center>
                    )}

                    {/* Overlay Actions (visible on hover/generated) */}
                    {generatedImage && !isGenerating && (
                        <HStack position="absolute" top={4} right={4} spacing={2}>
                            <IconButton 
                                aria-label="Download" 
                                icon={<FiDownload />} 
                                size="sm" 
                                variant="solid"
                                onClick={handleDownload}
                            />
                        </HStack>
                    )}
                </GlassPanel>
            </Box>

            {/* Prompt Input Area */}
            <GlassPanel p={4}>
                <VStack spacing={3} align="stretch">
                    <HStack align="start" spacing={3}>
                        <Box flex={1} position="relative">
                            <Textarea
                                placeholder="Describe your imagination... (e.g. 'A cyberpunk city with neon lights, rainy streets, 8k resolution')"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                minH="80px"
                                resize="none"
                                border="none"
                                bg="transparent"
                                _focus={{ boxShadow: 'none' }}
                                p={0}
                                pr="100px"
                                fontSize="md"
                            />
                            {/* Inline Mode Toggle */}
                            <Button
                                position="absolute"
                                bottom="4px"
                                right="4px"
                                size="xs"
                                variant={generationMode === 'async' ? 'solid' : 'outline'}
                                colorScheme={generationMode === 'async' ? 'green' : 'purple'}
                                onClick={() => setGenerationMode(generationMode === 'async' ? 'sync' : 'async')}
                                leftIcon={generationMode === 'async' ? <FiZap /> : <FiImage />}
                                fontSize="xs"
                                h="24px"
                                px={2}
                            >
                                {generationMode === 'async' ? 'Queue' : 'Live'}
                            </Button>
                        </Box>
                        <VStack spacing={2}>
                            <Button
                                colorScheme="blue"
                                size="lg"
                                h="80px"
                                w="100px"
                                onClick={handleGenerate}
                                isLoading={isGenerating}
                                loadingText="..."
                            >
                                <VStack spacing={0}>
                                    <Icon as={FiSend} mb={1} />
                                    <Text fontSize="xs">Generate</Text>
                                </VStack>
                            </Button>
                        </VStack>
                    </HStack>

                    <HStack justify="space-between">
                        <Button
                            size="xs"
                            variant="ghost"
                            leftIcon={<FiMinusCircle />}
                            onClick={toggleNegative}
                            color={showNegative ? 'red.400' : 'gray.500'}
                        >
                            Negative Prompt
                        </Button>
                        <Button size="xs" variant="ghost" leftIcon={<FiZap />} color="yellow.400">
                            Magic Enhance
                        </Button>
                    </HStack>

                    <Collapse in={showNegative} animateOpacity>
                        <Input
                            placeholder="Things to avoid (e.g. blurry, bad anatomy, text)"
                            size="sm"
                            variant="filled"
                            bg={surfaceHover}
                            borderColor={borderColor}
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                        />
                    </Collapse>

                    {/* Error Display */}
                    {error && (
                        <Alert status="error" borderRadius="md" size="sm">
                            <AlertIcon />
                            <Text fontSize="sm">{error}</Text>
                        </Alert>
                    )}
                </VStack>
            </GlassPanel>
        </VStack>
    );
};
