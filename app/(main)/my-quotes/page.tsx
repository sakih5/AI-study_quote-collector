'use client';

import { useState, useEffect, useRef } from 'react';
import QuoteModal from '../components/QuoteModal';
import QuoteEditModal from '../components/QuoteEditModal';
import QuoteGroupCard from '../components/QuoteGroupCard';
import { useQuotesGrouped, Quote } from '../hooks/useQuotesGrouped';
import { useActivities } from '../hooks/useActivities';
import { useTags } from '../hooks/useTags';
import { apiDelete } from '@/lib/api/client';

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivityIds, setSelectedActivityIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 選択モード関連
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<number>>(new Set());

  // 無限スクロール用のref
  const observerTarget = useRef<HTMLDivElement>(null);

  const { activities } = useActivities();
  const { tags: allTags } = useTags();

  // 使用中のタグのみをフィルタリング
  const tags = allTags.filter((tag) => (tag.usage_count || 0) > 0);

  const { items, loading, loadingMore, error, total, hasMore, loadMore, refetch } =
    useQuotesGrouped({
      search: searchQuery,
      activityIds: selectedActivityIds.length > 0 ? selectedActivityIds : undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      limit: 50,
    });

  // 無限スクロール実装
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // 要素が画面に入ったら、かつ、まだ読み込むデータがある場合
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 } // 10%見えたらトリガー
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
  }, [hasMore, loadingMore, loadMore]);

  // リアルタイム検索（デバウンス処理）
  useEffect(() => {
    // 入力から500ms後に検索を実行
    const timer = setTimeout(() => {
      setSearchQuery(searchKeyword);
    }, 500);

    // クリーンアップ: 次の入力があったらタイマーをキャンセル
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const handleSearch = () => {
    // 検索ボタン押下時は即座に検索
    setSearchQuery(searchKeyword);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleActivity = (activityId: number) => {
    if (selectedActivityIds.includes(activityId)) {
      setSelectedActivityIds(selectedActivityIds.filter((id) => id !== activityId));
    } else {
      setSelectedActivityIds([...selectedActivityIds, activityId]);
    }
  };

  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const clearFilters = () => {
    setSearchKeyword('');
    setSearchQuery('');
    setSelectedActivityIds([]);
    setSelectedTagIds([]);
  };

  const hasActiveFilters =
    searchQuery || selectedActivityIds.length > 0 || selectedTagIds.length > 0;

  // CSVエクスポート処理
  const handleExportCsv = async () => {
    try {
      // クエリパラメータを構築
      const params = new URLSearchParams();

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (selectedActivityIds.length > 0) {
        params.append('activity_ids', selectedActivityIds.join(','));
      }

      if (selectedTagIds.length > 0) {
        params.append('tag_ids', selectedTagIds.join(','));
      }

      // FastAPI URLを使用
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || '';
      const url = `${apiUrl}/api/export/csv${params.toString() ? '?' + params.toString() : ''}`;

      // fetchで認証付きリクエスト
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert('認証が必要です。ログインしてください。');
        return;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('CSVエクスポートに失敗しました');
      }

      // Blobとして取得
      const blob = await response.blob();

      // ダウンロード用のリンクを作成
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Content-Dispositionヘッダーからファイル名を取得
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'quotes.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('CSVエクスポートエラー:', error);
      alert(error instanceof Error ? error.message : 'CSVエクスポートに失敗しました');
    }
  };

  // フレーズ削除処理
  const handleDelete = async (quoteId: number) => {
    if (isDeleting) return;

    const confirmed = confirm('このフレーズを削除してもよろしいですか？');
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      await apiDelete(`/api/quotes/${quoteId}`);

      // 成功：一覧を再取得
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  // フレーズ編集処理
  const handleEdit = (quote: Quote) => {
    setEditingQuote(quote);
  };

  // 選択モード切り替え
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedQuoteIds(new Set());
  };

  // フレーズ選択トグル
  const toggleQuoteSelection = (quoteId: number) => {
    const newSet = new Set(selectedQuoteIds);
    if (newSet.has(quoteId)) {
      newSet.delete(quoteId);
    } else {
      newSet.add(quoteId);
    }
    setSelectedQuoteIds(newSet);
  };

  // すべて選択
  const selectAllQuotes = () => {
    const allQuoteIds = new Set<number>();
    items.forEach((group) => {
      if ('quotes' in group) {
        group.quotes.forEach((quote) => allQuoteIds.add(quote.id));
      }
    });
    setSelectedQuoteIds(allQuoteIds);
  };

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedQuoteIds.size === 0) return;

    const confirmed = confirm(
      `選択した${selectedQuoteIds.size}件のフレーズを削除してもよろしいですか？`
    );
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      // 各フレーズを個別に削除（現在のAPI仕様に合わせる）
      const deletePromises = Array.from(selectedQuoteIds).map((quoteId) =>
        apiDelete(`/api/quotes/${quoteId}`)
      );

      await Promise.all(deletePromises);

      // 成功：選択をクリアして一覧を再取得
      setSelectedQuoteIds(new Set());
      setIsSelectionMode(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* 検索バー */}
      <div className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="本のタイトル/著者名・SNSのアカウント名・フレーズで検索"
            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            検索
          </button>
        </div>
      </div>

      {/* フィルターセクション */}
      <div className="mb-6 space-y-4">
        {/* 活動領域フィルター */}
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">活動領域</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => toggleActivity(activity.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedActivityIds.includes(activity.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {activity.icon} {activity.name}
              </button>
            ))}
          </div>
        </div>

        {/* タグフィルター */}
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">タグ</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tags.length === 0 ? (
              <p className="text-gray-500 text-sm">タグがまだありません</p>
            ) : (
              tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tag.name}
                </button>
              ))
            )}
          </div>
        </div>

        {/* 件数表示とアクションバー */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-300">
          {!isSelectionMode ? (
            <>
              {/* 通常モード */}
              <div className="flex items-center gap-4">
                <p className="text-gray-600 text-sm">
                  {hasActiveFilters ? '該当フレーズ数' : 'フレーズ総数'}：
                  <span className="font-bold text-gray-900 ml-1">{total}件</span>
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    フィルターをクリア
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* 選択削除モードボタン */}
                <button
                  onClick={toggleSelectionMode}
                  disabled={total === 0}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="複数のフレーズを選択して一括削除"
                >
                  <span>☑️</span>
                  <span>選択削除</span>
                </button>
                {/* CSVエクスポートボタン */}
                <button
                  onClick={handleExportCsv}
                  disabled={total === 0}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="表示中のフレーズをCSV形式でダウンロード"
                >
                  <span>📥</span>
                  <span>CSVエクスポート</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* 選択モード */}
              <div className="flex items-center gap-4">
                <p className="text-gray-900 text-sm font-medium">{selectedQuoteIds.size}件選択中</p>
                <button
                  onClick={selectAllQuotes}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  すべて選択
                </button>
              </div>
              <div className="flex items-center gap-3">
                {/* 削除ボタン */}
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedQuoteIds.size === 0 || isDeleting}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>🗑️</span>
                  <span>{isDeleting ? '削除中...' : '削除'}</span>
                </button>
                {/* キャンセルボタン */}
                <button
                  onClick={toggleSelectionMode}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  キャンセル
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* フレーズ一覧 */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">エラーが発生しました: {error}</p>
        </div>
      ) : items.length === 0 ? (
        <>
          {/* ウェルカムメッセージ（フレーズがない場合のみ） */}
          <div className="bg-white rounded-lg p-8 mb-8 text-center shadow-lg border border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">ようこそ、ことばアーカイブへ</h1>
            <p className="text-gray-600 mb-6">
              本やSNSから気になったフレーズを保存して、あなただけのアーカイブを作りましょう
            </p>
            <div className="flex justify-center gap-4">
              <div className="bg-gray-50 rounded-lg p-6 flex-1 max-w-xs border border-gray-200">
                <div className="text-4xl mb-2">📚</div>
                <h3 className="text-gray-900 font-semibold mb-2">フレーズを登録</h3>
                <p className="text-gray-600 text-sm">本やSNSから気になった言葉を保存</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 flex-1 max-w-xs border border-gray-200">
                <div className="text-4xl mb-2">🏷️</div>
                <h3 className="text-gray-900 font-semibold mb-2">タグで整理</h3>
                <p className="text-gray-600 text-sm">活動領域やタグで分類して管理</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 flex-1 max-w-xs border border-gray-200">
                <div className="text-4xl mb-2">🔍</div>
                <h3 className="text-gray-900 font-semibold mb-2">簡単に検索</h3>
                <p className="text-gray-600 text-sm">キーワードやフィルターで素早く見つける</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 flex-1 max-w-xs border border-gray-200">
                <div className="text-4xl mb-2">🧠</div>
                <h3 className="text-gray-900 font-semibold mb-2">CSVエクスポート</h3>
                <p className="text-gray-600 text-sm">集約したフレーズをCSV形式で出力可能</p>
              </div>
            </div>
          </div>

          {/* クイックスタートガイド */}
          <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">はじめ方</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-gray-900 font-semibold mb-1">フレーズを登録する</h3>
                  <p className="text-gray-600 text-sm">
                    右下の「+ 新規登録」ボタンから、気になったフレーズを登録しましょう
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-gray-900 font-semibold mb-1">活動領域とタグを付ける</h3>
                  <p className="text-gray-600 text-sm">
                    「仕事・キャリア」「学習・研究」などの活動領域や、自分でタグを作成して整理できます
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-gray-900 font-semibold mb-1">検索とフィルター</h3>
                  <p className="text-gray-600 text-sm">
                    キーワード検索や、活動領域・タグのフィルターで必要な情報をすぐに見つけられます
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-gray-900 font-semibold mb-1">CSVエクスポート</h3>
                  <p className="text-gray-600 text-sm">
                    キーワード検索や、活動領域・タグのフィルターで絞り込んだフレーズ一覧をCSV形式でダウンロードできます
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 未登録メッセージ */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">まだフレーズが登録されていません</p>
            <p className="text-gray-500 text-sm mt-2">
              フレーズを登録すると、ここに一覧が表示されます
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-6">
            {items.map((group, index) => (
              <QuoteGroupCard
                key={index}
                group={group}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isSelectionMode={isSelectionMode}
                selectedQuoteIds={selectedQuoteIds}
                onToggleSelection={toggleQuoteSelection}
              />
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

      {/* 固定フローティングボタン */}
      <button
        onClick={() => setIsModalOpen(true)}
        // className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-3xl transition-colors"
        className="fixed bottom-8 right-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center gap-2 text-lg transition"
        title="新規登録"
      >
        + 新規登録
      </button>

      {/* フレーズ登録モーダル */}
      <QuoteModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          refetch();
        }}
      />

      {/* フレーズ編集モーダル */}
      <QuoteEditModal
        isOpen={!!editingQuote}
        quote={editingQuote}
        onClose={() => setEditingQuote(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
