import React from 'react';
import {
    Box,
    SimpleGrid,
    Text,
    Card,
    CardBody,
    Image,
    HStack,
    Icon,
    Badge,
    VStack,
} from '@chakra-ui/react';
import { ClockIcon, FireIcon } from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface NewsItem {
    id: string;
    title: string;
    source: string;
    time: string;
    imageUrl?: string;
    category: string;
}

const MOCK_NEWS: NewsItem[] = [
    {
        id: '1',
        title: 'Breakthrough in Nuclear Fusion Energy Generation announced at ITER',
        source: 'Science Daily',
        time: '2h ago',
        category: 'Science',
        imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=300'
    },
    {
        id: '2',
        title: 'New AI Model "Qwen 2.5" Outperforms GPT-4 in Coding Benchmarks',
        source: 'TechCrunch',
        time: '4h ago',
        category: 'Technology',
        imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=300'
    },
    {
        id: '3',
        title: 'SpaceX Starship Successfully Reaches Orbit in Latest Test Flight',
        source: 'SpaceNews',
        time: '6h ago',
        category: 'Space',
        imageUrl: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&q=80&w=300'
    },
    {
        id: '4',
        title: 'Global Markets Rally as Inflation Data Shows Cooling Trend',
        source: 'Bloomberg',
        time: '8h ago',
        category: 'Finance',
        imageUrl: 'https://images.unsplash.com/photo-1611974765270-ca1258634369?auto=format&fit=crop&q=80&w=300'
    }
];

export const DiscoveryFeed: React.FC = () => {
    const cardBg = useSemanticToken('surface.elevated');
    const textColor = useSemanticToken('text.primary');
    const mutedColor = useSemanticToken('text.secondary');

    return (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {MOCK_NEWS.map((item) => (
                <Card
                    key={item.id}
                    bg={cardBg}
                    variant="outline"
                    overflow="hidden"
                    cursor="pointer"
                    _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
                    transition="all 0.2s"
                >
                    <HStack align="start" spacing={0} h="full">
                        <Box w="100px" h="full" position="relative">
                            <Image
                                src={item.imageUrl}
                                alt={item.title}
                                objectFit="cover"
                                h="full"
                                w="full"
                            />
                        </Box>
                        <CardBody py={3} px={4}>
                            <VStack align="start" spacing={2}>
                                <HStack justify="space-between" w="full">
                                    <Badge colorScheme="blue" fontSize="xs" variant="subtle">{item.category}</Badge>
                                    <HStack spacing={1}>
                                        <Icon as={ClockIcon} w={3} h={3} color="gray.500" />
                                        <Text fontSize="xs" color="gray.500">{item.time}</Text>
                                    </HStack>
                                </HStack>

                                <Text fontWeight="bold" fontSize="sm" noOfLines={2} color={textColor}>
                                    {item.title}
                                </Text>

                                <Text fontSize="xs" color={mutedColor} fontWeight="medium">
                                    {item.source}
                                </Text>
                            </VStack>
                        </CardBody>
                    </HStack>
                </Card>
            ))}
        </SimpleGrid>
    );
};
