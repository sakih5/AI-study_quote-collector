# データの流れ

このドキュメントでは、アプリケーション内でデータがどのように流れるかを学びます。

---

## 🌊 全体のデータフロー

```
┌─────────────┐
│ ユーザー     │  1. ページを開く、ボタンをクリック
│（ブラウザ）   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Next.js     │  2. 画面を表示、データが必要
│（フロント    │     app/(main)/page.tsx
│  エンド）    │
└──────┬──────┘
       │
       │ 3. APIにリクエスト
       │    fetch('/api/quotes')
       ↓
┌─────────────┐
│ API Routes  │  4. リクエストを処理
│（バック      │     app/api/quotes/route.ts
│  エンド）    │
└──────┬──────┘
       │
       │ 5. データベースにクエリ
       │    supabase.from('quotes')
       ↓
┌─────────────┐
│ Supabase    │  6. データを返す
│（データ      │
│  ベース）    │
└──────┬──────┘
       │
       │ 7. レスポンスを返す
       ↓
┌─────────────┐
│ API Routes  │  8. JSONレスポンス
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Next.js     │  9. データを受け取って画面更新
│（フロント    │
│  エンド）    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ ユーザー     │  10. 更新された画面を見る
│（ブラウザ）   │
└─────────────┘
```

---

## 📖 具体例：フレーズ一覧を表示する

### ステップ1: ユーザーがホーム画面を開く

URL: `https://example.com/`

↓

Next.jsが `app/(main)/page.tsx` を実行

### ステップ2: ページコンポーネントがデータを要求

```typescript
// app/(main)/page.tsx
export default function HomePage() {
  // カスタムフックでデータ取得
  const { items, loading, error } = useQuotesGrouped();

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;

  return (
    <div>
      {items.map(item => (
        <QuoteGroupCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### ステップ3: カスタムフックがAPIを呼び出す

```typescript
// app/(main)/hooks/useQuotesGrouped.ts
export function useQuotesGrouped() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // APIを呼び出す
    fetch('/api/quotes/grouped')
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      });
  }, []);

  return { items, loading };
}
```

### ステップ4: APIがリクエストを処理

```typescript
// app/api/quotes/grouped/route.ts
export async function GET(request: Request) {
  // 認証チェック
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '未認証' }, { status: 401 });
  }

  // データベースからデータ取得
  const { data: quotes } = await supabase
    .from('quotes_with_details')  // ビュー
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // グループ化処理
  const grouped = groupQuotesBySource(quotes);

  // レスポンスを返す
  return Response.json(grouped);
}
```

### ステップ5: Supabaseがデータを返す

```sql
-- PostgreSQLクエリ（実際にはSupabaseが実行）
SELECT * FROM quotes_with_details
WHERE user_id = 'ユーザーID'
ORDER BY created_at DESC;
```

### ステップ6: データが画面に表示される

```
quotes_with_details
↓
API (/api/quotes/grouped)
↓
useQuotesGrouped フック
↓
HomePage コンポーネント
↓
QuoteGroupCard コンポーネント
↓
ブラウザに表示
```

---

## ✏️ 具体例：フレーズを登録する

### 全体の流れ

```
ユーザー入力
↓
QuoteModal（フォーム）
↓
POST /api/quotes（API呼び出し）
↓
app/api/quotes/route.ts（バリデーション + DB保存）
↓
Supabase（INSERT文実行）
↓
成功レスポンス
↓
画面更新（新しいフレーズを表示）
```

### ステップ1: ユーザーがモーダルで入力

```typescript
// app/(main)/components/QuoteModal.tsx
'use client';
import { useState } from 'react';

