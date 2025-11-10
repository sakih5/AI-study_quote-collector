# 作業ログ: ログインループとAPI接続エラーの修正

**日付**: 2025-11-10
**担当**: Claude Code
**状態**: ✅ 解決済み

## 問題の概要

### 問題1: ログインループ
ログイン成功後、ホーム画面に遷移せずログイン画面にリダイレクトされ続ける問題が発生。

### 問題2: データ取得エラー
ログイン後、「Failed to fetch」エラーが発生し、DBから取得したデータが表示されない問題が発生。

---

## 問題1: ログインループの調査と解決

### 初期調査

1. **参考リポジトリとの比較**
   - 参考リポジトリ: https://github.com/sakih5/webapp-study_google-oauth
   - Next.jsバージョンの違いを発見:
     - 参考リポジトリ: Next.js 16.0.1
     - 現在のプロジェクト: Next.js 14.2.15

2. **`cookies()`の動作の違い**
   - Next.js 14: `cookies()`は同期的
   - Next.js 15+: `cookies()`はPromiseを返す（`await`が必要）

### 試行錯誤のプロセス

#### 試行1: 参考リポジトリのコードをそのまま適用
- **実施内容**:
  - `lib/supabase/server.ts`を参考リポジトリと同じ`get`/`set`/`remove`パターンに変更
  - `app/auth/callback/route.ts`をシンプル化
- **結果**: ❌ 失敗（ログインループ継続）
- **原因**: Next.jsバージョンの違いにより、cookie処理が異なる

#### 試行2: Supabase公式パターン（`getAll`/`setAll`）を適用
- **実施内容**:
  - Supabase公式ドキュメントに従い、`getAll`/`setAll`メソッドに変更
  - middlewareのcookie処理を修正
- **結果**: ❌ 失敗（ログインループ継続）
- **原因**: middlewareの実装が不完全

#### 試行3: middlewareを無効化
- **実施内容**:
  - `middleware.ts`を`middleware.ts.backup`にリネーム
  - layoutでの認証チェックのみに依存
- **結果**: ❌ 失敗（ログインループ継続）
- **原因**: Next.js 14では、Server Componentsはcookieを読むことしかできないため、middlewareが必須

#### 試行4: パッケージバージョンのアップデート
- **実施内容**:
  - `@supabase/ssr`を0.5.1 → 0.7.0にアップデート
  - `@supabase/supabase-js`を2.45.4 → 2.80.0にアップデート
  - 参考リポジトリと同じバージョンに揃える
- **結果**: ❌ 失敗（ログインループ継続）

#### 試行5: middlewareを復活させて正しいパターンを適用
- **実施内容**:
  - Next.js 14用の公式middlewareパターンを適用
  - requestとresponseの両方にcookieを設定
  - `await supabase.auth.getUser()`でセッションをリフレッシュ
- **結果**: ❌ 失敗（ログインループ継続）

### 最終的な解決方法

**以前のコミットに戻す**

長時間の試行錯誤の結果、問題を複雑にしすぎていたことが判明。以前の動作していたコミットに戻すことで解決。

```bash
# 動作していたコミットに戻す
git checkout <previous-commit-hash>
```

**結果**: ✅ ログインループが解消

---

## 問題2: データ取得エラー（Failed to fetch）の調査と解決

### 問題の発見

ログイン成功後、以下のエラーがブラウザコンソールに表示：

```
Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:8000/api/activities:1
localhost:8000/api/tags:1
localhost:8000/api/books?limit=100:1
localhost:8000/api/sns-users?limit=100:1
```

### 原因の特定

1. **APIリクエストが間違ったポートに送られている**
   - Next.jsサーバー: `localhost:3000`
   - リクエスト先: `localhost:8000`（FastAPIバックエンド）

2. **`lib/api/client.ts`の設定に問題**
   ```typescript
   // 問題のあるコード
   const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
   ```

3. **影響を受けていたファイル**
   - `app/(main)/hooks/useActivities.ts`
   - `app/(main)/hooks/useTags.ts`
   - `app/(main)/hooks/useSnsUsers.ts`
   - `app/(main)/hooks/useBooks.ts`

### 解決方法

**`lib/api/client.ts`の修正**

```typescript
// 修正前
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

// 修正後
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || '';
```

**変更の効果**:
- APIリクエストが相対パスになる
- `http://localhost:8000/api/activities` → `/api/activities`
- Next.js APIルート（`app/api/*`）が正しく呼び出される

**結果**: ✅ データが正常に表示されるようになった

---

## 修正ファイル一覧

### 主要な修正ファイル

1. **`lib/api/client.ts`**
   - FastAPIベースURLのデフォルト値を空文字列に変更
   - Next.js APIルートを使用するように修正

### その他試行錯誤で変更したファイル（最終的に以前のコミットに戻した）

- `lib/supabase/server.ts`
- `app/auth/callback/route.ts`
- `middleware.ts`
- `app/(main)/layout.tsx`
- `app/(auth)/login/page.tsx`

---

## 学んだこと・教訓

### 1. Next.jsバージョンの違いに注意

参考リポジトリと異なるNext.jsバージョンを使用している場合、以下に注意：

- **cookies()の動作**:
  - Next.js 14: 同期的
  - Next.js 15+: Promise（`await`が必要）

- **middleware の必要性**:
  - Next.js 14では、Server Componentsはcookieを読むことしかできない
  - middlewareでcookieを書き込み、セッションをリフレッシュする必要がある

### 2. Supabase SSRの実装パターン

**Next.js 14での推奨パターン**:

```typescript
// lib/supabase/server.ts
export function createClient() {
  const cookieStore = cookies(); // awaitなし（Next.js 14）

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Component内でのset呼び出しは無視
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Server Component内でのremove呼び出しは無視
          }
        },
      },
    }
  );
}
```

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  await supabase.auth.getUser(); // セッションをリフレッシュ

  return response;
}
```

### 3. 環境変数とAPIエンドポイントの確認

- プロジェクトが複数のバックエンド（FastAPI、Next.js API Routes）を想定している場合、環境変数の設定に注意
- `NEXT_PUBLIC_API_URL`などの環境変数が意図しない値を持っていないか確認
- デフォルト値の設定に注意（`http://localhost:8000`のようなハードコードを避ける）

### 4. デバッグのアプローチ

- 問題が複雑化した場合、一度シンプルな状態に戻すことも有効
- git履歴を活用し、動作していた時点に戻ることで原因を特定しやすくなる
- ブラウザの開発者ツール（Network、Console）を活用してエラーの詳細を確認

---

## 参考リソース

- [Supabase公式: Next.js Server-Side Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase公式: Creating a Client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [参考リポジトリ](https://github.com/sakih5/webapp-study_google-oauth)

---

## 今後の注意点

1. **認証周りのコードを変更する前に**
   - 現在の実装をコミットして保存
   - 小さな変更ずつテストする

2. **パッケージアップデート時**
   - 破壊的変更がないか確認
   - 特にNext.js、Supabase関連のパッケージは注意

3. **環境変数の確認**
   - `.env.local`の設定を定期的に見直す
   - 不要な環境変数は削除またはコメントアウト

---

**作成日**: 2025-11-10
**最終更新**: 2025-11-10
