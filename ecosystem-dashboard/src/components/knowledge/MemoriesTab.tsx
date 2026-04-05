import React from 'react';
import { Box, Heading, Text, Card, CardBody } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

const MemoriesTab: React.FC = () => {
  return (
    <Box>
      <Card>
        <CardBody>
          <Heading size="md" mb={4}>IDE Memories</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Memory browser coming soon. Navigate to IDE Memory pages in the main navigation for full features.
          </Text>
        </CardBody>
      </Card>
    </Box>
  );
};

export default MemoriesTab;
