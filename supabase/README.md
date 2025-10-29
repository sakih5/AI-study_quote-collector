# Supabase セットアップ手順

## 1. Supabaseプロジェクトの作成

1. <https://supabase.com> にアクセス
2. 「Start your project」をクリック
3. 新しいプロジェクトを作成:
   - Organization: 既存または新規作成
   - Name: `quote-collector`（任意）
   - Database Password: 安全なパスワードを設定（記録しておく）
   - Region: `Northeast Asia (Tokyo)`（推奨）
   - Pricing Plan: `Free`（開発用）

## 2. プロジェクト情報の取得

プロジェクトが作成されたら、以下の情報を取得します：

1. サイドバーの「Settings」→「API」をクリック
2. 以下の情報をコピー:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJxxx...`

※補足 現在の画面上からは「API」は無くなっている。代わりに以下を参照すること

Project URL: サイドバーの「Data API」 > 画面右側にある「API Settings」 > Project URL
anon public key: サイドバーの「API Keys」 > 画面右側にある「Legacy API Keys」 > anon public

## 3. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成:

```bash
cp .env.example .env.local
```

`.env.local` を編集して、取得した情報を設定:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

## 4. データベーススキーマの適用

### 方法1: Supabase Dashboard（推奨）

1. Supabaseダッシュボードで「SQL Editor」を開く
2. `supabase/migrations/20241027000000_initial_schema.sql` の内容をコピー
3. SQLエディタに貼り付けて「Run」をクリック
4. エラーがなければ完了！

### 方法2: Supabase CLI（ローカル開発用）

```bash
# Supabase CLIをインストール（未インストールの場合）
npm install -g supabase

# Supabaseプロジェクトにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref <your-project-ref>

# マイグレーションを適用
supabase db push
```

## 5. 認証プロバイダーの設定

= SNSログインを組み込むための下準備

1. Supabaseダッシュボードで「Authentication」→「Sign In /Providers」を開く
2. Supabase Auth > User Signups で以下のように設定:

   - Allow new users to sign up: ON
   - Confirm email: OFF（開発時のみ。本番ではONにする）

3. Supabase Auth > Auth Providers で以下のように設定:

   - **Email**:

      - Auth providersのEmailを選択
      - 以下のように設定:

         - Enable Email provider: ON
         - Allow new users to sign up: ON
         - Confirm email: OFF（開発時のみ。本番ではONにする）

         → これでメールアドレス＋パスワードによるサインアップ/ログインが有効になる

   - **Google**: （オプション）Client IDとSecretを設定

      - Auth providersのGoogleを選択
      - 以下のように設定

         - Enable Sign in with Google: ON
         - Client IDs: Google Cloudで作成したものを入力※
         - Client Secret (for OAuth): Google Cloudで作成したものを入力※
         - Allow users without an email: ON（開発時のみ。本番ではOFFにする）

         → これでGoogleアカウントによるサインアップ/ログインが有効になる

   - **GitHub**: （オプション）Client IDとSecretを設定

      - Auth providersのGithubを選択
      - 以下のように設定

         - Enable Sign in with Github: ON
         - Client IDs: Githubで作成したものを入力※
         - Client Secret (for OAuth): Githubで作成したものを入力※
         - Allow users without an email: ON（開発時のみ。本番ではOFFにする）

         → これでGithubアカウントによるサインアップ/ログインが有効になる

※補足 Google Cloud Consoleから「Client ID」「Client Secret」を取得する方法

1. Google Cloud Consoleにアクセス
2. `quote-collector`用のプロジェクトを作成または選択
3. 左メニューから「OAuth同意画面」を開き、「開始」ボタンをクリック → OAuth同意画面の設定から始まる
4. 以下のように設定:

   - アプリケーションの種類: ウェブアプリケーション
   - 名前: Supabase OAuth
   - 承認済みのリダイレクトURI: `https://<あなたのプロジェクト名>.supabase.co/auth/v1/callback`（Supabaseに戻ってプロジェクトIDを取得）

5. 「作成」ボタンを押すと、クライアントID・クライアントシークレットが発行される

※補足 Githubから「Client ID」「Client Secret」を取得する方法

1. Githubにアクセス
2. Settings > サイドバーの最下部「Developer settings」 > サイドバー「OAuth Apps」→「New OAuth App」ボタンを押す
3. 以下のように設定:

   - Application name: quote-collector
   - Homepage URL: `https://<あなたのSupabaseプロジェクト名>.supabase.co`
   - Authorization callback URL: `https://<あなたのSupabaseプロジェクト名>.supabase.co/auth/v1/callback`

4. 設定して作成が完了すると、

   - Client ID：すぐに表示される
   - Client Secret：一度しか表示されないので「Generate a new client secret」を押してコピーしておく

### Site URLの設定

「Authentication」→「URL Configuration」で以下を設定:

- **Site URL**:
  - 開発環境: `http://localhost:3000`
  - 本番環境: `https://your-app.vercel.app`
- **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `https://your-app.vercel.app/auth/callback`

※補足 本番URLはデプロイ後作成して追記する（今は空欄で進める）

## 6. 動作確認

以下のクエリをSQL Editorで実行して、スキーマが正しく作成されたか確認:

```sql
-- テーブル一覧
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 活動領域マスタデータの確認
SELECT * FROM activities ORDER BY display_order;
```

以下が表示されれば成功:

- activities（10件のデータ）
- books
- sns_users
- tags
- quotes
- quote_activities
- quote_tags
- quote_with_details

## 7. RLSポリシーの確認

```sql
-- RLSが有効になっているか確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
```

RLSとはデータベースの行レベルのアクセス制御機能のこと
RLSを有効にしておくことで、自分が登録したデータしか見れないようにできる

以下が表示されれば成功
※activitiesは属人性が無いため、rowsecurityはfalseで設定されている

| tablename        | rowsecurity |
| ---------------- | ----------- |
| books            | true        |
| sns_users        | true        |
| tags             | true        |
| quotes           | true        |
| quote_activities | true        |
| quote_tags       | true        |

## トラブルシューティング

### エラー: text search configuration "japanese" does not exist

→ Supabaseのデフォルト設定には日本語用の全文検索設定が含まれていません。
   マイグレーションファイルは既に `'simple'` 設定に修正済みです。
   より高度な日本語検索が必要な場合は、`pg_bigm` 拡張の使用を検討してください。

### エラー: relation "auth.users" does not exist

→ Supabaseの認証機能が有効になっていることを確認してください。

### エラー: permission denied

→ RLSポリシーが正しく設定されているか確認してください。

### マイグレーションをリセットしたい場合

```sql
-- 全テーブルを削除（注意：データも削除されます）
DROP VIEW IF EXISTS quotes_with_details;
DROP TABLE IF EXISTS quote_tags CASCADE;
DROP TABLE IF EXISTS quote_activities CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS sns_users CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

その後、再度マイグレーションSQLを実行してください。
