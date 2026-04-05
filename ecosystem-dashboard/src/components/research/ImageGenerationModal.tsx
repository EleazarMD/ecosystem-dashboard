import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Button,
  Textarea,
  Select,
  Text,
  Badge,
  Image,
  Box,
  Grid,
  useToast,
} from '@chakra-ui/react';

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

interface GeneratedImage {
  url: string;
  prompt: string;
  size: string;
  quality: string;
}

export const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
  isOpen,
  onClose,
  sessionId,
}) => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [quality, setQuality] = useState<'low' | 'medium'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  
  const toast = useToast();
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt required',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const res = await fetch('/api/research-lab/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || 'standalone',
          prompt,
          size,
          quality,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedImage(data.image);
        toast({
          title: 'Image generated!',
          description: 'GPT Image 1 - Medical visualization',
          status: 'success',
          duration: 3000,
        });
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error: any) {
      toast({
        title: 'Generation failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setPrompt('');
    setGeneratedImage(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Text>🎨 Generate Medical Visualization</Text>
            <Badge colorScheme="purple">GPT Image 1</Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Create accurate medical diagrams and scientific visualizations with proper text rendering
            </Text>

            <Textarea
              placeholder="Describe your medical/scientific visualization in detail..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              size="sm"
            />

            <HStack>
              <Select
                value={size}
                onChange={(e) => setSize(e.target.value as any)}
                size="sm"
              >
                <option value="1024x1024">1024×1024 (Square)</option>
                <option value="1792x1024">1792×1024 (Wide)</option>
                <option value="1024x1792">1024×1792 (Tall)</option>
              </Select>

              <Select
                value={quality}
                onChange={(e) => setQuality(e.target.value as any)}
                size="sm"
              >
                <option value="low">Low Quality ($0.011)</option>
                <option value="medium">Medium Quality ($0.042)</option>
              </Select>
            </HStack>

            <Button
              colorScheme="purple"
              onClick={generateImage}
              isLoading={isGenerating}
              loadingText="Generating..."
              isDisabled={!prompt.trim()}
              width="full"
            >
              Generate Image
            </Button>

            {generatedImage && (
              <Box
                borderRadius="md"
                overflow="hidden"
                borderWidth="1px"
                borderColor={borderColor}
                mt={4}
              >
                <Image src={generatedImage.url} alt={generatedImage.prompt} width="100%" />
                <Box p={3} bg={bgColor}>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={2}>
                    {generatedImage.prompt}
                  </Text>
                  <HStack spacing={2}>
                    <Badge size="sm">{generatedImage.size}</Badge>
                    <Badge size="sm" colorScheme="purple">{generatedImage.quality}</Badge>
                  </HStack>
                </Box>
              </Box>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
