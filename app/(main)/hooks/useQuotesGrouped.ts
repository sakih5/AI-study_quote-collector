'use client';

import { useState, useEffect } from 'react';

export interface Activity {
  id: number;
  name: string;
  icon: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Quote {
  id: number;
  text: string;
  page_number?: number;
  activities: Activity[];
  tags: Tag[];
  created_at: string;
}

export interface Book {
  id: number;
  title: string;
  author: string | null;
  cover_image_url: string | null;
}

export interface SnsUser {
  id: number;
  platform: 'X' | 'THREADS';
  handle: string;
  display_name: string | null;
}

export interface BookGroup {
  type: 'book';
  book: Book;
  quotes: Quote[];
}

export interface SnsGroup {
  type: 'sns';
  sns_user: SnsUser;
  quotes: Quote[];
}

export interface OtherGroup {
  type: 'other';
  quote: Quote & {
    source_meta: {
      source?: string;
      note?: string;
    };
  };
}

export type QuoteGroup = BookGroup | SnsGroup | OtherGroup;

export interface UseQuotesGroupedOptions {
  search?: string;
  sourceType?: 'BOOK' | 'SNS' | 'OTHER';
  activityIds?: number[];
  tagIds?: number[];
  limit?: number;
  offset?: number;
}

export function useQuotesGrouped(options: UseQuotesGroupedOptions = {}) {
  const [items, setItems] = useState<QuoteGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);

  useEffect(() => {
    // フィルター条件が変わったらリセット
    setItems([]);
    setCurrentOffset(0);
    fetchQuotes(0, false);
  }, [
    options.search,
    options.sourceType,
    options.activityIds,
    options.tagIds,
    options.limit,
  ]);

  const fetchQuotes = async (offset: number = 0, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = new URLSearchParams();
      if (options.search) params.append('search', options.search);
      if (options.sourceType) params.append('source_type', options.sourceType);
      if (options.activityIds && options.activityIds.length > 0) {
        params.append('activity_ids', options.activityIds.join(','));
      }
      if (options.tagIds && options.tagIds.length > 0) {
        params.append('tag_ids', options.tagIds.join(','));
      }
      params.append('limit', (options.limit || 50).toString());
      params.append('offset', offset.toString());

      // FastAPI用のfetchを使用
      const { apiGet } = await import('@/lib/api/client');
      const data = await apiGet<{
        items: QuoteGroup[];
        total: number;
        has_more: boolean;
      }>(`/api/quotes/grouped?${params.toString()}`);

      if (append) {
        setItems((prevItems) => [...prevItems, ...(data.items || [])]);
      } else {
        setItems(data.items || []);
      }

      setTotal(data.total || 0);
      setHasMore(data.has_more || false);
      setCurrentOffset(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    const nextOffset = currentOffset + (options.limit || 50);
    fetchQuotes(nextOffset, true);
  };

  const refetch = () => {
    setItems([]);
    setCurrentOffset(0);
    fetchQuotes(0, false);
  };

  return { items, loading, loadingMore, error, total, hasMore, loadMore, refetch };
}
