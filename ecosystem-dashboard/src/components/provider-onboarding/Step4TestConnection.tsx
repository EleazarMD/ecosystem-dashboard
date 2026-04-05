/**
 * Step 4: Test Connection
 * Optional but encouraged - test provider connection before deployment
 */

import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Box,
  Alert,
  AlertIcon,
  Textarea,
  Icon,
  Spinner,
  Badge,
} from '@chakra-ui/react';
import { FiCheckCircle, FiAlertCircle, FiClock, FiDollarSign } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Step4TestConnectionProps {
  provider: any;
  apiConfig: any;
  models: any[];
  onNext: (data: any) => void;
  onBack: () => void;
  onSkip: () => void;
}

interface TestResult {
  success: boolean;
  model: string;
  latency: number;
  tokensUsed: {
    input: number;
    output: number;
  };
  cost: number;
  responsePreview?: string;
  error?: string;
}

export const Step4TestConnection: React.FC<Step4TestConnectionProps> = ({
  provider,
  apiConfig,
  models,
  onNext,
  onBack,
  onSkip,
}) => {
  const [testQuery, setTestQuery] = useState('What are the latest developments in AI?');
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [overallSuccess, setOverallSuccess] = useState<boolean | null>(null);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const subtleText = useSemanticToken('text.secondary');
  const successBg = useSemanticToken('surface.highlight');
  const errorBg = useSemanticToken('surface.highlight');
  const codeBg = useSemanticToken('surface.base');

  // Debug: Log apiConfig on mount
  React.useEffect(() => {
    console.log('Step4TestConnection - apiConfig:', apiConfig);
    console.log('Step4TestConnection - models:', models);
    console.log('Step4TestConnection - provider:', provider);
  }, [apiConfig, models, provider]);

  const runTests = async () => {
    setTesting(true);
    setTestResults([]);
    setOverallSuccess(null);

    try {
      // Validate API config
      if (!apiConfig || !apiConfig.apiKey || !apiConfig.apiKey.trim()) {
        throw new Error('API key is required');
      }

      // Test first enabled model
      const firstModel = models?.find(m => m.enabled);
      if (!firstModel) {
        throw new Error('No models enabled');
      }

      // Use the validation endpoint
      const response = await fetch('/api/ai-inferencing/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: provider.id,
          apiKey: apiConfig.apiKey.trim(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResults([{
          success: result.valid,
          model: firstModel.modelId || provider.name,
          latency: result.responseTime,
          tokensUsed: { input: 0, output: 0 },
          cost: 0,
          responsePreview: result.message,
          error: result.valid ? undefined : result.message,
        }]);
        setOverallSuccess(result.valid);
      } else {
        const error = await response.json().catch(() => ({ error: 'Connection failed' }));
        setTestResults([{
          success: false,
          model: firstModel.modelId || provider.name,
          latency: 0,
          tokensUsed: { input: 0, output: 0 },
          cost: 0,
          error: error.error || error.message || 'Connection failed',
        }]);
        setOverallSuccess(false);
      }
    } catch (error: any) {
      setTestResults([{
        success: false,
        model: 'unknown',
        latency: 0,
        tokensUsed: { input: 0, output: 0 },
        cost: 0,
        error: error.message || 'Network error',
      }]);
      setOverallSuccess(false);
    } finally {
      setTesting(false);
    }
  };

  const handleNext = () => {
    onNext({ testResults });
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(cost);
  };

  // Check if required data is present
  if (!apiConfig || !apiConfig.apiKey) {
    return (
      <VStack spacing={8} align="stretch">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <Text fontSize="sm" fontWeight="600" mb={1}>
              Configuration Missing
            </Text>
            <Text fontSize="xs">
              API configuration is missing or incomplete. Please go back to Step 3 and configure your API key.
            </Text>
          </Box>
        </Alert>
        <HStack justify="space-between" pt={4}>
          <Button onClick={onBack} variant="ghost">
            ← Back to API Configuration
          </Button>
          <Button onClick={onSkip}>
            Skip Testing →
          </Button>
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <Box>
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontSize="sm" fontWeight="600" mb={1}>
              Test Connection (Optional but Recommended)
            </Text>
            <Text fontSize="xs">
              Verify your configuration works before deploying. This helps catch issues early.
            </Text>
          </Box>
        </Alert>
      </Box>

      {/* Test Query */}
      <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
        <VStack align="stretch" spacing={4}>
          <Text fontSize="sm" fontWeight="600">
            Test Query
          </Text>
          <Textarea
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Enter a test query..."
            rows={3}
            fontSize="sm"
          />
          <Button
            onClick={runTests}
            isLoading={testing}
            loadingText="Testing..."
            isDisabled={!testQuery.trim()}
          >
            Run Connection Test
          </Button>
        </VStack>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card
          bg={overallSuccess ? successBg : errorBg}
          shadow="none"
          border="1px"
          borderColor={overallSuccess ? 'green.400' : 'red.400'}
          p={6}
        >
          <VStack align="stretch" spacing={6}>
            {/* Overall Status */}
            <HStack>
              <Icon
                as={overallSuccess ? FiCheckCircle : FiAlertCircle}
                boxSize={6}
                color={overallSuccess ? 'green.600' : 'red.600'}
              />
              <Text fontSize="md" fontWeight="600">
                {overallSuccess ? 'Connection Successful!' : 'Connection Failed'}
              </Text>
            </HStack>

            {/* Results */}
            {testResults.map((result, index) => (
              <Box
                key={index}
                bg={cardBg}
                p={4}
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <VStack align="stretch" spacing={4}>
                  <HStack justify="space-between">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="600">
                        Model: {result.model}
                      </Text>
                      <Badge colorScheme={result.success ? 'green' : 'red'} fontSize="xs">
                        {result.success ? 'Success' : 'Failed'}
                      </Badge>
                    </VStack>
                    {result.success && (
                      <HStack spacing={4} fontSize="xs" color={subtleText}>
                        <HStack>
                          <Icon as={FiClock} />
                          <Text>{result.latency}ms</Text>
                        </HStack>
                        <HStack>
                          <Icon as={FiDollarSign} />
                          <Text>{formatCost(result.cost)}</Text>
                        </HStack>
                      </HStack>
                    )}
                  </HStack>

                  {result.success && (
                    <>
                      <HStack spacing={6} fontSize="xs">
                        <Box>
                          <Text color={subtleText}>Input Tokens</Text>
                          <Text fontWeight="500">{result.tokensUsed.input}</Text>
                        </Box>
                        <Box>
                          <Text color={subtleText}>Output Tokens</Text>
                          <Text fontWeight="500">{result.tokensUsed.output}</Text>
                        </Box>
                      </HStack>

                      {result.responsePreview && (
                        <Box>
                          <Text fontSize="xs" color={subtleText} mb={2}>
                            Response Preview:
                          </Text>
                          <Box
                            p={3}
                            bg={codeBg}
                            borderRadius="md"
                            fontSize="xs"
                            fontFamily="mono"
                          >
                            {result.responsePreview.substring(0, 200)}
                            {result.responsePreview.length > 200 && '...'}
                          </Box>
                        </Box>
                      )}
                    </>
                  )}

                  {result.error && (
                    <Alert status="error" borderRadius="md" fontSize="sm">
                      <AlertIcon />
                      {result.error}
                    </Alert>
                  )}
                </VStack>
              </Box>
            ))}
          </VStack>
        </Card>
      )}

      {/* Actions */}
      <HStack justify="space-between" pt={4}>
        <Button onClick={onBack} variant="ghost">
          ← Back
        </Button>
        <HStack>
          <Button onClick={onSkip} variant="ghost">
            Skip Testing
          </Button>
          <Button
            onClick={handleNext}
            isDisabled={testResults.length === 0 || !overallSuccess}
          >
            {testResults.length > 0 && overallSuccess
              ? 'Next: Review & Deploy →'
              : 'Run Test First'}
          </Button>
        </HStack>
      </HStack>
    </VStack>
  );
};
