'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useTagsManagement,
  renameTag,
  mergeTags,
  deleteTag,
  TagWithMetadata,
} from '@/hooks/useTagsManagement';
import { useActivities } from '@/hooks/useActivities';

export default function TagsManagementPage() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'usage_count'>('usage_count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { tags: allTags, loading, error, refetch } = useTagsManagement({
    search: searchQuery,
    sort: sortBy,
    order: sortOrder,
  });

  // 使用中のタグのみをフィルタリング
  const tags = allTags.filter(tag => (tag.usage_count || 0) > 0);

  const { activities } = useActivities();

  // リネームモーダル用の状態
  const [renamingTag, setRenamingTag] = useState<TagWithMetadata | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // 統合モーダル用の状態
  const [mergingTag, setMergingTag] = useState<TagWithMetadata | null>(null);
  const [targetTagId, setTargetTagId] = useState<number | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // 削除中の状態
  const [deletingTagId, setDeletingTagId] = useState<number | null>(null);

  const handleSearch = () => {
    setSearchQuery(searchKeyword);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // リネーム処理
  const handleRename = async () => {
    if (!renamingTag || !newTagName.trim()) return;

    setIsRenaming(true);
    try {
      await renameTag(renamingTag.id, newTagName);
      alert('タグ名を変更しました');
      setRenamingTag(null);
      setNewTagName('');
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsRenaming(false);
    }
  };

  // 統合処理
  const handleMerge = async () => {
    if (!mergingTag || !targetTagId) return;

    if (mergingTag.id === targetTagId) {
      alert('同じタグには統合できません');
      return;
    }

    const targetTag = tags.find((t) => t.id === targetTagId);
    const confirmed = confirm(
      `「${mergingTag.name}」を「${targetTag?.name}」に統合してもよろしいですか？\n\n統合元のタグは削除され、使用していたすべてのフレーズが統合先のタグに変更されます。`
    );
    if (!confirmed) return;

    setIsMerging(true);
    try {
      await mergeTags(mergingTag.id, targetTagId);
      alert('タグを統合しました');
      setMergingTag(null);
      setTargetTagId(null);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsMerging(false);
    }
  };

  // 削除処理
  const handleDelete = async (tag: TagWithMetadata) => {
    const confirmed = confirm(
      `「${tag.name}」を削除してもよろしいですか？\n\n使用数: ${tag.usage_count}件`
    );
    if (!confirmed) return;

    setDeletingTagId(tag.id);
    try {
      await deleteTag(tag.id);
      alert('タグを削除しました');
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setDeletingTagId(null);
    }
  };

  // 活動領域名を取得
  const getActivityName = (activityId: number): string => {
    const activity = activities.find((a) => a.id === activityId);
    return activity ? `${activity.icon} ${activity.name}` : '';
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4 transition-colors"
        >
          <span className="mr-2">←</span>
          <span>戻る</span>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <span>🏷️</span>
          <span>タグ管理</span>
        </h1>
        <p className="text-gray-600 mt-2">タグの編集、統合、削除を行うことができます</p>
      </div>

      {/* 検索・ソートセクション */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="タグ名で検索..."
            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors w-full sm:w-auto"
          >
            検索
          </button>
        </div>

        {/* ソート */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <label className="text-gray-600 text-sm">並び替え:</label>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'created_at' | 'usage_count')}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full sm:w-auto"
            >
              <option value="usage_count">使用数順</option>
              <option value="name">名前順</option>
              <option value="created_at">作成日順</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full sm:w-auto"
            >
              <option value="desc">降順</option>
              <option value="asc">昇順</option>
            </select>
          </div>
        </div>

        <div className="text-gray-600 text-sm">全{tags.length}件のタグ</div>
      </div>

      {/* タグ一覧 */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400">エラーが発生しました: {error}</p>
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">タグがまだありません</p>
          <p className="text-gray-500 text-sm mt-2">フレーズ登録時にタグを作成できます</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tags.map((tag) => (
            <div key={tag.id} className="bg-white rounded-lg p-6 border border-gray-200">
              {/* タグ名と使用数 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{tag.name}</h3>
                <span className="text-gray-600 text-sm">{tag.usage_count}件で使用中</span>
              </div>

              {/* 活動領域別分布 */}
              {Object.keys(tag.activity_distribution).length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-600 text-sm mb-2">📊 活動領域別分布:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(tag.activity_distribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([activityId, count]) => (
                        <span
                          key={activityId}
                          className="px-3 py-1 bg-white rounded-lg text-sm text-gray-700"
                        >
                          {getActivityName(parseInt(activityId))}
                          <span className="ml-1 text-blue-400 font-bold">({count})</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setRenamingTag(tag);
                    setNewTagName(tag.name);
                  }}
                  disabled={deletingTagId === tag.id}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  名前変更
                </button>
                <button
                  onClick={() => {
                    setMergingTag(tag);
                    setTargetTagId(null);
                  }}
                  disabled={deletingTagId === tag.id || tags.length < 2}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  統合
                </button>
                <button
                  onClick={() => handleDelete(tag)}
                  disabled={deletingTagId === tag.id}
                  className="px-4 py-2 bg-gray-400 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {deletingTagId === tag.id ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* リネームモーダル */}
      {renamingTag && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">タグ名を変更</h2>
            <p className="text-gray-600 text-sm mb-4">変更前: {renamingTag.name}</p>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="新しいタグ名"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleRename}
                disabled={isRenaming || !newTagName.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRenaming ? '変更中...' : '変更'}
              </button>
              <button
                onClick={() => {
                  setRenamingTag(null);
                  setNewTagName('');
                }}
                disabled={isRenaming}
                className="flex-1 px-4 py-3 bg-blue-400 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 統合モーダル */}
      {mergingTag && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">タグを統合</h2>
            <p className="text-gray-600 text-sm mb-2">統合元: {mergingTag.name}</p>
            <p className="text-gray-600 text-sm mb-4">統合先のタグを選択してください:</p>
            <select
              value={targetTagId || ''}
              onChange={(e) => setTargetTagId(parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              <option value="">選択してください</option>
              {tags
                .filter((t) => t.id !== mergingTag.id)
                .map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name} ({tag.usage_count}件)
                  </option>
                ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={handleMerge}
                disabled={isMerging || !targetTagId}
                className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMerging ? '統合中...' : '統合'}
              </button>
              <button
                onClick={() => {
                  setMergingTag(null);
                  setTargetTagId(null);
                }}
                disabled={isMerging}
                className="flex-1 px-4 py-3 bg-blue-400 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
