/**
 * Custom Error Page
 * Handles both client-side and server-side errors
 */

import { NextPageContext } from 'next';
import { Box, VStack, Heading, Text, Button, Icon } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface ErrorProps {
  statusCode?: number;
  message?: string;
}

function Error({ statusCode, message }: ErrorProps) {
  const router = useRouter();

  const getErrorMessage = () => {
    if (message) return message;
    switch (statusCode) {
      case 404:
        return 'The page you are looking for could not be found.';
      case 500:
        return 'An internal server error occurred.';
      case 503:
        return 'The service is temporarily unavailable.';
      default:
        return 'An unexpected error occurred.';
    }
  };

  const getErrorTitle = () => {
    switch (statusCode) {
      case 404:
        return 'Page Not Found';
      case 500:
        return 'Server Error';
      case 503:
        return 'Service Unavailable';
      default:
        return 'Error';
    }
  };

  return (
    <DashboardLayout>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="calc(100vh - 120px)"
        p={4}
      >
        <VStack spacing={6} textAlign="center" maxW="500px">
          <Heading
            size="4xl"
            bgGradient="linear(to-r, red.400, orange.400)"
            bgClip="text"
          >
            {statusCode || '?'}
          </Heading>
          
          <Heading size="lg">{getErrorTitle()}</Heading>
          
          <Text color="gray.500" fontSize="md">
            {getErrorMessage()}
          </Text>

          <VStack spacing={3}>
            <Button
              colorScheme="blue"
              onClick={() => router.push('/')}
              size="lg"
            >
              Go to Dashboard
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => router.back()}
              size="md"
            >
              Go Back
            </Button>
          </VStack>
        </VStack>
      </Box>
    </DashboardLayout>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
