'use client';

import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // ユーザー表示名を取得（メールアドレスの@前）
  const displayName = user.email?.split('@')[0] || 'ユーザー';

  return (
    <header className="bg-[#2a2a2a] border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 左側: アプリ名 */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">抜き書きアプリ</span>
            </Link>
          </div>

          {/* 右側: ユーザー情報・ボタン */}
          <div className="flex items-center gap-4">
            {/* ログイン中のユーザー */}
            <div className="text-sm text-gray-300">
              <span className="text-gray-400">ログイン中:</span>{' '}
              <span className="font-medium">{displayName}</span>
            </div>

            {/* タグ管理リンク */}
            <Link
              href="/settings/tags"
              className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <span>🏷️</span>
              <span>タグ管理</span>
            </Link>

            {/* ログアウトボタン */}
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading ? '処理中...' : 'ログアウト'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
