# 公開フラグ機能実装とモーダル改善

**日付**: 2025年11月15日
**目的**: フレーズの公開/非公開機能の実装、モーダルUI改善、API統合の完成
**ステータス**: ✅ 完了

## 背景

### 実装要件
1. フレーズ登録時・編集時に公開/非公開を設定できるようにする
2. 公開フラグがついたフレーズをログイン前画面に表示する
3. モーダルの枠外クリックで意図せず閉じてしまう問題を解決
4. 全APIエンドポイントをFastAPIに統一し、直接fetchを使用しているコードを修正

---

## 実装内容

### 1. 編集モーダルに公開フラグチェックボックスを追加

#### バックエンド修正

**ファイル**: `backend/models/quote.py`

全てのQuoteモデルに`is_public`フィールドを追加：
- `Quote`: 基本モデル
- `QuoteWithDetails`: 詳細情報付きモデル
- `QuoteInGroup`: グループ内のフレーズモデル
- `QuoteCreate`: 作成リクエストモデル（デフォルト: `False`）
- `QuoteUpdate`: 更新リクエストモデル（オプショナル）

```python
class QuoteUpdate(BaseModel):
    """フレーズ更新リクエスト"""
    text: Optional[str] = Field(None, min_length=1, max_length=10000)
    activity_ids: Optional[list[int]] = None
    tag_ids: Optional[list[int]] = None
    is_public: Optional[bool] = None  # 追加
```

**ファイル**: `backend/routes/quotes.py`

PUT `/api/quotes/{quote_id}`エンドポイントを修正：
- `is_public`フィールドの更新をサポート
- レスポンスに`is_public`を含める

```python
# テキストまたは公開フラグを更新
update_data = {}
if quote_update.text is not None:
    update_data['text'] = quote_update.text
if quote_update.is_public is not None:
    update_data['is_public'] = quote_update.is_public

if update_data:
    update_response = supabase.table('quotes') \
        .update(update_data) \
        .eq('id', quote_id) \
        .eq('user_id', user.id) \
        .execute()
```

GET `/api/quotes/grouped`エンドポイントを修正：
- クエリで`is_public`を取得
- すべてのQuoteInGroupとQuoteWithDetailsに`is_public`を含める

#### フロントエンド修正

**ファイル**: `app/(main)/hooks/useQuotesGrouped.ts`

Quote型に`is_public`フィールドを追加：
```typescript
export interface Quote {
  id: number;
  text: string;
  page_number?: number;
  is_public: boolean;  // 追加
  activities: Activity[];
  tags: Tag[];
  created_at: string;
}
```

**ファイル**: `app/(main)/components/QuoteEditModal.tsx`

1. state管理に`isPublic`を追加
2. useEffectで初期値として`quote.is_public`を設定
3. フッターに公開フラグのチェックボックスUIを追加（QuoteModalと同様）
4. 更新APIリクエストに`is_public`を含める
5. APIヘルパー関数（`apiPut`）を使用するように修正

```typescript
// 公開/非公開トグル
<div className="mb-4">
  <label className="flex items-center gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={isPublic}
      onChange={(e) => setIsPublic(e.target.checked)}
      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
    />
    <div className="flex flex-col">
      <span className="text-sm font-medium text-gray-900">このフレーズを公開する</span>
      <span className="text-xs text-gray-500">
        ログインしていないユーザーも閲覧できます
      </span>
    </div>
  </label>
</div>
```

---

### 2. モーダルの枠外クリック無効化

#### 修正内容

**ファイル**: `app/(main)/components/QuoteModal.tsx`, `app/(main)/components/QuoteEditModal.tsx`

オーバーレイ要素から`onClick={onClose}`を削除：

```typescript
// 修正前
<div className="fixed inset-0 bg-gray-900/20 z-40" onClick={onClose} />

// 修正後
<div className="fixed inset-0 bg-gray-900/20 z-40" />
```

モーダルを閉じる方法を以下の2つに限定：
1. 右上のバツ印（×）ボタン
2. 下部のキャンセルボタン

**効果**:
- 入力中の誤クリックによるデータ消失を防止
- OCRで抽出したテキストが意図せず消えることを防止

---

### 3. APIエンドポイント統合（fetch → APIヘルパー関数）

#### 問題
Next.js API Routes（`app/api/`）を削除したにも関わらず、一部のコンポーネントで直接`fetch`を使用していたため、FastAPIではなく削除されたルートを呼び出してエラーが発生。

#### 解決策

**ファイル**: `lib/api/client.ts`

既存のAPIヘルパー関数を使用：
- `apiGet<T>(endpoint: string)`: GET リクエスト
- `apiPost<T>(endpoint: string, body: unknown)`: POST リクエスト
- `apiPut<T>(endpoint: string, body: unknown)`: PUT リクエスト
- `apiDelete<T>(endpoint: string)`: DELETE リクエスト

