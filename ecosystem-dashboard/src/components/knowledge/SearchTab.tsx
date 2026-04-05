import React from 'react';
import { Box, Heading, Text, Card, CardBody } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

const SearchTab: React.FC = () => {
  return (
    <Box>
      <Card>
        <CardBody>
          <Heading size="md" mb={4}>Semantic Search</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Unified search across documents, memories, and graph entities coming soon.
          </Text>
        </CardBody>
      </Card>
    </Box>
  );
};

export default SearchTab;
