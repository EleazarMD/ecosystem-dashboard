import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function Custom404() {
  return (
    <DashboardLayout>
      <Box
        minH="60vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={6} textAlign="center" px={4}>
          <Heading size="2xl" color="gray.700">
            404
          </Heading>
          <Heading size="lg" color="gray.600">
            Page Not Found
          </Heading>
          <Text color="gray.500" maxW="md">
            The page you're looking for doesn't exist or has been moved.
          </Text>
          <NextLink href="/dashboard" passHref>
            <Button colorScheme="purple" size="lg">
              Go to Dashboard
            </Button>
          </NextLink>
        </VStack>
      </Box>
    </DashboardLayout>
  );
}
