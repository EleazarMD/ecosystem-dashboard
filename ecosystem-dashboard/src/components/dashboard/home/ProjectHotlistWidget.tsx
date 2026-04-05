import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Icon,
  Link,
  Flex,
  CircularProgress,
  CircularProgressLabel,
} from '@chakra-ui/react';
import { useProgress } from '@/context/ProgressContext';
import { useRouter } from 'next/router';
import { FiArrowRight } from 'react-icons/fi';
import { Project } from '@/types';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const getProgressColor = (status: Project['status']) => {
  switch (status) {
    case 'completed':
      return 'green.400';
    case 'in-progress':
      return 'blue.400';
    case 'on-hold':
      return 'yellow.400';
    case 'cancelled':
      return 'red.400';
    default:
      return 'gray.400';
  }
};

const ProjectHotlistWidget = () => {
  const { projects, loading, error } = useProgress();
  const router = useRouter();
  const textColor = useSemanticToken('text.secondary');
  const headingColor = useSemanticToken('text.primary');
  const hoverBgColor = useSemanticToken('surface.hover');

  if (loading) {
    return (
      <Flex justify="center" align="center" h="100%" minH="150px">
        <Spinner />
      </Flex>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  if (!projects || projects.length === 0) {
    return <Text>No active projects found.</Text>;
  }

  const hotlist = projects.slice(0, 3); // Show top 3 for a cleaner look

  return (
    <VStack align="stretch" spacing={4}>
      {hotlist.map((project) => (
        <Link key={project.id} onClick={() => router.push(`/ecosystem/projects/${project.id}`)} _hover={{ textDecoration: 'none' }}>
          <HStack
            spacing={4}
            p={3}
            borderRadius="lg"
            _hover={{ bg: hoverBgColor }}
            transition="background 0.2s ease-in-out"
          >
            <CircularProgress
              value={project.progress}
              color={getProgressColor(project.status)}
              size="45px"
              thickness="6px"
            >
              <CircularProgressLabel fontSize="xs">{project.progress}%</CircularProgressLabel>
            </CircularProgress>
            <VStack align="start" spacing={0} flex={1}>
              <Text fontWeight="bold" color={headingColor} noOfLines={1}>
                {project.name}
              </Text>
              <Text fontSize="sm" color={textColor}>
                {project.tasks?.length || 0} Tasks | {project.status}
              </Text>
            </VStack>
            <Icon as={FiArrowRight} color={textColor} />
          </HStack>
        </Link>
      ))}
    </VStack>
  );
};

export default ProjectHotlistWidget;
