'use client';

import { useState, useEffect } from 'react';
import { Quote } from '../hooks/useQuotesGrouped';
import { useActivities } from '../hooks/useActivities';
import { useTags } from '../hooks/useTags';
import { apiPut } from '@/lib/api/client';

interface QuoteEditModalProps {
  isOpen: boolean;
  quote: Quote | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuoteEditModal({
  isOpen,
  quote,
  onClose,
  onSuccess,
}: QuoteEditModalProps) {
  const [text, setText] = useState('');
  const [activityIds, setActivityIds] = useState<number[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [referenceLink, setReferenceLink] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { activities, loading: activitiesLoading } = useActivities();
  const { tags, loading: tagsLoading, createTag } = useTags();

  // quoteが変わったら初期値を設定
  useEffect(() => {
    if (quote) {
      setText(quote.text);
      setActivityIds(quote.activities.map((a) => a.id));
      setTagIds(quote.tags.map((t) => t.id));
      setIsPublic(quote.is_public);
      setReferenceLink(quote.reference_link || '');
    }
  }, [quote]);

  if (!isOpen || !quote) return null;

  const handleSubmit = async () => {
    setError(null);

    // バリデーション
    if (!text.trim()) {
      setError('フレーズを入力してください');
      return;
    }

    if (activityIds.length === 0) {
      setError('少なくとも1つの活動領域を選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiPut(`/api/quotes/${quote.id}`, {
        text: text.trim(),
        activity_ids: activityIds,
        tag_ids: tagIds,
        is_public: isPublic,
        reference_link: referenceLink.trim() || null,
      });

      // 成功
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 bg-gray-900/20 z-40" />

      {/* モーダル */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-gray-900">フレーズを編集</h2>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 transition-colors text-2xl"
            >
              ×
            </button>
          </div>

          {/* コンテンツ */}
          <div className="p-6 space-y-4">
            {/* フレーズテキスト */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                フレーズ<span className="text-red-500">*</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 活動領域選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                活動領域（複数選択可）<span className="text-red-500">*</span>
              </label>
              {activitiesLoading ? (
                <p className="text-gray-600 text-sm">読み込み中...</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {activities.map((activity) => (
                    <label
                      key={activity.id}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={activityIds.includes(activity.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setActivityIds([...activityIds, activity.id]);
                          } else {
                            setActivityIds(activityIds.filter((id) => id !== activity.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-900 text-sm">
                        {activity.icon} {activity.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* タグ選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">タグ</label>
              {/* 選択済みタグ */}
              <div className="flex flex-wrap gap-2 mb-3">
                {tagIds.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <button
                      key={tagId}
                      onClick={() => {
                        setTagIds(tagIds.filter((id) => id !== tagId));
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-full flex items-center gap-2 transition-colors"
                    >
                      {tag.name}
                      <span>×</span>
                    </button>
                  );
                })}
              </div>

              {/* タグ選択ドロップダウン */}
              {!tagsLoading && tags.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const tagId = parseInt(e.target.value);
                    if (tagId && !tagIds.includes(tagId)) {
                      setTagIds([...tagIds, tagId]);
                    }
                  }}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                >
                  <option value="">既存のタグを選択...</option>
                  {tags
                    .filter((tag) => !tagIds.includes(tag.id))
                    .map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                </select>
              )}

              {/* 新規タグ作成 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTagName.trim()) {
                      e.preventDefault();
                      (async () => {
                        const tag = await createTag(newTagName.trim());
                        if (tag) {
                          setTagIds([...tagIds, tag.id]);
                          setNewTagName('');
                        }
                      })();
                    }
                  }}
                  placeholder="新しいタグ名を入力（例: 生産性）"
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (newTagName.trim()) {
                      const tag = await createTag(newTagName.trim());
                      if (tag) {
                        setTagIds([...tagIds, tag.id]);
                        setNewTagName('');
                      }
                    }
                  }}
                  disabled={!newTagName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + 追加
                </button>
              </div>
            </div>

            {/* 参考リンク */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔗 参考リンク（任意）
              </label>
              <input
                type="url"
                value={referenceLink}
                onChange={(e) => setReferenceLink(e.target.value)}
                placeholder="例: https://example.com/article"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                このフレーズに関連する参考URLを登録できます
              </p>
            </div>
          </div>

          {/* フッター */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            {/* 公開/非公開トグル */}
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">このフレーズを公開する</span>
                  <span className="text-xs text-gray-500">
                    ログインしていないユーザーも閲覧できます
                  </span>
                </div>
              </label>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* ボタン */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-400 hover:bg-blue-500 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '更新中...' : '更新する'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
