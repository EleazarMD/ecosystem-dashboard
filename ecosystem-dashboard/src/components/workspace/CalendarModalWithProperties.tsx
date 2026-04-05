/**
 * CalendarModalWithProperties - Example integration of dynamic property system
 * Shows how to add the property command menu to the calendar event creation modal
 */

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  IconButton,
  Icon,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiExternalLink,
  FiCopy,
  FiTrash2,
  FiCalendar,
} from 'react-icons/fi';
import { PropertyCommandMenu } from './PropertyCommandMenu';
import { useAddPropertyButton } from '@/hooks/usePropertyCommand';
import { PropertyDefinition } from '@/lib/property-registry';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PropertyValue {
  id: string;
  name: string;
  type: string;
  icon: string;
  value: any;
}

interface CalendarModalWithPropertiesProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onCreateEvent: (title: string, properties: PropertyValue[]) => Promise<void>;
}

export function CalendarModalWithProperties({
  isOpen,
  onClose,
  selectedDate,
  onCreateEvent,
}: CalendarModalWithPropertiesProps) {
  const [eventTitle, setEventTitle] = useState('');
  const [properties, setProperties] = useState<PropertyValue[]>([]);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const selectedBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  // Property command menu integration
  const addProperty = useAddPropertyButton(
    (property: PropertyDefinition) => {
      // Add new property to list
      const newProperty: PropertyValue = {
        id: `${property.type}-${Date.now()}`,
        name: property.name,
        type: property.type,
        icon: property.icon,
        value: property.defaultValue ?? null,
      };
      setProperties([...properties, newProperty]);
    },
    {
      view: 'calendar',
      hasDatabase: false, // Calendar doesn't require database
    }
  );

  const handleCreate = async () => {
    if (!eventTitle.trim()) return;

    await onCreateEvent(eventTitle, properties);

    // Reset
    setEventTitle('');
    setProperties([]);
    onClose();
  };

  const handleRemoveProperty = (propertyId: string) => {
    setProperties(properties.filter(p => p.id !== propertyId));
  };

  const handleUpdatePropertyValue = (propertyId: string, value: any) => {
    setProperties(properties.map(p =>
      p.id === propertyId ? { ...p, value } : p
    ));
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalOverlay />
        <ModalContent maxW="800px" minH="600px">
          {/* Header with Share and Actions */}
          <HStack
            justify="flex-end"
            p={4}
            borderBottom="1px solid"
            borderColor={borderColor}
          >
            <Button size="sm" variant="ghost" leftIcon={<Icon as={FiExternalLink} />}>
              Share
            </Button>
            <IconButton
              icon={<Icon as={FiCopy} />}
              aria-label="Favorite"
              size="sm"
              variant="ghost"
            />
            <IconButton
              icon={<Icon as={FiTrash2} />}
              aria-label="More options"
              size="sm"
              variant="ghost"
            />
          </HStack>

          <ModalBody px={20} py={8}>
            <VStack align="stretch" spacing={6}>
              {/* Page Title */}
              <Input
                placeholder="New page"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                fontSize="3xl"
                fontWeight="bold"
                border="none"
                px={0}
                _focus={{ boxShadow: 'none' }}
                _placeholder={{ color: 'gray.300' }}
                autoFocus
              />

              {/* Properties Section */}
              <VStack align="stretch" spacing={3}>
                {/* Date Property (always present) */}
                <HStack spacing={4}>
                  <HStack spacing={2} minW="120px" color={mutedColor}>
                    <Icon as={FiCalendar} boxSize={4} />
                    <Text fontSize="sm">Date</Text>
                  </HStack>
                  <Text fontSize="sm" color={textColor}>
                    {selectedDate?.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </HStack>

                {/* Dynamic Properties */}
                {properties.map((prop) => (
                  <HStack key={prop.id} spacing={4}>
                    <HStack spacing={2} minW="120px" color={mutedColor}>
                      <Text fontSize="lg">{prop.icon}</Text>
                      <Text fontSize="sm">{prop.name}</Text>
                    </HStack>

                    {/* Property Value Input */}
                    <HStack flex={1}>
                      {prop.type === 'text' && (
                        <Input
                          size="sm"
                          placeholder="Empty"
                          value={prop.value || ''}
                          onChange={(e) => handleUpdatePropertyValue(prop.id, e.target.value)}
                        />
                      )}

                      {prop.type === 'number' && (
                        <Input
                          size="sm"
                          type="number"
                          placeholder="0"
                          value={prop.value || ''}
                          onChange={(e) => handleUpdatePropertyValue(prop.id, Number(e.target.value))}
                        />
                      )}

                      {prop.type === 'checkbox' && (
                        <Box
                          as="button"
                          w="20px"
                          h="20px"
                          borderRadius="sm"
                          border="2px solid"
                          borderColor={prop.value ? 'blue.500' : borderColor}
                          bg={prop.value ? 'blue.500' : 'transparent'}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          onClick={() => handleUpdatePropertyValue(prop.id, !prop.value)}
                        >
                          {prop.value && <Text color="whiteAlpha.900">✓</Text>}
                        </Box>
                      )}

                      {/* Default: Show empty */}
                      {!['text', 'number', 'checkbox'].includes(prop.type) && (
                        <Text fontSize="sm" color={useSemanticToken('text.tertiary')}>Empty</Text>
                      )}

                      {/* Remove button */}
                      <IconButton
                        icon={<Icon as={FiTrash2} />}
                        aria-label="Remove property"
                        size="xs"
                        variant="ghost"
                        onClick={() => handleRemoveProperty(prop.id)}
                      />
                    </HStack>
                  </HStack>
                ))}

                {/* Add Property Button */}
                <Button
                  ref={addProperty.buttonRef}
                  variant="ghost"
                  size="sm"
                  leftIcon={<Icon as={FiPlus} boxSize={4} />}
                  color={useSemanticToken('text.secondary')}
                  justifyContent="flex-start"
                  _hover={{ color: textColor }}
                  onClick={addProperty.openMenu}
                >
                  Add a property
                </Button>
              </VStack>

              {/* Comments Section */}
              <Box>
                <Text fontSize="sm" color={mutedColor} mb={2}>Comments</Text>
                <HStack
                  p={2}
                  borderRadius="md"
                  _hover={{ bg: selectedBg }}
                  cursor="text"
                >
                  <Box
                    w="24px"
                    h="24px"
                    borderRadius="md"
                    bg={useSemanticToken('surface.elevated')}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="xs"
                    fontWeight="bold"
                    color={useSemanticToken('text.secondary')}
                  >
                    E
                  </Box>
                  <Text fontSize="sm" color={useSemanticToken('text.tertiary')}>Add a comment...</Text>
                </HStack>
              </Box>

              {/* Footer Text */}
              <Text fontSize="sm" color={mutedColor} pt={4}>
                Press <Text as="span" fontWeight="600">Enter</Text> to continue with an empty page, or{' '}
                <Text
                  as="span"
                  textDecoration="underline"
                  cursor="pointer"
                  _hover={{ color: textColor }}
                >
                  create a template
                </Text>
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Property Command Menu */}
      <PropertyCommandMenu
        isOpen={addProperty.isOpen}
        position={addProperty.position}
        context={addProperty.context}
        onClose={addProperty.closeMenu}
        onSelect={addProperty.handleSelect}
      />
    </>
  );
}

/**
 * Usage Example:
 * 
 * function CalendarView() {
 *   const [isModalOpen, setIsModalOpen] = useState(false);
 *   const [selectedDate, setSelectedDate] = useState<Date | null>(null);
 *   
 *   const handleCreateEvent = async (title: string, properties: PropertyValue[]) => {
 *     await fetch('/api/workspace/events', {
 *       method: 'POST',
 *       body: JSON.stringify({
 *         title,
 *         date: selectedDate,
 *         properties: properties.map(p => ({
 *           name: p.name,
 *           type: p.type,
 *           value: p.value,
 *         })),
 *       }),
 *     });
 *   };
 *   
 *   return (
 *     <>
 *       <Calendar onDateClick={(date) => {
 *         setSelectedDate(date);
 *         setIsModalOpen(true);
 *       }} />
 *       
 *       <CalendarModalWithProperties
 *         isOpen={isModalOpen}
 *         onClose={() => setIsModalOpen(false)}
 *         selectedDate={selectedDate}
 *         onCreateEvent={handleCreateEvent}
 *       />
 *     </>
 *   );
 * }
 */
