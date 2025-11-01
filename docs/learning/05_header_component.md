# シンプルなコンポーネントを読み解く - Header

このドキュメントでは、`app/(main)/components/Header.tsx` を読み解きます。

**ファイルパス**: `app/(main)/components/Header.tsx`

---

## 📋 このファイルの役割

ヘッダーコンポーネント - アプリの上部に表示されるナビゲーションバー。

### 表示内容

- アプリ名（「抜き書きアプリ」）
- ログイン中のユーザー名
- タグ管理へのリンク
- ログアウトボタン

---

## 🔍 コード全体を見る

```typescript
'use client';

import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const displayName = user.email?.split('@')[0] || 'ユーザー';

  return (
    <header>
      {/* JSX */}
    </header>
  );
}
```

---

## 📖 1行ずつ詳しく見ていく

### 1. `'use client';`

```typescript
'use client';
```

#### 解説

- **クライアントコンポーネント**であることを宣言
- ブラウザで実行される
- インタラクティブな機能（ボタン、state）を使える

#### なぜ必要？

Next.js 14 では、デフォルトで**サーバーコンポーネント**。インタラクティブな機能を使う場合は、明示的にクライアントコンポーネントにする必要があります。

このコンポーネントでは以下を使用:

- `useState` (React Hook)
- `onClick` (イベントハンドラー)
- `useRouter` (ナビゲーション)

---

### 2. インポート

```typescript
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import Link from 'next/link';
```

#### 各インポートの説明

**`User` 型**

```typescript
import { User } from '@supabase/supabase-js';
```

- Supabaseのユーザー型
- ログイン中のユーザー情報を表す

**`useRouter` フック**

```typescript
import { useRouter } from 'next/navigation';
```

- Next.jsのナビゲーション用フック
- ページ遷移やリフレッシュに使用

**`createClient` 関数**

```typescript
import { createClient } from '@/lib/supabase/client';
```

- Supabaseクライアントを作成
- `@/` = プロジェクトのルートディレクトリ

**`useState` フック**

```typescript
import { useState } from 'react';
```

- Reactの状態管理フック
- ローディング状態を管理

**`Link` コンポーネント**

```typescript
import Link from 'next/link';
```

- Next.jsのリンクコンポーネント
- ページ遷移を高速化（プリフェッチ）

---

### 3. Props の型定義

```typescript
interface HeaderProps {
  user: User;
}
```

#### 解説

- `interface` = オブジェクトの形を定義
- `HeaderProps` = このコンポーネントのPropsの型
- `user: User` = userプロパティは `User` 型

#### 使い方

```typescript
// 親コンポーネントから渡される
<Header user={currentUser} />
```

---

### 4. コンポーネント定義

```typescript
export default function Header({ user }: HeaderProps) {
```

#### 解説

- `export default` = デフォルトエクスポート
- `function Header` = Header という関数コンポーネント
- `{ user }` = propsから user を分割代入
- `: HeaderProps` = propsの型

#### 分割代入とは？

```typescript
// 分割代入なし
function Header(props: HeaderProps) {
  const user = props.user;  // props.user でアクセス
}

// 分割代入あり
function Header({ user }: HeaderProps) {
  // 直接 user でアクセスできる
}
```

---

### 5. State とフックの初期化

```typescript
const [loading, setLoading] = useState(false);
const router = useRouter();
const supabase = createClient();
```

#### `useState` - ローディング状態

```typescript
const [loading, setLoading] = useState(false);
```

- `loading` = 現在の状態（初期値: `false`）
- `setLoading` = 状態を更新する関数
- ログアウト処理中に `true` にして、ボタンを無効化

#### `useRouter` - ページ遷移

```typescript
const router = useRouter();
```

- `router.push('/login')` = ログインページに遷移
- `router.refresh()` = ページをリフレッシュ

#### `createClient` - Supabaseクライアント

```typescript
const supabase = createClient();
```

- ブラウザ用のSupabaseクライアントを作成
- 認証操作に使用

---

### 6. ログアウト処理

```typescript
const handleLogout = async () => {
  setLoading(true);
  await supabase.auth.signOut();
  router.push('/login');
  router.refresh();
};
```

