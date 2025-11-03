import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';

interface Activity {
  id: number;
  name: string;
  description: string;
  icon: string;
  display_order: number;
}

interface ActivitiesResponse {
  activities: Activity[];
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const data = await apiGet<ActivitiesResponse>('/api/activities');
        setActivities(data.activities || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, []);

  return { activities, loading, error };
}
