/**
 * DreamDigestCard — Phase 8 parent control-plane component.
 *
 * Surfaces overnight consolidation results ("dream report") to parents.
 * Shows the latest dream insights, recommended focus skills, and a
 * human-readable digest. Parents can manually trigger consolidation.
 *
 * Backend: /api/learn/dream (GET retrieve, POST trigger)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Button, Card, CardBody,
  Spinner, Center, useToast, Heading, Divider, Icon, Collapse,
  IconButton, Alert, AlertIcon,
} from '@chakra-ui/react';
import { FiMoon, FiRefreshCw, FiZap, FiTrendingUp, FiStar, FiCheckCircle } from 'react-icons/fi';

interface DreamInsight {
  id: string;
  childId: string;
  insight: string;
  actionable: boolean;
  suggestedActions: string[];
  confidence: number;
  consolidatedAt: number;
}

interface DreamDigestCardProps {
  childId: string;
  childName: string;
}

export default function DreamDigestCard({ childId, childName }: DreamDigestCardProps) {
  const [insights, setInsights] = useState<DreamInsight[]>([]);
  const [digest, setDigest] = useState('');
  const [dreamCount, setDreamCount] = useState(0);
  const [focusSkills, setFocusSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const toast = useToast();

  const fetchDream = useCallback(async () => {
    try {
      const res = await fetch(`/api/learn/dream?childId=${childId}&childName=${encodeURIComponent(childName)}`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
        setDigest(data.digest || '');
        setDreamCount(data.dreamCount || 0);
        setFocusSkills(data.recommendedFocusSkills || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [childId, childName]);

  useEffect(() => {
    fetchDream();
  }, [fetchDream]);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/learn/dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, childName }),
      });

      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
        setDigest(data.digest || '');
        setDreamCount(data.dreamCount || 0);
        setFocusSkills(data.recommendedFocusSkills || []);
        toast({
          title: data.insights.length > 0
            ? `Dream complete — ${data.insights.length} insights`
            : 'Dream ran — not enough data yet',
          status: data.insights.length > 0 ? 'success' : 'info',
          duration: 3000,
        });
      } else {
        toast({ title: 'Failed to trigger dream', status: 'error', duration: 3000 });
      }
    } catch {
      toast({ title: 'Network error', status: 'error', duration: 3000 });
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return <Center py={4}><Spinner size="sm" color="purple.500" /></Center>;
  }

  const actionableInsights = insights.filter((i) => i.actionable);
  const progressInsights = insights.filter((i) => !i.actionable);

  return (
    <Card borderWidth="1px" borderRadius="lg" borderColor="purple.100">
      <CardBody p={4}>
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Icon as={FiMoon} color="purple.500" />
              <Heading size="sm">Dream Report</Heading>
              {dreamCount > 0 && (
                <Badge colorScheme="purple" fontSize="2xs">#{dreamCount}</Badge>
              )}
            </HStack>
            <HStack>
              <IconButton
                size="xs"
                variant="ghost"
                icon={<FiRefreshCw />}
                aria-label="Refresh"
                onClick={fetchDream}
              />
              <Button
                size="xs"
                colorScheme="purple"
                variant="outline"
                leftIcon={<FiZap />}
                onClick={handleTrigger}
                isLoading={triggering}
              >
                Run Dream
              </Button>
            </HStack>
          </HStack>

          {insights.length === 0 ? (
            <Alert status="info" borderRadius="md" size="sm">
              <AlertIcon />
              <Text fontSize="sm">
                No dream insights yet. The dreaming engine consolidates learning patterns after
                at least 3 sessions. Click "Run Dream" to trigger consolidation manually.
              </Text>
            </Alert>
          ) : (
            <>
              {/* Digest text */}
              <Collapse in={expanded}>
                <Box
                  p={3}
                  borderRadius="md"
                  bg="purple.50"
                  _dark={{ bg: 'purple.900', color: 'purple.100' }}
                  whiteSpace="pre-wrap"
                  fontSize="sm"
                  color="purple.900"
                >
                  {digest}
                </Box>
              </Collapse>

              {/* Actionable insights */}
              {actionableInsights.length > 0 && (
                <>
                  <Divider />
                  <Text fontSize="xs" fontWeight="600" color="purple.600" textTransform="uppercase">
                    <HStack spacing={1}><FiStar /><Text>Recommendations</Text></HStack>
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {actionableInsights.map((insight) => (
                      <Box key={insight.id} p={2} borderRadius="md" borderWidth="1px" borderColor="purple.100">
                        <Text fontSize="sm" fontWeight="500">{insight.insight}</Text>
                        {insight.suggestedActions.length > 0 && (
                          <VStack spacing={0} align="stretch" mt={1}>
                            {insight.suggestedActions.map((action, idx) => (
                              <HStack key={idx} spacing={1}>
                                <Text fontSize="2xs" color="gray.500">→</Text>
                                <Text fontSize="xs" color="gray.600">{action}</Text>
                              </HStack>
                            ))}
                          </VStack>
                        )}
                        <HStack mt={1} spacing={2}>
                          <Badge fontSize="2xs" colorScheme={
                            insight.confidence > 0.8 ? 'green' :
                            insight.confidence > 0.6 ? 'yellow' : 'gray'
                          }>
                            {Math.round(insight.confidence * 100)}% confidence
                          </Badge>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </>
              )}

              {/* Recommended focus skills */}
              {focusSkills.length > 0 && (
                <>
                  <Divider />
                  <Text fontSize="xs" fontWeight="600" color="purple.600" textTransform="uppercase">
                    <HStack spacing={1}><FiTrendingUp /><Text>Recommended Focus Skills</Text></HStack>
                  </Text>
                  <HStack spacing={1} flexWrap="wrap">
                    {focusSkills.map((skill) => (
                      <Badge key={skill} colorScheme="purple" fontSize="2xs" variant="subtle">
                        {skill}
                      </Badge>
                    ))}
                  </HStack>
                  <Text fontSize="2xs" color="gray.400">
                    These skills will be prioritized in {childName}'s next learning plan.
                  </Text>
                </>
              )}
            </>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
