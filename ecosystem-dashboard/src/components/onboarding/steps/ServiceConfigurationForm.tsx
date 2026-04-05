import React, { useState, useEffect } from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Button,
  Box,
  Heading,
  Text,
  HStack,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { ServiceData } from '../ProjectOnboardingWizard';
import { ecosystemApi } from '@/lib/api';

interface ServiceConfigurationFormProps {
  projectId: string;
  initialServices: ServiceData[];
  onSubmit: (services: ServiceData[]) => void;
  isLoading: boolean;
}

const ServiceConfigurationForm: React.FC<ServiceConfigurationFormProps> = ({ 
  projectId, 
  initialServices, 
  onSubmit, 
  isLoading 
}) => {
  const [services, setServices] = useState<ServiceData[]>(initialServices.length > 0 ? initialServices : []);
  const [newService, setNewService] = useState<ServiceData>({
    name: '',
    port: 0,
    description: '',
    type: 'http'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availablePorts, setAvailablePorts] = useState<number[]>([]);
  const [loadingPorts, setLoadingPorts] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const toast = useToast();

  // Fetch available ports when component mounts
  useEffect(() => {
    const fetchAvailablePorts = async () => {
      setLoadingPorts(true);
      setError(null);
      
      try {
        const response = await ecosystemApi.getAvailablePorts();
        if (response.success) {
          setAvailablePorts(response.available_ports || []);
        } else {
          throw new Error(response.error || 'Failed to fetch available ports');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching available ports');
        toast({
          title: 'Error',
          description: err.message || 'An error occurred while fetching available ports',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoadingPorts(false);
      }
    };
    
    if (projectId) {
      fetchAvailablePorts();
    }
  }, [projectId, toast]);

  const handleNewServiceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewService(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 0 : value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateNewService = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newService.name) {
      newErrors.name = 'Service name is required';
    } else if (services.some(s => s.name === newService.name)) {
      newErrors.name = 'Service name must be unique';
    }
    
    if (!newService.port) {
      newErrors.port = 'Port is required';
    } else if (newService.port < 1024 || newService.port > 65535) {
      newErrors.port = 'Port must be between 1024 and 65535';
    } else if (services.some(s => s.port === newService.port)) {
      newErrors.port = 'Port is already in use by another service';
    }
    
    if (!newService.description) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddService = () => {
    if (validateNewService()) {
      setServices(prev => [...prev, { ...newService }]);
      setNewService({
        name: '',
        port: 0,
        description: '',
        type: 'http'
      });
      
      toast({
        title: 'Service added',
        description: `Service ${newService.name} has been added to the list.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRemoveService = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index));
    
    toast({
      title: 'Service removed',
      description: 'Service has been removed from the list.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (services.length === 0) {
      toast({
        title: 'No services',
        description: 'Please add at least one service before proceeding.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    onSubmit(services);
  };

  const handleSelectPort = (port: number) => {
    setNewService(prev => ({
      ...prev,
      port
    }));
    
    // Clear port error if exists
    if (errors.port) {
      setErrors(prev => ({
        ...prev,
        port: ''
      }));
    }
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Service Configuration</Heading>
      <Text mb={6}>Configure services and ports for your project.</Text>
      
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <VStack spacing={6} align="stretch">
          {/* Add new service form */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Heading size="sm" mb={4}>Add New Service</Heading>
            
            <VStack spacing={4} align="stretch">
              <FormControl isInvalid={!!errors.name} isRequired>
                <FormLabel>Service Name</FormLabel>
                <Input
                  name="name"
                  value={newService.name}
                  onChange={handleNewServiceChange}
                  placeholder="api-service"
                  disabled={isLoading}
                />
                <FormErrorMessage>{errors.name}</FormErrorMessage>
              </FormControl>
              
              <FormControl isInvalid={!!errors.port} isRequired>
                <FormLabel>Port</FormLabel>
                <Input
                  name="port"
                  type="number"
                  value={newService.port || ''}
                  onChange={handleNewServiceChange}
                  placeholder="8080"
                  disabled={isLoading}
                />
                <FormErrorMessage>{errors.port}</FormErrorMessage>
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Port Type</FormLabel>
                <Select
                  name="type"
                  value={newService.type}
                  onChange={handleNewServiceChange}
                  disabled={isLoading}
                >
                  <option value="http">HTTP</option>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                </Select>
              </FormControl>
              
              <FormControl isInvalid={!!errors.description} isRequired>
                <FormLabel>Description</FormLabel>
                <Input
                  name="description"
                  value={newService.description}
                  onChange={handleNewServiceChange}
                  placeholder="Main API service"
                  disabled={isLoading}
                />
                <FormErrorMessage>{errors.description}</FormErrorMessage>
              </FormControl>
              
              <Button
                leftIcon={<AddIcon />}
                colorScheme="blue"
                variant="outline"
                onClick={handleAddService}
                disabled={isLoading}
              >
                Add Service
              </Button>
            </VStack>
          </Box>
          
          {/* Available ports section */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Heading size="sm" mb={4}>Available Ports</Heading>
            
            {loadingPorts ? (
              <Text>Loading available ports...</Text>
            ) : availablePorts.length > 0 ? (
              <Box overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Port</Th>
                      <Th>Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {availablePorts.slice(0, 5).map((port, index) => (
                      <Tr key={index}>
                        <Td>{port}</Td>
                        <Td>
                          <Button
                            size="xs"
                            colorScheme="blue"
                            onClick={() => handleSelectPort(port)}
                            disabled={isLoading}
                          >
                            Select
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {availablePorts.length > 5 && (
                  <Text fontSize="sm" mt={2}>
                    Showing 5 of {availablePorts.length} available ports
                  </Text>
                )}
              </Box>
            ) : (
              <Text>No available ports found.</Text>
            )}
          </Box>
          
          {/* Services list */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Heading size="sm" mb={4}>Configured Services</Heading>
            
            {services.length > 0 ? (
              <Box overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Port</Th>
                      <Th>Type</Th>
                      <Th>Description</Th>
                      <Th>Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {services.map((service, index) => (
                      <Tr key={index}>
                        <Td>{service.name}</Td>
                        <Td>{service.port}</Td>
                        <Td>{service.type}</Td>
                        <Td>{service.description}</Td>
                        <Td>
                          <IconButton
                            aria-label="Remove service"
                            icon={<DeleteIcon />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => handleRemoveService(index)}
                            disabled={isLoading}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            ) : (
              <Text>No services configured yet.</Text>
            )}
          </Box>
          
          <Box pt={4}>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={isLoading}
              loadingText="Registering Services..."
              width="full"
              disabled={services.length === 0}
            >
              Register Services
            </Button>
          </Box>
        </VStack>
      </form>
    </Box>
  );
};

export default ServiceConfigurationForm;
