import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Activity {
  id: number;
  name: string;
  description: string;
  icon: string;
  display_order: number;
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const supabase = createClient();
        const response = await fetch('/api/activities', {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('活動領域の取得に失敗しました');
        }

        const data = await response.json();
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
