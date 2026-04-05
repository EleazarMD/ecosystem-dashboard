import { NextApiRequest, NextApiResponse } from 'next';

const REMOTE_API_URL = 'http://100.108.41.22:3000/api/agent-pipeline';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing id' });
    }

    try {
        // 1. Get State
        const stateRes = await fetch(`${REMOTE_API_URL}/${id}/state`);
        if (!stateRes.ok) throw new Error('Failed to get state');

        const state = await stateRes.json();

        // Check if all subagents are done (simple heuristic: check if maps/arrays are populated)
        // Or check a 'status' field if we added one. We didn't explicitly add a 'status' field to DataFlowLayer.
        // But we can check if 'final_results' is populated.

        const isComplete = state.final_results && state.final_results.length > 0;

        if (isComplete) {
            // Return structured data
            return res.status(200).json({
                status: 'completed',
                answer: state.answer || formatReport(state.final_results, state), // Fallback to formatted report if no answer
                sources: state.final_results,
                trace: state.final_results.map((r: any) => r.verification_trace).flat()
            });
        }

        // Check if we need to trigger synthesis
        // If subagents are done but final_results is empty, trigger synthesis
        const subagentsDone = state.domain_scores?.value?.length > 0 &&
            state.content_analysis?.length > 0 &&
            state.fact_checks?.length > 0;

        if (subagentsDone && (!state.final_results || state.final_results.length === 0)) {
            // Trigger synthesis if not already doing so (idempotent)
            fetch(`${REMOTE_API_URL}/${id}/synthesize`, { method: 'POST' }).catch(() => { });
            return res.status(200).json({ status: 'running', progress: 'Synthesizing results...' });
        }

        // Generate progress message
        let progress = 'Processing...';
        if (state.raw_search_results?.length > 0) progress = 'Analyzing search results...';
        if (state.domain_scores?.value?.length > 0) progress = 'Validating domain authority...';
        if (state.fact_checks?.length > 0) progress = 'Verifying facts...';

        res.status(200).json({ status: 'running', progress });

    } catch (error: any) {
        console.error('[AgentStatus] Error:', error);
        res.status(500).json({ error: error.message });
    }
}

function formatReport(results: any[], state: any): string {
    let md = `## Verified Search Results\n\n`;

    if (state.metrics) {
        md += `> **Execution Metrics**: ${state.metrics.total_execution_time_ms}ms | ${state.metrics.subagents_spawned} Agents\n\n`;
    }

    results.forEach((r: any, i: number) => {
        md += `### ${i + 1}. [${r.title}](${r.url})\n`;
        md += `**Confidence**: ${(r.overall_confidence * 100).toFixed(0)}% | **Source**: ${r.source_engine}\n\n`;
        md += `${r.content}\n\n`;

        if (r.verification_trace) {
            md += `*Verification: ${r.verification_trace.join(', ')}*\n`;
        }
        md += `\n---\n`;
    });

    return md;
}
