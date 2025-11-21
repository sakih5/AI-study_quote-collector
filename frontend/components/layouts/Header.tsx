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
    router.push('/');
    router.refresh();
  };

  // ユーザー表示名を取得（メールアドレスの@前）
  const displayName = user.email || 'ユーザー名取得失敗';

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 py-3 md:py-0 md:h-16">
          {/* 左側: アプリ名 */}
          <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
            <Link href="/my-quotes" className="flex items-center gap-2">
              <span className="text-lg md:text-2xl font-bold text-gray-900">ことばアーカイブ</span>
            </Link>
          </div>

          {/* 右側: ユーザー情報・ボタン */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 md:gap-4 w-full md:w-auto">
            {/* ログイン中のユーザー */}
            <div className="text-xs sm:text-sm text-gray-700 truncate max-w-full">
              <span className="text-gray-500">ログイン中:</span>{' '}
              <span className="font-medium">{displayName}</span>
            </div>

            {/* タグ管理リンク */}
            <Link
              href="/settings/tags"
              className="px-3 sm:px-4 py-2 bg-white border border-gray-700 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1 text-sm w-full sm:w-auto justify-center"
            >
              <span>🏷️</span>
              <span>タグ管理</span>
            </Link>

            {/* ログアウトボタン */}
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-3 sm:px-4 py-2 bg-gray-400 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full sm:w-auto"
            >
              {loading ? '処理中...' : 'ログアウト'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
