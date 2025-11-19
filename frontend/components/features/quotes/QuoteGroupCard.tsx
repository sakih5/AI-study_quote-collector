import Image from 'next/image';
import { QuoteGroup, Quote } from '@/hooks/useQuotesGrouped';
import QuoteItem from './QuoteItem';

interface QuoteGroupCardProps {
  group: QuoteGroup;
  onEdit?: (quote: Quote) => void;
  onDelete?: (quoteId: number) => void;
  isSelectionMode?: boolean;
  selectedQuoteIds?: Set<number>;
  onToggleSelection?: (quoteId: number) => void;
}

export default function QuoteGroupCard({
  group,
  onEdit,
  onDelete,
  isSelectionMode,
  selectedQuoteIds,
  onToggleSelection
}: QuoteGroupCardProps) {
  if (group.type === 'book') {
    const { book, quotes } = group;
    return (
      <div className="bg-white p-6">
        <div className="flex gap-6 items-start">
          {/* 左側：書籍情報（1/3） */}
          <div className="w-1/3 flex-shrink-0 sticky top-6 self-start bg-gray-50 p-4 rounded-lg">
            {/* 書籍カバー */}
            <div className="flex justify-center mb-3">
              {book.cover_image_url ? (
                <Image
                  src={book.cover_image_url}
                  alt={book.title}
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

            {/* 書籍情報（画像の下） */}
            <div className="text-center">
              <h3 className="text-sm text-gray-500 mb-0.5 font-medium">{book.title}</h3>
              {book.author && <p className="text-xs text-gray-400">著者: {book.author}</p>}
              <p className="text-xs text-gray-400 mt-2">{quotes.length}件のフレーズ</p>
            </div>
          </div>

          {/* 右側：フレーズ一覧（2/3） */}
          <div className="flex-1">
            <div className="space-y-3">
              {quotes.map((quote) => (
                <QuoteItem
                  key={quote.id}
                  quote={quote}
                  pageNumber={quote.page_number}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedQuoteIds?.has(quote.id)}
                  onToggleSelection={() => onToggleSelection?.(quote.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (group.type === 'sns') {
    const { sns_user, quotes } = group;
    const platformIcon = sns_user.platform === 'X' ? '𝕏' : '@';

    return (
      <div className="bg-white p-6">
        <div className="flex gap-6 items-start">
          {/* 左側：SNSユーザー情報（1/3） */}
          <div className="w-1/3 flex-shrink-0 sticky top-6 self-start bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col items-center text-center">
              {/* SNSアイコン */}
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-3xl">{platformIcon}</span>
              </div>

              {/* ユーザー情報 */}
              <h3 className="text-sm text-gray-900 font-medium mb-0.5">
                {sns_user.display_name || `@${sns_user.handle}`}
              </h3>
              <p className="text-xs text-gray-500">@{sns_user.handle}</p>
              <p className="text-xs text-gray-400 mt-2">
                {sns_user.platform}・{quotes.length}件のフレーズ
              </p>
            </div>
          </div>

          {/* 右側：フレーズ一覧（2/3） */}
          <div className="flex-1">
            <div className="space-y-3">
              {quotes.map((quote) => (
                <QuoteItem
                  key={quote.id}
                  quote={quote}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedQuoteIds?.has(quote.id)}
                  onToggleSelection={() => onToggleSelection?.(quote.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OTHER タイプ
  const { source_info, quotes } = group;
  return (
    <div className="bg-white p-6">
      <div className="flex gap-6 items-start">
        {/* 左側：その他メタ情報（1/3） */}
        <div className="w-1/3 flex-shrink-0 sticky top-6 self-start bg-gray-50 p-4 rounded-lg">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
              <span className="text-3xl">📝</span>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">その他</h3>
            {source_info?.source && (
              <p className="text-xs text-gray-500">出典: {source_info.source}</p>
            )}
            {source_info?.note && (
              <p className="text-xs text-gray-400 mt-1">{source_info.note}</p>
            )}
            {!source_info?.source && !source_info?.note && (
              <p className="text-xs text-gray-400">出典情報なし</p>
            )}
            <p className="text-xs text-gray-400 mt-2">{quotes.length}件のフレーズ</p>
          </div>
        </div>

        {/* 右側：フレーズ一覧（2/3） */}
        <div className="flex-1">
          <div className="space-y-3">
            {quotes.map((quote) => (
              <QuoteItem
                key={quote.id}
                quote={quote}
                onEdit={onEdit}
                onDelete={onDelete}
                isSelectionMode={isSelectionMode}
                isSelected={selectedQuoteIds?.has(quote.id)}
                onToggleSelection={() => onToggleSelection?.(quote.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
