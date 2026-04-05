import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';

export default function Custom500() {
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
    >
      <VStack spacing={6} textAlign="center" px={4}>
        <Heading size="2xl" color="gray.700">
          500
        </Heading>
        <Heading size="lg" color="gray.600">
          Server Error
        </Heading>
        <Text color="gray.500" maxW="md">
          Something went wrong on our end. Please try again later.
        </Text>
        <NextLink href="/dashboard" passHref>
          <Button colorScheme="purple" size="lg">
            Go to Dashboard
          </Button>
        </NextLink>
      </VStack>
    </Box>
  );
}
