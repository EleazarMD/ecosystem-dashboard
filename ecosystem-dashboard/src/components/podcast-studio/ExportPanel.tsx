import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Icon,
  Switch,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { FiShare2, FiMap, FiCreditCard, FiExternalLink, FiDownload } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ExportPanelProps {
  script?: any[]; // Podcast script data
}

export default function ExportPanel({ script }: ExportPanelProps) {
  const [autoExport, setAutoExport] = useState(false);

  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');
  const surfaceHover = useSemanticToken('surface.hover');

  const exportOptions = [
    {
      id: 'mindmap',
      name: 'Mind Map',
      description: 'Visual concept mapping',
      icon: FiMap,
      gradient: 'linear(to-br, pink.400, rose.500)',
      color: 'pink',
      available: true,
    },
    {
      id: 'flashcards',
      name: 'Flashcards',
      description: 'Study cards from insights',
      icon: FiCreditCard,
      gradient: 'linear(to-br, teal.400, cyan.500)',
      color: 'teal',
      available: true,
    },
    {
      id: 'sources',
      name: 'To Sources Panel',
      description: 'Add as research material',
      icon: FiDownload,
      gradient: 'linear(to-br, purple.400, indigo.500)',
      color: 'purple',
      available: true,
    },
  ];

  const integrations = [
    {
      id: 'pcg-learning',
      name: 'PCG Learning Platform',
      description: 'Medical education platform',
      status: 'coming-soon',
      icon: FiExternalLink,
    },
    {
      id: 'kids-learning',
      name: 'Kids Learning Platform',
      description: 'Educational content for children',
      status: 'coming-soon',
      icon: FiExternalLink,
    },
  ];

  const handleExport = (type: string) => {
    console.log('Exporting to:', type);
    // TODO: Implement export functionality for Mind Maps, Flashcards, etc.
  };

  const handleDownloadScript = (format: 'json' | 'markdown' | 'txt') => {
    if (!script || script.length === 0) {
      console.error('No script available to download');
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'json':
        content = JSON.stringify({
          metadata: {
            generated: new Date().toISOString(),
            turns: script.length,
            exportedBy: 'AI Homelab Podcast Studio'
          },
          script
        }, null, 2);
        filename = `podcast-script-${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      
      case 'markdown':
        // Calculate total word count and estimated duration
        const totalWords = script.reduce((sum: number, turn: any) => 
          sum + (turn.content?.split(' ').length || 0), 0);
        const estimatedMinutes = Math.ceil(totalWords / 150); // 150 words per minute
        
        content = `# Podcast Script\n\n`;
        content += `**Generated:** ${new Date().toLocaleString()}\n\n`;
        content += `**Statistics:**\n`;
        content += `- Total Turns: ${script.length}\n`;
        content += `- Total Words: ${totalWords}\n`;
        content += `- Estimated Duration: ~${estimatedMinutes} minutes\n\n`;
        content += `---\n\n`;
        
        script.forEach((turn: any, index: number) => {
          const wordCount = turn.content?.split(' ').length || 0;
          content += `## Turn ${index + 1}: ${turn.speaker || `Speaker ${index + 1}`}\n\n`;
          content += `*${wordCount} words*\n\n`;
          content += `${turn.content}\n\n`;
          content += `---\n\n`;
        });
        
        filename = `podcast-script-${Date.now()}.md`;
        mimeType = 'text/markdown';
        break;
      
      case 'txt':
        content = `PODCAST SCRIPT\n`;
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `Total Turns: ${script.length}\n\n`;
        content += `${'='.repeat(60)}\n\n`;
        
        script.forEach((turn: any, index: number) => {
          content += `[Turn ${index + 1}] ${turn.speaker || `Speaker ${index + 1}`}:\n`;
          content += `${turn.content}\n\n`;
          content += `${'-'.repeat(60)}\n\n`;
        });
        
        filename = `podcast-script-${Date.now()}.txt`;
        mimeType = 'text/plain';
        break;
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto" bg={bgColor}>
      {/* Header */}
      <HStack justify="space-between" px={4} py={3}>
        <HStack spacing={2}>
          <FiShare2 color="purple" />
          <Text 
            fontSize="14px" 
            fontWeight="500" 
            color={textColor}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            Export & Share
          </Text>
        </HStack>
        <Badge colorScheme="purple" fontSize="11px">
          3 available
        </Badge>
      </HStack>

      {/* Auto-Export Setting */}
      <Box px={4} pb={4}>
        <Box
          p={4}
          bg={cardBg}
          borderRadius="xl"
          boxShadow="md"
          border="1px solid"
          borderColor={borderColor}
        >
          <FormControl display="flex" alignItems="center" justifyContent="space-between">
            <FormLabel 
              htmlFor="auto-export" 
              mb={0}
              fontSize="13px"
              fontWeight="500"
              color={textColor}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              Auto-export insights
            </FormLabel>
            <Switch 
              id="auto-export" 
              isChecked={autoExport}
              onChange={(e) => setAutoExport(e.target.checked)}
              colorScheme="purple"
            />
          </FormControl>
          <Text 
            fontSize="11px" 
            color={mutedColor}
            mt={2}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            Automatically add pinned insights to sources
          </Text>
        </Box>
      </Box>

      {/* Script Download Options */}
      <Box px={4} pb={4}>
        <Text 
          fontSize="12px" 
          fontWeight="600" 
          color={textColor}
          mb={3}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
        >
          Download Script
        </Text>
        
        {!script || script.length === 0 ? (
          <Box
            p={4}
            bg={cardBg}
            borderRadius="xl"
            border="1px solid"
            borderColor="orange.500"
            textAlign="center"
          >
            <Text fontSize="13px" color={textColor} fontWeight="500" mb={2}>
              📝 No Script Available
            </Text>
            <Text fontSize="11px" color={mutedColor}>
              Generate a script first from the Script Generator tab, then return here to export it.
            </Text>
          </Box>
        ) : (
          <VStack spacing={2}>
            <Button
              size="sm"
              w="full"
              colorScheme="blue"
              leftIcon={<FiDownload />}
              onClick={() => handleDownloadScript('markdown')}
            >
              📄 Markdown (.md) - Recommended
            </Button>
            <Button
              size="sm"
              w="full"
              colorScheme="purple"
              leftIcon={<FiDownload />}
              onClick={() => handleDownloadScript('json')}
            >
              🗂️ JSON (.json) - For Re-import
            </Button>
            <Button
              size="sm"
              w="full"
              colorScheme="gray"
              leftIcon={<FiDownload />}
              onClick={() => handleDownloadScript('txt')}
            >
              📝 Plain Text (.txt)
            </Button>
            
            <Box
              mt={2}
              p={3}
              bg={cardBg}
              borderRadius="lg"
              w="full"
            >
              <Text fontSize="11px" color={textColor} fontWeight="500">
                ✅ Script Ready: {script.length} turns
              </Text>
            </Box>
          </VStack>
        )}
      </Box>

      {/* Export Options */}
      <Box px={4} pb={4}>
        <Text 
          fontSize="12px" 
          fontWeight="600" 
          color={textColor}
          mb={3}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
        >
          Export Tools
        </Text>
        <VStack spacing={3}>
          {exportOptions.map((option) => (
            <Box
              key={option.id}
              p={4}
              bg={cardBg}
              border="2px solid"
              borderColor={`${option.color}.500`}
              borderRadius="2xl"
              boxShadow="lg"
              w="full"
              position="relative"
              overflow="hidden"
              transition="all 0.3s ease"
              cursor="pointer"
              onClick={() => handleExport(option.id)}
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: '2xl',
              }}
              _before={{
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bg: surfaceHover,
                zIndex: 0,
              }}
            >
              <HStack spacing={3} position="relative" zIndex={1}>
                <Box
                  w="40px"
                  h="40px"
                  borderRadius="xl"
                  bg={surfaceHover}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={option.icon} color={`${option.color}.500`} boxSize={5} />
                </Box>
                <VStack align="flex-start" spacing={0} flex={1}>
                  <Text 
                    fontSize="13px" 
                    fontWeight="600" 
                    color={textColor}
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  >
                    {option.name}
                  </Text>
                  <Text 
                    fontSize="11px" 
                    color={mutedColor}
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  >
                    {option.description}
                  </Text>
                </VStack>
                <Icon as={FiExternalLink} color={mutedColor} boxSize={4} />
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Platform Integrations */}
      <Box px={4} pb={4}>
        <Text 
          fontSize="12px" 
          fontWeight="600" 
          color={textColor}
          mb={3}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
        >
          Platform Integrations
        </Text>
        <VStack spacing={3}>
          {integrations.map((integration) => (
            <Box
              key={integration.id}
              p={4}
              bg={cardBg}
              borderRadius="xl"
              boxShadow="md"
              border="1px solid"
              borderColor={borderColor}
              w="full"
              opacity={integration.status === 'coming-soon' ? 0.6 : 1}
            >
              <HStack spacing={3}>
                <Box
                  w="40px"
                  h="40px"
                  borderRadius="xl"
                  bg={surfaceHover}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={integration.icon} color={useSemanticToken('text.secondary')} boxSize={5} />
                </Box>
                <VStack align="flex-start" spacing={0} flex={1}>
                  <HStack>
                    <Text 
                      fontSize="13px" 
                      fontWeight="600" 
                      color={textColor}
                      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                    >
                      {integration.name}
                    </Text>
                    {integration.status === 'coming-soon' && (
                      <Badge fontSize="9px" colorScheme="yellow">
                        Coming Soon
                      </Badge>
                    )}
                  </HStack>
                  <Text 
                    fontSize="11px" 
                    color={mutedColor}
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  >
                    {integration.description}
                  </Text>
                </VStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Info */}
      <Box
        mx={4}
        mb={4}
        p={4}
        bg={cardBg}
        borderRadius="xl"
        borderLeft="4px solid"
        borderLeftColor="purple.400"
      >
        <Text 
          fontSize="12px" 
          color={textColor}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          fontWeight="500"
        >
          🚀 Export your research to various formats or integrate with learning platforms to extend your content reach.
        </Text>
      </Box>
    </VStack>
  );
}
