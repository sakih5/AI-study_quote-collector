import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/sns-users
 * ユーザーのSNSユーザー一覧を取得
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
    const platform = searchParams.get('platform') || '';
    const search = searchParams.get('search') || '';

    // SNSユーザー一覧を取得
    let query = supabase
      .from('sns_users')
      .select('id, platform, handle, display_name, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // プラットフォームフィルター
    if (platform) {
      query = query.eq('platform', platform);
    }

    // 検索条件を追加
    if (search) {
      query = query.or(`handle.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    // ページネーション
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: sns_users, error, count } = await query;

    if (error) {
      console.error('SNSユーザー取得エラー:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'SNSユーザーの取得に失敗しました',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sns_users: sns_users || [],
      total: count || 0,
      has_more: count ? offset + limit < count : false,
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
 * POST /api/sns-users
 * 新規SNSユーザーを登録
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
    const { platform, handle, display_name } = body;

    // バリデーション
    if (!platform || !['X', 'THREADS'].includes(platform)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: 'プラットフォームはXまたはTHREADSである必要があります',
          },
        },
        { status: 400 }
      );
    }

    if (!handle || typeof handle !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'ハンドルが必要です' } },
        { status: 400 }
      );
    }

    if (!display_name || typeof display_name !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: '表示名が必要です' } },
        { status: 400 }
      );
    }

    // 同じプラットフォーム・ハンドルのユーザーが存在しないかチェック
    const { data: existing } = await supabase
      .from('sns_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('handle', handle)
      .is('deleted_at', null)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_SNS_USER',
            message: '同じSNSユーザーが既に登録されています',
          },
        },
        { status: 409 }
      );
    }

    // SNSユーザーを登録
    const { data: sns_user, error } = await supabase
      .from('sns_users')
      .insert({
        user_id: user.id,
        platform,
        handle,
        display_name,
      })
      .select('id, platform, handle, display_name, created_at')
      .single();

    if (error) {
      console.error('SNSユーザー登録エラー:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'SNSユーザーの登録に失敗しました',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ sns_user }, { status: 201 });
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
