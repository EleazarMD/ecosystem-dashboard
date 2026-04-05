/**
 * Contact Graph Visualization - Neo4j email relationships
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  Badge,
  Spinner,
  Center,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Avatar,
  Button,
} from '@chakra-ui/react';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Contact {
  email: string;
  name?: string;
  count: number;
}

interface ContactGraphProps {
  graphragUrl?: string;
}

export const ContactGraph: React.FC<ContactGraphProps> = ({
  graphragUrl = 'http://localhost:8780',
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.subtle');
  const primaryColor = useSemanticToken('interactive.primary');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${graphragUrl}/contacts?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <GlassPanel p={6} h="full">
        <Center h="300px">
          <VStack>
            <Spinner size="lg" />
            <Text color={textSecondary}>Loading contacts...</Text>
          </VStack>
        </Center>
      </GlassPanel>
    );
  }

  return (
    <VStack spacing={4} align="stretch" h="full">
      {/* Header Stats */}
      <HStack spacing={4}>
        <GlassPanel p={4} flex={1}>
          <HStack>
            <Icon as={UserGroupIcon} boxSize={8} color={primaryColor} />
            <VStack align="start" spacing={0}>
              <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                {contacts.length}
              </Text>
              <Text fontSize="sm" color={textSecondary}>
                Total Contacts
              </Text>
            </VStack>
          </HStack>
        </GlassPanel>
        <GlassPanel p={4} flex={1}>
          <HStack>
            <Icon as={EnvelopeIcon} boxSize={8} color={primaryColor} />
            <VStack align="start" spacing={0}>
              <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                {contacts.reduce((sum, c) => sum + c.count, 0)}
              </Text>
              <Text fontSize="sm" color={textSecondary}>
                Total Emails
              </Text>
            </VStack>
          </HStack>
        </GlassPanel>
      </HStack>

      {/* Search */}
      <InputGroup>
        <InputLeftElement>
          <Icon as={MagnifyingGlassIcon} color={textTertiary} />
        </InputLeftElement>
        <Input
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </InputGroup>

      {/* Contact List */}
      <GlassPanel p={0} flex={1} overflowY="auto">
        {filteredContacts.length === 0 ? (
          <Center h="200px">
            <VStack>
              <Icon as={UserGroupIcon} boxSize={12} color={textTertiary} />
              <Text color={textSecondary}>No contacts found</Text>
              <Text color={textTertiary} fontSize="sm">
                Contacts will appear as emails are indexed
              </Text>
            </VStack>
          </Center>
        ) : (
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Contact</Th>
                <Th isNumeric>Emails</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredContacts.map((contact) => (
                <Tr
                  key={contact.email}
                  _hover={{ bg: 'whiteAlpha.100' }}
                  cursor="pointer"
                  onClick={() => setSelectedContact(contact)}
                >
                  <Td>
                    <HStack>
                      <Avatar
                        size="sm"
                        name={contact.name || contact.email}
                      />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="medium" color={textPrimary}>
                          {contact.name || contact.email.split('@')[0]}
                        </Text>
                        <Text fontSize="xs" color={textTertiary}>
                          {contact.email}
                        </Text>
                      </VStack>
                    </HStack>
                  </Td>
                  <Td isNumeric>
                    <Badge colorScheme="purple" variant="subtle">
                      {contact.count}
                    </Badge>
                  </Td>
                  <Td>
                    <Button size="xs" variant="ghost">
                      View Graph
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </GlassPanel>

      {/* Graph Visualization Placeholder */}
      <GlassPanel p={4}>
        <Text fontSize="sm" color={textTertiary} textAlign="center">
          🔮 Interactive graph visualization coming soon
        </Text>
        <Text fontSize="xs" color={textTertiary} textAlign="center" mt={1}>
          Will show email relationships using Neo4j data
        </Text>
      </GlassPanel>
    </VStack>
  );
};

export default ContactGraph;
