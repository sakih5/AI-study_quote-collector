import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/tags
 * ユーザーのタグ一覧を取得
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
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const search = searchParams.get('search') || '';

    // タグ一覧を取得
    let query = supabase
      .from('tags')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // 検索条件を追加
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // ソート条件を追加
    const ascending = order === 'asc';
    if (sort === 'name') {
      query = query.order('name', { ascending });
    } else {
      query = query.order('created_at', { ascending });
    }

    const { data: tags, error } = await query;

    if (error) {
      console.error('タグ取得エラー:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'タグの取得に失敗しました',
          },
        },
        { status: 500 }
      );
    }

    // 各タグの使用数と活動領域別分布を取得
    const tagsWithMetadata = await Promise.all(
      tags.map(async (tag) => {
        // 使用数を取得
        const { count } = await supabase
          .from('quote_tags')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', tag.id);

        // 活動領域別分布を取得
        const { data: distribution } = await supabase
          .from('quote_tags')
          .select(
            `
            quote_id,
            quotes!inner (
              quote_activities!inner (
                activity_id
              )
            )
          `
          )
          .eq('tag_id', tag.id);

        // 活動領域別にカウント
        const activityDistribution: Record<number, number> = {};
        distribution?.forEach((item: any) => {
          item.quotes.quote_activities.forEach((qa: any) => {
            const activityId = qa.activity_id;
            activityDistribution[activityId] =
              (activityDistribution[activityId] || 0) + 1;
          });
        });

        return {
          ...tag,
          usage_count: count || 0,
          activity_distribution: activityDistribution,
        };
      })
    );

    // usage_countでソートする場合
    if (sort === 'usage_count') {
      tagsWithMetadata.sort((a, b) => {
        return ascending
          ? a.usage_count - b.usage_count
          : b.usage_count - a.usage_count;
      });
    }

    return NextResponse.json({
      tags: tagsWithMetadata,
      total: tagsWithMetadata.length,
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

/**
 * POST /api/tags
 * 新規タグを作成
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

    // 同名のアクティブなタグが存在しないかチェック
    const { data: activeTag } = await supabase
      .from('tags')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', tagName)
      .is('deleted_at', null)
      .single();

    if (activeTag) {
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

    // 同名の削除済みタグがあるかチェック
    const { data: deletedTag } = await supabase
      .from('tags')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .eq('name', tagName)
      .not('deleted_at', 'is', null)
      .single();

    let tag;
    let error;

    if (deletedTag) {
      // 削除済みタグを復活させる
      const result = await supabase
        .from('tags')
        .update({ deleted_at: null })
        .eq('id', deletedTag.id)
        .select('id, name, created_at')
        .single();

      tag = result.data;
      error = result.error;
    } else {
      // 新しいタグを作成
      const result = await supabase
        .from('tags')
        .insert({
          user_id: user.id,
          name: tagName,
        })
        .select('id, name, created_at')
        .single();

      tag = result.data;
      error = result.error;
    }

    if (error) {
      console.error('タグ作成エラー:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'タグの作成に失敗しました',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ tag }, { status: 201 });
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
