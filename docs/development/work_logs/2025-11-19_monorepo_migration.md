# モノレポ化作業ログ

**日付**: 2025-11-19
**作業者**: Claude Code
**目的**: モバイルアプリ開発に備えた完全なモノレポ構造への移行

## 背景

将来的なモバイルアプリ開発を見据えて、フロントエンド・バックエンドを明確に分離したモノレポ構造に移行することを決定。フロントエンドはNext.js（Vercelデプロイ）、バックエンドはFastAPI（Cloud Runデプロイ）という構成を整理する。

## 実施内容

### 1. ディレクトリ構造の再構成

#### プロジェクトルート構造

```
project-root/
├── frontend/          # Next.js アプリケーション
├── backend/           # FastAPI アプリケーション
├── infra/             # デプロイ設定
│   ├── vercel/
│   └── cloud-run/
├── docs/              # ドキュメント
├── supabase/          # DBマイグレーション
└── docker-compose.yml # 開発環境オーケストレーション
```

### 2. フロントエンドコンポーネント構成の改善

**変更前:**
```
components/
├── QuoteCard.tsx
├── QuoteModal.tsx
├── ...（フラットな構造）
```

**変更後:**
```
components/
├── features/          # ドメイン別コンポーネント
│   ├── quotes/
│   │   ├── QuoteModal.tsx
│   │   ├── QuoteEditModal.tsx
│   │   ├── QuoteGroupCard.tsx
│   │   └── QuoteItem.tsx
│   └── tags/
│       └── TagManagementModal.tsx
├── layouts/           # レイアウトコンポーネント
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── MainLayout.tsx
└── ui/                # 共通UIコンポーネント
    ├── Button.tsx
    ├── Input.tsx
    └── Modal.tsx
```

**設計方針:**
- `features/`: ドメイン別にコンポーネントを整理（スケーラビリティ重視）
- `layouts/`: ページ構造を定義するコンポーネント
- `ui/`: プロジェクト全体で再利用可能な汎用コンポーネント

### 3. hooks/ ディレクトリの配置

**配置場所:** `frontend/hooks/`（プロジェクトルート）

**理由:**
- カスタムフックはプロジェクト全体で共有される可能性が高い
- `app/`配下に置くとNext.jsのルーティングと混同される
- 将来的に複数アプリ（Web/Mobile）で共有する可能性がある

**含まれるフック:**
- `useQuotesGrouped.ts` - グループ化されたフレーズ一覧取得
- `useTags.ts` - タグ管理
- 他、共通ロジックフック

### 4. API統合レイヤーの作成

#### `lib/api/` 構成

```
lib/api/
├── client.ts        # Axiosベースクライアント
├── endpoints.ts     # 全APIエンドポイント関数
└── types.ts         # TypeScript型定義
```

#### `lib/api/endpoints.ts` の実装

全バックエンドAPIを型安全にラップ：

```typescript
// Activities API
export const activitiesApi = {
  list: async () => {
    return apiGet<Activity[]>('/api/activities');
  },
};

// Tags API
export const tagsApi = {
  list: async (params?: TagListParams) => {
    const query = buildQueryString(params);
    return apiGet<Tag[]>(`/api/tags${query}`);
  },
  create: async (name: string) => {
    return apiPost<Tag>('/api/tags', { name });
  },
  rename: async (id: number, name: string) => {
    return apiPut<Tag>(`/api/tags/${id}`, { name });
  },
  merge: async (sourceId: number, targetId: number) => {
    return apiPost<void>(`/api/tags/${sourceId}/merge`, { target_tag_id: targetId });
  },
  delete: async (id: number) => {
    return apiDelete<void>(`/api/tags/${id}`);
  },
};

// Quotes API（グループ化対応）
export const quotesApi = {
  listGrouped: async (params?: QuoteListParams) => {
    const query = buildQueryString(params);
    return apiGet<QuoteGroup[]>(`/api/quotes/grouped${query}`);
  },
  create: async (data: QuoteCreateRequest) => {
    return apiPost<Quote[]>('/api/quotes', data);
  },
  update: async (id: number, data: QuoteUpdateRequest) => {
    return apiPut<Quote>(`/api/quotes/${id}`, data);
  },
  delete: async (id: number) => {
    return apiDelete<void>(`/api/quotes/${id}`);
  },
};

// Books, SNS Users, OCR, Export APIも同様...
```

