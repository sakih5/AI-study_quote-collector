# 開発再開クイックスタート

次回作業を開始する際の手順です。

---

## 1. 開発サーバーの起動

```bash
cd /home/sakih/projects/AI-study_quote-collector
npm run dev
```

✅ ブラウザで http://localhost:3000 にアクセスして確認

---

## 2. 現在の状態を確認

### 進捗状況を確認
```bash
cat docs/development/PROGRESS.md
```

### 前回の作業ログを確認
```bash
cat docs/development/work_logs/2024-10-28_initial_setup.md
```

---

## 3. 次にやるべきこと

### ⚠️ 必須: Supabaseプロジェクトの作成（未実施）

まだSupabaseプロジェクトを作成していません。以下の手順で作成してください：

1. https://supabase.com にアクセス
2. 「Start your project」をクリック
3. プロジェクトを作成:
   - Name: `quote-collector`
   - Region: `Northeast Asia (Tokyo)`
   - Database Password: 安全なパスワードを設定
4. プロジェクト情報を取得:
   - Project URL
   - anon public key
5. `.env.local` ファイルを作成:
   ```bash
   cp .env.example .env.local
   # エディタで .env.local を開いて情報を入力
   ```
6. Supabaseダッシュボードで「SQL Editor」を開く
7. `supabase/migrations/20241027000000_initial_schema.sql` の内容をコピー＆実行
8. 認証プロバイダーを有効化（Email, Google, GitHubなど）

**詳細な手順**: `supabase/README.md` を参照

---

## 4. 推奨する次の実装順序

### オプションA: 認証から始める（推奨）

1. **Supabaseプロジェクト作成**（上記参照）
2. **ログイン画面実装**
   - `app/(auth)/login/page.tsx`
   - `app/(auth)/callback/route.ts`
3. **基本レイアウト実装**
   - `app/(main)/layout.tsx`

### オプションB: APIから始める

1. **活動領域API実装**（最も簡単）
   - `app/api/activities/route.ts`
2. **基本レイアウト実装**
   - `app/(main)/layout.tsx`
3. **ログイン画面実装**
   - `app/(auth)/login/page.tsx`
   - `app/(auth)/callback/route.ts`

---

## 5. よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# 開発サーバー停止
# Ctrl + C

# Lint実行
npm run lint

# フォーマット実行
npm run format

# ビルド確認
npm run build

# 型チェック
npx tsc --noEmit

# パッケージ追加
npm install <package-name>

# パッケージ削除
npm uninstall <package-name>
```

---

## 6. ファイル構造の確認

```bash
# プロジェクト全体の構造
ls -la

# appディレクトリの構造
ls -la app/

# libディレクトリの構造
ls -la lib/

# 作成済みファイル数
find . -type f -name "*.ts" -o -name "*.tsx" | wc -l
```

---

## 7. トラブルシューティング

### エラー: Cannot find module

```bash
# node_modulesを削除して再インストール
rm -rf node_modules
npm install
```

### エラー: Port 3000 is already in use

```bash
# ポート3000を使用しているプロセスを確認
lsof -i :3000

# プロセスを終了（PIDを確認してから）
kill -9 <PID>

# または別のポートで起動
PORT=3001 npm run dev
```

### TypeScriptエラー

```bash
# .nextフォルダを削除して再ビルド
rm -rf .next
npm run dev
```

---

## 8. 参考ドキュメント

### プロジェクト内
- [README.md](../../README.md) - プロジェクト概要
- [PROGRESS.md](./PROGRESS.md) - 進捗状況
- [supabase/README.md](../../supabase/README.md) - Supabaseセットアップ手順

### 設計ドキュメント
- [要件定義書](../要件定義書_v2.md)
- [画面設計書](../画面設計書_実装版_v2.md)
- [API設計書](../API設計書_v2.md)
- [データベース設計書](../データベース設計書_v2.md)
- [技術仕様書](../技術仕様書_v2.md)

### 外部リンク
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## 9. Claudeへの質問例

次回、Claudeに作業を依頼する際の質問例：

```
ログイン画面を実装してください
```

```
活動領域APIを実装してください
```

```
メインレイアウトを作成してください
```

```
進捗状況を確認したいです
```

---

**最終更新**: 2024年10月28日
