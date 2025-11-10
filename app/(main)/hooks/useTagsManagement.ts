import { useState, useEffect, useCallback } from 'react';

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

      const response = await fetch(`/api/tags?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'タグの取得に失敗しました');
      }

      const data = await response.json();
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
  const response = await fetch(`/api/tags/${tagId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'タグの名前変更に失敗しました');
  }
}

/**
 * タグの統合
 */
export async function mergeTags(
  sourceTagId: number,
  targetTagId: number
): Promise<void> {
  const response = await fetch(`/api/tags/${sourceTagId}/merge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target_tag_id: targetTagId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'タグの統合に失敗しました');
  }
}

/**
 * タグの削除
 */
export async function deleteTag(tagId: number): Promise<void> {
  const response = await fetch(`/api/tags/${tagId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'タグの削除に失敗しました');
  }
}
