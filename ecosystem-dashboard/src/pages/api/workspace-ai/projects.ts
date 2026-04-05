import { NextApiRequest, NextApiResponse } from 'next';
import { AIProject, ListProjectsResponse } from '@/types/workspace-ai';

/**
 * API Handler for Workspace AI Projects
 * Currently returns mock data until the backend is fully integrated
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ListProjectsResponse | { error: string }>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Mock projects data matching AIProject interface
        const projects: AIProject[] = [
            {
                id: 'proj_default',
                name: 'General Workspace',
                description: 'Default workspace for general conversations',
                color: 'blue',
                icon: 'folder',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                archived: false,
                conversation_count: 12,
                total_messages: 45,
                total_cost: 0.15
            },
            {
                id: 'proj_research',
                name: 'Research Assistant',
                description: 'Deep research and analysis projects',
                color: 'purple',
                icon: 'beaker',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                archived: false,
                conversation_count: 8,
                total_messages: 120,
                total_cost: 0.85
            },
            {
                id: 'proj_coding',
                name: 'Coding Companion',
                description: 'Code generation and debugging assistance',
                color: 'green',
                icon: 'code',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                archived: false,
                conversation_count: 25,
                total_messages: 350,
                total_cost: 2.45
            }
        ];

        return res.status(200).json({
            projects,
            total: projects.length
        });
    } catch (error) {
        console.error('[API] Error fetching projects:', error);
        return res.status(500).json({ error: 'Failed to fetch projects' });
    }
}