### 5. OpenAPI型生成のセットアップ

#### package.json スクリプト追加

```json
{
  "scripts": {
    "generate-types": "openapi-typescript http://localhost:8000/openapi.json -o lib/api/types.ts",
    "generate-types:prod": "openapi-typescript https://quote-collector-api-3276884015.asia-northeast1.run.app/openapi.json -o lib/api/types.ts"
  },
  "devDependencies": {
    "openapi-typescript": "^7.10.1"
  }
}
```

**使い方:**
```bash
# ローカルバックエンドから型生成
npm run generate-types

# 本番バックエンドから型生成
npm run generate-types:prod
```

### 6. インポートパスの統一

すべての相対インポートを絶対パスに変更：

**変更前:**
```typescript
import QuoteModal from '../components/QuoteModal';
import { useQuotesGrouped } from '../hooks/useQuotesGrouped';
```

**変更後:**
```typescript
import QuoteModal from '@/components/features/quotes/QuoteModal';
import { useQuotesGrouped } from '@/hooks/useQuotesGrouped';
```

**変更対象ファイル:**
- `app/(main)/my-quotes/page.tsx`
- `app/(main)/layout.tsx`
- `app/(main)/settings/tags/page.tsx`
- `components/features/quotes/QuoteModal.tsx`
- `components/features/quotes/QuoteEditModal.tsx`
- `components/features/quotes/QuoteGroupCard.tsx`
- `components/features/quotes/QuoteItem.tsx`

### 7. Vercel設定の整理

#### `infra/vercel/vercel.json`

```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "cd frontend && npm install",
  "framework": "nextjs",
  "regions": ["hnd1"]
}
```

**重要な注意点:**
- **Vercel は Next.js をネイティブサポート** → Docker不要
- `frontend/Dockerfile` はローカル開発専用
- Vercelデプロイでは使用されない

## 成果

### ✅ 達成されたこと

1. **明確な責任分離**
   - フロントエンド・バックエンドが完全に独立
   - 各ディレクトリが独自のpackage.json/pyproject.tomlを持つ

2. **スケーラブルな構成**
   - components/をドメイン別に整理
   - 新機能追加時の衝突を最小化

3. **型安全なAPI呼び出し**
   - `lib/api/endpoints.ts`で一元管理
   - OpenAPI型生成で自動同期

4. **開発体験の向上**
   - 絶対パスインポートで可読性向上
   - IDEの自動補完が効きやすい

5. **モバイルアプリ準備完了**
   - 共通ロジックをhooks/やlib/に集約
   - 将来的にReact Native等からも利用可能

## ファイル変更サマリー

| ファイル | 変更内容 |
|---------|---------|
| `frontend/components/features/*` | 新規作成（ドメイン別整理） |
| `frontend/lib/api/endpoints.ts` | 新規作成（287行、全APIラップ） |
| `frontend/lib/api/types.ts` | 新規作成（型定義） |
| `frontend/package.json` | OpenAPI型生成スクリプト追加 |
| `infra/vercel/vercel.json` | モノレポ対応設定 |
| `README.md` | プロジェクト構造説明更新 |
| `CLAUDE.md` | 開発ガイド更新 |

## 次のステップ

- [ ] モバイルアプリ（React Native）開発開始
- [ ] 共通ロジックのさらなる抽出（shared/パッケージ化）
- [ ] E2Eテストの追加（Playwrightでフロントエンド・バックエンド統合テスト）

## 参考リンク

- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [Next.js Project Structure Best Practices](https://nextjs.org/docs/app/building-your-application/routing/colocation)
- [openapi-typescript Documentation](https://github.com/drwpow/openapi-typescript)
