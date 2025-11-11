import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/quotes/public
 * 公開フレーズを取得（認証不要）
 */
export async function GET(request: NextRequest) {
  try {
    // 未認証ユーザー向けに匿名クライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 公開フレーズを取得（is_public = true）
    // quotes_with_detailsビューは既にdeleted_at IS NULLでフィルター済み
    const { data: quotes, error } = await supabase
      .from('quotes_with_details')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('公開フレーズ取得エラー:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: '公開フレーズの取得に失敗しました',
            details: error.message,
            hint: error.hint,
          },
        },
        { status: 500 }
      );
    }

    // 書籍・SNSユーザー別にグループ化
    const grouped: {
      books: Record<number, any>;
      snsUsers: Record<number, any>;
      others: any[];
    } = {
      books: {},
      snsUsers: {},
      others: [],
    };

    for (const quote of quotes || []) {
      if (quote.source_type === 'BOOK' && quote.book_id) {
        if (!grouped.books[quote.book_id]) {
          grouped.books[quote.book_id] = {
            book: {
              id: quote.book_id,
              title: quote.book_title,
              author: quote.book_author,
              publisher: quote.book_publisher,
              cover_image_url: quote.book_cover_image_url,
            },
            quotes: [],
          };
        }
        grouped.books[quote.book_id].quotes.push({
          id: quote.id,
          text: quote.text,
          page_number: quote.page_number,
          created_at: quote.created_at,
          activities: quote.activity_ids || [],
          tags: quote.tag_ids || [],
        });
      } else if (quote.source_type === 'SNS' && quote.sns_user_id) {
        if (!grouped.snsUsers[quote.sns_user_id]) {
          grouped.snsUsers[quote.sns_user_id] = {
            sns_user: {
              id: quote.sns_user_id,
              platform: quote.sns_platform,
              handle: quote.sns_handle,
              display_name: quote.sns_display_name,
            },
            quotes: [],
          };
        }
        grouped.snsUsers[quote.sns_user_id].quotes.push({
          id: quote.id,
          text: quote.text,
          created_at: quote.created_at,
          activities: quote.activity_ids || [],
          tags: quote.tag_ids || [],
        });
      } else {
        grouped.others.push({
          id: quote.id,
          text: quote.text,
          source_meta: quote.source_meta,
          created_at: quote.created_at,
          activities: quote.activity_ids || [],
          tags: quote.tag_ids || [],
        });
      }
    }

    return NextResponse.json({
      books: Object.values(grouped.books),
      sns_users: Object.values(grouped.snsUsers),
      others: grouped.others,
      total: quotes?.length || 0,
    });
  } catch (error) {
    console.error('予期しないエラー:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      },
      { status: 500 }
    );
  }
}
