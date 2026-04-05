import React, { useState, useEffect } from 'react';

// Define the structure of an activity update item
interface ActivityUpdate {
  id: string; // Or number, depending on DB schema
  timestamp: string; // ISO format string
  message: string;
  project_name?: string; // Assuming project name might be included
  // Add other relevant fields based on actual API response
}

interface ActivityFeedProps {
  // Add props if needed
}

const ActivityFeed: React.FC<ActivityFeedProps> = () => {
  const [activities, setActivities] = useState<ActivityUpdate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/activity'); // Fetches from the MCP server backend
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setActivities(result.data);
        } else {
          throw new Error('Failed to fetch activities or invalid data format');
        }
      } catch (err) {
        console.error("Error fetching activity feed:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []); // Empty dependency array means this runs once on mount

  const formatDateTime = (timestamp: string): string => {
    if (!isClient) return 'Loading...';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return <div>Loading activity feed...</div>;
  }

  if (error) {
    return <div>Error loading activity feed: {error}</div>;
  }

  if (activities.length === 0) {
    return <div>No recent activity found.</div>;
  }

  return (
    <div>
      <h3>Recent Ecosystem Activity</h3>
      {/* Basic list rendering - enhance with UI library components later */}
      <ul>
        {activities.map((activity) => (
          <li key={activity.id}>
            <strong>{formatDateTime(activity.timestamp)}</strong>: {activity.message}
            {activity.project_name && ` (Project: ${activity.project_name})`}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActivityFeed;
