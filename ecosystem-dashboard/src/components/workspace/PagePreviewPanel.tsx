import React, { useEffect, useState } from 'react';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';
import { CustomNotionEditor } from '@/components/editor/CustomNotionEditor';
import { Block } from '@/lib/editor/BlockModel';

interface PagePreviewPanelProps {
    pageId: string;
    workspaceId: string;
}

export default function PagePreviewPanel({ pageId, workspaceId }: PagePreviewPanelProps) {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pageId) return;
        loadPageBlocks();
    }, [pageId]);

    const loadPageBlocks = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/blocks/${pageId}`);
            if (response.ok) {
                const data = await response.json();
                // Transform children to blocks
                const pageBlocks: Block[] = data.children?.map((child: any) => ({
                    id: child.id,
                    type: child.type,
                    properties: child.properties,
                    content: [{ text: child.properties?.title?.[0]?.text?.content || child.properties?.content || '' }],
                    parentId: child.parent_id,
                    children: [],
                    createdTime: new Date(child.created_at).getTime(),
                    lastEditedTime: new Date(child.updated_at).getTime(),
                    createdBy: child.created_by,
                    lastEditedBy: child.last_edited_by,
                })) || [];
                setBlocks(pageBlocks);
            } else {
                setError('Failed to load page content');
            }
        } catch (err) {
            setError('Error loading page content');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" h="100%">
                <Spinner size="xl" />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={4}>
                <Text color="red.500">{error}</Text>
            </Box>
        );
    }

    return (
        <Box h="100%" overflowY="auto" p={4}>
            <CustomNotionEditor
                pageId={pageId}
                title="Page Preview" // TODO: Fetch actual title
                initialBlocks={blocks}
                workspaceId={workspaceId}
                onBlocksChange={setBlocks}
                onTitleChange={() => { }}
                onSave={() => { }}
                readOnly={false}
            />
        </Box>
    );
}
