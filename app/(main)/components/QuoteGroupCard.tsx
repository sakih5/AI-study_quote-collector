import Image from 'next/image';
import { QuoteGroup, Quote } from '../hooks/useQuotesGrouped';
import QuoteItem from './QuoteItem';

interface QuoteGroupCardProps {
  group: QuoteGroup;
  onEdit?: (quote: Quote) => void;
  onDelete?: (quoteId: number) => void;
}

export default function QuoteGroupCard({ group, onEdit, onDelete }: QuoteGroupCardProps) {
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
      <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
        <div className="flex gap-4 mb-4">
          {/* SNSアイコン */}
          <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">{platformIcon}</span>
          </div>

          {/* ユーザー情報 */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {sns_user.display_name || `@${sns_user.handle}`}
            </h3>
            <p className="text-gray-500 text-sm">@{sns_user.handle}</p>
            <p className="text-gray-400 text-xs mt-2">
              {sns_user.platform} · {quotes.length}件のフレーズ
            </p>
          </div>
        </div>

        {/* フレーズ一覧 */}
        <div className="space-y-3">
          {quotes.map((quote) => (
            <QuoteItem
              key={quote.id}
              quote={quote}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    );
  }

  // OTHER タイプ
  const { quote } = group;
  return (
    <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">その他</h3>
        {quote.source_meta?.source && (
          <p className="text-gray-500 text-sm">出典: {quote.source_meta.source}</p>
        )}
        {quote.source_meta?.note && (
          <p className="text-gray-400 text-xs mt-1">{quote.source_meta.note}</p>
        )}
      </div>

      <QuoteItem quote={quote} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