export default function QuoteModal() {
  const [text, setText] = useState('');
  const [activityIds, setActivityIds] = useState<number[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);

  const handleSubmit = async () => {
    // APIに送信
    const response = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quotes: [{
          text,
          activity_ids: activityIds,
          tag_ids: tagIds,
        }],
      }),
    });

    if (response.ok) {
      alert('登録しました！');
      // モーダルを閉じる
      onClose();
      // 一覧を更新
      refetch();
    }
  };

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      {/* 活動領域、タグ選択 */}
      <button onClick={handleSubmit}>登録</button>
    </div>
  );
}
```

### ステップ2: APIがデータを受け取る

```typescript
// app/api/quotes/route.ts
export async function POST(request: Request) {
  // 1. 認証チェック
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '未認証' }, { status: 401 });
  }

  // 2. リクエストボディを取得
  const body = await request.json();
  const { quotes } = body;

  // 3. バリデーション
  if (!quotes || quotes.length === 0) {
    return Response.json({ error: 'フレーズが空です' }, { status: 400 });
  }

  // 4. データベースに保存
  const quotesToInsert = quotes.map(q => ({
    user_id: user.id,
    text: q.text,
    source_type: q.source_type || 'OTHER',
    // その他のフィールド
  }));

  const { data, error } = await supabase
    .from('quotes')
    .insert(quotesToInsert)
    .select();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 5. 関連テーブルに保存（quote_activities, quote_tags）
  // ...省略...

  // 6. 成功レスポンス
  return Response.json({ success: true, data });
}
```

### ステップ3: Supabaseがデータを保存

```sql
-- PostgreSQL（Supabaseが実行）
INSERT INTO quotes (user_id, text, source_type, created_at)
VALUES ('ユーザーID', 'フレーズ内容', 'OTHER', NOW())
RETURNING *;

-- 関連テーブル
INSERT INTO quote_activities (quote_id, activity_id)
VALUES (1, 1), (1, 2);

INSERT INTO quote_tags (quote_id, tag_id)
VALUES (1, 5);
```

---

## 🔐 認証の流れ

### ログインフロー

```
1. ユーザーが「Googleでログイン」をクリック
   ↓
2. Supabase Authにリダイレクト
   ↓
3. Googleの認証画面
   ↓
4. 認証成功後、コールバックURLにリダイレクト
   /auth/callback
   ↓
5. トークンをCookieに保存
   ↓
6. ホーム画面（/）にリダイレクト
```

### 実装コード

**ログイン画面**（`app/(auth)/login/page.tsx`）
```typescript
'use client';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button onClick={handleGoogleLogin}>
      Googleでログイン
    </button>
  );
}
```

**コールバック処理**（`app/auth/callback/route.ts`）
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // ホーム画面にリダイレクト
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
```

**ミドルウェア**（`middleware.ts`）
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 未認証ユーザーを/loginにリダイレクト
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 認証済みユーザーが/loginにアクセスしたら/にリダイレクト
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}
```

---

## 🗄️ データベース構造とリレーション

### 主要テーブル

```
quotes (フレーズ)
├── id
├── user_id          → users.id
├── text
├── source_type
├── book_id          → books.id
├── sns_user_id      → sns_users.id
└── created_at

books (書籍)
├── id
├── user_id          → users.id
├── title
├── author
└── created_at

tags (タグ)
├── id
├── user_id          → users.id
├── name
└── created_at

activities (活動領域)
├── id
├── name
└── icon

quote_activities (多対多)
├── quote_id         → quotes.id
└── activity_id      → activities.id

quote_tags (多対多)
├── quote_id         → quotes.id
└── tag_id           → tags.id
```

### リレーションの例

**1つのフレーズに対して**:
- 複数の活動領域（`quote_activities`テーブルで関連付け）
- 複数のタグ（`quote_tags`テーブルで関連付け）
- 1つの書籍またはSNSユーザー（外部キー）

```sql
-- フレーズと関連データを取得
SELECT
  q.*,
  b.title AS book_title,
  b.author AS book_author,
  array_agg(DISTINCT a.name) AS activities,
  array_agg(DISTINCT t.name) AS tags
