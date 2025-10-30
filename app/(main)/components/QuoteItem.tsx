import { Quote } from '../hooks/useQuotesGrouped';

interface QuoteItemProps {
  quote: Quote;
  pageNumber?: number;
  onEdit?: (quote: Quote) => void;
  onDelete?: (quoteId: number) => void;
}

export default function QuoteItem({ quote, pageNumber, onEdit, onDelete }: QuoteItemProps) {
  return (
    <div className="py-3 border-b border-gray-700 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-white text-base mb-2">{quote.text}</p>

          {/* 活動領域とタグ */}
          <div className="flex flex-wrap gap-2">
            {quote.activities.map((activity) => (
              <span
                key={activity.id}
                className="px-2 py-1 bg-[#1a1a1a] text-gray-300 text-xs rounded"
              >
                {activity.icon} {activity.name}
              </span>
            ))}
            {quote.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* ページ番号 */}
          {pageNumber && (
            <div className="text-gray-500 text-sm">p.{pageNumber}</div>
          )}

          {/* 編集・削除ボタン */}
          <div className="flex gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(quote)}
                className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-[#1a1a1a] rounded transition-colors"
                title="編集"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(quote.id)}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#1a1a1a] rounded transition-colors"
                title="削除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
