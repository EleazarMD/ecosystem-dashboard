import React from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Link,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { ExternalLinkIcon, QuestionIcon } from '@chakra-ui/icons';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Citation {
  title?: string;
  url: string;
  snippet?: string;
}

interface PerplexityMetadata {
  source?: string;
  model?: string;
  citations?: Citation[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface PerplexityResponseRendererProps {
  content: string;
  metadata: PerplexityMetadata;
}

const PerplexityResponseRenderer: React.FC<PerplexityResponseRendererProps> = ({
  content,
  metadata
}) => {
  const borderColor = useSemanticToken('border.default');
  const bgColor = useSemanticToken('interactive.surface');
  const linkColor = useSemanticToken('interactive.primary');
  
  // Parse content to separate main text from sources and related questions
  const sections = content.split(/\n\n\*\*(Sources|Related Questions):\*\*/);
  const mainContent = sections[0];
  
  let sources: string[] = [];
  let relatedQuestions: string[] = [];
  
  for (let i = 1; i < sections.length; i += 2) {
    const sectionType = sections[i];
    const sectionContent = sections[i + 1];
    
    if (sectionType === 'Sources' && sectionContent) {
      sources = sectionContent
        .split('\n')
        .filter(line => line.trim().startsWith('1.') || line.trim().match(/^\d+\./))
        .map(line => line.trim());
    } else if (sectionType === 'Related Questions' && sectionContent) {
      relatedQuestions = sectionContent
        .split('\n')
        .filter(line => line.trim().startsWith('•'))
        .map(line => line.trim().substring(1).trim());
    }
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Search Response Badge */}
      <HStack spacing={2}>
        <Badge colorScheme="blue" variant="solid" size="sm">
          🔍 Research Response
        </Badge>
        <Badge colorScheme="gray" variant="outline" size="sm">
          {metadata.model}
        </Badge>
        {metadata.usage && (
          <Badge colorScheme="green" variant="outline" size="sm">
            {metadata.usage.total_tokens} tokens
          </Badge>
        )}
      </HStack>

      {/* Main Content */}
      <Box
        p={4}
        bg={bgColor}
        borderRadius="md"
        border="1px"
        borderColor={borderColor}
      >
        <Text whiteSpace="pre-wrap" lineHeight="1.6">
          {mainContent}
        </Text>
      </Box>

      {/* Citations Section */}
      {sources.length > 0 && (
        <Box>
          <HStack spacing={2} mb={2}>
            <Icon as={ExternalLinkIcon} color={linkColor} />
            <Text fontSize="sm" fontWeight="semibold" color={linkColor}>
              Sources
            </Text>
          </HStack>
          <VStack spacing={2} align="stretch" pl={4}>
            {sources.map((source, index) => {
              // Extract URL from markdown link format [title](url)
              const linkMatch = source.match(/\[([^\]]+)\]\(([^)]+)\)/);
              if (linkMatch) {
                const [, title, url] = linkMatch;
                return (
                  <HStack key={index} spacing={2}>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')} minW="20px">
                      {index + 1}.
                    </Text>
                    <Link
                      href={url}
                      isExternal
                      color={linkColor}
                      fontSize="sm"
                      _hover={{ textDecoration: 'underline' }}
                    >
                      {title}
                      <Icon as={ExternalLinkIcon} mx="2px" />
                    </Link>
                  </HStack>
                );
              } else {
                return (
                  <Text key={index} fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {source}
                  </Text>
                );
              }
            })}
          </VStack>
        </Box>
      )}

      {/* Related Questions Section */}
      {relatedQuestions.length > 0 && (
        <Box>
          <Divider />
          <HStack spacing={2} mt={3} mb={2}>
            <Icon as={QuestionIcon} color="purple.500" />
            <Text fontSize="sm" fontWeight="semibold" color="purple.500">
              Related Questions
            </Text>
          </HStack>
          <VStack spacing={1} align="stretch" pl={4}>
            {relatedQuestions.map((question, index) => (
              <Text key={index} fontSize="sm" color={useSemanticToken('text.secondary')}>
                • {question}
              </Text>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
};

export default PerplexityResponseRenderer;
