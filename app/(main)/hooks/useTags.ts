import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Tag {
  id: number;
  name: string;
  usage_count?: number;
  created_at: string;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    try {
      const supabase = createClient();
      const response = await fetch('/api/tags', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('タグの取得に失敗しました');
      }

      const data = await response.json();
      setTags(data.tags || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createTag(name: string): Promise<Tag | null> {
    try {
      const supabase = createClient();
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('タグの作成に失敗しました');
      }

      const data = await response.json();
      const newTag = data.tag;

      // ローカルステートを更新
      setTags((prev) => [...prev, newTag]);

      return newTag;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }

  return { tags, loading, error, createTag, refreshTags: fetchTags };
}
