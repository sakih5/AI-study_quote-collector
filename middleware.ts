import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 1. 最初に一度だけレスポンスを作る
  const response = NextResponse.next({
    request: {
      // headers は新しい Headers に包んで渡すのが無難
      headers: new Headers(request.headers),
    },
  });

  // 2. Supabase クライアント（サーバー用）を作成
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // request 側は触らず、response 側だけに書き込む
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 認証不要のパス
  const publicPaths = ['/login', '/auth/callback', '/api/quotes/public'];
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  // 🔹 ルート ('/') の扱いを明示的に分ける
  //   - 未ログイン → 公開トップ (app/page.tsx) をそのまま表示
  //   - ログイン済み → /my-quotes にリダイレクト
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/my-quotes', request.url));
    }
    // 未ログインならそのままトップページ表示
    return response;
  }

  // 🔹 未認証ユーザーをログインページにリダイレクト（ただし公開パスは除く）
  if (!user && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 🔹 認証済みユーザーがログインページにアクセスした場合は /my-quotes へ
  if (user && pathname.startsWith('/login')) {
    const myQuotesUrl = new URL('/my-quotes', request.url);
    return NextResponse.redirect(myQuotesUrl);
  }

  // ここまで何も該当しなければ、そのまま Next.js に処理を渡す
  return response;
}

export const config = {
  matcher: [
    // _next 配下や画像・favicon 以外すべてを対象にする
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
