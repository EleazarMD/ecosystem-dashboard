import React from 'react';
import {
  Box,
  Text,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  Heading,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
} from '@chakra-ui/react';
import { usePredictiveActions } from '@/context/PredictiveActionsContext';

const PredictiveActionsWidget = () => {
  const { actions, loading, error } = usePredictiveActions();

  return (
      <VStack spacing={4} align="stretch" h="100%">
        {loading && actions.length === 0 && (
          <VStack justify="center" h="100%">
            <Spinner />
            <Text>Analyzing recent activity...</Text>
          </VStack>
        )}
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}
        {!loading && !error && actions.length === 0 && (
          <Text>No suggested actions at the moment.</Text>
        )}
        {!error && actions.length > 0 && (
          <VStack spacing={4} align="stretch">
            {actions.map((action) => (
              <Card key={action.id} variant="outline">
                <CardHeader pb={2}>
                  <Heading size="sm">{action.title}</Heading>
                </CardHeader>
                <CardBody py={2}>
                  <Text fontSize="sm">{action.description}</Text>
                </CardBody>
                <CardFooter pt={2}>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={action.action}
                  >
                    {action.actionLabel}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </VStack>
        )}
      </VStack>
  );
};

export default PredictiveActionsWidget;
