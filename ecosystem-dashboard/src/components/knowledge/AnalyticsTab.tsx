import React from 'react';
import { Box, Heading, Text, Card, CardBody } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

const AnalyticsTab: React.FC = () => {
  return (
    <Box>
      <Card>
        <CardBody>
          <Heading size="md" mb={4}>Knowledge Analytics</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Analytics dashboard with ingestion trends, approval statistics, and system performance coming soon.
          </Text>
        </CardBody>
      </Card>
    </Box>
  );
};

export default AnalyticsTab;
