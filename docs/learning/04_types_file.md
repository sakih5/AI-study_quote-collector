# 型定義ファイルを読み解く

このドキュメントでは、`lib/supabase/types.ts` を読み解きます。

**ファイルパス**: `lib/supabase/types.ts`

---

## 📋 このファイルの役割

このファイルは、**データベースのテーブル構造をTypeScriptの型として定義**しています。

### なぜ必要？

データベース（Supabase）と TypeScript のコードを連携させるため。

```typescript
// 型定義がない場合
const book = await supabase.from('books').select().single();
book.title  // どんな型？わからない！

// 型定義がある場合
const book = await supabase.from('books').select().single();
book.title  // string型！エディタが補完してくれる
```

---

## 🔍 ファイル全体の構造

```typescript
export type Json = ...                    // JSON型の定義

export interface Database {               // データベース全体の型
  public: {
    Tables: {                             // テーブルの型定義
      activities: { ... }
      books: { ... }
      sns_users: { ... }
      tags: { ... }
      quotes: { ... }
      quote_activities: { ... }
      quote_tags: { ... }
    };
    Views: {                              // ビューの型定義
      quotes_with_details: { ... }
    };
    Functions: { ... }                    // 関数の型定義（空）
    Enums: { ... }                        // 列挙型の型定義（空）
  };
}
```

---

## 📖 各部分を詳しく見ていく

