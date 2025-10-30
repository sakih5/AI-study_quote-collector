'use client';

import { useState } from 'react';
import QuoteModal from './components/QuoteModal';
import QuoteEditModal from './components/QuoteEditModal';
import QuoteGroupCard from './components/QuoteGroupCard';
import { useQuotesGrouped, Quote } from './hooks/useQuotesGrouped';
import { useActivities } from './hooks/useActivities';
import { useTags } from './hooks/useTags';

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivityIds, setSelectedActivityIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { activities } = useActivities();
  const { tags } = useTags();

  const { items, loading, loadingMore, error, total, hasMore, loadMore, refetch } =
    useQuotesGrouped({
      search: searchQuery,
      activityIds: selectedActivityIds.length > 0 ? selectedActivityIds : undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      limit: 50,
    });

  const handleSearch = () => {
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
  const handleExportCsv = () => {
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

    // CSVエクスポートAPIにリクエスト
    const url = `/api/export/csv${params.toString() ? '?' + params.toString() : ''}`;
    window.location.href = url;
  };

  // フレーズ削除処理
  const handleDelete = async (quoteId: number) => {
    if (isDeleting) return;

    const confirmed = confirm('このフレーズを削除してもよろしいですか？');
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '削除に失敗しました');
      }

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
            placeholder="キーワードで絞り込み..."
            className="flex-1 px-4 py-3 bg-[#2a2a2a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <h3 className="text-sm font-medium text-gray-400 mb-2">活動領域</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => toggleActivity(activity.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedActivityIds.includes(activity.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#353535]'
                }`}
              >
                {activity.icon} {activity.name}
              </button>
            ))}
          </div>
        </div>

        {/* タグフィルター */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">タグ</h3>
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
                      : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#353535]'
                  }`}
                >
                  {tag.name}
                </button>
              ))
            )}
          </div>
        </div>

        {/* 件数表示とクリアボタン */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <div className="flex items-center gap-4">
            <p className="text-gray-400 text-sm">
              {hasActiveFilters ? '該当件数' : '全件数'}：
              <span className="font-bold text-white ml-1">{total}件</span>
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                フィルターをクリア
              </button>
            )}
          </div>
          {/* CSVエクスポートボタン */}
          <button
            onClick={handleExportCsv}
            disabled={total === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="表示中のフレーズをCSV形式でダウンロード"
          >
            <span>📥</span>
            <span>CSVエクスポート</span>
          </button>
        </div>
      </div>

      {/* フレーズ一覧 */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400">エラーが発生しました: {error}</p>
        </div>
      ) : items.length === 0 ? (
        <>
          {/* ウェルカムメッセージ（フレーズがない場合のみ） */}
          <div className="bg-[#2a2a2a] rounded-lg p-8 mb-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-4">
              ようこそ、抜き書きアプリへ
            </h1>
            <p className="text-gray-400 mb-6">
              本やSNSから気になったフレーズを保存して、あなただけの知識ベースを作りましょう
            </p>
            <div className="flex justify-center gap-4">
              <div className="bg-[#1a1a1a] rounded-lg p-6 flex-1 max-w-xs">
                <div className="text-4xl mb-2">📚</div>
                <h3 className="text-white font-semibold mb-2">フレーズを登録</h3>
                <p className="text-gray-400 text-sm">
                  本やSNSから気になった言葉を保存
                </p>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-6 flex-1 max-w-xs">
                <div className="text-4xl mb-2">🏷️</div>
                <h3 className="text-white font-semibold mb-2">タグで整理</h3>
                <p className="text-gray-400 text-sm">
                  活動領域やタグで分類して管理
                </p>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-6 flex-1 max-w-xs">
                <div className="text-4xl mb-2">🔍</div>
                <h3 className="text-white font-semibold mb-2">簡単に検索</h3>
                <p className="text-gray-400 text-sm">
                  キーワードやフィルターで素早く見つける
                </p>
              </div>
            </div>
          </div>

          {/* クイックスタートガイド */}
          <div className="bg-[#2a2a2a] rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6">はじめ方</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    フレーズを登録する
                  </h3>
                  <p className="text-gray-400 text-sm">
                    右下の「+ 新規登録」ボタンから、気になったフレーズを登録しましょう
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    活動領域とタグを付ける
                  </h3>
                  <p className="text-gray-400 text-sm">
                    「仕事・キャリア」「学習・研究」などの活動領域や、自分でタグを作成して整理できます
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">検索とフィルター</h3>
                  <p className="text-gray-400 text-sm">
                    キーワード検索や、活動領域・タグのフィルターで必要な情報をすぐに見つけられます
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 未登録メッセージ */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              まだフレーズが登録されていません
            </p>
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
              />
            ))}
          </div>

          {/* もっと見るボタン */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-8 py-3 bg-[#2a2a2a] hover:bg-[#353535] text-white font-medium rounded-lg border border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? '読み込み中...' : 'もっと見る'}
              </button>
            </div>
          )}
        </>
      )}

      {/* 固定フローティングボタン */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-3xl transition-colors"
        title="新規登録"
      >
        +
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
