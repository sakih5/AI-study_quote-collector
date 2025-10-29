import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 認証成功: リダイレクト先へ
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // エラー時はログイン画面へリダイレクト
  return NextResponse.redirect(`${origin}/login`);
}
