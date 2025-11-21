'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Activity {
  id: number;
  name: string;
  icon: string;
}

interface Tag {
  id: number;
  name: string;
}

interface QuoteSource {
  type: 'BOOK' | 'SNS' | 'OTHER';
  // BOOK
  book_title?: string | null;
  book_author?: string | null;
  // SNS
  sns_platform?: string | null;
  sns_handle?: string | null;
  sns_display_name?: string | null;
  // OTHER
  other_source?: string | null;
  other_note?: string | null;
  // 共通
  page_number?: number | null;
}

interface PublicQuote {
  id: number;
  text: string;
  source: QuoteSource;
  activities: Activity[];
  tags: Tag[];
  created_at: string;
}

export default function PublicHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [quotes, setQuotes] = useState<PublicQuote[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 認証チェック - 認証済みユーザーは自分のページにリダイレクト
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.push('/my-quotes');
      } else {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // 公開フレーズを取得
  const fetchPublicQuotes = async (offset: number = 0, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || '';
      const response = await fetch(`${apiUrl}/api/quotes/public?limit=50&offset=${offset}`);
      if (!response.ok) {
        throw new Error('Failed to fetch public quotes');
      }

      const data = await response.json();

      if (append) {
        setQuotes((prev) => [...prev, ...(data.items || [])]);
      } else {
        setQuotes(data.items || []);
      }

      setTotal(data.total || 0);
      setHasMore(data.has_more || false);
    } catch (error) {
      console.error('Error fetching public quotes:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    if (!checkingAuth) {
      fetchPublicQuotes(0, false);
    }
  }, [checkingAuth]);

  // 無限スクロール
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchPublicQuotes(quotes.length, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, quotes.length]);

  // 出典を文字列にフォーマット
  const formatSource = (source: QuoteSource): string => {
    if (source.type === 'BOOK') {
      const parts = [];
      if (source.book_title) parts.push(source.book_title);
      if (source.book_author) parts.push(source.book_author);
      return parts.join(' / ') || '書籍';
    } else if (source.type === 'SNS') {
      if (source.sns_display_name) {
        return `${source.sns_display_name} (@${source.sns_handle})`;
      }
      return `@${source.sns_handle || 'SNS'}`;
    } else {
      const parts = [];
      if (source.other_source) parts.push(source.other_source);
      if (source.other_note) parts.push(source.other_note);
      return parts.join(' / ') || 'その他';
    }
  };

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
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">ことばアーカイブ</h1>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                心に響いた言葉を、いつでも一瞬で取り出せる。あなた専用の引き出しを作ろう
              </p>
            </div>
            <Link
              href="/login"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center w-full md:w-auto"
            >
              ログイン/新規登録
            </Link>
          </div>
        </div>
      </header>

      {/* アプリ紹介セクション */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-8 md:py-12 border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* メインメッセージ */}
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
              心に響いた言葉を、一箇所に。
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-gray-600 mb-1 md:mb-2">
              本・SNS・メモから、大切なフレーズを集めて整理できる、あなた専用のアーカイブです。
            </p>
            <p className="text-xs md:text-sm lg:text-base text-gray-500">
              必要な時に、すぐに取り出せる。そんな「言葉の引き出し」を作りましょう。
            </p>
          </div>

          {/* 主な機能 */}
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl md:text-4xl mb-2 md:mb-3">📚</div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">多様な出典に対応</h3>
              <p className="text-xs md:text-sm text-gray-600">
                書籍・SNS（X/Threads）・その他のメモなど、あらゆる場所から心に響いたフレーズを登録できます。
              </p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl md:text-4xl mb-2 md:mb-3">🏷️</div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">柔軟な整理・分類</h3>
              <p className="text-xs md:text-sm text-gray-600">
                活動領域（仕事・学習・趣味など）やタグで分類。後から検索・フィルタリングして簡単に見つけられます。
              </p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl md:text-4xl mb-2 md:mb-3">🧠</div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">スマートなデータ活用</h3>
              <p className="text-xs md:text-sm text-gray-600">
                フレーズはCSV形式でエクスポート可能。AIへ流し込んで、自分の価値観や思考パターンを可視化できます。
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/login"
              className="inline-block px-6 md:px-8 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              今すぐ始める（無料）
            </Link>
            <p className="text-xs text-gray-500 mt-2 md:mt-3">
              GoogleアカウントまたはGitHubアカウントで簡単に登録できます
            </p>
          </div>
        </div>
      </section>

      {/* 公開フレーズセクション */}
      <section className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">みんなが公開したフレーズ</h2>
          <p className="text-sm md:text-base text-gray-600">他のユーザーが公開した心に響くフレーズを見てみましょう</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">公開フレーズを読み込んでいます...</div>
          </div>
        ) : total === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600">まだ公開フレーズがありません</div>
            <p className="text-sm text-gray-500 mt-2">
              ログインして、あなた専用の言葉の引き出しを整えましょう
            </p>
          </div>
        ) : (
          <>
            {/* フレーズカード一覧 */}
            <div className="space-y-4">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white p-4 md:p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* フレーズテキスト */}
                  <p className="text-gray-900 text-base md:text-lg font-medium mb-3 md:mb-4 leading-relaxed">
                    {quote.text}
                  </p>

                  {/* 出典情報（目立たない） */}
                  <div className="text-xs text-gray-400 mb-3">
                    {formatSource(quote.source)}
                    {quote.source.page_number && ` p.${quote.source.page_number}`}
                  </div>

                  {/* 活動領域とタグ */}
                  <div className="flex flex-wrap gap-2">
                    {/* 活動領域 */}
                    {quote.activities.map((activity) => (
                      <span
                        key={activity.id}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        <span>{activity.icon}</span>
                        <span>{activity.name}</span>
                      </span>
                    ))}

                    {/* タグ */}
                    {quote.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 無限スクロールトリガー */}
            {hasMore && (
              <div ref={observerTarget} className="mt-8 py-4 text-center">
                {loadingMore && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600">読み込み中...</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 mt-8 md:mt-12 py-4 md:py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 text-xs md:text-sm">
            ログインして、あなた専用の言葉の引き出しを整えましょう
          </p>
          <Link
            href="/login"
            className="inline-block mt-3 md:mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-medium rounded-lg transition-colors"
          >
            ログイン/新規登録
          </Link>
        </div>
      </footer>
    </div>
  );
}
