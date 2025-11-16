import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut, apiPost, apiDelete } from '@/lib/api/client';

export type TagWithMetadata = {
  id: number;
  name: string;
  created_at: string;
  usage_count: number;
  activity_distribution: Record<number, number>;
};

type UseTagsManagementParams = {
  search?: string;
  sort?: 'name' | 'created_at' | 'usage_count';
  order?: 'asc' | 'desc';
};

export function useTagsManagement(params: UseTagsManagementParams = {}) {
  const { search = '', sort = 'usage_count', order = 'desc' } = params;

  const [tags, setTags] = useState<TagWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('sort', sort);
      params.append('order', order);

      const data = await apiGet<{ tags: TagWithMetadata[] }>(`/api/tags?${params.toString()}`);
      setTags(data.tags || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [search, sort, order]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    refetch: fetchTags,
  };
}

/**
 * タグのリネーム
 */
export async function renameTag(tagId: number, newName: string): Promise<void> {
  await apiPut(`/api/tags/${tagId}`, { name: newName });
}

/**
 * タグの統合
 */
export async function mergeTags(
  sourceTagId: number,
  targetTagId: number
): Promise<void> {
  await apiPost(`/api/tags/${sourceTagId}/merge`, { target_tag_id: targetTagId });
}

/**
 * タグの削除
 */
export async function deleteTag(tagId: number): Promise<void> {
  await apiDelete(`/api/tags/${tagId}`);
}
