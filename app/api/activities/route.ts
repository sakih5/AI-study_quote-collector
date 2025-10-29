import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/activities
 * 活動領域一覧を取得（システム固定の10個）
 */
export async function GET() {
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

    // 活動領域一覧を取得（display_order順）
    const { data: activities, error } = await supabase
      .from('activities')
      .select('id, name, description, icon, display_order')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('活動領域取得エラー:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: '活動領域の取得に失敗しました',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ activities });
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
