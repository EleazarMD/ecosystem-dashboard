import React, { useState } from 'react';
import {
  Box,
  Input,
  Button,
  Text,
  FormControl,
  FormLabel,
  Spinner,
  Alert,
  AlertIcon,
  Code,
  VStack,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { FiSend } from 'react-icons/fi';
import { useAgenticCommand } from '@/context/AgenticCommandContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const AgenticCommandBar = () => {
  const [query, setQuery] = useState('');
  const { executeQuery, response, loading, error } = useAgenticCommand();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    executeQuery(query);
  };

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" w="100%">
      <VStack spacing={4} align="stretch">
        <form onSubmit={handleSubmit}>
          <FormControl>
            <FormLabel htmlFor="agentic-command">Agentic Command</FormLabel>
            <HStack>
              <Input
                id="agentic-command"
                placeholder="Ask the ecosystem a question... (e.g., 'What is the status of the Phoenix project?')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                isDisabled={loading}
              />
              <IconButton
                aria-label="Submit query"
                icon={<FiSend />}
                type="submit"
                isLoading={loading}
                colorScheme="blue"
              />
            </HStack>
          </FormControl>
        </form>

        {loading && (
          <HStack justify="center">
            <Spinner />
            <Text>Thinking...</Text>
          </HStack>
        )}

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {response && (
          <Box mt={4} p={4} bg={useSemanticToken('surface.base')} borderRadius="md">
            <Text fontWeight="bold" mb={2}>Agent Response:</Text>
            <Code
              p={3}
              borderRadius="md"
              w="100%"
              display="block"
              whiteSpace="pre-wrap"
              bg={useSemanticToken('surface.base')}
            >
              {JSON.stringify(response, null, 2)}
            </Code>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default AgenticCommandBar;
