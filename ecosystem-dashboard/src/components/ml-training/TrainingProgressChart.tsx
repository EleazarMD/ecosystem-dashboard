/**
 * Training Progress Chart
 * Full-page real-time training metrics visualization with job selector
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Spinner,
  useColorModeValue,
  Select,
} from '@chakra-ui/react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface Metric {
  step: number;
  epoch: number;
  loss: number;
  learning_rate: number;
  elapsed_seconds: number;
  gpu_memory_gb?: number;
}

interface Job {
  job_id: string;
  status: string;
  model?: string;
  config?: {
    epochs?: number;
    learning_rate?: number;
    batch_size?: number;
    lora_r?: number;
  };
  metrics: Metric[];
  latest_metrics?: Metric;
}

export function TrainingProgressChart() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bgCard = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Read job ID from URL query parameter
  useEffect(() => {
    if (router.isReady && router.query.job) {
      setSelectedJobId(router.query.job as string);
    }
  }, [router.isReady, router.query.job]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/training-hub/api/jobs');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setJobs(data);
        
        // Auto-select the most recent running job if no job selected
        if (!selectedJobId && !router.query.job) {
          const runningJob = data.find((j: Job) => j.status === 'running');
          if (runningJob) {
            setSelectedJobId(runningJob.job_id);
          } else if (data.length > 0) {
            setSelectedJobId(data[0].job_id);
          }
        }
        
        setError(null);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [selectedJobId, router.query.job]);

  const handleJobChange = (jobId: string) => {
    setSelectedJobId(jobId);
    // Update URL without full navigation
    router.push(`/ml-training?section=live-progress&job=${jobId}`, undefined, { shallow: true });
  };

  if (loading) {
    return (
      <Box p={8} textAlign='center'>
        <Spinner size='xl' />
        <Text mt={4}>Loading training data...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8} textAlign='center' color='red.500'>
        <Text>Error: {error}</Text>
      </Box>
    );
  }

  const activeJob = jobs.find((j) => j.job_id === selectedJobId) || jobs.find((j) => j.status === 'running') || jobs[0];
  if (!activeJob) {
    return (
      <Box p={8} textAlign='center'>
        <Text>No training jobs found</Text>
      </Box>
    );
  }

  const metrics = activeJob.metrics || [];
  const latest = activeJob.latest_metrics || metrics[metrics.length - 1];
  const totalSteps = activeJob.config?.epochs ? activeJob.config.epochs * 19 : 95;
  const progress = latest ? (latest.step / totalSteps) * 100 : 0;
  const etaHours = latest && latest.step > 0 ? ((totalSteps - latest.step) * (latest.elapsed_seconds / latest.step)) / 3600 : 0;

  const chartData = metrics.map((m) => ({
    step: m.step,
    loss: Number(m.loss.toFixed(4)),
    epoch: Number(m.epoch.toFixed(2)),
    lr: m.learning_rate * 10000,
  }));

  const runningJobs = jobs.filter((j) => j.status === 'running');
  const recentJobs = jobs.slice(0, 10);

  return (
    <Box p={6}>
      <VStack spacing={6} align='stretch'>
        {/* Header with Job Selector */}
        <HStack justify='space-between' wrap='wrap' gap={4}>
          <VStack align='start' spacing={1}>
            <Heading size='lg'>Training Progress</Heading>
            <Text color='gray.500' fontSize='sm'>{activeJob.job_id}</Text>
          </VStack>
          
          <HStack spacing={4}>
            <Select
              value={selectedJobId || ''}
              onChange={(e) => handleJobChange(e.target.value)}
              maxW='350px'
              size='md'
              bg={bgCard}
            >
              {runningJobs.length > 0 && (
                <optgroup label='Running Jobs'>
                  {runningJobs.map((job) => (
                    <option key={job.job_id} value={job.job_id}>
                      {job.job_id}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label='Recent Jobs'>
                {recentJobs.filter(j => j.status !== 'running').map((job) => (
                  <option key={job.job_id} value={job.job_id}>
                    {job.job_id} ({job.status})
                  </option>
                ))}
              </optgroup>
            </Select>
            
            <Badge
              colorScheme={activeJob.status === 'running' ? 'green' : activeJob.status === 'completed' ? 'blue' : 'gray'}
              fontSize='md'
              px={3}
              py={1}
            >
              {activeJob.status.toUpperCase()}
            </Badge>
          </HStack>
        </HStack>

        {/* Stats Grid */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Box bg={bgCard} p={4} borderRadius='lg' border='1px' borderColor={borderColor}>
            <Stat>
              <StatLabel>Current Step</StatLabel>
              <StatNumber>{latest?.step || 0} / {totalSteps}</StatNumber>
              <StatHelpText>{progress.toFixed(1)}% complete</StatHelpText>
            </Stat>
          </Box>
          <Box bg={bgCard} p={4} borderRadius='lg' border='1px' borderColor={borderColor}>
            <Stat>
              <StatLabel>Current Loss</StatLabel>
              <StatNumber color='blue.500'>{latest?.loss?.toFixed(4) || '—'}</StatNumber>
              <StatHelpText>Epoch {latest?.epoch?.toFixed(2) || 0}</StatHelpText>
            </Stat>
          </Box>
          <Box bg={bgCard} p={4} borderRadius='lg' border='1px' borderColor={borderColor}>
            <Stat>
              <StatLabel>Learning Rate</StatLabel>
              <StatNumber>{latest?.learning_rate?.toExponential(2) || '—'}</StatNumber>
              <StatHelpText>Cosine schedule</StatHelpText>
            </Stat>
          </Box>
          <Box bg={bgCard} p={4} borderRadius='lg' border='1px' borderColor={borderColor}>
            <Stat>
              <StatLabel>ETA</StatLabel>
              <StatNumber>{etaHours.toFixed(1)}h</StatNumber>
              <StatHelpText>GPU: {latest?.gpu_memory_gb?.toFixed(1) || '—'} GB</StatHelpText>
            </Stat>
          </Box>
        </SimpleGrid>

        {/* Loss Chart */}
        <Box bg={bgCard} p={6} borderRadius='lg' border='1px' borderColor={borderColor}>
          <Heading size='md' mb={4}>Training Loss Curve</Heading>
          <Box h='400px'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id='lossGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#3182CE' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#3182CE' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                <XAxis dataKey='step' label={{ value: 'Step', position: 'bottom' }} />
                <YAxis label={{ value: 'Loss', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: 'white' }}
                />
                <Legend />
                <Area
                  type='monotone'
                  dataKey='loss'
                  stroke='#3182CE'
                  strokeWidth={3}
                  fill='url(#lossGradient)'
                  name='Loss'
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {/* Config Info */}
        <Box bg={bgCard} p={4} borderRadius='lg' border='1px' borderColor={borderColor}>
          <Heading size='sm' mb={3}>Training Configuration</Heading>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Box>
              <Text fontSize='sm' color='gray.500'>Model</Text>
              <Text fontWeight='bold'>{activeJob.model || 'Med42-8B'}</Text>
            </Box>
            <Box>
              <Text fontSize='sm' color='gray.500'>Epochs</Text>
              <Text fontWeight='bold'>{activeJob.config?.epochs || 5}</Text>
            </Box>
            <Box>
              <Text fontSize='sm' color='gray.500'>LoRA Rank</Text>
              <Text fontWeight='bold'>{activeJob.config?.lora_r || 32}</Text>
            </Box>
            <Box>
              <Text fontSize='sm' color='gray.500'>Batch Size</Text>
              <Text fontWeight='bold'>{activeJob.config?.batch_size || 16}</Text>
            </Box>
          </SimpleGrid>
        </Box>
      </VStack>
    </Box>
  );
}

export default TrainingProgressChart;
