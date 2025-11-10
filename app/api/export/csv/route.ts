import { createClient } from '@/lib/supabase/server';
import {
  generateCsvFromQuotes,
  generateCsvFilename,
  QuoteForExport,
} from '@/lib/utils/csv-export';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/export/csv
 * フレーズをCSV形式でエクスポートする
 *
 * クエリパラメータ:
 * - search: 検索キーワード（フレーズテキスト）
 * - source_type: 出典タイプ（BOOK, SNS, OTHER）
 * - activity_ids: 活動領域ID（カンマ区切り）
 * - tag_ids: タグID（カンマ区切り）
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

    // 並び順（登録日時の降順）
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

    // 活動領域フィルター（クライアント側で実施）
    let filteredQuotes = quotes;

    if (activity_ids) {
      const activityIdsArray = activity_ids.split(',').map((id) => parseInt(id.trim()));

      filteredQuotes = filteredQuotes.filter((quote) => {
        const quoteActivityIds =
          quote.quote_activities?.map((qa) => (qa.activities as unknown as { id: number }).id) || [];

        // すべての指定された活動領域がフレーズに含まれているかチェック（AND条件）
        return activityIdsArray.every((activityId) =>
          quoteActivityIds.includes(activityId)
        );
      });
    }

    // タグフィルター（クライアント側で実施）
    if (tag_ids) {
      const tagIdsArray = tag_ids.split(',').map((id) => parseInt(id.trim()));

      filteredQuotes = filteredQuotes.filter((quote) => {
        const quoteTagIds = quote.quote_tags?.map((qt) => (qt.tags as unknown as { id: number }).id) || [];

        // すべての指定されたタグがフレーズに含まれているかチェック（AND条件）
        return tagIdsArray.every((tagId) => quoteTagIds.includes(tagId));
      });
    }

    // CSV生成
    const csvContent = generateCsvFromQuotes(filteredQuotes as QuoteForExport[]);
    const filename = generateCsvFilename();

    // CSVレスポンスを返す
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('CSVエクスポートエラー:', error);
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
