# FastAPI Phase 3-3: /api/books 実装作業ログ

**作業日**: 2025-11-02
**作業者**: sakih
**作業時間**: 約2時間
**状態**: ✅ 完了

---

## 📋 作業概要

FastAPI移行のPhase 3-3として、書籍管理API `/api/books` の全エンドポイントを実装しました。
Phase 3-2（タグAPI）で発生したsupabase-pyの問題を回避する方法を確立し、正常に動作させることに成功しました。

---

## ✅ 完了した作業

### 1. Pydanticモデル作成

**ファイル**: `backend/models/book.py`

以下のモデルを作成：
- `Book`: 基本書籍モデル
- `BookCreate`: 書籍作成リクエスト
- `BooksResponse`: 書籍一覧レスポンス（books, total, has_more）
- `BookResponse`: 書籍作成レスポンス

**ポイント**:
- Next.js側のAPIと同じデータ構造を維持
- ページネーション情報（total, has_more）を含む
- Fieldバリデーションを追加（min_length, max_length）

---

### 2. APIルート作成

**ファイル**: `backend/routes/books.py`

実装したエンドポイント：
1. **GET /api/books** - 書籍一覧取得（✅ 動作確認済み）
   - ページネーション（limit, offset）
   - 検索機能（title, author）
   - ソート（created_at降順）
2. **POST /api/books** - 書籍作成（✅ 動作確認済み）
   - 重複チェック（title + author）
   - RLS対応

**実装した機能**:
- 検索機能（タイトル・著者名で部分一致）
- ページネーション（limit: 1-100, offset: 0以上）
- 重複チェック（同じタイトル・著者の書籍が存在する場合は409エラー）
- supabase-pyの問題回避（insert後に別途selectクエリを実行）

---

### 3. 重要な問題と解決

#### 問題1: supabase-pyの.insert().select()チェーン呼び出し失敗

**エラー**:
```
'SyncQueryRequestBuilder' object has no attribute 'select'
```

**解決策**:
```python
# ❌ 失敗（Phase 3-2と同じ問題）
response = supabase.table('books') \
    .insert(data) \
    .select('*') \
    .execute()

# ✅ 成功（2つのクエリに分離）
# まずinsertを実行
insert_response = supabase.table('books').insert(data).execute()
book_id = insert_response.data[0]['id']

# 別途selectクエリで取得
select_response = supabase.table('books') \
    .select('*') \
    .eq('id', book_id) \
    .execute()
```

---

#### 問題2: RLSポリシー違反エラー

**エラー**:
```
new row violates row-level security policy for table "books"
```

**原因**:
- `get_supabase_client()`が認証トークンなしでクライアントを作成していた
- RLSポリシーがuser_idをチェックするため、認証なしではINSERTが拒否される

**解決策** (`backend/auth.py`):
```python
# ❌ 修正前
def get_supabase_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_key)

# ✅ 修正後
def get_supabase_client(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Client:
    token = credentials.credentials
    supabase = create_client(settings.supabase_url, settings.supabase_key)
    # 認証トークンをPostgRESTセッションに設定
    supabase.postgrest.auth(token)
    return supabase
```

**重要ポイント**:
- `supabase.postgrest.auth(token)` でPostgRESTセッションに認証トークンを設定
- これによりRLSポリシーが正しく適用され、ユーザーのデータとして操作可能になる
- **この修正は全エンドポイントに適用される**（activities, tagsも恩恵を受ける）

---

### 4. main.pyへルーター登録

**ファイル**: `backend/main.py`

```python
from routes import activities, tags, books

app.include_router(activities.router)
app.include_router(tags.router)
app.include_router(books.router)
```

---

### 5. 動作確認

#### 5-1. Swagger UIテスト

**GET /api/books**:
```json
{
  "books": [],
  "total": 0,
  "has_more": false
}
```
✅ 成功（初期状態：書籍なし）

**POST /api/books**:
```json
// リクエスト
{
  "title": "リーダブルコード",
  "author": "Dustin Boswell"
}

// レスポンス（201 Created）
{
  "book": {
    "id": 12,
    "user_id": "26c01d9c-69dd-40ff-b561-fe39c2798ac8",
    "title": "リーダブルコード",
    "author": "Dustin Boswell",
    "cover_image_url": null,
    "isbn": null,
    "asin": null,
    "publisher": null,
    "publication_date": null,
    "created_at": "2025-11-02T13:19:53.421198Z",
    "updated_at": "2025-11-02T13:19:53.421198Z"
  }
}
```
✅ 成功

**GET /api/books（再実行）**:
```json
{
  "books": [
    {
      "id": 12,
      "title": "リーダブルコード",
      "author": "Dustin Boswell",
      ...
    }
  ],
  "total": 1,
  "has_more": false
}
```
✅ 成功（登録した書籍が取得できる）

---

#### 5-2. Next.jsからの呼び出しテスト

**ブラウザコンソールで実行**:
```javascript
// トークン取得
const tokenRes = await fetch('/api/get-token');
const { access_token } = await tokenRes.json();

// FastAPI /api/books を呼び出し
const booksRes = await fetch('http://localhost:8000/api/books', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const booksData = await booksRes.json();
console.log('FastAPI books:', booksData);

// Next.js既存APIと比較
const nextjsRes = await fetch('/api/books');
const nextjsData = await nextjsRes.json();
console.log('Next.js books:', nextjsData);
```

**結果**:
```
FastAPI books: {books: Array(11), total: 11, has_more: false}
Next.js books: {books: Array(11), total: 11, has_more: false}
```
✅ 成功（FastAPIとNext.jsで同じデータが取得できる）

