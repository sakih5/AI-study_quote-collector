import { Quote } from '../hooks/useQuotesGrouped';

interface QuoteItemProps {
  quote: Quote;
  pageNumber?: number;
  onEdit?: (quote: Quote) => void;
  onDelete?: (quoteId: number) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

export default function QuoteItem({
  quote,
  pageNumber,
  onEdit,
  onDelete,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection
}: QuoteItemProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 border ${
      isSelectionMode && isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        {/* チェックボックス（選択モード時のみ） */}
        {isSelectionMode && (
          <div className="flex-shrink-0 pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelection}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
          </div>
        )}

        <div className="flex-1">
          <p className="text-gray-900 text-lg font-bold mb-3">{quote.text}</p>

          {/* 活動領域とタグ */}
          <div className="flex flex-wrap gap-2">
            {quote.activities.map((activity) => (
              <span
                key={activity.id}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {activity.icon} {activity.name}
              </span>
            ))}
            {quote.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
              >
                {tag.name}
              </span>
            ))}
          </div>

          {/* 参考リンク */}
          {quote.reference_link && (
            <div className="mt-3">
              <a
                href={quote.reference_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs rounded-lg border border-gray-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                参考リンクを開く
              </a>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* ページ番号 */}
          {pageNumber && (
            <div className="text-gray-500 text-sm">p.{pageNumber}</div>
          )}

          {/* 編集・削除ボタン（通常モード時のみ） */}
          {!isSelectionMode && (
            <div className="flex gap-1">
              {onEdit && (
                <button
                  onClick={() => onEdit(quote)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
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
                  className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-gray-100 rounded transition-colors"
                  title="削除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
