import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/quotes/grouped
 * フレーズ一覧を取得（グループ化あり）
 *
 * 書籍単位・SNSユーザー単位でグループ化してフレーズを返す
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const source_type = searchParams.get('source_type') || '';
    const activity_ids = searchParams.get('activity_ids') || '';
    const tag_ids = searchParams.get('tag_ids') || '';

    // フレーズを取得（フィルター条件付き）
    let quotesQuery = supabase
      .from('quotes')
      .select(
        `
        id,
        text,
        source_type,
        book_id,
        sns_user_id,
        page_number,
        source_meta,
        created_at,
        books(id, title, author, cover_image_url),
        sns_users(id, platform, handle, display_name),
        quote_activities(
          activities(id, name, icon)
        ),
        quote_tags(
          tags(id, name)
        )
      `
      )
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // 検索条件
    if (search) {
      quotesQuery = quotesQuery.ilike('text', `%${search}%`);
    }

    // 出典タイプフィルター
    if (source_type) {
      quotesQuery = quotesQuery.eq('source_type', source_type);
    }

    // 並び順
    quotesQuery = quotesQuery.order('created_at', { ascending: false });

    const { data: quotes, error: quotesError } = await quotesQuery;

    if (quotesError) {
      console.error('フレーズ取得エラー:', quotesError);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'フレーズの取得に失敗しました',
          },
        },
        { status: 500 }
      );
    }

    if (!quotes) {
      return NextResponse.json({
        items: [],
        total: 0,
        has_more: false,
      });
    }

    // 活動領域フィルター（クライアント側で実施）
    let filteredQuotes = quotes;
    if (activity_ids) {
      const activityIdArray = activity_ids.split(',').map((id) => parseInt(id));
      filteredQuotes = filteredQuotes.filter((quote: any) => {
        const quoteActivityIds = quote.quote_activities.map(
          (qa: any) => qa.activities.id
        );
        return activityIdArray.some((id) => quoteActivityIds.includes(id));
      });
    }

    // タグフィルター（クライアント側で実施）
    if (tag_ids) {
      const tagIdArray = tag_ids.split(',').map((id) => parseInt(id));
      filteredQuotes = filteredQuotes.filter((quote: any) => {
        const quoteTagIds = quote.quote_tags.map((qt: any) => qt.tags.id);
        return tagIdArray.some((id) => quoteTagIds.includes(id));
      });
    }

    // グループ化処理
    const groupedItems: any[] = [];

    // 書籍単位でグループ化
    const bookGroups = new Map<number, any[]>();
    filteredQuotes.forEach((quote: any) => {
      if (quote.source_type === 'BOOK' && quote.book_id) {
        if (!bookGroups.has(quote.book_id)) {
          bookGroups.set(quote.book_id, []);
        }
        bookGroups.get(quote.book_id)!.push(quote);
      }
    });

    bookGroups.forEach((quotes, bookId) => {
      const firstQuote = quotes[0];
      groupedItems.push({
        type: 'book',
        book: firstQuote.books,
        quotes: quotes.map((q: any) => ({
          id: q.id,
          text: q.text,
          page_number: q.page_number,
          activities: q.quote_activities.map((qa: any) => qa.activities),
          tags: q.quote_tags.map((qt: any) => qt.tags),
          created_at: q.created_at,
        })),
      });
    });

    // SNSユーザー単位でグループ化
    const snsGroups = new Map<number, any[]>();
    filteredQuotes.forEach((quote: any) => {
      if (quote.source_type === 'SNS' && quote.sns_user_id) {
        if (!snsGroups.has(quote.sns_user_id)) {
          snsGroups.set(quote.sns_user_id, []);
        }
        snsGroups.get(quote.sns_user_id)!.push(quote);
      }
    });

    snsGroups.forEach((quotes, snsUserId) => {
      const firstQuote = quotes[0];
      groupedItems.push({
        type: 'sns',
        sns_user: firstQuote.sns_users,
        quotes: quotes.map((q: any) => ({
          id: q.id,
          text: q.text,
          activities: q.quote_activities.map((qa: any) => qa.activities),
          tags: q.quote_tags.map((qt: any) => qt.tags),
          created_at: q.created_at,
        })),
      });
    });

    // その他のフレーズ（グループ化なし）
    filteredQuotes.forEach((quote: any) => {
      if (quote.source_type === 'OTHER') {
        groupedItems.push({
          type: 'other',
          quote: {
            id: quote.id,
            text: quote.text,
            source_meta: quote.source_meta,
            activities: quote.quote_activities.map((qa: any) => qa.activities),
            tags: quote.quote_tags.map((qt: any) => qt.tags),
            created_at: quote.created_at,
          },
        });
      }
    });

    // ページネーション適用
    const paginatedItems = groupedItems.slice(offset, offset + limit);

    return NextResponse.json({
      items: paginatedItems,
      total: groupedItems.length,
      has_more: offset + limit < groupedItems.length,
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
