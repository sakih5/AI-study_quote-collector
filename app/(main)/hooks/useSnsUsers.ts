'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api/client';

export interface SnsUser {
  id: number;
  platform: 'X' | 'THREADS';
  handle: string;
  display_name: string | null;
}

interface SnsUsersResponse {
  sns_users: SnsUser[];
  total: number;
  has_more: boolean;
}

interface SnsUserResponse {
  sns_user: SnsUser;
}

export function useSnsUsers() {
  const [snsUsers, setSnsUsers] = useState<SnsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSnsUsers();
  }, []);

  const fetchSnsUsers = async () => {
    try {
      setLoading(true);
      const data = await apiGet<SnsUsersResponse>('/api/sns-users?limit=100');
      setSnsUsers(data.sns_users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createSnsUser = async (userData: {
    platform: 'X' | 'THREADS';
    handle: string;
    display_name?: string;
  }): Promise<SnsUser | null> => {
    try {
      const data = await apiPost<SnsUserResponse>('/api/sns-users', userData);
      const newUser = data.sns_user;
      setSnsUsers([...snsUsers, newUser]);
      return newUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  return { snsUsers, loading, error, createSnsUser, refetch: fetchSnsUsers };
}
