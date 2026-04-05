import React from 'react';
import {
    Box,
    VStack,
    Text,
    SkeletonText,
    HStack,
    Icon,
    Collapse,
    Button,
    useDisclosure,
    Card,
    CardBody,
    Badge,
    Link,
} from '@chakra-ui/react';
import {
    CheckCircleIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { SearchResultData } from '@/hooks/useGooseSearch';
import { Image } from '@chakra-ui/react';

interface SearchResultsStreamProps {
    isLoading: boolean;
    results: SearchResultData | null;
    mode: 'web' | 'rag';
}

export const SearchResultsStream: React.FC<SearchResultsStreamProps> = ({
    isLoading,
    results,
    mode
}) => {
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });

    if (isLoading && !results?.answer) {
        return (
            <VStack spacing={6} align="stretch" w="full" py={8}>
                {/* Thinking Skeleton */}
                <HStack spacing={3} color="gray.500">
                    <Icon as={ArrowPathIcon} className="animate-spin" w={4} h={4} />
                    <Text fontSize="sm">Searching...</Text>
                </HStack>

                {/* Answer Skeleton */}
                <Box>
                    <SkeletonText noOfLines={6} spacing="4" skeletonHeight="3" />
                </Box>
            </VStack>
        );
    }

    if (!results) return null;

    return (
        <VStack spacing={8} align="stretch" w="full" py={4}>

            {/* Thinking Process (Collapsible) */}
            <Box>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    rightIcon={isOpen ? <ChevronUpIcon width={16} /> : <ChevronDownIcon width={16} />}
                    fontWeight="normal"
                    color="gray.500"
                    fontSize="sm"
                    px={0}
                    _hover={{ bg: 'transparent', color: 'gray.700' }}
                >
                    <HStack>
                        {results.isComplete ? (
                            <Icon as={CheckCircleIcon} color="green.500" w={4} h={4} />
                        ) : (
                            <Icon as={ArrowPathIcon} className="animate-spin" color="blue.500" w={4} h={4} />
                        )}
                        <Text>
                            {results.isComplete ? `Verified ${results.sources.length} sources` : 'Analyzing...'}
                        </Text>
                    </HStack>
                </Button>
                <Collapse in={isOpen}>
                    <VStack align="start" pl={6} mt={2} spacing={1}>
                        {results.verificationTrace.length > 0 ? (
                            results.verificationTrace.map((trace, i) => (
                                <Text key={i} fontSize="xs" color="gray.500">✓ {trace}</Text>
                            ))
                        ) : (
                            <Text fontSize="xs" color="gray.500">Initializing...</Text>
                        )}
                    </VStack>
                </Collapse>
            </Box>

            {/* Sources */}
            {results.sources.length > 0 && (
                <Box>
                    <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3} textTransform="uppercase" letterSpacing="wide">
                        Sources
                    </Text>
                    <HStack spacing={3} overflowX="auto" pb={2}>
                        {results.sources.map((source: any, i: number) => (
                            <Card
                                key={i}
                                minW="180px"
                                maxW="180px"
                                size="sm"
                                variant="outline"
                                cursor="pointer"
                                borderColor="gray.200"
                                _hover={{ borderColor: 'blue.400', shadow: 'sm' }}
                                as={Link}
                                href={source.url}
                                isExternal
                                textDecoration="none !important"
                                borderRadius="lg"
                                transition="all 0.2s"
                            >
                                <CardBody p={3}>
                                    <Text fontSize="xs" fontWeight="600" noOfLines={2} mb={2} color="gray.800">
                                        {source.title}
                                    </Text>
                                    <HStack justify="space-between">
                                        <HStack spacing={1}>
                                            <Image
                                                src={`https://www.google.com/s2/favicons?domain=${source.domain}`}
                                                w={3}
                                                h={3}
                                                alt=""
                                                fallbackSrc="https://via.placeholder.com/12"
                                            />
                                            <Text fontSize="xs" color="gray.500" noOfLines={1}>{source.domain}</Text>
                                        </HStack>
                                        {source.overall_confidence && (
                                            <Badge
                                                colorScheme={source.overall_confidence > 0.7 ? 'green' : 'yellow'}
                                                fontSize="xx-small"
                                                variant="subtle"
                                            >
                                                {(source.overall_confidence * 100).toFixed(0)}%
                                            </Badge>
                                        )}
                                    </HStack>
                                </CardBody>
                            </Card>
                        ))}
                    </HStack>
                </Box>
            )}

            {/* Answer */}
            <Box>
                <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3} textTransform="uppercase" letterSpacing="wide">
                    Answer
                </Text>
                <Text
                    fontSize="md"
                    lineHeight="tall"
                    color="gray.800"
                    whiteSpace="pre-wrap"
                    _dark={{ color: 'gray.100' }}
                >
                    {results.answer}
                </Text>
            </Box>

            {/* Related (Commented out until we have actual related questions from backend) */}
            {/* <Box pt={4}>
                <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3} textTransform="uppercase" letterSpacing="wide">
                    Related
                </Text>
                <VStack align="start" spacing={2}>
                    {['Example question 1', 'Example question 2'].map((q, i) => (
                        <HStack key={i} py={2} px={3} w="full" _hover={{ bg: 'gray.50' }} borderRadius="md" cursor="pointer">
                            <Text fontSize="sm" color="gray.600">{q}</Text>
                        </HStack>
                    ))}
                </VStack>
            </Box> */}

        </VStack>
    );
};