### 1. Json型の定義

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
```

#### 解説

- `|` = 「または」を意味する（ユニオン型）
- この型は、JSONとして有効な値を表す

**例**:

```typescript
const json1: Json = "文字列";              // ✅ OK
const json2: Json = 123;                   // ✅ OK
const json3: Json = { name: "太郎" };      // ✅ OK
const json4: Json = [1, 2, 3];             // ✅ OK
const json5: Json = null;                  // ✅ OK
```

#### どこで使う？

`quotes` テーブルの `source_meta` フィールドで使用。

```typescript
quotes: {
  Row: {
    source_meta: Json | null;  // ← ここ
  }
}
```

---

### 2. Database インターフェース

```typescript
export interface Database {
  public: {
    Tables: { ... };
    Views: { ... };
    Functions: { ... };
    Enums: { ... };
  };
}
```

#### 解説

- `interface` = オブジェクトの形を定義する
- `public` = PostgreSQLのスキーマ名（通常はpublic）
- `Tables` = データベースのテーブル
- `Views` = ビュー（複数テーブルを結合したもの）

---

### 3. テーブルの型定義

各テーブルには、3つの型があります。

```typescript
activities: {
  Row: { ... };      // 読み取り時の型
  Insert: { ... };   // 挿入時の型
  Update: { ... };   // 更新時の型
};
```

#### なぜ3つに分かれている？

**Row** = データベースから取得したときの型

- すべてのフィールドが存在する
- `id` や `created_at` は必須

**Insert** = データを挿入するときの型

- 自動生成されるフィールド（`id`, `created_at`）は省略可能（`?`付き）
- 必須フィールドは省略不可

**Update** = データを更新するときの型

- すべてのフィールドが省略可能
- 更新したいフィールドだけ指定すればOK

---

### 4. activities テーブル

```typescript
activities: {
  Row: {
    id: number;
    name: string;
    description: string | null;
    icon: string;
    display_order: number;
    created_at: string;
  };
  Insert: {
    id?: number;
    name: string;
    description?: string | null;
    icon: string;
    display_order: number;
    created_at?: string;
  };
  Update: {
    id?: number;
    name?: string;
    description?: string | null;
    icon?: string;
    display_order?: number;
    created_at?: string;
  };
};
```

#### フィールドの意味

| フィールド | 型 | 意味 | 例 |
|-----------|-----|------|-----|
| `id` | `number` | 活動領域のID | 1 |
| `name` | `string` | 名前 | "仕事・キャリア" |
| `description` | `string \| null` | 説明 | "仕事に関する..." |
| `icon` | `string` | アイコン | "💼" |
| `display_order` | `number` | 表示順序 | 1 |
| `created_at` | `string` | 作成日時 | "2025-11-01T12:00:00Z" |

#### `string | null` とは？

- `string` または `null` を許可
- `null` = 値が存在しない

```typescript
const desc1: string | null = "説明文";     // ✅ OK
const desc2: string | null = null;         // ✅ OK
```

#### `id?: number` の `?` とは？

- オプショナル（省略可能）を意味する
- 値を指定してもしなくてもOK

```typescript
// Insert時
const activity = {
  name: "仕事",
  icon: "💼",
  display_order: 1,
  // id は省略してもOK（データベースが自動生成）
};
```

---

### 5. books テーブル

```typescript
books: {
  Row: {
    id: number;
    user_id: string;
    title: string;
    author: string;
    cover_image_url: string | null;
    isbn: string | null;
    asin: string | null;
    publisher: string | null;
    publication_date: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
  // ...省略...
};
```

#### フィールドの意味

| フィールド | 型 | 意味 | 例 |
|-----------|-----|------|-----|
| `id` | `number` | 書籍ID | 1 |
| `user_id` | `string` | ユーザーID（所有者） | "abc123..." |
| `title` | `string` | タイトル | "プログラミング入門" |
| `author` | `string` | 著者 | "山田太郎" |
| `cover_image_url` | `string \| null` | カバー画像URL | "https://..." |
| `isbn` | `string \| null` | ISBN番号 | "978-4-..." |
| `asin` | `string \| null` | Amazon ASIN | "B08XYZ..." |
| `publisher` | `string \| null` | 出版社 | "技術評論社" |
| `publication_date` | `string \| null` | 出版日 | "2025-01-01" |
| `created_at` | `string` | 作成日時 | "2025-11-01T..." |
| `updated_at` | `string` | 更新日時 | "2025-11-01T..." |
| `deleted_at` | `string \| null` | 削除日時 | null（削除されていない） |

#### ソフトデリート

`deleted_at` フィールドで**ソフトデリート**を実装しています。

```typescript
// 削除されていない書籍
deleted_at: null

// 削除された書籍
deleted_at: "2025-11-01T12:00:00Z"
```

**メリット**:
- データを完全に削除せず、「削除済み」フラグを立てるだけ
- 復元が可能
- 履歴を保持できる

---

### 6. sns_users テーブル

```typescript
sns_users: {
  Row: {
    id: number;
    user_id: string;
    platform: 'X' | 'THREADS';
    handle: string;
    display_name: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
  // ...省略...
};
```

#### リテラル型 `'X' | 'THREADS'`

```typescript
platform: 'X' | 'THREADS';
```

これは**リテラル型**と呼ばれ、特定の文字列のみを許可します。

```typescript
const platform1: 'X' | 'THREADS' = 'X';        // ✅ OK
const platform2: 'X' | 'THREADS' = 'THREADS';  // ✅ OK
const platform3: 'X' | 'THREADS' = 'Facebook'; // ❌ エラー！
```

**メリット**:
- タイポを防げる
- 許可された値以外を使えない
- エディタで自動補完される

---

### 7. tags テーブル

```typescript
tags: {
  Row: {
    id: number;
    user_id: string;
    name: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
  // ...省略...
};
```

シンプルな構造。タグ名（`name`）だけを保存します。

---

### 8. quotes テーブル

```typescript
quotes: {
  Row: {
    id: number;
    user_id: string;
    text: string;
    source_type: 'BOOK' | 'SNS' | 'OTHER';
    book_id: number | null;
    sns_user_id: number | null;
    page_number: number | null;
    source_meta: Json | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
  // ...省略...
};
```

#### フィールドの意味

| フィールド | 型 | 意味 |
|-----------|-----|------|
| `text` | `string` | フレーズのテキスト |
| `source_type` | `'BOOK' \| 'SNS' \| 'OTHER'` | 出典タイプ |
| `book_id` | `number \| null` | 書籍ID（本の場合） |
| `sns_user_id` | `number \| null` | SNSユーザーID（SNSの場合） |
| `page_number` | `number \| null` | ページ番号 |
| `source_meta` | `Json \| null` | その他の出典情報 |

#### データの整合性

`source_type` によって、どのフィールドに値が入るかが決まります。

```typescript
// 本からのフレーズ
{
  source_type: 'BOOK',
  book_id: 1,           // ← 値あり
  sns_user_id: null,    // ← null
}

// SNSからのフレーズ
{
  source_type: 'SNS',
  book_id: null,        // ← null
  sns_user_id: 5,       // ← 値あり
}

// その他
{
  source_type: 'OTHER',
  book_id: null,
  sns_user_id: null,
  source_meta: { source: "メモ" }  // ← JSONで自由に保存
}
```

---

### 9. 中間テーブル（多対多）

#### quote_activities

```typescript
quote_activities: {
  Row: {
    id: number;
    quote_id: number;
    activity_id: number;
    created_at: string;
  };
  // ...省略...
};
```

**役割**: フレーズと活動領域の関連付け

```
quotes (フレーズ) ← quote_activities → activities (活動領域)

1つのフレーズに複数の活動領域
1つの活動領域に複数のフレーズ
```

**例**:

```typescript
// フレーズID=1 に 活動領域ID=1,2 を関連付け
quote_activities: [
  { quote_id: 1, activity_id: 1 },  // 仕事
  { quote_id: 1, activity_id: 2 },  // 学習
]
```

#### quote_tags

```typescript
quote_tags: {
  Row: {
    id: number;
    quote_id: number;
    tag_id: number;
    created_at: string;
  };
  // ...省略...
};
```

**役割**: フレーズとタグの関連付け

同じように多対多のリレーションを実現します。

---

### 10. ビュー（quotes_with_details）

```typescript
Views: {
  quotes_with_details: {
    Row: {
      id: number;
      user_id: string;
      text: string;
      source_type: 'BOOK' | 'SNS' | 'OTHER';
      // ... フレーズの基本情報
      book_id: number | null;
      book_title: string | null;
      book_author: string | null;
      book_cover_image_url: string | null;
      // ... 書籍情報
      sns_user_id: number | null;
      sns_platform: 'X' | 'THREADS' | null;
      sns_handle: string | null;
      sns_display_name: string | null;
      // ... SNSユーザー情報
      activity_ids: number[] | null;
      activity_names: string[] | null;
      // ... 活動領域（配列）
      tag_ids: number[] | null;
      tag_names: string[] | null;
      // ... タグ（配列）
    };
  };
};
```

#### ビューとは？

**複数のテーブルを結合して、1つのテーブルのように扱えるようにしたもの**。

```sql
-- ビューの定義（PostgreSQL）
CREATE VIEW quotes_with_details AS
SELECT
  q.*,
  b.title AS book_title,
  b.author AS book_author,
  -- ... 他のフィールド
FROM quotes q
LEFT JOIN books b ON q.book_id = b.id
LEFT JOIN sns_users s ON q.sns_user_id = s.id
-- ... 他の結合
```

#### メリット

- 1回のクエリで全ての情報を取得できる
- N+1問題を回避

```typescript
// ビューを使わない場合（N+1問題）
const quotes = await supabase.from('quotes').select();
for (const quote of quotes) {
  // 各フレーズごとにクエリを発行（遅い！）
  const book = await supabase.from('books').select().eq('id', quote.book_id);
}

// ビューを使う場合（1回のクエリ）
const quotes = await supabase.from('quotes_with_details').select();
// 書籍情報もタグ情報も全て含まれている！
```

#### 配列型 `number[]`, `string[]`

```typescript
activity_ids: number[] | null;
activity_names: string[] | null;
```

- `number[]` = 数字の配列
- `string[]` = 文字列の配列

**例**:

```typescript
activity_ids: [1, 2, 5]
activity_names: ["仕事・キャリア", "学習・研究", "趣味・娯楽"]
```

---

## 💡 実際の使用例

### データを取得する

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

const supabase = createClient();

// Row型で型が付く
const { data: books } = await supabase
  .from('books')
  .select();
// books: Database['public']['Tables']['books']['Row'][]

// エディタが補完してくれる
books[0].title;  // string型
books[0].author; // string型
```

### データを挿入する

```typescript
// Insert型で型が付く
const newBook: Database['public']['Tables']['books']['Insert'] = {
  user_id: 'abc123',
  title: 'プログラミング入門',
  author: '山田太郎',
  // id, created_at は省略可能
};

await supabase.from('books').insert(newBook);
```

### データを更新する

```typescript
// Update型で型が付く
const update: Database['public']['Tables']['books']['Update'] = {
  title: '新しいタイトル',
  // 他のフィールドは省略可能
};

await supabase.from('books').update(update).eq('id', 1);
```

---

## ✅ まとめ

### このファイルの役割

- データベースのテーブル構造をTypeScriptの型として定義
- エディタの補完とエラーチェックを有効化

### 主な型の種類

- **Row**: データ取得時
- **Insert**: データ挿入時
- **Update**: データ更新時

### 重要な概念

- **`string | null`**: nullを許可
- **`field?: type`**: 省略可能
- **`'A' | 'B' | 'C'`**: リテラル型（特定の値のみ）
- **`type[]`**: 配列型

### ビュー

- 複数テーブルを結合
- 1回のクエリで全情報取得
- N+1問題を回避

---

## 🎯 次のステップ

型定義が理解できたら、次は**シンプルなコンポーネント**を読み解きましょう！

👉 [05_header_component.md](./05_header_component.md)

---

**参考リンク**:

- [TypeScript Handbook - Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [TypeScript Handbook - Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)
- [Supabase TypeScript Support](https://supabase.com/docs/guides/api/generating-types)
