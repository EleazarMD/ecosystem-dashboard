/**
 * Conversation Analytics Dashboard
 * 
 * Real-time monitoring of production child AI conversations
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface ConversationStats {
  total_messages: number;
  unique_users: number;
  total_conversations: number;
  avg_response_time: number;
  avg_response_length: number;
  with_choices: number;
  errors: number;
}

interface SubjectStats {
  subject_area: string;
  count: number;
  avg_length: number;
  avg_time: number;
}

interface UserStats {
  user_name: string;
  user_theme: string;
  user_age: number;
  message_count: number;
  conversation_count: number;
  avg_response_length: number;
}

interface RecentConversation {
  user_name: string;
  user_theme: string;
  user_age: number;
  subject_area: string;
  message_preview: string;
  response_length: number;
  response_time_ms: number;
  interactive_choices_present: boolean;
  created_at: string;
}

interface LengthDistribution {
  user_theme: string;
  user_age: number;
  avg_length: number;
  std_dev: number;
  min_length: number;
  max_length: number;
}

interface AnalyticsData {
  timeframe: string;
  stats: ConversationStats;
  bySubject: SubjectStats[];
  byUser: UserStats[];
  recent: RecentConversation[];
  lengthDistribution: LengthDistribution[];
}

export default function ConversationAnalytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [timeframe, setTimeframe] = useState('24h');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/conversation-analytics?timeframe=${timeframe}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Conversation Analytics</h1>
            <p className="text-gray-600 mt-1">Real-time monitoring of production AI conversations</p>
          </div>
          <div className="flex gap-2">
            {['24h', '7d', '30d', 'all'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tf === '24h' ? 'Last 24h' : tf === '7d' ? 'Last 7d' : tf === '30d' ? 'Last 30d' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Overall Stats */}
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Total Messages</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{data.stats.total_messages}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Unique Users</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{data.stats.unique_users}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Avg Response Time</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{data.stats.avg_response_time}ms</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">With Choices</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  {data.stats.total_messages > 0 
                    ? Math.round((data.stats.with_choices / data.stats.total_messages) * 100)
                    : 0}%
                </div>
              </div>
            </div>

            {/* By Subject */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">By Subject Area</h2>
              </div>
              <div className="p-6">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-3">Subject</th>
                      <th className="pb-3">Count</th>
                      <th className="pb-3">Avg Length</th>
                      <th className="pb-3">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {data.bySubject.map((subject) => (
                      <tr key={subject.subject_area} className="border-t border-gray-100">
                        <td className="py-3 font-medium capitalize">{subject.subject_area || 'Unknown'}</td>
                        <td className="py-3">{subject.count}</td>
                        <td className="py-3">{subject.avg_length} chars</td>
                        <td className="py-3">{subject.avg_time}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By User */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">By User</h2>
              </div>
              <div className="p-6">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Theme</th>
                      <th className="pb-3">Age</th>
                      <th className="pb-3">Messages</th>
                      <th className="pb-3">Conversations</th>
                      <th className="pb-3">Avg Length</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {data.byUser.map((user, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="py-3 font-medium">{user.user_name}</td>
                        <td className="py-3 capitalize">{user.user_theme}</td>
                        <td className="py-3">{user.user_age}yo</td>
                        <td className="py-3">{user.message_count}</td>
                        <td className="py-3">{user.conversation_count}</td>
                        <td className="py-3">{user.avg_response_length} chars</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Length Distribution */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Response Length Distribution</h2>
              </div>
              <div className="p-6">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-3">Theme</th>
                      <th className="pb-3">Age</th>
                      <th className="pb-3">Avg</th>
                      <th className="pb-3">StdDev</th>
                      <th className="pb-3">Min</th>
                      <th className="pb-3">Max</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {data.lengthDistribution.map((dist, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="py-3 capitalize">{dist.user_theme}</td>
                        <td className="py-3">{dist.user_age}yo</td>
                        <td className="py-3 font-medium">{dist.avg_length}</td>
                        <td className="py-3">{dist.std_dev}</td>
                        <td className="py-3">{dist.min_length}</td>
                        <td className="py-3">{dist.max_length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Conversations */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Recent Conversations</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {data.recent.map((conv, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{conv.user_name}</span>
                          <span className="text-sm text-gray-500 capitalize">{conv.user_theme}</span>
                          <span className="text-sm text-gray-500">{conv.user_age}yo</span>
                          {conv.subject_area && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded capitalize">
                              {conv.subject_area}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(conv.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 mb-2">"{conv.message_preview}..."</div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>Response: {conv.response_length} chars</span>
                        <span>Time: {conv.response_time_ms}ms</span>
                        {conv.interactive_choices_present && (
                          <span className="text-green-600">✓ Choices</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
