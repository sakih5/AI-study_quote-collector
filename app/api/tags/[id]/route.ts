import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PUT /api/tags/:id
 * タグ名を変更
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

    const tagId = parseInt(params.id);
    if (isNaN(tagId)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ID', message: '無効なタグIDです' } },
        { status: 400 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { name } = body;

    // バリデーション
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'タグ名が必要です' } },
        { status: 400 }
      );
    }

    // タグ名が#で始まっていない場合は追加
    const tagName = name.startsWith('#') ? name : `#${name}`;

    // タグの存在確認と権限チェック
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id')
      .eq('id', tagId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!existingTag) {
      return NextResponse.json(
        {
          error: {
            code: 'TAG_NOT_FOUND',
            message: 'タグが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    // 同名の別タグが存在しないかチェック
    const { data: duplicate } = await supabase
      .from('tags')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', tagName)
      .neq('id', tagId)
      .is('deleted_at', null)
      .single();

    if (duplicate) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_TAG',
            message: '同じ名前のタグが既に存在します',
          },
        },
        { status: 409 }
      );
    }

    // タグ名を更新
    const { data: tag, error } = await supabase
      .from('tags')
      .update({ name: tagName })
      .eq('id', tagId)
      .eq('user_id', user.id)
      .select('id, name, updated_at')
      .single();

    if (error) {
      console.error('タグ更新エラー:', error);
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

    return NextResponse.json({ tag });
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
 * DELETE /api/tags/:id
 * タグを削除（ソフトデリート）
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

    const tagId = parseInt(params.id);
    if (isNaN(tagId)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ID', message: '無効なタグIDです' } },
        { status: 400 }
      );
    }

    // タグの存在確認と権限チェック
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id')
      .eq('id', tagId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!existingTag) {
      return NextResponse.json(
        {
          error: {
            code: 'TAG_NOT_FOUND',
            message: 'タグが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    // まず、quote_tagsテーブルから関連レコードを削除
    const { error: quoteTagsError } = await supabase
      .from('quote_tags')
      .delete()
      .eq('tag_id', tagId);

    if (quoteTagsError) {
      console.error('quote_tags削除エラー:', quoteTagsError);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'タグの関連データの削除に失敗しました',
          },
        },
        { status: 500 }
      );
    }

    // ソフトデリート（deleted_atに現在時刻を設定）
    const { error } = await supabase
      .from('tags')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', tagId)
      .eq('user_id', user.id);

    if (error) {
      console.error('タグ削除エラー:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'タグの削除に失敗しました',
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
