import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tags/:id/merge
 * タグを統合
 *
 * 指定したタグ（:id）を target_tag_id に統合します。
 * - source（:id）を使用していたすべてのフレーズが target に変更される
 * - source タグは削除される
 */
export async function POST(
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

    const sourceTagId = parseInt(params.id);
    if (isNaN(sourceTagId)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ID', message: '無効なタグIDです' } },
        { status: 400 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { target_tag_id } = body;

    // バリデーション
    if (!target_tag_id || typeof target_tag_id !== 'number') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: '統合先のタグIDが必要です',
          },
        },
        { status: 400 }
      );
    }

    if (sourceTagId === target_tag_id) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: '同じタグ同士を統合することはできません',
          },
        },
        { status: 400 }
      );
    }

    // sourceタグの存在確認と権限チェック
    const { data: sourceTag } = await supabase
      .from('tags')
      .select('id, name')
      .eq('id', sourceTagId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!sourceTag) {
      return NextResponse.json(
        {
          error: {
            code: 'TAG_NOT_FOUND',
            message: '統合元のタグが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    // targetタグの存在確認と権限チェック
    const { data: targetTag } = await supabase
      .from('tags')
      .select('id, name')
      .eq('id', target_tag_id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!targetTag) {
      return NextResponse.json(
        {
          error: {
            code: 'TAG_NOT_FOUND',
            message: '統合先のタグが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    // sourceタグが使用されているquote_tagsを取得
    const { data: sourceQuoteTags } = await supabase
      .from('quote_tags')
      .select('quote_id')
      .eq('tag_id', sourceTagId);

    // sourceタグをtargetタグに置き換え
    // 重複を避けるため、ON CONFLICT DO NOTHINGの代わりにチェックして更新
    let mergedCount = 0;
    if (sourceQuoteTags && sourceQuoteTags.length > 0) {
      for (const quoteTag of sourceQuoteTags) {
        // targetタグが既に存在するかチェック
        const { data: existing } = await supabase
          .from('quote_tags')
          .select('quote_id')
          .eq('quote_id', quoteTag.quote_id)
          .eq('tag_id', target_tag_id)
          .single();

        if (!existing) {
          // 存在しない場合は更新
          const { error: updateError } = await supabase
            .from('quote_tags')
            .update({ tag_id: target_tag_id })
            .eq('quote_id', quoteTag.quote_id)
            .eq('tag_id', sourceTagId);

          if (!updateError) {
            mergedCount++;
          }
        } else {
          // 既に存在する場合はsourceを削除
          await supabase
            .from('quote_tags')
            .delete()
            .eq('quote_id', quoteTag.quote_id)
            .eq('tag_id', sourceTagId);
        }
      }
    }

    // sourceタグを削除（ソフトデリート）
    await supabase
      .from('tags')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', sourceTagId)
      .eq('user_id', user.id);

    // targetタグの使用数を取得
    const { count } = await supabase
      .from('quote_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', target_tag_id);

    return NextResponse.json({
      success: true,
      merged_count: mergedCount,
      target_tag: {
        id: targetTag.id,
        name: targetTag.name,
        usage_count: count || 0,
      },
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
