import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PUT /api/quotes/:id
 * フレーズを更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const quoteId = parseInt(params.id);
    if (isNaN(quoteId)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ID', message: '無効なフレーズIDです' } },
        { status: 400 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { text, activity_ids, tag_ids } = body;

    // フレーズの存在確認と権限チェック
    const { data: existingQuote } = await supabase
      .from('quotes')
      .select('id')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!existingQuote) {
      return NextResponse.json(
        {
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: 'フレーズが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    // テキストを更新
    if (text) {
      const { error } = await supabase
        .from('quotes')
        .update({ text })
        .eq('id', quoteId)
        .eq('user_id', user.id);

      if (error) {
        console.error('フレーズ更新エラー:', error);
        return NextResponse.json(
          {
            error: {
              code: 'DATABASE_ERROR',
              message: 'フレーズの更新に失敗しました',
            },
          },
          { status: 500 }
        );
      }
    }

    // 活動領域を更新
    if (activity_ids && Array.isArray(activity_ids)) {
      // 既存の活動領域を削除
      await supabase.from('quote_activities').delete().eq('quote_id', quoteId);

      // 新しい活動領域を挿入
      if (activity_ids.length > 0) {
        const activityInserts = activity_ids.map((activity_id: number) => ({
          quote_id: quoteId,
          activity_id,
        }));

        const { error: activityError } = await supabase
          .from('quote_activities')
          .insert(activityInserts);

        if (activityError) {
          console.error('活動領域更新エラー:', activityError);
          return NextResponse.json(
            {
              error: {
                code: 'DATABASE_ERROR',
                message: '活動領域の更新に失敗しました',
              },
            },
            { status: 500 }
          );
        }
      }
    }

    // タグを更新
    if (tag_ids !== undefined && Array.isArray(tag_ids)) {
      // 既存のタグを削除
      await supabase.from('quote_tags').delete().eq('quote_id', quoteId);

      // 新しいタグを挿入
      if (tag_ids.length > 0) {
        const tagInserts = tag_ids.map((tag_id: number) => ({
          quote_id: quoteId,
          tag_id,
        }));

        const { error: tagError } = await supabase
          .from('quote_tags')
          .insert(tagInserts);

        if (tagError) {
          console.error('タグ更新エラー:', tagError);
          return NextResponse.json(
            {
              error: {
                code: 'DATABASE_ERROR',
                message: 'タグの更新に失敗しました',
              },
            },
            { status: 500 }
          );
        }
      }
    }

    // 更新後のフレーズを取得
    const { data: quote } = await supabase
      .from('quotes')
      .select(
        `
        id,
        text,
        source_type,
        page_number,
        created_at,
        updated_at,
        activities:quote_activities(
          activity:activities(id, name, icon)
        ),
        tags:quote_tags(
          tag:tags(id, name)
        )
      `
      )
      .eq('id', quoteId)
      .single();

    return NextResponse.json({ quote });
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

/**
 * DELETE /api/quotes/:id
 * フレーズを削除（ソフトデリート）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const quoteId = parseInt(params.id);
    if (isNaN(quoteId)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ID', message: '無効なフレーズIDです' } },
        { status: 400 }
      );
    }

    // フレーズの存在確認と権限チェック
    const { data: existingQuote } = await supabase
      .from('quotes')
      .select('id')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!existingQuote) {
      return NextResponse.json(
        {
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: 'フレーズが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    // ソフトデリート
    const { error } = await supabase
      .from('quotes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', quoteId)
      .eq('user_id', user.id);

    if (error) {
      console.error('フレーズ削除エラー:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'フレーズの削除に失敗しました',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
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