---

## 📊 進捗状況

### 完了したフェーズ

| Phase | タスク | 進捗 | 状態 |
|-------|--------|------|------|
| Phase 1 | 環境構築 | 100% | ✅ 完了 |
| Phase 2 | 認証基盤 | 100% | ✅ 完了 |
| Phase 3-1 | /api/activities | 100% | ✅ 完了 |
| Phase 3-2 | /api/tags | 40% | ⚠️ ブロック中 |
| Phase 3-3 | /api/books | 100% | ✅ 完了 |

**Phase 3-3完了！**

---

## 💡 学んだこと

### 1. supabase-pyの制約と回避策

**制約**:
- `.insert().select()` のメソッドチェーンが動作しない（SyncQueryRequestBuilderの問題）
- タグAPIと同じ問題が発生

**回避策**:
- insertとselectを2つの別々のクエリに分離
- insert後に返されるIDを使ってselectクエリを実行
- この方法は確実に動作する

**将来の改善案**:
- supabase-pyのバージョンアップで問題が解決される可能性
- または、直接PostgREST APIを呼ぶ実装に変更

---

### 2. RLSポリシーとSupabase認証

**重要な発見**:
- Supabaseのanon keyだけでは不十分
- PostgRESTセッションに認証トークンを明示的に設定する必要がある
- `supabase.postgrest.auth(token)` が必須

**影響**:
- この修正により、全エンドポイントでRLSポリシーが正しく動作する
- activities（RLS不要）、tags（user_idチェック）、books（user_idチェック）すべてに適用

---

### 3. FastAPIの依存性注入の威力

**メリット**:
- `get_supabase_client(credentials)` で認証トークンを自動注入
- 全エンドポイントで同じパターンを使用できる
- コードの重複を削減

**パターン**:
```python
@router.get("")
async def get_items(
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    # userとsupabaseが自動的に注入される
    pass
```

---

### 4. Next.js APIとの互換性

**確認できたこと**:
- レスポンス構造が完全に一致
- データの内容も一致（11件の書籍）
- フロントエンドの修正なしで切り替え可能

**今後の移行手順**:
1. FastAPI側のエンドポイントを実装
2. Swagger UIとNext.jsから動作確認
3. フロントエンドのAPI呼び出し先をFastAPIに変更
4. Next.js API Routesを削除（任意）

---

## 🎯 次回の作業予定

### Phase 3-4: /api/sns-users エンドポイント実装

**実装内容**（見積もり: 2〜3時間）:
1. Pydanticモデル作成（`backend/models/sns_user.py`）
2. APIルート作成（`backend/routes/sns_users.py`）
3. CRUD操作実装
   - GET /api/sns-users（一覧取得）
   - POST /api/sns-users（新規作成）
4. 動作確認（curl → Swagger UI → Next.js）

**注意点**:
- books APIと同じ回避策を適用（insert後に別途select）
- RLS対応済み（`get_supabase_client`が認証トークンを設定）

---

## 📁 作成・更新したファイル

### 新規作成

```
backend/
├── models/
│   └── book.py              # Pydanticモデル
└── routes/
    └── books.py             # APIルート
```

### 更新

```
backend/
├── main.py                  # booksルーター登録
└── auth.py                  # RLS対応のため認証トークンをPostgRESTに設定
```

### ドキュメント

```
docs/development/work_logs/
└── 2025-11-02_fastapi_phase3-3_books.md  # 本ファイル
```

---

## 🔧 技術スタック

| カテゴリ | ライブラリ | バージョン | 状態 |
|---------|----------|-----------|------|
| Webフレームワーク | FastAPI | 0.104.1 | ✅ 正常 |
| バリデーション | Pydantic | 2.5.0 | ✅ 正常 |
| Supabaseクライアント | supabase-py | 2.0.0 | ⚠️ 制約あり（回避策確立） |

---

## 📝 メモ・気づき

1. **supabase-pyの制約**
   - メソッドチェーンに制約がある
   - しかし、2つのクエリに分離することで回避可能
   - パフォーマンスへの影響は最小限

2. **RLSポリシーの重要性**
   - 認証トークンを正しく設定しないとINSERTが拒否される
   - `supabase.postgrest.auth(token)` が必須
   - この設定は全テーブルに適用される

3. **FastAPIとNext.jsの互換性**
   - レスポンス構造を一致させることで、シームレスな移行が可能
   - フロントエンドの修正は最小限で済む

4. **デバッグの効率化**
   - Swagger UIでの手動テストが非常に便利
   - エラーメッセージから問題を特定しやすい
   - Next.jsからの呼び出しテストも簡単

---

## 🚀 次回の開始方法

次回作業を再開する際は、以下のコマンドでサーバーを起動してください：

### FastAPI起動

```bash
cd /home/sakih/projects/AI-study_quote-collector/backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Next.js起動（別ターミナル）

```bash
cd /home/sakih/projects/AI-study_quote-collector
npm run dev
```

### Swagger UIアクセス

```
http://localhost:8000/docs
```

### トークン取得（ブラウザコンソール）

```javascript
fetch('/api/get-token').then(res => res.json()).then(data => {
  console.log('トークン:', data.access_token);
  navigator.clipboard.writeText(data.access_token);
});
```

---

**作成日**: 2025-11-02
**最終更新**: 2025-11-02
**FastAPI Phase 3-3 完了！**
**次回アクション**: Phase 3-4 (/api/sns-users) の実装
