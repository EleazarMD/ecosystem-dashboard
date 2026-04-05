import React, { useState } from 'react';
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
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  useToast,
  HStack,
  Checkbox,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { ConfigUpdate } from '../../../types/onboarding';

interface ConfigurationUpdatesFormProps {
  projectId: string;
  initialUpdates: ConfigUpdate[];
  onSubmit: (updates: ConfigUpdate[]) => void;
  isLoading: boolean;
}

const ConfigurationUpdatesForm: React.FC<ConfigurationUpdatesFormProps> = ({
  projectId,
  initialUpdates,
  onSubmit,
  isLoading
}) => {
  const [updates, setUpdates] = useState<ConfigUpdate[]>(initialUpdates.length > 0 ? initialUpdates : []);
  const [newUpdate, setNewUpdate] = useState<ConfigUpdate>({
    file_path: '',
    key: '',
    value: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dryRun, setDryRun] = useState<boolean>(true);
  
  const toast = useToast();

  const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUpdate(prev => ({
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

  const validateNewUpdate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newUpdate.file_path) {
      newErrors.file_path = 'File path is required';
    }
    
    if (!newUpdate.key) {
      newErrors.key = 'Key is required';
    }
    
    if (!newUpdate.value) {
      newErrors.value = 'Value is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddUpdate = () => {
    if (validateNewUpdate()) {
      setUpdates(prev => [...prev, { ...newUpdate }]);
      
      setNewUpdate({
        file_path: '',
        key: '',
        value: '',
        description: ''
      });
      
      toast({
        title: 'Configuration update added',
        description: `Update for ${newUpdate.file_path} has been added to the list.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRemoveUpdate = (index: number) => {
    setUpdates(prev => prev.filter((_, i) => i !== index));
    
    toast({
      title: 'Update removed',
      description: 'Configuration update has been removed from the list.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (updates.length === 0) {
      toast({
        title: 'No updates',
        description: 'Please add at least one configuration update before proceeding, or skip this step if no updates are needed.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    onSubmit(updates);
  };

  const handleSkip = () => {
    toast({
      title: 'Step skipped',
      description: 'Configuration updates step has been skipped.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    
    onSubmit([]);
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Configuration Updates</Heading>
      <Text mb={6}>
        Update configuration files with allocated port numbers or other AHIS-managed settings.
        This step is optional and can be skipped if no configuration updates are needed.
      </Text>
      
      <form onSubmit={handleSubmit}>
        <VStack spacing={6} align="stretch">
          {/* Add new update form */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Heading size="sm" mb={4}>Add New Configuration Update</Heading>
            
            <VStack spacing={4} align="stretch">
              <FormControl isInvalid={!!errors.file_path} isRequired>
                <FormLabel>File Path</FormLabel>
                <Input
                  name="file_path"
                  value={newUpdate.file_path}
                  onChange={handleUpdateChange}
                  placeholder="docker-compose.yml"
                  disabled={isLoading}
                />
                <FormErrorMessage>{errors.file_path}</FormErrorMessage>
              </FormControl>
              
              <FormControl isInvalid={!!errors.key} isRequired>
                <FormLabel>Key</FormLabel>
                <Input
                  name="key"
                  value={newUpdate.key}
                  onChange={handleUpdateChange}
                  placeholder="services.api.ports[0]"
                  disabled={isLoading}
                />
                <FormErrorMessage>{errors.key}</FormErrorMessage>
              </FormControl>
              
              <FormControl isInvalid={!!errors.value} isRequired>
                <FormLabel>Value</FormLabel>
                <Input
                  name="value"
                  value={newUpdate.value}
                  onChange={handleUpdateChange}
                  placeholder="8080:8080"
                  disabled={isLoading}
                />
                <FormErrorMessage>{errors.value}</FormErrorMessage>
              </FormControl>
              
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  name="description"
                  value={newUpdate.description}
                  onChange={handleUpdateChange}
                  placeholder="Description of the update"
                  disabled={isLoading}
                />
              </FormControl>
              
              <Button
                leftIcon={<AddIcon />}
                colorScheme="blue"
                variant="outline"
                onClick={handleAddUpdate}
                disabled={isLoading}
              >
                Add Configuration Update
              </Button>
            </VStack>
          </Box>
          
          {/* Updates list */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Heading size="sm" mb={4}>Configured Updates</Heading>
            
            {updates.length > 0 ? (
              <Accordion allowMultiple>
                {updates.map((update, index) => (
                  <AccordionItem key={index}>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left">
                          {update.file_path}
                        </Box>
                        <IconButton
                          aria-label="Remove update"
                          icon={<DeleteIcon />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveUpdate(index);
                          }}
                          disabled={isLoading}
                          mr={2}
                        />
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <Table size="sm" variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Key</Th>
                            <Th>Value</Th>
                            <Th>Description</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          <Tr>
                            <Td>{update.key}</Td>
                            <Td>{update.value}</Td>
                            <Td>{update.description}</Td>
                          </Tr>
                        </Tbody>
                      </Table>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <Text>No configuration updates added yet.</Text>
            )}
          </Box>
          
          <FormControl display="flex" alignItems="center">
            <Checkbox
              isChecked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              disabled={isLoading}
            />
            <FormLabel mb="0" ml={2}>
              Dry run (validate changes without applying them)
            </FormLabel>
          </FormControl>
          
          <HStack spacing={4} pt={4}>
            <Button
              colorScheme="gray"
              onClick={handleSkip}
              disabled={isLoading}
              flex="1"
            >
              Skip This Step
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={isLoading}
              loadingText="Updating Configuration..."
              disabled={updates.length === 0}
              flex="1"
            >
              Apply Updates
            </Button>
          </HStack>
        </VStack>
      </form>
    </Box>
  );
};

export default ConfigurationUpdatesForm;
