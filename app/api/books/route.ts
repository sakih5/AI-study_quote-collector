import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/books
 * ユーザーの書籍一覧を取得
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

    // 書籍一覧を取得
    let query = supabase
      .from('books')
      .select('id, title, author, cover_image_url, isbn, asin, publisher, publication_date, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // 検索条件を追加
    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    }

    // ページネーション
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: books, error, count } = await query;

    if (error) {
      console.error('書籍取得エラー:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: '書籍の取得に失敗しました',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      books: books || [],
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
 * POST /api/books
 * 新規書籍を登録
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
    const { title, author, cover_image_url, isbn, asin, publisher, publication_date } = body;

    // バリデーション
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'タイトルが必要です' } },
        { status: 400 }
      );
    }

    if (!author || typeof author !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: '著者名が必要です' } },
        { status: 400 }
      );
    }

    // 同じタイトル・著者の書籍が存在しないかチェック
    const { data: existing } = await supabase
      .from('books')
      .select('id')
      .eq('user_id', user.id)
      .eq('title', title)
      .eq('author', author)
      .is('deleted_at', null)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_BOOK',
            message: '同じ書籍が既に登録されています',
          },
        },
        { status: 409 }
      );
    }

    // 書籍を登録
    const { data: book, error } = await supabase
      .from('books')
      .insert({
        user_id: user.id,
        title,
        author,
        cover_image_url: cover_image_url || null,
        isbn: isbn || null,
        asin: asin || null,
        publisher: publisher || null,
        publication_date: publication_date || null,
      })
      .select('id, title, author, cover_image_url, isbn, asin, publisher, publication_date, created_at')
      .single();

    if (error) {
      console.error('書籍登録エラー:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: '書籍の登録に失敗しました',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ book }, { status: 201 });
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
