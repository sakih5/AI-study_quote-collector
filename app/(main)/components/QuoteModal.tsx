'use client';

import { useState } from 'react';
import { useActivities } from '../hooks/useActivities';
import { useTags } from '../hooks/useTags';
import { useBooks } from '../hooks/useBooks';
import { useSnsUsers } from '../hooks/useSnsUsers';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuoteInput {
  text: string;
  activity_ids: number[];
  tag_ids: number[];
}

interface BookData {
  selectionMode: 'existing' | 'new';
  selectedBookId: number | null;
  newBook: {
    title: string;
    author: string;
    publisher: string;
  };
}

interface SnsData {
  selectionMode: 'existing' | 'new';
  platform: 'X' | 'THREADS';
  selectedSnsUserId: number | null;
  newSnsUser: {
    handle: string;
    display_name: string;
  };
}

interface OtherData {
  source: string;
  note: string;
}

export default function QuoteModal({ isOpen, onClose }: QuoteModalProps) {
  const [activeSection, setActiveSection] = useState<'phrase' | 'source'>('phrase');
  const [quotes, setQuotes] = useState<QuoteInput[]>([
    { text: '', activity_ids: [], tag_ids: [] },
  ]);
  const [sourceType, setSourceType] = useState<'BOOK' | 'SNS' | 'OTHER'>('BOOK');

  const { activities, loading: activitiesLoading } = useActivities();
  const { tags, loading: tagsLoading, createTag } = useTags();
  const { books, loading: booksLoading } = useBooks();
  const { snsUsers, loading: snsUsersLoading } = useSnsUsers();

  const [newTagName, setNewTagName] = useState('');

  // 出典情報の管理
  const [bookData, setBookData] = useState<BookData>({
    selectionMode: 'new',
    selectedBookId: null,
    newBook: { title: '', author: '', publisher: '' },
  });

  const [snsData, setSnsData] = useState<SnsData>({
    selectionMode: 'new',
    platform: 'X',
    selectedSnsUserId: null,
    newSnsUser: { handle: '', display_name: '' },
  });

  const [otherData, setOtherData] = useState<OtherData>({
    source: '',
    note: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォームのバリデーション
  const validateForm = (): string | null => {
    // フレーズのバリデーション
    if (quotes.length === 0 || quotes.every((q) => !q.text.trim())) {
      return '少なくとも1つのフレーズを入力してください';
    }

    for (const quote of quotes) {
      if (quote.text.trim() && quote.activity_ids.length === 0) {
        return 'すべてのフレーズに少なくとも1つの活動領域を選択してください';
      }
    }

    // 出典のバリデーション
    if (sourceType === 'BOOK') {
      if (bookData.selectionMode === 'existing' && !bookData.selectedBookId) {
        return '書籍を選択してください';
      }
      if (bookData.selectionMode === 'new' && !bookData.newBook.title.trim()) {
        return '書籍のタイトルを入力してください';
      }
    } else if (sourceType === 'SNS') {
      if (snsData.selectionMode === 'existing' && !snsData.selectedSnsUserId) {
        return 'SNSユーザーを選択してください';
      }
      if (snsData.selectionMode === 'new' && !snsData.newSnsUser.handle.trim()) {
        return 'ユーザーIDを入力してください';
      }
    }

    return null;
  };

  // フレーズ登録処理
  const handleSubmit = async () => {
    setError(null);

    // バリデーション
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      let bookId = null;
      let snsUserId = null;

      // 本の場合：新規作成または既存選択
      if (sourceType === 'BOOK') {
        if (bookData.selectionMode === 'new') {
          const response = await fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: bookData.newBook.title.trim(),
              author: bookData.newBook.author.trim() || null,
              publisher: bookData.newBook.publisher.trim() || null,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || '書籍の登録に失敗しました');
          }

          const data = await response.json();
          bookId = data.book.id;
        } else {
          bookId = bookData.selectedBookId;
        }
      }

      // SNSの場合：新規作成または既存選択
      if (sourceType === 'SNS') {
        if (snsData.selectionMode === 'new') {
          const response = await fetch('/api/sns-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: snsData.platform,
              handle: snsData.newSnsUser.handle.trim(),
              display_name: snsData.newSnsUser.display_name.trim() || null,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'SNSユーザーの登録に失敗しました');
          }

          const data = await response.json();
          snsUserId = data.sns_user.id;
        } else {
          snsUserId = snsData.selectedSnsUserId;
        }
      }

      // フレーズを登録
      const quotesPayload = quotes
        .filter((q) => q.text.trim())
        .map((q) => ({
          text: q.text.trim(),
          activity_ids: q.activity_ids,
          tag_ids: q.tag_ids,
        }));

      const payload: any = {
        quotes: quotesPayload,
        source_type: sourceType,
      };

      if (sourceType === 'BOOK') {
        payload.book_id = bookId;
      } else if (sourceType === 'SNS') {
        payload.sns_user_id = snsUserId;
      } else if (sourceType === 'OTHER') {
        payload.source_meta = {
          source: otherData.source.trim() || null,
          note: otherData.note.trim() || null,
        };
      }

      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'フレーズの登録に失敗しました');
      }

      // 成功：モーダルを閉じてフォームをリセット
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // フォームのリセット
  const resetForm = () => {
    setQuotes([{ text: '', activity_ids: [], tag_ids: [] }]);
    setSourceType('BOOK');
    setBookData({
      selectionMode: 'new',
      selectedBookId: null,
      newBook: { title: '', author: '', publisher: '' },
    });
    setSnsData({
      selectionMode: 'new',
      platform: 'X',
      selectedSnsUserId: null,
      newSnsUser: { handle: '', display_name: '' },
    });
    setOtherData({ source: '', note: '' });
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[#2a2a2a] rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="sticky top-0 bg-[#2a2a2a] border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-white">フレーズを登録</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl"
            >
              ×
            </button>
          </div>

          {/* コンテンツ */}
          <div className="p-6 space-y-4">
            {/* セクション1: フレーズ & 分類分け */}
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveSection('phrase')}
                className="w-full px-4 py-3 bg-[#1a1a1a] text-white text-left font-medium flex items-center justify-between hover:bg-[#252525] transition-colors"
              >
                <span>1. フレーズ & 分類分け</span>
                <span className="text-xl">{activeSection === 'phrase' ? '▲' : '▼'}</span>
              </button>
              {activeSection === 'phrase' && (
                <div className="p-4 space-y-6">
                  {quotes.map((quote, index) => (
                    <div key={index} className="space-y-4 pb-6 border-b border-gray-700 last:border-b-0">
                      {/* フレーズテキスト入力 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          フレーズ {quotes.length > 1 && `#${index + 1}`}
                        </label>
                        <textarea
                          value={quote.text}
                          onChange={(e) => {
                            const newQuotes = [...quotes];
                            newQuotes[index].text = e.target.value;
                            setQuotes(newQuotes);
                          }}
                          placeholder="例）集中は筋肉のように鍛えられる。"
                          rows={3}
                          className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* 活動領域選択 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          活動領域（複数選択可）<span className="text-red-500">*</span>
                        </label>
                        {activitiesLoading ? (
                          <p className="text-gray-400 text-sm">読み込み中...</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {activities.map((activity) => (
                              <label
                                key={activity.id}
                                className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg hover:bg-[#252525] cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={quote.activity_ids.includes(activity.id)}
                                  onChange={(e) => {
                                    const newQuotes = [...quotes];
                                    if (e.target.checked) {
                                      newQuotes[index].activity_ids.push(activity.id);
                                    } else {
                                      newQuotes[index].activity_ids = newQuotes[
                                        index
                                      ].activity_ids.filter((id) => id !== activity.id);
                                    }
                                    setQuotes(newQuotes);
                                  }}
                                  className="w-4 h-4"
                                />
                                <span className="text-white text-sm">
                                  {activity.icon} {activity.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* タグ選択 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          タグ
                        </label>
                        {/* 選択済みタグ */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {quote.tag_ids.map((tagId) => {
                            const tag = tags.find((t) => t.id === tagId);
                            if (!tag) return null;
                            return (
                              <button
                                key={tagId}
                                onClick={() => {
                                  const newQuotes = [...quotes];
                                  newQuotes[index].tag_ids = newQuotes[
                                    index
                                  ].tag_ids.filter((id) => id !== tagId);
                                  setQuotes(newQuotes);
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
                              if (tagId && !quote.tag_ids.includes(tagId)) {
                                const newQuotes = [...quotes];
                                newQuotes[index].tag_ids.push(tagId);
                                setQuotes(newQuotes);
                              }
                            }}
                            className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                          >
                            <option value="">既存のタグを選択...</option>
                            {tags
                              .filter((tag) => !quote.tag_ids.includes(tag.id))
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
                            placeholder="例: 生産性"
                            className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={async () => {
                              if (newTagName.trim()) {
                                const tag = await createTag(newTagName.trim());
                                if (tag) {
                                  const newQuotes = [...quotes];
                                  newQuotes[index].tag_ids.push(tag.id);
                                  setQuotes(newQuotes);
                                  setNewTagName('');
                                }
                              }
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          >
                            + 追加
                          </button>
                        </div>
                      </div>

                      {/* フレーズ削除ボタン（2つ以上ある場合のみ） */}
                      {quotes.length > 1 && (
                        <button
                          onClick={() => {
                            setQuotes(quotes.filter((_, i) => i !== index));
                          }}
                          className="text-red-400 hover:text-red-300 text-sm transition-colors"
                        >
                          このフレーズを削除
                        </button>
                      )}
                    </div>
                  ))}

                  {/* フレーズ追加ボタン */}
                  <button
                    onClick={() => {
                      setQuotes([...quotes, { text: '', activity_ids: [], tag_ids: [] }]);
                    }}
                    className="w-full py-3 border-2 border-dashed border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-400 rounded-lg transition-colors font-medium"
                  >
                    + フレーズを追加
                  </button>
                </div>
              )}
            </div>

            {/* セクション2: 出典 */}
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveSection('source')}
                className="w-full px-4 py-3 bg-[#1a1a1a] text-white text-left font-medium flex items-center justify-between hover:bg-[#252525] transition-colors"
              >
                <span>2. 出典（本 / SNS / その他）</span>
                <span className="text-xl">{activeSection === 'source' ? '▲' : '▼'}</span>
              </button>
              {activeSection === 'source' && (
                <div className="p-4 space-y-4">
                  {/* 出典タイプ選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      出典の種類
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="BOOK"
                          checked={sourceType === 'BOOK'}
                          onChange={(e) => setSourceType(e.target.value as 'BOOK' | 'SNS' | 'OTHER')}
                          className="w-4 h-4"
                        />
                        <span className="text-white">本</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="SNS"
                          checked={sourceType === 'SNS'}
                          onChange={(e) => setSourceType(e.target.value as 'BOOK' | 'SNS' | 'OTHER')}
                          className="w-4 h-4"
                        />
                        <span className="text-white">SNS</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="OTHER"
                          checked={sourceType === 'OTHER'}
                          onChange={(e) => setSourceType(e.target.value as 'BOOK' | 'SNS' | 'OTHER')}
                          className="w-4 h-4"
                        />
                        <span className="text-white">その他</span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    {/* 本の場合 */}
                    {sourceType === 'BOOK' && (
                      <div className="space-y-4">
                        <div className="flex gap-4 mb-4">
                          <button
                            onClick={() =>
                              setBookData({ ...bookData, selectionMode: 'existing' })
                            }
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              bookData.selectionMode === 'existing'
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
                            }`}
                          >
                            既存の書籍から選択
                          </button>
                          <button
                            onClick={() =>
                              setBookData({ ...bookData, selectionMode: 'new' })
                            }
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              bookData.selectionMode === 'new'
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
                            }`}
                          >
                            新しい書籍を登録
                          </button>
                        </div>

                        {bookData.selectionMode === 'existing' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              書籍を選択
                            </label>
                            {booksLoading ? (
                              <p className="text-gray-400 text-sm">読み込み中...</p>
                            ) : books.length === 0 ? (
                              <p className="text-gray-400 text-sm">
                                登録されている書籍がありません
                              </p>
                            ) : (
                              <select
                                value={bookData.selectedBookId || ''}
                                onChange={(e) =>
                                  setBookData({
                                    ...bookData,
                                    selectedBookId: parseInt(e.target.value) || null,
                                  })
                                }
                                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">書籍を選択...</option>
                                {books.map((book) => (
                                  <option key={book.id} value={book.id}>
                                    {book.title}
                                    {book.author && ` - ${book.author}`}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                タイトル<span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={bookData.newBook.title}
                                onChange={(e) =>
                                  setBookData({
                                    ...bookData,
                                    newBook: { ...bookData.newBook, title: e.target.value },
                                  })
                                }
                                placeholder="例: 深い仕事"
                                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                著者
                              </label>
                              <input
                                type="text"
                                value={bookData.newBook.author}
                                onChange={(e) =>
                                  setBookData({
                                    ...bookData,
                                    newBook: { ...bookData.newBook, author: e.target.value },
                                  })
                                }
                                placeholder="例: カル・ニューポート"
                                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                出版社
                              </label>
                              <input
                                type="text"
                                value={bookData.newBook.publisher}
                                onChange={(e) =>
                                  setBookData({
                                    ...bookData,
                                    newBook: {
                                      ...bookData.newBook,
                                      publisher: e.target.value,
                                    },
                                  })
                                }
                                placeholder="例: ダイヤモンド社"
                                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SNSの場合 */}
                    {sourceType === 'SNS' && (
                      <div className="space-y-4">
                        {/* プラットフォーム選択 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            プラットフォーム
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                value="X"
                                checked={snsData.platform === 'X'}
                                onChange={(e) =>
                                  setSnsData({
                                    ...snsData,
                                    platform: e.target.value as 'X' | 'THREADS',
                                  })
                                }
                                className="w-4 h-4"
                              />
                              <span className="text-white">X (旧Twitter)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                value="THREADS"
                                checked={snsData.platform === 'THREADS'}
                                onChange={(e) =>
                                  setSnsData({
                                    ...snsData,
                                    platform: e.target.value as 'X' | 'THREADS',
                                  })
                                }
                                className="w-4 h-4"
                              />
                              <span className="text-white">Threads</span>
                            </label>
                          </div>
                        </div>

                        {/* 既存/新規選択 */}
                        <div className="flex gap-4">
                          <button
                            onClick={() =>
                              setSnsData({ ...snsData, selectionMode: 'existing' })
                            }
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              snsData.selectionMode === 'existing'
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
                            }`}
                          >
                            既存のユーザーから選択
                          </button>
                          <button
                            onClick={() =>
                              setSnsData({ ...snsData, selectionMode: 'new' })
                            }
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              snsData.selectionMode === 'new'
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
                            }`}
                          >
                            新しいユーザーを登録
                          </button>
                        </div>

                        {snsData.selectionMode === 'existing' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              ユーザーを選択
                            </label>
                            {snsUsersLoading ? (
                              <p className="text-gray-400 text-sm">読み込み中...</p>
                            ) : snsUsers.filter((u) => u.platform === snsData.platform)
                                .length === 0 ? (
                              <p className="text-gray-400 text-sm">
                                登録されている{snsData.platform}ユーザーがありません
                              </p>
                            ) : (
                              <select
                                value={snsData.selectedSnsUserId || ''}
                                onChange={(e) =>
                                  setSnsData({
                                    ...snsData,
                                    selectedSnsUserId: parseInt(e.target.value) || null,
                                  })
                                }
                                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">ユーザーを選択...</option>
                                {snsUsers
                                  .filter((user) => user.platform === snsData.platform)
                                  .map((user) => (
                                    <option key={user.id} value={user.id}>
                                      @{user.handle}
                                      {user.display_name && ` (${user.display_name})`}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                ユーザーID<span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={snsData.newSnsUser.handle}
                                onChange={(e) =>
                                  setSnsData({
                                    ...snsData,
                                    newSnsUser: {
                                      ...snsData.newSnsUser,
                                      handle: e.target.value,
                                    },
                                  })
                                }
                                placeholder="例: kentaro_dev"
                                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                表示名
                              </label>
                              <input
                                type="text"
                                value={snsData.newSnsUser.display_name}
                                onChange={(e) =>
                                  setSnsData({
                                    ...snsData,
                                    newSnsUser: {
                                      ...snsData.newSnsUser,
                                      display_name: e.target.value,
                                    },
                                  })
                                }
                                placeholder="例: Kentaro | エンジニア"
                                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* その他の場合 */}
                    {sourceType === 'OTHER' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            出典（任意）
                          </label>
                          <input
                            type="text"
                            value={otherData.source}
                            onChange={(e) =>
                              setOtherData({ ...otherData, source: e.target.value })
                            }
                            placeholder="例: 社内研修"
                            className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            メモ（任意）
                          </label>
                          <textarea
                            value={otherData.note}
                            onChange={(e) =>
                              setOtherData({ ...otherData, note: e.target.value })
                            }
                            placeholder="例: 10月の全社研修での気づき"
                            rows={3}
                            className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* フッター */}
          <div className="sticky bottom-0 bg-[#2a2a2a] border-t border-gray-700 px-6 py-4">
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
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '登録中...' : '登録する'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