FROM quotes q
LEFT JOIN books b ON q.book_id = b.id
LEFT JOIN quote_activities qa ON q.id = qa.quote_id
LEFT JOIN activities a ON qa.activity_id = a.id
LEFT JOIN quote_tags qt ON q.id = qt.quote_id
LEFT JOIN tags t ON qt.tag_id = t.id
WHERE q.user_id = 'ユーザーID'
GROUP BY q.id, b.id;
```

このクエリは**ビュー**として保存されています:
```sql
CREATE VIEW quotes_with_details AS ...
```

APIでは以下のように使用:
```typescript
const { data } = await supabase
  .from('quotes_with_details')
  .select('*');
```

---

## 🔄 状態管理の流れ

### React Hooksによる状態管理

このプロジェクトでは、複雑な状態管理ライブラリ（Redux等）は使わず、**React Hooks**を使っています。

#### useStateの例

```typescript
'use client';
import { useState } from 'react';

function Counter() {
  // state: 現在の値
  // setState: 値を更新する関数
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>カウント: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

**フロー**:
1. ユーザーがボタンをクリック
2. `setCount(count + 1)` が実行
3. `count` が更新される
4. コンポーネントが再レンダリング
5. 新しい値が表示される

#### useEffectの例（データ取得）

```typescript
'use client';
import { useState, useEffect } from 'react';

function QuoteList() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // コンポーネントがマウントされたときに実行
    fetch('/api/quotes')
      .then(res => res.json())
      .then(data => {
        setQuotes(data);
        setLoading(false);
      });
  }, []); // 空配列 = 初回のみ実行

  if (loading) return <div>読み込み中...</div>;

  return (
    <ul>
      {quotes.map(q => <li key={q.id}>{q.text}</li>)}
    </ul>
  );
}
```

**フロー**:
1. コンポーネントがマウント（画面に表示）
2. `useEffect` 内の処理が実行
3. APIを呼び出し
4. データを受け取る
5. `setQuotes(data)` でstateを更新
6. コンポーネントが再レンダリング
7. データが表示される

---

## 🎨 コンポーネント間のデータの流れ

### Props（親→子）

```typescript
// 親コンポーネント
function ParentComponent() {
  const data = { id: 1, name: "太郎" };

  return <ChildComponent user={data} />;
}

// 子コンポーネント
function ChildComponent({ user }: { user: { id: number; name: string } }) {
  return <div>こんにちは、{user.name}さん</div>;
}
```

**フロー**:
```
ParentComponent (data)
    ↓ props
ChildComponent (user)
    ↓
画面に表示
```

### コールバック（子→親）

```typescript
// 親コンポーネント
function ParentComponent() {
  const [count, setCount] = useState(0);

  const handleIncrement = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <p>カウント: {count}</p>
      <ChildComponent onIncrement={handleIncrement} />
    </div>
  );
}

// 子コンポーネント
function ChildComponent({ onIncrement }: { onIncrement: () => void }) {
  return <button onClick={onIncrement}>+1</button>;
}
```

**フロー**:
```
ユーザーがボタンをクリック
    ↓
ChildComponent の onClick
    ↓
onIncrement() を呼び出し
    ↓
ParentComponent の handleIncrement 実行
    ↓
setCount(count + 1)
    ↓
ParentComponent が再レンダリング
    ↓
新しいcountが表示される
```

---

## ✅ まとめ

### データの流れ

1. **表示**: ユーザー → 画面 → API → DB → 画面 → ユーザー
2. **登録**: ユーザー → フォーム → API → DB → 成功 → 画面更新

### 主要な技術

- **フロントエンド**: React Hooks（useState, useEffect）
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth

### ファイルの役割

- **page.tsx**: 画面を表示
- **hooks/*.ts**: データ取得ロジック
- **api/*/route.ts**: APIエンドポイント
- **lib/supabase/**: データベース接続

---

## 🎯 次のステップ

データの流れが理解できたら、次は**実際のファイルを1つずつ読み解いて**いきましょう！

推奨順序:
1. 型定義ファイル（`lib/supabase/types.ts`）
2. シンプルなコンポーネント（`app/(main)/components/Header.tsx`）
3. APIファイル（`app/api/activities/route.ts`）
4. 画面ファイル（`app/(main)/page.tsx`）

---

**参考リンク**:
- [React Hooks](https://react.dev/reference/react)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
