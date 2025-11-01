# プロジェクト構造の理解

このドキュメントでは、プロジェクトのディレクトリ構造とファイルの役割を学びます。

---

## 📁 プロジェクト全体の構造

```
AI-study_quote-collector/
├── app/                    ← 画面とAPIのコード
├── lib/                    ← 共通で使う機能
├── styles/                 ← デザイン（CSS）
├── docs/                   ← ドキュメント
├── public/                 ← 画像などの静的ファイル
├── scripts/                ← ユーティリティスクリプト
├── node_modules/           ← インストールされたパッケージ
├── package.json            ← プロジェクト設定
├── tsconfig.json           ← TypeScript設定
├── next.config.js          ← Next.js設定
├── tailwind.config.js      ← Tailwind CSS設定
└── .env.local              ← 環境変数（秘密情報）
```

---

## 🎯 各ディレクトリの詳細

### 1. `app/` - 画面とAPIの中心

Next.js App Routerの**最重要ディレクトリ**です。

```
app/
├── (auth)/                 ← 認証関連（Route Group）
│   └── login/
│       └── page.tsx        ← ログイン画面
│
├── (main)/                 ← メインアプリ（Route Group）
│   ├── layout.tsx          ← メインレイアウト
│   ├── page.tsx            ← ホーム画面（/）
│   ├── components/         ← ページ専用コンポーネント
│   │   ├── Header.tsx
│   │   ├── QuoteModal.tsx
│   │   ├── QuoteGroupCard.tsx
│   │   └── ...
│   ├── hooks/              ← カスタムフック
│   │   ├── useQuotesGrouped.ts
│   │   ├── useTags.ts
│   │   └── ...
│   └── settings/
│       └── tags/
│           └── page.tsx    ← タグ管理画面
│
├── api/                    ← APIエンドポイント
│   ├── activities/
│   │   └── route.ts        ← GET /api/activities
│   ├── quotes/
│   │   ├── route.ts        ← GET/POST /api/quotes
│   │   ├── [id]/
│   │   │   └── route.ts    ← PUT/DELETE /api/quotes/:id
│   │   └── grouped/
│   │       └── route.ts    ← GET /api/quotes/grouped
│   └── ...
│
├── auth/
│   └── callback/
│       └── route.ts        ← 認証コールバック
│
└── layout.tsx              ← ルートレイアウト（全ページ共通）
```

#### Route Group `(auth)` と `(main)`

括弧で囲んだディレクトリは**URLに含まれません**。

```
app/(auth)/login/page.tsx       → URL: /login
app/(main)/page.tsx             → URL: /
app/(main)/settings/tags/page.tsx → URL: /settings/tags
```

**使い分けの理由**:

- `(auth)`: ヘッダーなしのシンプルなレイアウト
- `(main)`: ヘッダーありのメインレイアウト

---

### 2. `lib/` - 共通機能

アプリ全体で使う共通のロジックや設定を格納します。

```
lib/
├── supabase/               ← データベース接続
│   ├── client.ts           ← ブラウザ用クライアント
│   ├── server.ts           ← サーバー用クライアント
│   └── types.ts            ← データベースの型定義
│
├── ocr/                    ← OCR機能
│   ├── types.ts            ← OCR関連の型
│   ├── tesseract.ts        ← Tesseract.js統合
│   └── README.md           ← OCR実装ガイド
│
└── utils/                  ← ユーティリティ関数（将来使用）
```

#### `lib/supabase/`

**Supabase** = データベース + 認証を提供するサービス

- **client.ts**: ブラウザ（クライアント）で動くコード用
- **server.ts**: サーバーで動くコード用
- **types.ts**: データベースのテーブル構造を型定義

なぜ2つに分かれている？

- ブラウザとサーバーで認証方法が異なるため

#### `lib/ocr/`

**OCR** = 画像からテキストを抽出する技術

- **tesseract.ts**: Tesseract.jsというライブラリを使ってOCRを実行

---

### 3. `styles/` - デザイン

```
styles/
└── globals.css             ← グローバルスタイル
```

このプロジェクトでは**Tailwind CSS**を使用しているため、カスタムCSSは最小限です。

#### Tailwind CSSとは？

クラス名でスタイルを適用するCSSフレームワーク。

```tsx
// 通常のCSS
<div className="my-box">...</div>

// styles.css
.my-box {
  padding: 1rem;
  background-color: blue;
  border-radius: 0.5rem;
}

// Tailwind CSS
<div className="p-4 bg-blue-500 rounded-lg">...</div>
```

---

### 4. `docs/` - ドキュメント

```
docs/
├── 要件定義書_v2.md
├── 画面設計書_実装版_v2.md
├── API設計書_v2.md
├── データベース設計書_v2.md
├── 技術仕様書_v2.md
├── development/            ← 開発関連ドキュメント
│   ├── PROGRESS.md         ← 進捗状況
│   ├── QUICKSTART.md       ← クイックスタート
│   └── work_logs/          ← 作業ログ
└── learning/               ← 学習ガイド（このディレクトリ）
    ├── README.md
    ├── 01_basics.md
    ├── 02_project_structure.md
    └── 03_data_flow.md
```

---

### 5. `public/` - 静的ファイル

```
public/
└── (画像やアイコンなど)
```

このディレクトリのファイルは、`/` からアクセスできます。

```tsx
// public/logo.png にアクセス
<img src="/logo.png" alt="ロゴ" />
```

---

### 6. `scripts/` - ユーティリティスクリプト

