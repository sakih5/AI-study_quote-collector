'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useActivities } from '@/hooks/useActivities';
import { useTags } from '@/hooks/useTags';
import { useBooks } from '@/hooks/useBooks';
import { useSnsUsers } from '@/hooks/useSnsUsers';
import OCRTextSelector from './OCRTextSelector';
import { apiPost } from '@/lib/api/client';

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
    cover_image_url?: string;
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
  const [isPhraseOpen, setIsPhraseOpen] = useState(true);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [quotes, setQuotes] = useState<QuoteInput[]>([{ text: '', activity_ids: [], tag_ids: [] }]);
  const [sourceType, setSourceType] = useState<'BOOK' | 'SNS' | 'OTHER'>('BOOK');

  const { activities, loading: activitiesLoading } = useActivities();
  const { tags, loading: tagsLoading, createTag } = useTags();
  const { books, loading: booksLoading } = useBooks();
  const { snsUsers, loading: snsUsersLoading } = useSnsUsers();

  const [newTagName, setNewTagName] = useState('');
  const [isPublic, setIsPublic] = useState(false); // 公開/非公開フラグ
  const [referenceLink, setReferenceLink] = useState(''); // 参考リンク

  // 出典情報の管理
  const [bookData, setBookData] = useState<BookData>({
    selectionMode: 'new',
    selectedBookId: null,
    newBook: { title: '', author: '', publisher: '', cover_image_url: '' },
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
  const [warning, setWarning] = useState<string | null>(null);

  // OCR機能の状態管理
  const [ocrText, setOcrText] = useState<string>('');
  const [ocrImageUrl, setOcrImageUrl] = useState<string>('');
  const [ocrImageFile, setOcrImageFile] = useState<File | null>(null);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const [ocrError, setOcrError] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  // URL取得機能の状態管理
  const [bookUrl, setBookUrl] = useState('');
  const [isFetchingBookInfo, setIsFetchingBookInfo] = useState(false);
  const [snsUrl, setSnsUrl] = useState('');
  const [isFetchingSnsInfo, setIsFetchingSnsInfo] = useState(false);

  // OCR機能のハンドラー
  // OCR実行
  const handleOCRExtractText = async (imageDataUrl: string) => {
    setIsOCRProcessing(true);
    setOcrError('');
    setOcrProgress('画像を読み込んでいます...');

    try {
      // 画像読み込み完了
      await new Promise(resolve => setTimeout(resolve, 300));
      setOcrProgress('AIが文字を認識しています...');

      // バックエンドAPIを呼び出し
      const response = await apiPost<{ text: string; lines: any[]; average_confidence: number }>('/api/ocr/extract-text', {
        image_data: imageDataUrl,
        min_confidence: 0.5
      });

      setOcrProgress('テキストを整形しています...');
      await new Promise(resolve => setTimeout(resolve, 200));

      setOcrText(response.text);
      setOcrConfidence(response.average_confidence);
      setOcrProgress('');
    } catch (err) {
      console.error('OCR error:', err);
      setOcrError('テキスト抽出に失敗しました。画像を確認してください。');
      setOcrProgress('');
    } finally {
      setIsOCRProcessing(false);
    }
  };

  const handleOCRImageSelect = async (file: File) => {
    setOcrImageFile(file);
    setOcrError('');

    // プレビュー用のURLを作成
    const url = URL.createObjectURL(file);
    setOcrImageUrl(url);

    // Base64に変換
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      // 即座にOCR処理を実行
      await handleOCRExtractText(base64Data);
    };
    reader.readAsDataURL(file);
  };

  // ファイル選択
  const handleOCRFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleOCRImageSelect(file);
    }
  };

  // ドラッグ&ドロップ対応
  const handleOCRDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleOCRImageSelect(file);
    } else {
      setOcrError('画像ファイルを選択してください');
    }
  };

  const handleOCRDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // ファイル選択ダイアログを開く
  const handleOCRClickUpload = () => {
    ocrFileInputRef.current?.click();
  };

  const handleOCRTextSelect = (selectedText: string) => {
    // 選択されたテキストをフレーズ入力欄に追加
    if (selectedText.trim()) {
      // 最初のフレーズが空の場合は、そこに入れる
      if (quotes.length === 1 && quotes[0].text === '') {
        setQuotes([{
          text: selectedText.trim(),
          activity_ids: [],
          tag_ids: [],
        }]);
      } else {
        // それ以外の場合は新しいフレーズとして追加
        setQuotes([...quotes, {
          text: selectedText.trim(),
          activity_ids: [],
          tag_ids: [],
        }]);
      }
    }
  };

  const handleOCRReset = () => {
    setOcrText('');
    setOcrImageUrl('');
    setOcrImageFile(null);
    setOcrError('');
  };

  // Amazon URLから書籍情報を取得
  const handleFetchBookInfo = async () => {
    if (!bookUrl.trim()) {
      setError('Amazon URLを入力してください');
      return;
    }

    setIsFetchingBookInfo(true);
    setError(null);
    setWarning(null);

    try {
      const data = await apiPost<{ book_info: { title: string; author: string; publisher: string; cover_image_url: string } }>('/api/books/from-url', { url: bookUrl.trim() });
      const bookInfo = data.book_info;

      // 取得した情報をフォームに自動入力
      setBookData({
        ...bookData,
        newBook: {
          title: bookInfo.title || '',
          author: bookInfo.author || '',
          publisher: bookInfo.publisher || '',
          cover_image_url: bookInfo.cover_image_url || '',
        },
      });

      // URLフィールドをクリア
      setBookUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '書籍情報の取得に失敗しました');
    } finally {
      setIsFetchingBookInfo(false);
    }
  };

  // SNS URLからユーザー情報を取得
  const handleFetchSnsInfo = async () => {
    if (!snsUrl.trim()) {
      setError('SNS URLを入力してください');
      return;
    }

    setIsFetchingSnsInfo(true);
    setError(null);
    setWarning(null);

    try {
      const data = await apiPost<{
        user_info: { platform: 'X' | 'THREADS'; handle: string; display_name: string | null };
        display_name_fetched: boolean;
        warning: string | null;
      }>('/api/sns-users/from-url', { url: snsUrl.trim() });
      const userInfo = data.user_info;

      // 取得した情報をフォームに自動入力
      setSnsData({
        ...snsData,
        platform: userInfo.platform,
        newSnsUser: {
          handle: userInfo.handle || '',
          display_name: userInfo.display_name || '',
        },
      });

      // URLフィールドをクリア
      setSnsUrl('');

      // 警告メッセージがあれば表示
      if (data.warning) {
        setWarning(data.warning);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザー情報の取得に失敗しました');
    } finally {
      setIsFetchingSnsInfo(false);
    }
  };

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
      let bookId: number | undefined = undefined;
      let snsUserId: number | undefined = undefined;

      // 本の場合：新規作成または既存選択
      if (sourceType === 'BOOK') {
        if (bookData.selectionMode === 'new') {
          const data = await apiPost<{ book: { id: number } }>('/api/books', {
            title: bookData.newBook.title.trim(),
            author: bookData.newBook.author.trim() || null,
            publisher: bookData.newBook.publisher.trim() || null,
            cover_image_url: bookData.newBook.cover_image_url?.trim() || null,
          });
          bookId = data.book.id;
        } else {
          bookId = bookData.selectedBookId ?? undefined;
        }
      }

      // SNSの場合：新規作成または既存選択
      if (sourceType === 'SNS') {
        if (snsData.selectionMode === 'new') {
          const data = await apiPost<{ sns_user: { id: number } }>('/api/sns-users', {
            platform: snsData.platform,
            handle: snsData.newSnsUser.handle.trim(),
            display_name: snsData.newSnsUser.display_name.trim() || null,
          });
          snsUserId = data.sns_user.id;
        } else {
          snsUserId = snsData.selectedSnsUserId ?? undefined;
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

      interface QuotePayload {
        quotes: Array<{
          text: string;
          activity_ids: number[];
          tag_ids: number[];
        }>;
        source_type: 'BOOK' | 'SNS' | 'OTHER';
        is_public: boolean;
        reference_link?: string;
        book_id?: number;
        sns_user_id?: number;
        source_meta?: {
          source: string | null;
          note: string | null;
        };
      }

      const payload: QuotePayload = {
        quotes: quotesPayload,
        source_type: sourceType,
        is_public: isPublic,
        reference_link: referenceLink.trim() || undefined,
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

      await apiPost('/api/quotes', payload);

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
      newBook: { title: '', author: '', publisher: '', cover_image_url: '' },
    });
    setSnsData({
      selectionMode: 'new',
      platform: 'X',
      selectedSnsUserId: null,
      newSnsUser: { handle: '', display_name: '' },
    });
    setOtherData({ source: '', note: '' });
    setReferenceLink('');
    setError(null);
    setWarning(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 bg-gray-900/20 z-40" />

      {/* モーダル */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">フレーズを登録</h2>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 transition-colors text-2xl"
            >
              ×
            </button>
          </div>

          {/* コンテンツ */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* セクション0: OCR（画像からテキスト抽出） */}
            <div className="border border-blue-600 rounded-lg p-4 bg-blue-900/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📷</span>
                  <h3 className="text-lg font-semibold text-gray-900">画像からテキストを抽出</h3>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                書籍やメモの画像をアップロードして、テキストを自動で抽出できます。
              </p>

              {/* ファイル選択用input（非表示） */}
              <input
                ref={ocrFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleOCRFileChange}
                className="hidden"
              />

              {/* 画像が選択されていない場合 */}
              {!ocrImageFile && !isOCRProcessing && (
                <div
                  onDrop={handleOCRDrop}
                  onDragOver={handleOCRDragOver}
                  onClick={handleOCRClickUpload}
                  className="border-2 border-dashed border-blue-400 rounded-lg p-6 text-center hover:border-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-gray-700 mb-1 font-medium">画像をドラッグ&ドロップ</p>
                  <p className="text-gray-500 text-sm">または クリックして選択</p>
                </div>
              )}

              {/* 画像プレビュー（処理前のみ） */}
              {ocrImageFile && !isOCRProcessing && !ocrText && (
                <div className="space-y-3">
                  <div className="relative">
                    <Image
                      src={ocrImageUrl}
                      alt="プレビュー"
                      width={400}
                      height={300}
                      className="max-w-full max-h-48 mx-auto rounded-lg object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              {/* 別の画像を選択ボタン（処理前） */}
              {ocrImageFile && !isOCRProcessing && !ocrText && (
                <button
                  onClick={handleOCRReset}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  別の画像を選択
                </button>
              )}

              {/* 処理中表示 */}
              {isOCRProcessing && (
                <div className="py-6 px-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-lg font-medium text-blue-900">{ocrProgress}</p>
                  </div>

                  {/* プログレスバー */}
                  <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: '70%' }}></div>
                  </div>

                  <p className="mt-3 text-sm text-gray-600 text-center">
                    処理には数秒かかる場合があります
                  </p>
                </div>
              )}

              {/* OCR結果のテキスト表示・選択 */}
              {ocrText && !isOCRProcessing && (
                <div className="p-4 bg-white border border-gray-300 rounded-lg">
                  <OCRTextSelector
                    text={ocrText}
                    imageUrl={ocrImageUrl}
                    averageConfidence={ocrConfidence}
                    onTextSelect={handleOCRTextSelect}
                    onClose={handleOCRReset}
                  />
                </div>
              )}

              {/* エラー表示 */}
              {ocrError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
                  {ocrError}
                </div>
              )}
            </div>

            {/* セクション1: フレーズ & 分類分け */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsPhraseOpen((prev) => !prev)}
                className="w-full px-4 py-3 bg-white text-gray-900 text-left font-medium flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span>1. フレーズ & 分類分け</span>
                <span className="text-xl">{isPhraseOpen ? '▲' : '▼'}</span>
              </button>
              {isPhraseOpen && (
                <div className="p-4 space-y-6">
                  {quotes.map((quote, index) => (
                    <div
                      key={index}
                      className="space-y-4 pb-6 border-b border-gray-200 last:border-b-0"
                    >
                      {/* フレーズテキスト入力 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activities.map((activity) => (
                              <label
                                key={activity.id}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
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
                          {quote.tag_ids.map((tagId) => {
                            const tag = tags.find((t) => t.id === tagId);
                            if (!tag) return null;
                            return (
                              <button
                                key={tagId}
                                onClick={() => {
                                  const newQuotes = [...quotes];
                                  newQuotes[index].tag_ids = newQuotes[index].tag_ids.filter(
                                    (id) => id !== tagId
                                  );
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
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                          >
                            <option value="">既存のタグを選択...</option>
                            {tags
                              .filter((tag) => !quote.tag_ids.includes(tag.id) && (tag.usage_count ?? 0) > 0)
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
                                    const newQuotes = [...quotes];
                                    newQuotes[index].tag_ids.push(tag.id);
                                    setQuotes(newQuotes);
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
                                  const newQuotes = [...quotes];
                                  newQuotes[index].tag_ids.push(tag.id);
                                  setQuotes(newQuotes);
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

                  {/* 参考リンク */}
                  <div className="pt-4 border-t border-gray-200">
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

                  {/* フレーズ追加ボタン */}
                  <button
                    onClick={() => {
                      setQuotes([...quotes, { text: '', activity_ids: [], tag_ids: [] }]);
                    }}
                    className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-blue-500 text-gray-600 hover:text-blue-400 rounded-lg transition-colors font-medium"
                  >
                    + フレーズを追加
                  </button>
                </div>
              )}
            </div>

            {/* セクション2: 出典 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsSourceOpen((prev) => !prev)}
                className="w-full px-4 py-3 bg-white text-gray-900 text-left font-medium flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span>2. 出典（本 / SNS / その他）</span>
                <span className="text-xl">{isSourceOpen ? '▲' : '▼'}</span>
              </button>
              {isSourceOpen && (
                <div className="p-4 space-y-4">
                  {/* 出典タイプ選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      出典の種類
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="BOOK"
                          checked={sourceType === 'BOOK'}
                          onChange={(e) =>
                            setSourceType(e.target.value as 'BOOK' | 'SNS' | 'OTHER')
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-gray-900">本</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="SNS"
                          checked={sourceType === 'SNS'}
                          onChange={(e) =>
                            setSourceType(e.target.value as 'BOOK' | 'SNS' | 'OTHER')
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-gray-900">SNS</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="OTHER"
                          checked={sourceType === 'OTHER'}
                          onChange={(e) =>
                            setSourceType(e.target.value as 'BOOK' | 'SNS' | 'OTHER')
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-gray-900">その他</span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    {/* 本の場合 */}
                    {sourceType === 'BOOK' && (
                      <div className="space-y-4">
                        <div className="flex gap-4 mb-4">
                          <button
                            onClick={() => setBookData({ ...bookData, selectionMode: 'existing' })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              bookData.selectionMode === 'existing'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            既存の書籍から選択
                          </button>
                          <button
                            onClick={() => setBookData({ ...bookData, selectionMode: 'new' })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              bookData.selectionMode === 'new'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            新しい書籍を登録
                          </button>
                        </div>

                        {bookData.selectionMode === 'existing' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              書籍を選択
                            </label>
                            {booksLoading ? (
                              <p className="text-gray-600 text-sm">読み込み中...</p>
                            ) : books.length === 0 ? (
                              <p className="text-gray-600 text-sm">
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
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            {/* Amazon URLから取得 */}
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amazon URLから自動取得
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={bookUrl}
                                  onChange={(e) => setBookUrl(e.target.value)}
                                  placeholder="例: https://www.amazon.co.jp/dp/..."
                                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  disabled={isFetchingBookInfo}
                                />
                                <button
                                  onClick={handleFetchBookInfo}
                                  disabled={isFetchingBookInfo}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                                >
                                  {isFetchingBookInfo ? '取得中...' : 'URLから取得'}
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                ※ Amazon URLを入力すると、書籍情報（画像含む）を自動取得できます
                              </p>
                            </div>

                            {/* 書籍画像アップロード・プレビュー */}
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <label className="block text-sm font-medium text-gray-700 mb-3">
                                書籍の画像
                              </label>

                              {bookData.newBook.cover_image_url ? (
                                <div className="flex flex-col items-center gap-3">
                                  <Image
                                    src={bookData.newBook.cover_image_url}
                                    alt={bookData.newBook.title || '書籍カバー'}
                                    width={120}
                                    height={160}
                                    className="w-30 h-40 object-cover rounded shadow-md"
                                  />
                                  <button
                                    onClick={() => setBookData({
                                      ...bookData,
                                      newBook: { ...bookData.newBook, cover_image_url: '' }
                                    })}
                                    className="text-sm text-red-600 hover:text-red-700 transition-colors"
                                  >
                                    画像を削除
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-30 h-40 bg-gray-100 rounded flex items-center justify-center shadow-sm">
                                    <span className="text-5xl">📚</span>
                                  </div>
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            setBookData({
                                              ...bookData,
                                              newBook: {
                                                ...bookData.newBook,
                                                cover_image_url: reader.result as string
                                              }
                                            });
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors inline-block">
                                      画像をアップロード
                                    </span>
                                  </label>
                                </div>
                              )}
                              <p className="text-xs text-gray-500 mt-2 text-center">
                                ※ Amazon URLから自動取得、または手動でアップロードできます
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              <span className="text-gray-900">X (旧Twitter)</span>
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
                              <span className="text-gray-900">Threads</span>
                            </label>
                          </div>
                        </div>

                        {/* 既存/新規選択 */}
                        <div className="flex gap-4">
                          <button
                            onClick={() => setSnsData({ ...snsData, selectionMode: 'existing' })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              snsData.selectionMode === 'existing'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            既存のユーザーから選択
                          </button>
                          <button
                            onClick={() => setSnsData({ ...snsData, selectionMode: 'new' })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              snsData.selectionMode === 'new'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            新しいユーザーを登録
                          </button>
                        </div>

                        {snsData.selectionMode === 'existing' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              ユーザーを選択
                            </label>
                            {snsUsersLoading ? (
                              <p className="text-gray-600 text-sm">読み込み中...</p>
                            ) : snsUsers.filter((u) => u.platform === snsData.platform && (u.usage_count ?? 0) > 0).length ===
                              0 ? (
                              <p className="text-gray-600 text-sm">
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
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">ユーザーを選択...</option>
                                {snsUsers
                                  .filter((user) => user.platform === snsData.platform && (user.usage_count ?? 0) > 0)
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
                            {/* SNS URLから取得 */}
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                SNS URLから自動取得
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={snsUrl}
                                  onChange={(e) => setSnsUrl(e.target.value)}
                                  placeholder="例: https://x.com/username/status/... または https://www.threads.com/@username/post/..."
                                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  disabled={isFetchingSnsInfo}
                                />
                                <button
                                  onClick={handleFetchSnsInfo}
                                  disabled={isFetchingSnsInfo}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                                >
                                  {isFetchingSnsInfo ? '取得中...' : 'URLから取得'}
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                ※ X/Threads URLを入力すると、ユーザー情報を自動取得できます
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            出典（任意）
                          </label>
                          <input
                            type="text"
                            value={otherData.source}
                            onChange={(e) => setOtherData({ ...otherData, source: e.target.value })}
                            placeholder="例: 社内研修"
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            メモ（任意）
                          </label>
                          <textarea
                            value={otherData.note}
                            onChange={(e) => setOtherData({ ...otherData, note: e.target.value })}
                            placeholder="例: 10月の全社研修での気づき"
                            rows={3}
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4">
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

            {/* 警告メッセージ */}
            {warning && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-400 rounded-lg text-yellow-800 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{warning}</span>
              </div>
            )}

            {/* エラーメッセージ */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* ボタン */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-400 hover:bg-blue-500 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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
