import { useState, useCallback, useRef } from 'react';

export interface SearchResultData { // Renamed to avoid conflict with hook return type
    answer: string;
    sources: any[];
    verificationTrace: string[];
    isComplete: boolean;
    jobId?: string;
}

// Define the return type for the useGooseSearch hook
export interface UseGooseSearchReturn {
    search: (query: string, mode: string) => Promise<void>;
    isLoading: boolean;
    results: SearchResultData | null; // Use the renamed interface here
    error: string | null;
}

export const useGooseSearch = (): UseGooseSearchReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<SearchResultData | null>(null); // Use the renamed interface here
    const [error, setError] = useState<string | null>(null);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Removed useCallback as per the provided snippet, and updated mode type
    const search = async (query: string, mode: string) => {
        setIsLoading(true);
        setError(null);
        setResults(null); // Clear previous results

        // Clear any existing polling interval when a new search starts
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
        }

        try {
            // 1. Initialize Pipeline (API endpoint changed as per snippet)
            const initRes = await fetch('/api/agent-pipeline/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    focusMode: mode // Pass the specific focus mode directly
                })
            });

            if (!initRes.ok) throw new Error('Failed to start search'); // Changed res to initRes
            const { job_id } = await initRes.json();

            // 2. Poll for Results
            setResults({
                answer: '',
                sources: [],
                verificationTrace: [],
                isComplete: false,
                jobId: job_id
            });

            pollInterval.current = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/perplexica/agent-status?jobId=${job_id}`);
                    if (!statusRes.ok) return;

                    const statusData = await statusRes.json();

                    // Update state based on status
                    // Note: The API currently returns a formatted string report.
                    // We might need to parse it or update the API to return structured data.
                    // For now, we'll assume the API returns structured data or we parse it.

                    if (statusData.status === 'completed') {
                        clearInterval(pollInterval.current!);
                        setResults({
                            answer: statusData.report, // Assuming report is the answer
                            sources: statusData.sources || [],
                            verificationTrace: statusData.trace || [],
                            isComplete: true,
                            jobId: job_id
                        });
                        setIsLoading(false);
                    } else if (statusData.status === 'failed') {
                        clearInterval(pollInterval.current!);
                        setError(statusData.error || 'Search failed');
                        setIsLoading(false);
                    }
                } catch (e) {
                    console.error('Polling error', e);
                }
            }, 1000);

        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    return { search, isLoading, results, error };
};
