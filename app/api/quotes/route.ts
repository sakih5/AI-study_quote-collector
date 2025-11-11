import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/quotes
 * フレーズを登録（一括登録対応）
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
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { quotes, source_type, book_id, sns_user_id, source_meta, page_number, is_public } = body;

    // バリデーション
    if (!quotes || !Array.isArray(quotes) || quotes.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: 'quotesが必要です（配列形式）',
          },
        },
        { status: 400 }
      );
    }

    if (!source_type || !['BOOK', 'SNS', 'OTHER'].includes(source_type)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: 'source_typeはBOOK, SNS, OTHERのいずれかである必要があります',
          },
        },
        { status: 400 }
      );
    }

    // source_typeに応じた外部キーの検証
    if (source_type === 'BOOK' && !book_id) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: 'source_typeがBOOKの場合、book_idが必要です',
          },
        },
        { status: 400 }
      );
    }

    if (source_type === 'SNS' && !sns_user_id) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: 'source_typeがSNSの場合、sns_user_idが必要です',
          },
        },
        { status: 400 }
      );
    }

    // 各フレーズを登録
    const createdQuotes = [];

    for (const quoteData of quotes) {
      const { text, activity_ids, tag_ids } = quoteData;

      // テキストのバリデーション
      if (!text || typeof text !== 'string') {
        return NextResponse.json(
          { error: { code: 'INVALID_INPUT', message: 'フレーズのtextが必要です' } },
          { status: 400 }
        );
      }

      // 活動領域のバリデーション
      if (!activity_ids || !Array.isArray(activity_ids) || activity_ids.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_INPUT',
              message: '少なくとも1つの活動領域を指定してください',
            },
          },
          { status: 400 }
        );
      }

      // フレーズを登録
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          text,
          source_type,
          book_id: source_type === 'BOOK' ? book_id : null,
          sns_user_id: source_type === 'SNS' ? sns_user_id : null,
          page_number: page_number || null,
          source_meta: source_type === 'OTHER' ? source_meta : null,
          is_public: is_public || false,
        })
        .select('id, text, source_type, page_number, created_at')
        .single();

      if (quoteError) {
        console.error('フレーズ登録エラー:', quoteError);
        return NextResponse.json(
          {
            error: {
              code: 'DATABASE_ERROR',
              message: 'フレーズの登録に失敗しました',
            },
          },
          { status: 500 }
        );
      }

      // 活動領域を関連付け
      const activityInserts = activity_ids.map((activity_id: number) => ({
        quote_id: quote.id,
        activity_id,
      }));

      const { error: activityError } = await supabase
        .from('quote_activities')
        .insert(activityInserts);

      if (activityError) {
        console.error('活動領域関連付けエラー:', activityError);
        // 登録済みのフレーズを削除（ロールバック）
        await supabase.from('quotes').delete().eq('id', quote.id);
        return NextResponse.json(
          {
            error: {
              code: 'DATABASE_ERROR',
              message: '活動領域の関連付けに失敗しました',
            },
          },
          { status: 500 }
        );
      }

      // タグを関連付け
      if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
        const tagInserts = tag_ids.map((tag_id: number) => ({
          quote_id: quote.id,
          tag_id,
        }));

        const { error: tagError } = await supabase
          .from('quote_tags')
          .insert(tagInserts);

        if (tagError) {
          console.error('タグ関連付けエラー:', tagError);
          // 登録済みのフレーズと活動領域を削除（ロールバック）
          await supabase.from('quote_activities').delete().eq('quote_id', quote.id);
          await supabase.from('quotes').delete().eq('id', quote.id);
          return NextResponse.json(
            {
              error: {
                code: 'DATABASE_ERROR',
                message: 'タグの関連付けに失敗しました',
              },
            },
            { status: 500 }
          );
        }
      }

      createdQuotes.push(quote);
    }

    return NextResponse.json(
      {
        quotes: createdQuotes,
        created_count: createdQuotes.length,
      },
      { status: 201 }
    );
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
