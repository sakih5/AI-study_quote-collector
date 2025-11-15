'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

interface Activity {
  id: number;
  name: string;
  icon: string;
}

interface Tag {
  id: number;
  name: string;
}

interface Quote {
  id: number;
  text: string;
  page_number?: number;
  is_public: boolean;
  activities: number[];
  tags: number[];
  created_at: string;
}

interface Book {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_image_url: string | null;
}

interface BookGroup {
  book: Book;
  quotes: Quote[];
}

interface SnsUser {
  id: number;
  platform: 'X' | 'THREADS';
  handle: string;
  display_name: string | null;
}

interface SnsGroup {
  sns_user: SnsUser;
  quotes: Quote[];
}

export default function PublicHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [bookGroups, setBookGroups] = useState<BookGroup[]>([]);
  const [snsGroups, setSnsGroups] = useState<SnsGroup[]>([]);
  const [total, setTotal] = useState(0);

  // 認証チェック - 認証済みユーザーは自分のページにリダイレクト
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 認証済みユーザーは自分のフレーズページへ
        router.push('/my-quotes');
      } else {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // 公開フレーズを取得
  useEffect(() => {
    const fetchPublicQuotes = async () => {
      if (checkingAuth) return;

      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || '';
        const response = await fetch(`${apiUrl}/api/quotes/public?limit=50`);
        if (!response.ok) {
          throw new Error('Failed to fetch public quotes');
        }

        const data = await response.json();

        // FastAPIのレスポンス構造に合わせる
        const books: BookGroup[] = [];
        const sns: SnsGroup[] = [];

        for (const item of data.items || []) {
          if (item.type === 'book') {
            books.push({ book: item.book, quotes: item.quotes });
          } else if (item.type === 'sns') {
            sns.push({ sns_user: item.sns_user, quotes: item.quotes });
          }
        }

        setBookGroups(books);
        setSnsGroups(sns);
        setTotal(data.total || 0);
      } catch (error) {
        console.error('Error fetching public quotes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicQuotes();
  }, [checkingAuth]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">抜き書きアプリ</h1>
              <p className="text-sm text-gray-600 mt-1">
                書籍やSNSから集めたフレーズを公開しています
              </p>
            </div>
            <Link
              href="/login"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              ログインして自分のフレーズを登録
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">公開フレーズを読み込んでいます...</div>
          </div>
        ) : total === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600">まだ公開フレーズがありません</div>
            <p className="text-sm text-gray-500 mt-2">
              ログインしてあなたのフレーズを公開しましょう
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-700">
                公開フレーズ: <span className="font-bold">{total}件</span>
              </p>
            </div>

            <div className="space-y-6">
              {/* 書籍グループ */}
              {bookGroups.map((group) => (
                <div key={group.book.id} className="bg-white p-6">
                  <div className="flex gap-6 items-start">
                    {/* 左側：書籍情報 */}
                    <div className="w-1/3 flex-shrink-0 sticky top-6 self-start bg-gray-50 p-4 rounded-lg">
                      {/* 書籍カバー */}
                      <div className="flex justify-center mb-3">
                        {group.book.cover_image_url ? (
                          <Image
                            src={group.book.cover_image_url}
                            alt={group.book.title}
                            width={120}
                            height={160}
                            className="w-30 h-40 object-cover rounded shadow-md"
                          />
                        ) : (
                          <div className="w-30 h-40 bg-gray-100 rounded flex items-center justify-center shadow-sm">
                            <span className="text-5xl">📚</span>
                          </div>
                        )}
                      </div>

                      {/* 書籍情報 */}
                      <div className="text-center">
                        <h3 className="text-sm text-gray-500 mb-0.5 font-medium">
                          {group.book.title}
                        </h3>
                        {group.book.author && (
                          <p className="text-xs text-gray-400">著者: {group.book.author}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {group.quotes.length}件のフレーズ
                        </p>
                      </div>
                    </div>

                    {/* 右側：フレーズ一覧 */}
                    <div className="flex-1">
                      <div className="space-y-3">
                        {group.quotes.map((quote) => (
                          <div
                            key={quote.id}
                            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <p className="text-gray-900 text-lg font-bold mb-3">{quote.text}</p>
                            {quote.page_number && (
                              <p className="text-xs text-gray-500 mt-2">p.{quote.page_number}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* SNSグループ */}
              {snsGroups.map((group) => (
                <div
                  key={group.sns_user.id}
                  className="bg-white rounded-lg p-6 border border-gray-200"
                >
                  <div className="flex gap-4 mb-4">
                    {/* SNSアイコン */}
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-4xl">
                        {group.sns_user.platform === 'X' ? '𝕏' : '@'}
                      </span>
                    </div>

                    {/* ユーザー情報 */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {group.sns_user.display_name || `@${group.sns_user.handle}`}
                      </h3>
                      <p className="text-gray-500 text-sm">@{group.sns_user.handle}</p>
                      <p className="text-gray-400 text-xs mt-2">
                        {group.sns_user.platform} · {group.quotes.length}件のフレーズ
                      </p>
                    </div>
                  </div>

                  {/* フレーズ一覧 */}
                  <div className="space-y-3">
                    {group.quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <p className="text-gray-900 whitespace-pre-wrap">{quote.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 text-sm">ログインして自分のフレーズを登録・管理しましょう</p>
          <Link
            href="/login"
            className="inline-block mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            ログイン / 新規登録
          </Link>
        </div>
      </footer>
    </div>
  );
}
