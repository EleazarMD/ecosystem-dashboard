/**
 * Project and Service Selector Component
 * Handles project/service selection with inline service creation
 */

import React from 'react';
import {
  FormControl,
  FormLabel,
  Select,
  Input,
  Button,
  VStack,
  HStack,
} from '@chakra-ui/react';

interface ProjectServiceSelectorProps {
  projects: any[];
  services: any[];
  selectedProjectId: string;
  selectedServiceId: string;
  newServiceName: string;
  loadingProjects: boolean;
  loadingServices: boolean;
  isCreatingService: boolean;
  onProjectChange: (projectId: string) => void;
  onServiceChange: (serviceId: string) => void;
  onNewServiceNameChange: (name: string) => void;
  onCreateService: () => void;
}

export function ProjectServiceSelector({
  projects,
  services,
  selectedProjectId,
  selectedServiceId,
  newServiceName,
  loadingProjects,
  loadingServices,
  isCreatingService,
  onProjectChange,
  onServiceChange,
  onNewServiceNameChange,
  onCreateService,
}: ProjectServiceSelectorProps) {
  return (
    <>
      <FormControl isRequired>
        <FormLabel>Project</FormLabel>
        <Select
          value={selectedProjectId}
          onChange={(e) => onProjectChange(e.target.value)}
          placeholder="Select project"
          isDisabled={loadingProjects}
        >
          {projects.map((p) => (
            <option key={p.project_id} value={p.project_id}>
              {p.name || p.project_id}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Service</FormLabel>
        <VStack align="stretch" spacing={2}>
          <Select
            value={selectedServiceId}
            onChange={(e) => onServiceChange(e.target.value)}
            placeholder="Select service"
            isDisabled={!selectedProjectId || loadingServices}
          >
            {services.map((s) => (
              <option key={s.service_id} value={s.service_id}>
                {s.name || s.service_id}
              </option>
            ))}
          </Select>
          {selectedProjectId && (
            <HStack>
              <Input
                size="sm"
                placeholder="New service name"
                value={newServiceName}
                onChange={(e) => onNewServiceNameChange(e.target.value)}
              />
              <Button
                size="sm"
                onClick={onCreateService}
                isLoading={isCreatingService}
                isDisabled={!newServiceName.trim()}
              >
                Create
              </Button>
            </HStack>
          )}
        </VStack>
      </FormControl>
    </>
  );
}
