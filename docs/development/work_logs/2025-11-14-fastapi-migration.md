# FastAPI完全移行ガイド

**日付**: 2024年11月14日
**目的**: Next.js API Routes（TypeScript）からFastAPIへの完全移行
**ステータス**: ✅ 完了

## 背景

### 元の問題
ホーム画面でフレーズを削除した際、フレーズ0件となった書籍が「フレーズを登録」モーダルの「既存の書籍から選択」ドロップダウンに表示され続ける問題が発生していた。

### 移行の決断
この問題の解決をきっかけに、バックエンドをFastAPIに完全移行することを決定。TypeScript API Routesを削除し、Pythonバックエンドに統一することで、保守性とパフォーマンスを向上させる。

---

## 実装内容

### 1. フレーズ0件書籍のフィルタリング機能

#### FastAPI側の実装
**ファイル**: `backend/routes/books.py`

```python
@router.get("", response_model=BooksResponse)
async def get_books(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str = Query(""),
    has_quotes: bool = Query(False, description="フレーズが存在する書籍のみ取得"),  # 追加
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    # has_quotesがTrueの場合、フレーズが存在する書籍のIDを取得
    if has_quotes:
        quotes_response = supabase.table('quotes') \
            .select('book_id') \
            .eq('user_id', user.id) \
            .eq('source_type', 'BOOK') \
            .is_('deleted_at', 'null') \
            .execute()

        if quotes_response.data:
            book_ids_with_quotes = list(set([q['book_id'] for q in quotes_response.data if q['book_id'] is not None]))
        else:
            book_ids_with_quotes = []

        if not book_ids_with_quotes:
            return BooksResponse(books=[], total=0, has_more=False)

        # booksクエリにフィルタを追加
        query = query.in_('id', book_ids_with_quotes)
```

#### フロントエンド側の実装
**ファイル**: `app/(main)/hooks/useBooks.ts`

```typescript
const fetchBooks = async () => {
  try {
    setLoading(true);
    const data = await apiGet<BooksResponse>('/api/books?limit=100&has_quotes=true');
    setBooks(data.books || []);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    setLoading(false);
  }
};
```

---

### 2. スクレイピング機能のPython実装

#### Amazon書籍情報スクレイピング
**ファイル**: `backend/services/amazon_scraper.py`

- BeautifulSoup4を使用してAmazon商品ページをスクレイピング
- ASINの抽出、タイトル、著者、カバー画像、ISBN、出版社を取得
- レート制限（10req/min）を実装

#### SNSユーザー情報スクレイピング
**ファイル**: `backend/services/sns_scraper.py`

- X（旧Twitter）とThreadsのURLを解析
- プロフィールページからユーザー情報を取得
- レート制限（10req/min）を実装

---

### 3. 追加エンドポイントの実装

#### 3.1 POST /api/books/from-url
**ファイル**: `backend/routes/books.py`

Amazon URLから書籍情報を取得するエンドポイント。

**リクエスト例**:
```json
{
  "url": "https://www.amazon.co.jp/dp/B09XYZ1234"
}
```

**レスポンス例**:
```json
{
  "book_info": {
    "title": "サンプル書籍",
    "author": "著者名",
    "cover_image_url": "https://...",
    "isbn": "9784123456789",
    "asin": "B09XYZ1234",
    "publisher": "出版社名"
  }
}
```

#### 3.2 POST /api/sns-users/from-url
**ファイル**: `backend/routes/sns_users.py`

SNS URLからユーザー情報を取得するエンドポイント。

**リクエスト例**:
```json
{
  "url": "https://x.com/username/status/123456"
}
```

**レスポンス例**:
```json
{
  "user_info": {
    "platform": "X",
    "handle": "username",
    "display_name": "表示名"
  }
}
```

#### 3.3 GET /api/quotes/public
**ファイル**: `backend/routes/quotes.py`

公開フレーズを取得するエンドポイント（認証不要）。

**クエリパラメータ**:
- `limit`: 取得件数（デフォルト: 50）
- `offset`: オフセット（デフォルト: 0）

**レスポンス**: 書籍・SNSユーザー別にグループ化されたフレーズリスト

#### 3.4 GET /api/export/csv
**ファイル**: `backend/routes/export.py`

フレーズをCSV形式でエクスポートするエンドポイント。

**サービス**: `backend/services/csv_generator.py`

**クエリパラメータ**:
- `search`: 検索キーワード
- `source_type`: 出典タイプ（BOOK, SNS, OTHER）
- `activity_ids`: 活動領域ID（カンマ区切り）
- `tag_ids`: タグID（カンマ区切り）

**レスポンス**: BOM付きCSVファイル（Excel互換）

#### 3.5 GET /api/get-token
**ファイル**: `backend/main.py`

現在のセッションのアクセストークンを取得するエンドポイント。

**レスポンス例**:
```json
{
  "access_token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

---

### 4. 環境設定

#### 4.1 依存ライブラリの追加
**ファイル**: `backend/pyproject.toml`

```toml
dependencies = [
    "fastapi>=0.104.1",
    "uvicorn[standard]>=0.24.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
    "supabase>=2.10.0",  # 最新版に更新
    "python-jose[cryptography]>=3.3.0",
    "python-multipart>=0.0.6",
    "beautifulsoup4>=4.12.0",  # 追加
    "requests>=2.31.0",  # 追加
]
```

#### 4.2 フロントエンド設定
**ファイル**: `.env.local`

```bash
# FastAPI Backend URL (ローカル開発)
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