#### 1行ずつ解説

```typescript
const handleLogout = async () => {
```

- `async` = 非同期関数（`await` を使える）
- イベントハンドラー関数

```typescript
  setLoading(true);
```

- ローディング状態を `true` に設定
- ボタンが無効化される

```typescript
  await supabase.auth.signOut();
```

- `await` = 処理が完了するまで待つ
- Supabaseでログアウト処理を実行
- セッションを削除

```typescript
  router.push('/login');
```

- ログインページにリダイレクト

```typescript
  router.refresh();
```

- ページをリフレッシュ
- サーバーコンポーネントを再取得

#### フロー

```
ユーザーがログアウトボタンをクリック
    ↓
handleLogout 実行
    ↓
loading = true（ボタン無効化）
    ↓
supabase.auth.signOut()（セッション削除）
    ↓
/login にリダイレクト
    ↓
ページリフレッシュ
```

---

### 7. 表示名の取得

```typescript
const displayName = user.email?.split('@')[0] || 'ユーザー';
```

#### 解説

- `user.email` = ユーザーのメールアドレス
- `?.` = オプショナルチェイニング（`null/undefined` の場合はエラーにならない）
- `.split('@')[0]` = `@` で分割して最初の部分を取得
- `|| 'ユーザー'` = 値がない場合は「ユーザー」

#### 例

```typescript
// メール: taro@example.com
displayName = "taro"

// メール: null
displayName = "ユーザー"
```

#### オプショナルチェイニング `?.` とは？

```typescript
// ?.なし
const name = user.email.split('@')[0];  // emailがnullならエラー！

// ?.あり
const name = user.email?.split('@')[0]; // emailがnullなら undefined
```

---

### 8. JSX（画面の構造）

#### ヘッダー全体

```typescript
return (
  <header className="bg-[#2a2a2a] border-b border-gray-700">
```

- `<header>` = HTML5のヘッダー要素
- `className` = CSSクラス（Tailwind CSS）
  - `bg-[#2a2a2a]` = 背景色（ダークグレー）
  - `border-b` = 下ボーダー
  - `border-gray-700` = ボーダー色

#### コンテナ

```typescript
<div className="container mx-auto px-4">
```

- `container` = 最大幅を設定
- `mx-auto` = 左右マージンを自動（中央寄せ）
- `px-4` = 左右パディング

#### フレックスレイアウト

```typescript
<div className="flex items-center justify-between h-16">
```

- `flex` = フレックスボックス
- `items-center` = 垂直方向の中央揃え
- `justify-between` = 左右に配置（間にスペース）
- `h-16` = 高さ 4rem（64px）

```
┌──────────────────────────────────────┐
│ [左側]              [右側]            │
│ アプリ名      ユーザー タグ ログアウト│
└──────────────────────────────────────┘
```

---

### 9. 左側: アプリ名

```typescript
<Link href="/" className="flex items-center gap-2">
  <span className="text-2xl font-bold text-white">抜き書きアプリ</span>
</Link>
```

#### `Link` コンポーネント

- `href="/"` = ホーム画面へのリンク
- Next.jsの `Link` は高速ページ遷移を実現

#### スタイル

- `text-2xl` = テキストサイズ（1.5rem = 24px）
- `font-bold` = 太字
- `text-white` = 白色

---

### 10. 右側: ユーザー情報

```typescript
<div className="text-sm text-gray-300">
  <span className="text-gray-400">ログイン中:</span>{' '}
  <span className="font-medium">{displayName}</span>
</div>
```

#### `{displayName}`

- 変数を埋め込む（JSXの構文）
- `{}` で囲む

#### `{' '}`

- スペースを挿入
- JSXでは複数の要素間の空白が削除されるため、明示的に挿入

---

### 11. タグ管理リンク

```typescript
<Link
  href="/settings/tags"
  className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
>
  <span>🏷️</span>
  <span>タグ管理</span>
</Link>
```

#### ホバー効果

- `hover:text-white` = ホバー時に白色
- `hover:bg-gray-700` = ホバー時に背景色
- `transition-colors` = 色の変化をスムーズに

#### アイコンとテキスト

