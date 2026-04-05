import { NextApiRequest, NextApiResponse } from 'next';

const REMOTE_API_URL = 'http://100.108.41.22:3000/api/agent-pipeline';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query, focusMode } = req.body;

    try {
        console.log('[AgentSearch] Initializing pipeline for:', query);

        // 1. Initialize Pipeline
        const initRes = await fetch(`${REMOTE_API_URL}/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, focusMode: focusMode || 'webSearch' }),
        });

        if (!initRes.ok) {
            throw new Error(`Failed to init pipeline: ${initRes.statusText}`);
        }

        const { pipelineId } = await initRes.json();
        console.log('[AgentSearch] Pipeline started:', pipelineId);

        // 2. Trigger Subagents (Fire and Forget)
        // In a real production app, the remote orchestrator should handle this.
        // Since we are orchestrating from here, we trigger them now.
        const actions = ['validate-domains', 'detect-farms', 'analyze-diversity', 'verify-facts'];

        // We don't await these to return the job_id quickly
        Promise.all(actions.map(action =>
            fetch(`${REMOTE_API_URL}/${pipelineId}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ claim: query }) // Passing query as claim for fact-checking
            }).catch(err => console.error(`Failed to trigger ${action}:`, err))
        ));

        res.status(200).json({ job_id: pipelineId });

    } catch (error: any) {
        console.error('[AgentSearch] Error:', error);
        res.status(500).json({ error: error.message });
    }
}
