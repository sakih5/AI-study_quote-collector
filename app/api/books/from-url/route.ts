import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchBookInfo, isAmazonUrl, expandShortUrl } from '@/lib/scraping/amazon';

/**
 * POST /api/books/from-url
 *
 * Amazon URLから書籍情報を取得
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: { message: '認証が必要です' } }, { status: 401 });
    }

    // リクエストボディを取得
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: { message: 'URLが指定されていません' } },
        { status: 400 }
      );
    }

    // Amazon URLかチェック
    if (!isAmazonUrl(url)) {
      return NextResponse.json(
        { error: { message: 'Amazon URLではありません' } },
        { status: 400 }
      );
    }

    // 短縮URLの場合は展開
    let fullUrl = url;
    if (url.includes('amzn.to')) {
      fullUrl = await expandShortUrl(url);
    }

    // 書籍情報を取得
    const bookInfo = await fetchBookInfo(fullUrl);

    if (!bookInfo) {
      return NextResponse.json(
        { error: { message: '書籍情報の取得に失敗しました' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ book_info: bookInfo }, { status: 200 });
  } catch (error) {
    console.error('Error fetching book info:', error);
    return NextResponse.json(
      { error: { message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    );
  }
}