- `flex items-center gap-1` = 横並び、中央揃え、間隔1
- 絵文字 + テキスト

---

### 12. ログアウトボタン

```typescript
<button
  onClick={handleLogout}
  disabled={loading}
  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
>
  {loading ? '処理中...' : 'ログアウト'}
</button>
```

#### `onClick`

```typescript
onClick={handleLogout}
```

- クリックイベント
- `handleLogout` 関数を実行

#### `disabled`

```typescript
disabled={loading}
```

- `loading` が `true` のときボタンを無効化
- クリックできなくなる

#### 条件分岐（三項演算子）

```typescript
{loading ? '処理中...' : 'ログアウト'}
```

- `条件 ? 真の場合 : 偽の場合`
- `loading` が `true` なら「処理中...」
- `loading` が `false` なら「ログアウト」

#### スタイル

- `bg-red-600` = 赤色背景
- `hover:bg-red-700` = ホバー時に濃い赤
- `disabled:bg-gray-600` = 無効時にグレー
- `disabled:cursor-not-allowed` = 無効時にカーソルを禁止マークに

---

## 💡 Tailwind CSS について

### クラス名の読み方

| クラス | 意味 | CSS |
|-------|------|-----|
| `bg-red-600` | 背景色 | `background-color: #dc2626;` |
| `text-white` | 文字色 | `color: #ffffff;` |
| `px-4` | 左右パディング | `padding-left: 1rem; padding-right: 1rem;` |
| `py-2` | 上下パディング | `padding-top: 0.5rem; padding-bottom: 0.5rem;` |
| `rounded-lg` | 角丸 | `border-radius: 0.5rem;` |
| `hover:bg-red-700` | ホバー時の背景色 | `.class:hover { background-color: #b91c1c; }` |
| `flex` | フレックスボックス | `display: flex;` |
| `items-center` | 垂直中央 | `align-items: center;` |
| `justify-between` | 両端配置 | `justify-content: space-between;` |

### 数値の対応

- `1` = 0.25rem = 4px
- `2` = 0.5rem = 8px
- `4` = 1rem = 16px
- `8` = 2rem = 32px
- `16` = 4rem = 64px

---

## 🎨 コンポーネントの全体像

```
Header
├── header（背景: ダークグレー）
    ├── container（中央寄せ）
        ├── flex container（左右配置）
            ├── 左側
            │   └── Link（アプリ名）
            └── 右側
                ├── ユーザー情報
                ├── タグ管理リンク
                └── ログアウトボタン
```

---

## 🔄 動作の流れ

### 初回表示

```
1. Header コンポーネントがマウント
2. user プロパティを受け取る
3. displayName を生成
4. JSX をレンダリング
```

### ログアウトボタンクリック

```
1. ユーザーがボタンをクリック
2. handleLogout 実行
3. loading = true
4. ボタンが「処理中...」に変わる
5. supabase.auth.signOut() 実行
6. ログインページにリダイレクト
```

---

## ✅ まとめ

### このコンポーネントの役割

- アプリのヘッダーを表示
- ユーザー情報を表示
- ログアウト機能を提供
- タグ管理へのナビゲーション

### 使用した技術

- **React Hooks**: `useState`, `useRouter`
- **Supabase**: 認証（ログアウト）
- **Next.js**: `Link` コンポーネント
- **Tailwind CSS**: スタイリング

### 重要な概念

- **クライアントコンポーネント**: `'use client'`
- **Props**: 親から子へデータを渡す
- **State**: コンポーネント内の状態管理
- **イベントハンドラー**: `onClick={handleLogout}`
- **条件分岐**: `{loading ? 'A' : 'B'}`
- **オプショナルチェイニング**: `user.email?.split()`

---

## 🎯 次のステップ

シンプルなコンポーネントが理解できたら、次は**APIファイル**を読み解きましょう！

👉 [06_api_activities.md](./06_api_activities.md)

---

**参考リンク**:

- [React Hooks - useState](https://react.dev/reference/react/useState)
- [Next.js - Link](https://nextjs.org/docs/app/api-reference/components/link)
- [Next.js - useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)
- [Tailwind CSS](https://tailwindcss.com/docs)
