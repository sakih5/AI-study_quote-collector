# Next.jsとTypeScriptの基礎

このドキュメントでは、このプロジェクトで使用している主要技術の基礎を学びます。

---

## 📖 Next.jsとは？

**Next.js = Reactを使ったWebアプリを作るフレームワーク**

### Reactとは？

React（リアクト）は、Facebookが開発したJavaScriptライブラリで、ユーザーインターフェース（画面）を作るために使われます。

```jsx
// Reactの例
function Welcome() {
  return <h1>こんにちは！</h1>;
}
```

### Next.jsの役割

Reactは便利ですが、以下のような課題があります：

- ページのルーティング（URLの管理）が面倒
- サーバーサイドレンダリングの設定が複雑
- プロジェクトの初期設定が大変

**Next.jsはこれらを解決してくれます！**

---

## 🎯 Next.jsの主な特徴

### 1. ファイルベースルーティング

**ファイルの配置 = URLのパス**

```
app/
├── page.tsx              → https://example.com/
├── about/
│   └── page.tsx          → https://example.com/about
└── settings/
    └── tags/
        └── page.tsx      → https://example.com/settings/tags
```

ファイルを配置するだけで、自動的にページが作られます！

### 2. App Router（このプロジェクトで使用）

Next.js 14では「App Router」という新しい仕組みを使います。

#### 特別なファイル名

| ファイル名 | 役割 |
|-----------|------|
| `page.tsx` | ページ（画面） |
| `layout.tsx` | レイアウト（共通の枠組み） |
| `loading.tsx` | ローディング画面 |
| `error.tsx` | エラー画面 |
| `route.ts` | API エンドポイント |

### 3. サーバーコンポーネント

Next.jsでは、コンポーネントが**サーバー**または**クライアント**で実行されます。

```typescript
// サーバーコンポーネント（デフォルト）
export default function Page() {
  // サーバーで実行される
  return <div>サーバーコンポーネント</div>;
}
```

```typescript
// クライアントコンポーネント
'use client';  // この行が必要

export default function Page() {
  // ブラウザで実行される
  return <div>クライアントコンポーネント</div>;
}
```

#### 使い分け

- **サーバーコンポーネント**: データ取得、SEO対策
- **クライアントコンポーネント**: インタラクティブな機能（ボタン、フォームなど）

---

## 📝 TypeScriptとは？

**TypeScript = 型チェックができるJavaScript**

### JavaScriptの問題点

JavaScriptは柔軟ですが、エラーが起きやすい言語です。

```javascript
// JavaScript
function add(a, b) {
  return a + b;
}

add(1, 2);        // 3 ✅
add("1", "2");    // "12" ❌ 数字のつもりが文字列に！
add(1, "2");      // "12" ❌ 意図しない動作
```

### TypeScriptの解決策

TypeScriptでは**型**を指定できます。

```typescript
// TypeScript
function add(a: number, b: number): number {
  return a + b;
}

add(1, 2);        // 3 ✅
add("1", "2");    // エラー！ 数字じゃないよ
add(1, "2");      // エラー！ 型が違うよ
```

### TypeScriptの基本的な型

```typescript
// 基本型
let name: string = "太郎";          // 文字列
let age: number = 25;               // 数字
let isStudent: boolean = true;      // 真偽値

// 配列
let numbers: number[] = [1, 2, 3];
let names: string[] = ["太郎", "花子"];

// オブジェクト
let user: {
  name: string;
  age: number;
} = {
  name: "太郎",
  age: 25,
};

// 型エイリアス
type User = {
  name: string;
  age: number;
};

let user2: User = {
  name: "花子",
  age: 23,
};
```

---

## 🔧 TypeScriptの便利な機能

### 1. インターフェース

```typescript
interface Quote {
  id: number;
  text: string;
  created_at: string;
}

// 使用例
const quote: Quote = {
  id: 1,
  text: "これは重要なフレーズです",
  created_at: "2025-11-01",
};
```

### 2. 型推論

TypeScriptは型を自動的に推測してくれます。

```typescript
// 型を書かなくてもOK
let message = "こんにちは";  // string型と推論される
let count = 10;              // number型と推論される
```

### 3. オプショナル（任意）プロパティ

```typescript
interface Book {
  title: string;        // 必須
  author?: string;      // 任意（?マークを付ける）
  publisher?: string;   // 任意
}

// authorがなくてもOK
const book: Book = {
  title: "プログラミング入門",
};
```

### 4. ユニオン型（複数の型を許可）

```typescript
type SourceType = "BOOK" | "SNS" | "OTHER";

let source: SourceType = "BOOK";   // ✅
source = "SNS";                    // ✅
source = "WEBSITE";                // ❌ エラー！
```

---

## 🎨 JSX/TSX とは？

JSX（JavaScript XML）は、JavaScriptの中にHTMLのような記法を書けるようにしたものです。TypeScriptで使う場合はTSXと呼びます。

### 基本的な書き方

