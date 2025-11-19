# Shared Components

このディレクトリには、アプリケーション全体で共有されるReactコンポーネントを配置します。

## ディレクトリ構成

```
components/
├── ui/              # 汎用UIコンポーネント
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── Card.tsx
└── layouts/         # レイアウトコンポーネント
    ├── Footer.tsx
    └── Container.tsx
```

## 配置基準

### `ui/` - 汎用UIコンポーネント

以下の条件を満たすコンポーネントを配置:

- **再利用性が高い**: 複数のページ・機能で使用される
- **ビジネスロジックを含まない**: 純粋なUIコンポーネント
- **プロップで動作をカスタマイズ可能**: 柔軟な使い方ができる

**例**:
- `Button` - 汎用ボタン（Primary/Secondary/Dangerバリアント）
- `Input` - 汎用テキスト入力フィールド
- `Modal` - 汎用モーダルダイアログ
- `Card` - カード型レイアウト

### `layouts/` - レイアウトコンポーネント

以下の条件を満たすコンポーネントを配置:

- **構造的な役割**: ページの構造を定義する
- **複数のルートグループで共有**: `(auth)`と`(main)`の両方で使用など

**例**:
- `Footer` - 全ページ共通のフッター
- `Container` - コンテンツの最大幅を制御するラッパー

## 使用方法

```tsx
// 他のコンポーネントからインポート
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layouts/Container';

export default function MyPage() {
  return (
    <Container>
      <Button variant="primary" onClick={handleClick}>
        クリック
      </Button>
    </Container>
  );
}
```

## ページ専用コンポーネントとの違い

| 種類 | 配置場所 | 例 |
|------|----------|-----|
| **共有コンポーネント** | `components/ui/`, `components/layouts/` | Button, Modal, Footer |
| **ページ専用コンポーネント** | `app/(ルートグループ)/components/` | QuoteCard, QuoteModal, Header |

ページ専用コンポーネントは、特定のルートグループ内でのみ使用されるため、`app/(main)/components/`のように配置します。

## 注意事項

- 共有コンポーネントを作成する前に、本当に複数箇所で使われるか検討する
- 早すぎる抽象化を避ける（YAGNI原則）
- 同じコンポーネントを3回以上使う場合に共有化を検討
