/**
 * CSV生成ユーティリティ
 * Excel互換のBOM付きUTF-8形式でCSVを生成する
 */

type Activity = {
  id: number;
  name: string;
  icon: string;
};

type Tag = {
  id: number;
  name: string;
};

type Book = {
  id: number;
  title: string;
  author: string | null;
  cover_image_url: string | null;
};

type SnsUser = {
  id: number;
  platform: 'X' | 'THREADS';
  handle: string;
  display_name: string | null;
};

export type QuoteForExport = {
  id: number;
  text: string;
  source_type: 'BOOK' | 'SNS' | 'OTHER';
  page_number: number | null;
  source_meta: Record<string, unknown> | null;
  created_at: string;
  books: Book | null;
  sns_users: SnsUser | null;
  quote_activities: Array<{ activities: Activity }>;
  quote_tags: Array<{ tags: Tag }>;
};

/**
 * CSVフィールドをエスケープする
 * - カンマ、引用符、改行を含む場合は引用符で囲む
 * - フィールド内の引用符は2倍にする
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // カンマ、引用符、改行を含む場合は引用符で囲む必要がある
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // フィールド内の引用符は2倍にする
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return stringValue;
}

/**
 * 出典情報を文字列に変換する
 */
function formatSource(quote: QuoteForExport): string {
  if (quote.source_type === 'BOOK' && quote.books) {
    const book = quote.books;
    let source = book.title;

    if (book.author) {
      source += ` - ${book.author}`;
    }

    if (quote.page_number) {
      source += ` (p.${quote.page_number})`;
    }

    return source;
  }

  if (quote.source_type === 'SNS' && quote.sns_users) {
    const user = quote.sns_users;
    const platform = user.platform === 'X' ? '𝕏' : 'Threads';

    if (user.display_name) {
      return `${platform} - ${user.display_name} (@${user.handle})`;
    }

    return `${platform} - @${user.handle}`;
  }

  if (quote.source_type === 'OTHER' && quote.source_meta) {
    const source = quote.source_meta.source || '';
    const note = quote.source_meta.note || '';

    if (source && note) {
      return `${source} - ${note}`;
    }

    return source || note || 'その他';
  }

  return 'その他';
}

/**
 * 活動領域を文字列に変換する（カンマ区切り）
 */
function formatActivities(quote: QuoteForExport): string {
  if (!quote.quote_activities || quote.quote_activities.length === 0) {
    return '';
  }

  return quote.quote_activities
    .map((qa) => qa.activities.name)
    .join(', ');
}

/**
 * タグを文字列に変換する（カンマ区切り）
 */
function formatTags(quote: QuoteForExport): string {
  if (!quote.quote_tags || quote.quote_tags.length === 0) {
    return '';
  }

  return quote.quote_tags
    .map((qt) => qt.tags.name)
    .join(', ');
}

/**
 * 日時をフォーマットする（YYYY-MM-DD HH:mm:ss）
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * フレーズをCSV行に変換する
 */
function quoteToCSVRow(quote: QuoteForExport): string {
  const fields = [
    escapeCsvField(quote.text),
    escapeCsvField(formatSource(quote)),
    escapeCsvField(formatActivities(quote)),
    escapeCsvField(formatTags(quote)),
    escapeCsvField(formatDate(quote.created_at)),
  ];

  return fields.join(',');
}

/**
 * フレーズ配列をCSV文字列に変換する
 * Excel互換のBOM付きUTF-8形式で出力
 */
export function generateCsvFromQuotes(quotes: QuoteForExport[]): string {
  // BOM（Byte Order Mark）を先頭に追加（Excelで正しく開けるようにする）
  const BOM = '\uFEFF';

  // ヘッダー行
  const header = 'フレーズ,出典,活動領域,タグ,登録日時';

  // データ行
  const rows = quotes.map((quote) => quoteToCSVRow(quote));

  // 結合して返す
  return BOM + header + '\n' + rows.join('\n');
}

/**
 * CSVファイル名を生成する（quotes_export_YYYYMMDD.csv）
 */
export function generateCsvFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `quotes_export_${year}${month}${day}.csv`;
}
