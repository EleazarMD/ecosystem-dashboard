import React, { useState } from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Textarea,
  Select,
  Button,
  Box,
  Heading,
  Text
} from '@chakra-ui/react';
import { ProjectData } from '../ProjectOnboardingWizard';

interface ProjectDetailsFormProps {
  initialData: ProjectData;
  onSubmit: (data: ProjectData) => void;
  isLoading: boolean;
}

const ProjectDetailsForm: React.FC<ProjectDetailsFormProps> = ({ initialData, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<ProjectData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.id) {
      newErrors.id = 'Project ID is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = 'Project ID must contain only lowercase letters, numbers, and hyphens';
    }
    
    if (!formData.name) {
      newErrors.name = 'Project name is required';
    }
    
    if (!formData.description) {
      newErrors.description = 'Project description is required';
    }
    
    if (!formData.path) {
      newErrors.path = 'Project path is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Project Details</Heading>
      <Text mb={6}>Register your project with the AI Homelab Ecosystem.</Text>
      
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl isInvalid={!!errors.id} isRequired>
            <FormLabel>Project ID</FormLabel>
            <Input
              name="id"
              value={formData.id}
              onChange={handleChange}
              placeholder="my-project-id"
              disabled={isLoading}
            />
            <FormErrorMessage>{errors.id}</FormErrorMessage>
          </FormControl>
          
          <FormControl isInvalid={!!errors.name} isRequired>
            <FormLabel>Project Name</FormLabel>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="My Project"
              disabled={isLoading}
            />
            <FormErrorMessage>{errors.name}</FormErrorMessage>
          </FormControl>
          
          <FormControl isInvalid={!!errors.description} isRequired>
            <FormLabel>Description</FormLabel>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of your project"
              disabled={isLoading}
            />
            <FormErrorMessage>{errors.description}</FormErrorMessage>
          </FormControl>
          
          <FormControl isRequired>
            <FormLabel>Category</FormLabel>
            <Select
              name="category"
              value={formData.category}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value="application">Application</option>
              <option value="service">Service</option>
              <option value="platform">Platform</option>
            </Select>
          </FormControl>
          
          <FormControl isInvalid={!!errors.path} isRequired>
            <FormLabel>Project Path</FormLabel>
            <Input
              name="path"
              value={formData.path}
              onChange={handleChange}
              placeholder="/absolute/path/to/project"
              disabled={isLoading}
            />
            <FormErrorMessage>{errors.path}</FormErrorMessage>
          </FormControl>
          
          <FormControl>
            <FormLabel>Status</FormLabel>
            <Select
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value="planning">Planning</option>
              <option value="development">Development</option>
              <option value="testing">Testing</option>
              <option value="production">Production</option>
            </Select>
          </FormControl>
          
          <Box pt={4}>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={isLoading}
              loadingText="Registering..."
              width="full"
            >
              Register Project
            </Button>
          </Box>
        </VStack>
      </form>
    </Box>
  );
};

export default ProjectDetailsForm;