```
scripts/
└── seed-test-data.js       ← テストデータ生成スクリプト
```

開発時に便利なスクリプトを格納します。

---

## 📝 ファイルの命名規則

### Next.js App Routerの特別なファイル

| ファイル名 | 役割 | 例 |
|-----------|------|-----|
| `page.tsx` | ページ（画面） | `app/page.tsx` → `/` |
| `layout.tsx` | レイアウト | `app/(main)/layout.tsx` |
| `route.ts` | APIエンドポイント | `app/api/quotes/route.ts` |
| `loading.tsx` | ローディング画面 | （未使用） |
| `error.tsx` | エラー画面 | （未使用） |

### コンポーネントファイル

```
PascalCase.tsx

例:
- Header.tsx
- QuoteModal.tsx
- QuoteGroupCard.tsx
```

- コンポーネント名は**大文字で始める**（PascalCase）
- ファイル名もコンポーネント名と同じ

### カスタムフック

```
useSomething.ts

例:
- useQuotesGrouped.ts
- useTags.ts
- useActivities.ts
```

- `use` で始める
- camelCase（最初は小文字）

### ユーティリティ関数

```
kebab-case.ts または camelCase.ts

例:
- csv-export.ts
- validators.ts
```

---

## 🗂️ ファイルの種類と拡張子

| 拡張子 | 内容 | 使用例 |
|-------|------|--------|
| `.tsx` | TypeScript + JSX（画面） | コンポーネント、ページ |
| `.ts` | TypeScript（ロジック） | API、フック、型定義 |
| `.css` | CSS（スタイル） | グローバルスタイル |
| `.md` | Markdown（文書） | ドキュメント |
| `.json` | JSON（設定） | package.json、tsconfig.json |
| `.js` | JavaScript | 設定ファイル（next.config.js） |

---

## 🔍 コードの配置ルール

### 1. ページ専用のコンポーネント

そのページでしか使わないコンポーネントは、ページと同じディレクトリに配置。

```
app/(main)/
├── page.tsx                ← ホーム画面
└── components/
    ├── QuoteGroupCard.tsx  ← ホーム画面専用
    └── QuoteItem.tsx       ← ホーム画面専用
```

### 2. 共通のコンポーネント

複数のページで使うコンポーネントは、`components/` に配置（現在は未使用）。

```
components/
├── ui/
│   ├── Button.tsx
│   └── Modal.tsx
└── layouts/
    └── Container.tsx
```

### 3. カスタムフック

データ取得やロジックを含むフックは、`hooks/` に配置。

```
app/(main)/hooks/
├── useQuotesGrouped.ts     ← フレーズ取得
├── useTags.ts              ← タグ取得・作成
└── useActivities.ts        ← 活動領域取得
```

### 4. APIエンドポイント

APIは `app/api/` 配下に配置。URLパスに対応する構造。

```
app/api/
├── quotes/
│   ├── route.ts            ← /api/quotes
│   ├── [id]/
│   │   └── route.ts        ← /api/quotes/:id
│   └── grouped/
│       └── route.ts        ← /api/quotes/grouped
```

---

## 🎨 ディレクトリ設計の思想

### 1. Feature-based（機能ベース）

関連するファイルを近くに配置。

```
app/(main)/
├── page.tsx                ← ホーム画面
├── components/             ← ホーム画面用コンポーネント
│   ├── QuoteGroupCard.tsx
│   └── QuoteItem.tsx
└── hooks/                  ← ホーム画面用フック
    └── useQuotesGrouped.ts
```

**メリット**:

- 関連ファイルが見つけやすい
- 削除・変更時の影響範囲が明確

### 2. Separation of Concerns（関心の分離）

画面、ロジック、APIを分離。

```
app/(main)/page.tsx         ← 画面（表示）
app/(main)/hooks/useTags.ts ← ロジック（データ取得）
app/api/tags/route.ts       ← API（データ処理）
lib/supabase/server.ts      ← データベース（永続化）
```

**メリット**:

- 役割が明確
- テストしやすい
- 再利用しやすい

---

## 📦 設定ファイル

### `package.json`

プロジェクトの依存パッケージとスクリプトを定義。

```json
{
  "name": "quote-collector",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.15",
    "react": "^18",
    "typescript": "^5"
  }
}
```

### `tsconfig.json`

TypeScriptの設定。

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "preserve",
    "module": "ESNext",
    "strict": true
  }
}
```

### `next.config.js`

Next.jsの設定。

```javascript
module.exports = {
  reactStrictMode: true,
  // その他の設定
};
```

### `tailwind.config.js`

Tailwind CSSの設定。

```javascript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
};
```

---

## ✅ まとめ

### ディレクトリ構造

- **app/**: 画面とAPI
- **lib/**: 共通機能
- **styles/**: デザイン
- **docs/**: ドキュメント

### ファイル命名規則

- **page.tsx**: ページ
- **layout.tsx**: レイアウト
- **route.ts**: API
- **PascalCase.tsx**: コンポーネント
- **useSomething.ts**: カスタムフック

### 設計思想

- **Feature-based**: 関連ファイルを近くに配置
- **Separation of Concerns**: 画面・ロジック・APIを分離

---

## 🎯 次のステップ

プロジェクト構造が理解できたら、次は**データの流れ**を学びましょう！

👉 [03_data_flow.md](./03_data_flow.md)

---

**参考リンク**:

- [Next.js Project Structure](https://nextjs.org/docs/getting-started/project-structure)
- [Next.js App Router](https://nextjs.org/docs/app)
