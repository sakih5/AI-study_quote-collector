'use client';

import { useState, useEffect } from 'react';

export interface SnsUser {
  id: number;
  platform: 'X' | 'THREADS';
  handle: string;
  display_name: string | null;
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
      const response = await fetch('/api/sns-users?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch SNS users');
      }
      const data = await response.json();
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
      const response = await fetch('/api/sns-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to create SNS user');
      }

      const data = await response.json();
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
