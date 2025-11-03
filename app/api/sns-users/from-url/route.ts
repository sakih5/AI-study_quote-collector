import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseSnsUrl, isSnsUrl } from '@/lib/scraping/sns-url-parser';
import { fetchSnsUserInfo } from '@/lib/scraping/google-search';

/**
 * POST /api/sns-users/from-url
 *
 * SNS URLからユーザー情報を取得
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

    // SNS URLかチェック
    if (!isSnsUrl(url)) {
      return NextResponse.json(
        { error: { message: 'サポートされているSNS URLではありません（X, Threadsのみ対応）' } },
        { status: 400 }
      );
    }

    // URLを解析
    const parsed = parseSnsUrl(url);

    if (!parsed) {
      return NextResponse.json(
        { error: { message: 'URL の解析に失敗しました' } },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const userInfo = await fetchSnsUserInfo(parsed.platform, parsed.handle);

    if (!userInfo) {
      return NextResponse.json(
        { error: { message: 'ユーザー情報の取得に失敗しました' } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        user_info: {
          platform: userInfo.platform,
          handle: userInfo.handle,
          display_name: userInfo.display_name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching SNS user info:', error);
    return NextResponse.json(
      { error: { message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    );
  }
}