これらは自動的にSupabaseの認証トークンをヘッダーに追加し、FastAPI URLを使用します。

#### 修正ファイル

1. **QuoteEditModal.tsx**
```typescript
// 修正前
const response = await fetch(`/api/quotes/${quote.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... }),
});

// 修正後
import { apiPut } from '@/lib/api/client';
await apiPut(`/api/quotes/${quote.id}`, { ... });
```

2. **QuoteModal.tsx**
   - Amazon書籍情報取得: `apiPost('/api/books/from-url', ...)`
   - SNSユーザー情報取得: `apiPost('/api/sns-users/from-url', ...)`
   - 書籍登録: `apiPost('/api/books', ...)`
   - SNSユーザー登録: `apiPost('/api/sns-users', ...)`
   - フレーズ登録: `apiPost('/api/quotes', ...)`

3. **app/(main)/my-quotes/page.tsx**
   - フレーズ削除: `apiDelete(\`/api/quotes/${quoteId}\`)`

---

### 4. 公開フレーズ表示機能

#### バックエンド実装

**ファイル**: `backend/auth.py`

認証不要の公開エンドポイント用にSupabaseクライアントを作成：

```python
def get_supabase_client_public() -> Client:
    """
    認証不要のSupabaseクライアントを取得（公開エンドポイント用）

    サービスロールキーが設定されている場合はそれを使用し、RLSをバイパスする
    設定されていない場合は通常のanon keyを使用
    """
    if settings.supabase_service_role_key:
        return create_client(settings.supabase_url, settings.supabase_service_role_key)
    return create_client(settings.supabase_url, settings.supabase_key)
```

**ファイル**: `backend/config.py`

サービスロールキーの設定を追加：
```python
class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: str = ""  # サービスロールキー（オプション）
    ...
```

**ファイル**: `backend/.env`

```bash
SUPABASE_SERVICE_ROLE_KEY=<Supabaseのサービスロールキー>
```

**ファイル**: `backend/routes/quotes.py`

GET `/api/quotes/public`エンドポイントを修正：
- 認証不要（`get_supabase_client_public`を使用）
- `is_public=True`のフレーズのみ取得
- 書籍・SNSユーザー別にグループ化
- RLSポリシーをバイパスして関連データ（books, sns_users）を取得

```python
@router.get("/public", response_model=QuotesGroupedResponse)
async def get_public_quotes(
    limit: int = Query(50, ge=1, le=100, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    supabase: Client = Depends(get_supabase_client_public)  # 認証不要
):
    ...
```

#### フロントエンド実装

**ファイル**: `app/page.tsx`

1. FastAPI URLを使用してAPIを呼び出し
2. レスポンス構造を FastAPI 形式（`items`配列）に対応
3. `type`フィールドで`book`と`sns`グループを判別

```typescript
const apiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || '';
const response = await fetch(`${apiUrl}/api/quotes/public?limit=50`);
const data = await response.json();

const books: BookGroup[] = [];
const sns: SnsGroup[] = [];

for (const item of data.items || []) {
  if (item.type === 'book') {
    books.push({ book: item.book, quotes: item.quotes });
  } else if (item.type === 'sns') {
    sns.push({ sns_user: item.sns_user, quotes: item.quotes });
  }
}
```

---

## トラブルシューティング

### 問題1: 編集モーダルでis_publicを更新してもデータベースに保存されない

**原因**: フロントエンドが直接`fetch`を使用し、削除されたNext.js API Routesを呼び出していた。

**解決策**: `apiPut`ヘルパー関数を使用してFastAPIエンドポイントを呼び出すように修正。

---

### 問題2: 公開フレーズエンドポイントで認証エラー

**エラー**: `{"detail":"Not authenticated"}`

**原因**: `get_supabase_client`が認証を要求していた。

**解決策**: 認証不要の`get_supabase_client_public`関数を作成し、公開エンドポイントで使用。

---

### 問題3: 公開フレーズ取得時に関連データ（books）がNone

**エラー**: `BookNested() argument after ** must be a mapping, not NoneType`

**原因**:
- SupabaseのRLS（Row Level Security）ポリシーにより、認証なしでは`books`テーブルのデータを取得できない
- anon keyではRLSポリシーが適用され、user_idが一致しない行は取得不可

**解決策**:
1. `backend/.env`にSupabaseのサービスロールキーを追加
2. `get_supabase_client_public`でサービスロールキーを使用し、RLSをバイパス
3. 書籍データが存在しない場合はスキップする処理を追加

```python
# 書籍データがない場合はスキップ
if not book_data:
    continue
```

---

### 問題4: 公開フレーズのtotalは2だがitemsが空配列

**原因**: 書籍やSNSユーザーの関連データが`None`のため、グループ化時にスキップされていた。

**解決策**: サービスロールキーを使用してRLSをバイパスし、関連データを正しく取得。

---

## セキュリティ考慮事項

### サービスロールキーの取り扱い

**重要**: サービスロールキーは全てのRLSポリシーをバイパスするため、極めて機密性が高い。

**安全な使用方法**:
1. `.env`ファイルに保存（Gitにコミットしない）
2. 環境変数として設定
3. 公開エンドポイントでのみ使用
4. 本番環境では専用のRLSポリシーを設定することを推奨

**backend/.gitignore**で`.env`が除外されていることを確認：
```
.env
.venv/
__pycache__/
```

### 本番環境での推奨設定

公開フレーズ用のRLSポリシーを作成：
```sql
-- 公開フレーズとその関連データを誰でも閲覧可能にする
CREATE POLICY "公開フレーズは誰でも閲覧可能"
ON quotes FOR SELECT
USING (is_public = true AND deleted_at IS NULL);

CREATE POLICY "公開フレーズの書籍は誰でも閲覧可能"
ON books FOR SELECT
USING (
  id IN (
    SELECT book_id FROM quotes
    WHERE is_public = true AND deleted_at IS NULL
  )
  AND deleted_at IS NULL
);
```

---

## 動作確認

### 1. フレーズ編集モーダルでの公開フラグ設定

1. ログイン後、既存のフレーズの編集アイコンをクリック
2. 「このフレーズを公開する」チェックボックスが表示されることを確認
3. チェックを入れて「更新する」をクリック
4. 再度編集モーダルを開き、チェックが保持されていることを確認

### 2. フレーズ登録モーダルでの公開フラグ設定

1. 「フレーズを登録」ボタンをクリック
2. フレーズ情報を入力
3. 「このフレーズを公開する」にチェック
4. 「登録する」をクリック
5. 登録されたフレーズを編集して、公開フラグが保持されていることを確認

### 3. 公開フレーズの表示

1. ログアウト
2. トップページ（http://localhost:3000）にアクセス
3. 公開フラグをつけたフレーズが表示されることを確認
4. 書籍情報（タイトル、著者、カバー画像）が正しく表示されることを確認

### 4. モーダルの枠外クリック無効化

1. フレーズ登録/編集モーダルを開く
2. 入力フィールドに文字を入力
3. モーダルの枠外（グレーのオーバーレイ）をクリック
4. モーダルが閉じないことを確認
5. バツ印またはキャンセルボタンでモーダルが閉じることを確認

---

## APIエンドポイント一覧

### 修正されたエンドポイント

| メソッド | パス | 認証 | 変更内容 |
|---------|------|------|---------|
| PUT | `/api/quotes/{quote_id}` | 必須 | `is_public`の更新をサポート、レスポンスに`is_public`を含める |
| GET | `/api/quotes/grouped` | 必須 | レスポンスに`is_public`を含める |
| GET | `/api/quotes/public` | 不要 | サービスロールキーを使用、RLSバイパス |

---

## ファイル変更一覧

### バックエンド
- `backend/models/quote.py` - 全モデルに`is_public`追加
- `backend/routes/quotes.py` - PUT, GET (grouped), GET (public)エンドポイント修正
- `backend/auth.py` - `get_supabase_client_public`関数追加
- `backend/config.py` - `supabase_service_role_key`設定追加
- `backend/.env` - サービスロールキー追加

### フロントエンド
- `app/(main)/hooks/useQuotesGrouped.ts` - Quote型に`is_public`追加
- `app/(main)/components/QuoteEditModal.tsx` - 公開フラグUI追加、`apiPut`使用
- `app/(main)/components/QuoteModal.tsx` - オーバーレイクリック無効化、`apiPost`使用
- `app/(main)/my-quotes/page.tsx` - `apiDelete`使用
- `app/page.tsx` - FastAPI経由で公開フレーズ取得、Quote型に`is_public`追加

---

## まとめ

### 達成したこと

✅ フレーズの公開/非公開機能を完全実装
✅ 編集モーダルと登録モーダルに公開フラグのチェックボックスを追加
✅ モーダルの枠外クリックで閉じないように改善（UX向上）
✅ 全APIエンドポイントをFastAPIに統一（fetch → APIヘルパー関数）
✅ 公開フレーズをログイン前画面に表示
✅ サービスロールキーを使用してRLSをバイパス（公開エンドポイント用）
✅ データベースから正しく関連データ（books, sns_users）を取得

### 今後の改善案

- 本番環境用の公開フレーズ専用RLSポリシーを設定
- 公開フレーズの検索・フィルタリング機能
- 公開フレーズのページネーション改善
- 公開フレーズのOGP対応（SNSシェア時の表示）

---

## 参考リンク

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [FastAPI Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Supabase Service Role Key](https://supabase.com/docs/guides/api/api-keys)