#### 4.3 ライブラリのインストール

```bash
# uvのインストール（初回のみ）
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# 依存関係の解決とインストール
cd backend
uv pip compile pyproject.toml -o requirements.lock
uv pip sync requirements.lock
```

---

### 5. TypeScript API Routesの削除

```bash
rm -rf app/api
```

削除されたエンドポイント:
- `/api/activities`
- `/api/books`
- `/api/books/from-url`
- `/api/sns-users`
- `/api/sns-users/from-url`
- `/api/quotes`
- `/api/quotes/[id]`
- `/api/quotes/grouped`
- `/api/quotes/public`
- `/api/tags`
- `/api/tags/[id]`
- `/api/tags/[id]/merge`
- `/api/export/csv`
- `/api/get-token`

---

## トラブルシューティング

### 問題1: PostgreSTクエリ構文エラー

**エラーメッセージ**:
```
PGRST100: unexpected "n" expecting isVal: (null, not_null, true, false, unknown)
```

**原因**:
Python supabase-pyライブラリでは、`.is_('deleted_at', None)` が正しく解釈されない。

**解決策**:
全てのファイルで `.is_('deleted_at', None)` を `.is_('deleted_at', 'null')` に変更。

```bash
# 一括置換
cd backend
find routes/ -name "*.py" -exec sed -i "s/\.is_('deleted_at', None)/.is_('deleted_at', 'null')/g" {} \;
```

**影響範囲**:
- `routes/books.py` (3箇所)
- `routes/sns_users.py` (2箇所)
- `routes/quotes.py` (3箇所)
- `routes/tags.py` (7箇所)
- `routes/export.py` (1箇所)

---

### 問題2: 外部キー結合が動作しない（KeyError: 'books'）

**エラーメッセージ**:
```
KeyError: 'books'
TypeError: SyncRequestBuilder.select() got an unexpected keyword argument 'head'
```

**原因**:
`supabase-py 2.0.0` は古いバージョンで、外部キー結合（`books(id, title, ...)`）が正しく動作しない。

**解決策**:
supabase-pyを最新版（2.16.0）にアップグレード。

**手順**:
1. `pyproject.toml`のバージョン指定を`>=`に変更
2. requirements.lockを再生成
3. ライブラリを同期
4. サーバーを再起動

```bash
# requirements.lockを再生成
uv pip compile pyproject.toml -o requirements.lock

# ライブラリを同期
uv pip sync requirements.lock

# サーバーを再起動
.venv/bin/python3 main.py
```

**アップグレードされたライブラリ**:
- `supabase`: 2.0.0 → 2.16.0
- `postgrest`: 0.13.2 → 1.1.1
- `gotrue`: 1.3.1 → 2.12.4
- `httpx`: 0.24.1 → 0.28.1
- `httpcore`: 0.17.3 → 1.0.8
- `storage3`: 0.6.1 → 0.12.1
- `realtime`: 1.0.6 → 2.5.3
- `supafunc`: 0.3.3 → 0.10.2

---

## サーバー起動方法

### 開発環境

```bash
# FastAPIサーバーを起動
cd backend
.venv/bin/python3 main.py

# 別ターミナルでNext.jsフロントエンドを起動
cd ..
npm run dev
```

### 本番環境

```bash
# Docker経由でデプロイ（Cloud Run）
cd backend
./deploy.sh
```

---

## 動作確認

### 1. FastAPIサーバーの確認

```bash
# ヘルスチェック
curl http://localhost:8000/health
# {"status":"healthy"}

# ルートエンドポイント
curl http://localhost:8000/
# {"message":"抜き書きアプリ FastAPI","status":"running"}

# Swagger UI
open http://localhost:8000/docs
```

### 2. フロントエンドの確認

1. Next.jsフロントエンドを起動（http://localhost:3000）
2. ログイン
3. ホーム画面でフレーズが正しく表示されることを確認
4. フレーズを削除してフレーズ0件の書籍を作成
5. 「フレーズを登録」モーダルを開く
6. 「2. 出典」→「既存の書籍から選択」に、フレーズ0件の書籍が表示されないことを確認

---

## まとめ

### 達成したこと

✅ フレーズ0件の書籍をドロップダウンから除外（元の問題を解決）
✅ Amazonスクレイピング機能をPythonで実装
✅ SNSスクレイピング機能をPythonで実装
✅ 不足していた5つのエンドポイントをFastAPIに実装
✅ TypeScript API Routesを完全削除
✅ supabase-pyを最新版（2.16.0）にアップグレード
✅ 全エンドポイントの動作確認完了

### 今後のメンテナンス

- **ライブラリのアップデート**: 定期的に`uv pip compile`を実行して最新版を維持
- **エラーハンドリング**: スクレイピングエラー時のフォールバック処理を改善
- **レート制限**: Amazon/SNSスクレイピングのレート制限を監視
- **テスト**: E2Eテストの追加（Playwright）

---

## 参考リンク

- [FastAPI公式ドキュメント](https://fastapi.tiangolo.com/)
- [supabase-py GitHubリポジトリ](https://github.com/supabase-community/supabase-py)
- [uv公式ドキュメント](https://github.com/astral-sh/uv)
- [BeautifulSoup4ドキュメント](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
