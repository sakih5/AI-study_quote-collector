# APIファイルを読み解く - Activities

このドキュメントでは、`app/api/activities/route.ts` を読み解きます。

**ファイルパス**: `app/api/activities/route.ts`

---

## 📋 このファイルの役割

活動領域（システム固定の10個）の一覧を取得するAPIエンドポイント。

### APIエンドポイント

```
GET /api/activities
```

### レスポンス例

```json
{
  "activities": [
    {
      "id": 1,
      "name": "仕事・キャリア",
      "description": "仕事に関する...",
      "icon": "💼",
      "display_order": 1
    },
    // ... 残り9個
  ]
}
```

---

## 🔍 Next.js API Routesとは？

Next.jsでは、`app/api/` 配下に `route.ts` ファイルを置くと、自動的にAPIエンドポイントになります。

```
app/api/activities/route.ts  →  GET /api/activities
```

### HTTPメソッド

ファイル内でエクスポートする関数名がHTTPメソッドに対応します。

```typescript
export async function GET() { ... }    // GET リクエスト
export async function POST() { ... }   // POST リクエスト
export async function PUT() { ... }    // PUT リクエスト
export async function DELETE() { ... } // DELETE リクエスト
```

---

## 📖 コード全体を見る

```typescript
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    // 活動領域一覧を取得
    const { data: activities, error } = await supabase
      .from('activities')
      .select('id, name, description, icon, display_order')
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: '...' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ activities });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '...' } },
      { status: 500 }
    );
  }
}
```

---

## 📖 1行ずつ詳しく見ていく

### 1. インポート

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
```

#### `createClient`

- サーバー用のSupabaseクライアントを作成
- `lib/supabase/server.ts` から読み込み
- サーバーコンポーネント・APIルートで使用

#### `NextResponse`

- Next.jsのレスポンスオブジェクト
- `NextResponse.json()` でJSONレスポンスを返す

---

### 2. JSDoc コメント

```typescript
/**
 * GET /api/activities
 * 活動領域一覧を取得（システム固定の10個）
 */
