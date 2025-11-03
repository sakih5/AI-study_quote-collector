import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api/client';

interface Tag {
  id: number;
  name: string;
  usage_count?: number;
  created_at: string;
}

interface TagsResponse {
  tags: Tag[];
}

interface TagResponse {
  tag: Tag;
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
      const data = await apiGet<TagsResponse>('/api/tags');
      setTags(data.tags || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createTag(name: string): Promise<Tag | null> {
    try {
      const data = await apiPost<TagResponse>('/api/tags', { name });
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