```tsx
// HTMLっぽい書き方
function Greeting() {
  return <h1>こんにちは！</h1>;
}

// JavaScriptを埋め込む（{}で囲む）
function Greeting({ name }: { name: string }) {
  return <h1>こんにちは、{name}さん！</h1>;
}

// 使用例
<Greeting name="太郎" />
// 出力: こんにちは、太郎さん！
```

### JSXのルール

1. **1つの親要素で囲む**

```tsx
// ❌ ダメな例
function Bad() {
  return (
    <h1>タイトル</h1>
    <p>本文</p>
  );
}

// ✅ 良い例
function Good() {
  return (
    <div>
      <h1>タイトル</h1>
      <p>本文</p>
    </div>
  );
}

// ✅ フラグメント（空タグ）も使える
function Good2() {
  return (
    <>
      <h1>タイトル</h1>
      <p>本文</p>
    </>
  );
}
```

2. **className を使う**（classではない）

```tsx
// ❌ ダメ
<div class="container">...</div>

// ✅ 良い
<div className="container">...</div>
```

3. **自己閉じタグは `/` で閉じる**

```tsx
// HTML
<img src="..." >
<input type="text">

// JSX/TSX
<img src="..." />
<input type="text" />
```

---

## 🧩 Reactコンポーネントの基本

### コンポーネントとは？

コンポーネントは**再利用可能なUI部品**です。

```tsx
// Buttonコンポーネント
function Button({ text }: { text: string }) {
  return <button className="btn">{text}</button>;
}

// 使用例
function Page() {
  return (
    <div>
      <Button text="保存" />
      <Button text="キャンセル" />
      <Button text="削除" />
    </div>
  );
}
```

### Props（プロパティ）

コンポーネントに値を渡すための仕組み。

```tsx
// 型定義
type ButtonProps = {
  text: string;
  color?: "blue" | "red" | "green";
  onClick?: () => void;
};

// コンポーネント
function Button({ text, color = "blue", onClick }: ButtonProps) {
  return (
    <button
      className={`btn-${color}`}
      onClick={onClick}
    >
      {text}
    </button>
  );
}

// 使用例
<Button text="保存" color="blue" onClick={() => alert("保存しました")} />
```

### State（状態）

コンポーネント内で変化する値を管理します。

```tsx
'use client';  // クライアントコンポーネントにする
import { useState } from 'react';

function Counter() {
  // count: 現在の値
  // setCount: 値を更新する関数
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>カウント: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        +1
      </button>
    </div>
  );
}
```

---

## 📚 このプロジェクトでの使用例

### 実際のコード（app/layout.tsx）

```typescript
import type { Metadata } from 'next';
import '../styles/globals.css';

// ページのメタデータ（タイトル、説明など）
export const metadata: Metadata = {
  title: '抜き書きアプリ',
  description: '書籍やSNSから重要なフレーズを記録・整理する個人用ナレッジベースアプリ',
};

// ルートレイアウト（全ページ共通）
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

#### 1行ずつ解説

```typescript
// 1行目: 型定義のインポート
import type { Metadata } from 'next';
```

- `import` = 他のファイルから何かを持ってくる
- `type` = 型定義だけをインポート（コードは含まない）
- `Metadata` = Next.jsが提供するメタデータの型

```typescript
// 2行目: CSSのインポート
import '../styles/globals.css';
```

- グローバルなCSSスタイルを読み込む
- `../` = 1つ上のディレクトリ

```typescript
// 4-7行目: メタデータの設定
export const metadata: Metadata = {
  title: '抜き書きアプリ',
  description: '書籍やSNSから...',
};
```

- `export` = 他のファイルから使えるようにする
- `const` = 定数（変更できない変数）
- `: Metadata` = この変数の型はMetadata
- ブラウザのタブやSEOで使われる

```typescript
// 9-18行目: レイアウトコンポーネント
export default function RootLayout({ children }) {
```

- `export default` = デフォルトエクスポート（1ファイル1つ）
- `function` = 関数を定義
- `{ children }` = 引数（分割代入）

```typescript
  children,
}: Readonly<{
  children: React.ReactNode;
}>)
```

- `Readonly<...>` = 読み取り専用の型
- `React.ReactNode` = Reactで表示できるもの（要素、文字列、数字など）

```typescript
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
```

- `return` = この関数が返すもの
- `<html>` `<body>` = HTMLタグ
- `{children}` = 子要素が入る場所
- このレイアウトが全ページで使われる

---

## ✅ まとめ

### Next.js

- Reactベースのフレームワーク
- ファイル配置 = URLパス
- サーバーコンポーネントとクライアントコンポーネント

### TypeScript

- 型チェックができるJavaScript
- エラーを事前に発見できる
- コードの可読性が上がる

### JSX/TSX

- JavaScriptの中にHTMLを書ける
- `{}` で変数や式を埋め込める
- コンポーネントで再利用可能

---

## 🎯 次のステップ

基礎が理解できたら、次は**プロジェクト構造**を学びましょう！

👉 [02_project_structure.md](./02_project_structure.md)

---

**参考リンク**:

- [Next.js 公式ドキュメント](https://nextjs.org/docs)
- [TypeScript 公式ドキュメント](https://www.typescriptlang.org/docs/)
- [React 公式ドキュメント](https://react.dev/)