```

#### 解説

- `/** ... */` = JSDocコメント
- APIの説明を記載
- エディタでホバーすると表示される

---

### 3. 関数定義

```typescript
export async function GET() {
```

#### 解説

- `export` = 外部から使えるようにする
- `async` = 非同期関数（`await` を使える）
- `GET` = GETリクエストに対応

#### なぜ `async`？

データベースへのアクセスは時間がかかるため、非同期処理が必要。

```typescript
// 同期処理（ブロックする）
const data = getDataFromDB();  // 処理が終わるまで待つ

// 非同期処理（ブロックしない）
const data = await getDataFromDB();  // 他の処理も並行できる
```

---

### 4. try-catch ブロック

```typescript
try {
  // 正常な処理
} catch (error) {
  // エラー処理
}
```

#### 解説

- `try` = エラーが発生する可能性のある処理
- `catch` = エラーが発生したときの処理

**なぜ必要？**

予期しないエラーが発生してもアプリが停止しないようにするため。

---

### 5. Supabaseクライアント作成

```typescript
const supabase = createClient();
```

#### 解説

- サーバー用のSupabaseクライアントを作成
- このクライアントでデータベースにアクセス

---

### 6. 認証チェック

```typescript
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();
```

#### 分割代入（ネスト）

複雑な構造から必要な値を取り出す。

```typescript
// 実際のレスポンス構造
{
  data: {
    user: { id: "abc", email: "taro@example.com" }
  },
  error: null
}

// 分割代入で取り出す
const { data: { user }, error: authError } = response;
// user = { id: "abc", email: "..." }
// authError = null
```

#### `await` とは？

非同期処理の完了を待つ。

```typescript
// awaitなし（プロミスが返る）
const promise = supabase.auth.getUser();
// Promise { <pending> }

// awaitあり（結果が返る）
const result = await supabase.auth.getUser();
// { data: { user: {...} }, error: null }
```

---

### 7. 認証エラーの処理

```typescript
if (authError || !user) {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
    { status: 401 }
  );
}
```

#### 条件式

```typescript
if (authError || !user)
```

- `||` = 「または」（OR）
- `!` = 「否定」（NOT）
- authError がある **または** user がない → true

#### `NextResponse.json()`

```typescript
NextResponse.json(data, options)
```

- 第1引数: レスポンスボディ（JSON）
- 第2引数: オプション（ステータスコードなど）

```typescript
NextResponse.json(
  { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
  { status: 401 }
);
```

**レスポンス**:

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

#### HTTPステータスコード

| コード | 意味 |
|-------|------|
| 200 | 成功 |
| 400 | リクエストが不正 |
| 401 | 認証が必要 |
| 404 | 見つからない |
| 500 | サーバーエラー |

---

### 8. データベースクエリ

```typescript
const { data: activities, error } = await supabase
  .from('activities')
  .select('id, name, description, icon, display_order')
  .order('display_order', { ascending: true });
```

#### メソッドチェーン

複数のメソッドを `.` で繋げる。

```typescript
supabase
  .from('activities')              // テーブル選択
  .select('...')                   // フィールド選択
  .order('display_order', {...});  // 並び替え
```

#### `.from()`

```typescript
.from('activities')
```

- どのテーブルからデータを取得するか指定

#### `.select()`

```typescript
.select('id, name, description, icon, display_order')
```

- 取得するフィールドを指定
- カンマ区切りで複数指定

**SQL相当**:

```sql
SELECT id, name, description, icon, display_order
FROM activities
```

#### `.order()`

```typescript
.order('display_order', { ascending: true })
```

- 並び替え
- `ascending: true` = 昇順（1, 2, 3...）
- `ascending: false` = 降順（3, 2, 1...）

**SQL相当**:

```sql
ORDER BY display_order ASC
```

---

### 9. データベースエラーの処理

```typescript
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
```

#### `console.error()`

```typescript
console.error('活動領域取得エラー:', error);
```

- サーバーのログに出力
- デバッグ用

#### ステータスコード 500

サーバー側のエラーを表す。

---

### 10. 成功レスポンス

```typescript
return NextResponse.json({ activities });
```

#### オブジェクトの省略記法

```typescript
// 通常
{ activities: activities }

// 省略形（キーと値が同じ名前の場合）
{ activities }
```

#### レスポンス

```json
{
  "activities": [
    { "id": 1, "name": "仕事・キャリア", ... },
    { "id": 2, "name": "学習・研究", ... },
    ...
  ]
}
```

---

### 11. 予期しないエラーの処理

```typescript
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
```

#### catch ブロック

tryブロック内で発生した全てのエラーをキャッチします。

---

## 🔄 処理の流れ

```
クライアント（ブラウザ）
    ↓ GET /api/activities
サーバー（Next.js）
    ↓
1. Supabaseクライアント作成
    ↓
2. 認証チェック
    ├─ 認証エラー → 401エラー返す
    └─ OK
         ↓
3. データベースクエリ
   SELECT * FROM activities ORDER BY display_order ASC
    ├─ DBエラー → 500エラー返す
    └─ OK
         ↓
4. 成功レスポンス返す
   { activities: [...] }
    ↓
クライアント（ブラウザ）
    ↓
データを受け取って画面に表示
```

---

## 💡 フロントエンドからの呼び出し

### fetch API

```typescript
const response = await fetch('/api/activities');
const data = await response.json();

console.log(data.activities);
// [{ id: 1, name: "仕事・キャリア", ... }, ...]
```

### カスタムフック

```typescript
// app/(main)/hooks/useActivities.ts
export function useActivities() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetch('/api/activities')
      .then(res => res.json())
      .then(data => setActivities(data.activities));
  }, []);

  return { activities };
}
```

---

## 🛡️ セキュリティ

### 認証チェック

```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.json({ error: ... }, { status: 401 });
}
```

**未認証のユーザーはAPIを使えない**ようにしています。

### エラーハンドリング

```typescript
try {
  // 処理
} catch (error) {
  // エラーレスポンス
}
```

予期しないエラーでもサーバーが停止しないようにしています。

---

## 📝 エラーレスポンスの統一

このプロジェクトでは、エラーレスポンスを統一しています。

```typescript
{
  error: {
    code: 'ERROR_CODE',
    message: 'ユーザー向けメッセージ'
  }
}
```

| コード | 意味 | ステータス |
|-------|------|-----------|
| `UNAUTHORIZED` | 認証エラー | 401 |
| `DATABASE_ERROR` | DB エラー | 500 |
| `INTERNAL_ERROR` | 予期しないエラー | 500 |

---

## ✅ まとめ

### このファイルの役割

- 活動領域一覧を取得するAPI
- `GET /api/activities`

### 処理の流れ

1. Supabaseクライアント作成
2. 認証チェック
3. データベースクエリ
4. レスポンス返す

### 重要な概念

- **API Routes**: `app/api/*/route.ts`
- **HTTPメソッド**: `export async function GET()`
- **非同期処理**: `async` / `await`
- **エラーハンドリング**: `try` / `catch`
- **Supabaseクエリ**: `.from()`, `.select()`, `.order()`
- **レスポンス**: `NextResponse.json()`

### セキュリティ

- 認証チェック必須
- エラーハンドリング

---

## 🎯 次のステップ

APIファイルが理解できたら、次は**画面ファイル（ページ）**を読み解きましょう！

👉 [07_home_page.md](./07_home_page.md)

---

**参考リンク**:

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [HTTP Status Codes](https://developer.mozilla.org/ja/docs/Web/HTTP/Status)
