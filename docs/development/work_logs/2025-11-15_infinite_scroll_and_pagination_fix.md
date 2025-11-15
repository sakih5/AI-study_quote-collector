# 無限スクロール実装とページネーション修正

**日付**: 2025-11-15
**作業者**: Claude Code
**関連Issue**: フレーズ一覧の表示とページネーション改善

## 概要

フレーズ一覧表示において、「もっと見る」ボタンが正しく表示されない問題と、ユーザビリティ向上のための無限スクロール実装を行った。

## 問題点

### 1. ページネーションのロジック不具合

**症状**:
- フレーズが50件以上あっても「もっと見る」ボタンが表示されない
- グループ数でページネーションしていたため、フレーズ数が多くてもグループ数が少ないと次ページが出ない

**原因**:
```python
# backend/routes/quotes.py (修正前)
total = len(quotes)  # フレーズ総数
paginated_items = grouped_items[offset:offset + limit]  # グループ数でスライス
has_more = offset + limit < len(grouped_items)  # グループ数で判定
```

- `total` はフレーズ数をカウント
- しかしページネーションは**グループ数**で実施
- 例: フレーズ100件が書籍5冊に分散 → グループ5件 → 「もっと見る」が出ない

### 2. ユーザビリティの問題

**要望**:
- 「もっと見る」ボタンよりも、スクロールで自動的に読み込む無限スクロールの方が使いやすい
- 手動クリックの手間を省きたい

## 実施内容

### 1. バックエンド: フレーズ単位のページネーション実装

#### ファイル
`backend/routes/quotes.py` (Line 528-565)

#### 変更内容

**修正前**:
```python
# ページネーション適用
total = len(quotes)
paginated_items = grouped_items[offset:offset + limit]
has_more = offset + limit < len(grouped_items)

return QuotesGroupedResponse(
    items=paginated_items,
    total=total,
    has_more=has_more
)
```

**修正後**:
```python
# ページネーション適用（フレーズ単位）
total = len(quotes)

# フレーズ数を累積しながらグループを選択
paginated_items = []
quote_count = 0
start_counting = False

for item in grouped_items:
    # 各グループのフレーズ数を取得
    if hasattr(item, 'quotes'):
        group_quote_count = len(item.quotes)
    else:
        group_quote_count = 1  # OTHER typeは1件

    # offsetに達するまでスキップ
    if not start_counting:
        if quote_count + group_quote_count > offset:
            start_counting = True
        else:
            quote_count += group_quote_count
            continue

    # limitに達したら終了（ただし現在のグループは含める）
    if start_counting:
        paginated_items.append(item)
        quote_count += group_quote_count

        if quote_count >= offset + limit:
            break

has_more = quote_count < total

return QuotesGroupedResponse(
    items=paginated_items,
    total=total,
    has_more=has_more
)
```

#### ロジックの説明

1. **フレーズ数の累積カウント**:
   - 各グループのフレーズ数を累積
   - BOOK/SNSグループ: `len(item.quotes)`
   - OTHERタイプ: 1件

2. **offsetスキップ処理**:
   - フレーズ数が`offset`に達するまでグループをスキップ
   - offsetを跨ぐグループは含める（グループを途中で切らない）

3. **limit到達判定**:
   - フレーズ数が`offset + limit`に達したら終了
   - 現在のグループは含めてから終了（UX考慮）

4. **has_more判定**:
   - 累積カウントが総フレーズ数に達していなければtrue

#### 動作例

**ケース1: 書籍3冊、各50フレーズ（計150件）**
- limit=50, offset=0
  - 書籍1（50件）を返す
  - quote_count=50, has_more=true
- limit=50, offset=50
  - 書籍2（50件）を返す
  - quote_count=100, has_more=true
- limit=50, offset=100
  - 書籍3（50件）を返す
  - quote_count=150, has_more=false

**ケース2: 書籍1冊に100フレーズ**
- limit=50, offset=0
  - 書籍1（100件）を返す（グループを途中で切らない）
  - quote_count=100, has_more=false

### 2. フロントエンド: 無限スクロール実装

#### ファイル
`app/(main)/my-quotes/page.tsx`

#### 変更内容

**1. インポート追加** (Line 3):
```typescript
import { useState, useEffect, useRef } from 'react';
```

- `useEffect`: Intersection Observerのセットアップ
- `useRef`: トリガー要素の参照保持

**2. Refの定義** (Line 21-22):
```typescript
// 無限スクロール用のref
const observerTarget = useRef<HTMLDivElement>(null);
```

**3. Intersection Observer実装** (Line 35-57):
```typescript
// 無限スクロール実装
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      // 要素が画面に入ったら、かつ、まだ読み込むデータがある場合
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMore();
      }
    },
    { threshold: 0.1 } // 10%見えたらトリガー
  );

  const currentTarget = observerTarget.current;
  if (currentTarget) {
    observer.observe(currentTarget);
  }

  return () => {
    if (currentTarget) {
      observer.unobserve(currentTarget);
    }
  };
}, [hasMore, loadingMore, loadMore]);
```

**パラメータ説明**:
- `threshold: 0.1`: トリガー要素の10%が画面に入ったら発火
- `entries[0].isIntersecting`: 要素が画面内に入ったか
- `hasMore`: まだデータがあるか
- `!loadingMore`: 現在読み込み中でないか

**クリーンアップ関数**:
- コンポーネントのアンマウント時にobserverを解除
- メモリリーク防止

**4. UI変更** (Line 351-361):

**修正前**:
```tsx
{/* もっと見るボタン */}
{hasMore && (
  <div className="mt-8 text-center">
    <button
      onClick={loadMore}
      disabled={loadingMore}
      className="px-8 py-3 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg border border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loadingMore ? '読み込み中...' : 'もっと見る'}
    </button>
  </div>
)}
```

**修正後**:
```tsx
{/* 無限スクロールトリガー */}
{hasMore && (
  <div ref={observerTarget} className="mt-8 py-4 text-center">
    {loadingMore && (
      <div className="flex items-center justify-center gap-2">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">読み込み中...</p>
      </div>
    )}
  </div>
)}
```

**変更ポイント**:
- ボタンを削除してトリガー要素（`div`）に変更
- `ref={observerTarget}` を設定
- ローディング中のみスピナー表示
- 非ローディング時は空の`div`（見えないトリガー）

## 影響範囲

### 変更されたファイル
1. `backend/routes/quotes.py` (Line 528-565)
2. `app/(main)/my-quotes/page.tsx` (Line 1-361)

### 変更されていないファイル
- `app/(main)/hooks/useQuotesGrouped.ts` (既存のloadMore関数をそのまま利用)
- `backend/models/quote.py` (レスポンス型は変更なし)

## テスト項目

### バックエンド
- [x] フレーズ50件以上で`has_more=true`が返される
- [x] グループ数が少なくてもフレーズ数でページネーション
- [x] offset=0, limit=50で最初の50件分のグループが返る
- [x] offset=50で次の50件分のグループが返る
- [x] グループが途中で切れない（書籍1冊の全フレーズが含まれる）
- [x] totalがフレーズ総数と一致する

### フロントエンド
- [x] 初回読み込みで50件分表示される
- [x] 画面下部にスクロールすると自動で次のデータを読み込む
- [x] 読み込み中はスピナーが表示される
- [x] 全データ読み込み後、トリガー要素が消える
- [x] フィルター変更時にリセットされる
- [x] 検索時にリセットされる

## 技術的な知見

### Intersection Observer API

**メリット**:
- スクロールイベントよりもパフォーマンスが良い
- ブラウザがネイティブで最適化
- 非同期で処理されるためメインスレッドをブロックしない

**基本的な使い方**:
```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 要素が画面に入った時の処理
      }
    });
  },
  {
    root: null,        // viewportを基準
    rootMargin: '0px', // 基準からのマージン
    threshold: 0.1     // 10%見えたらトリガー
  }
);

observer.observe(targetElement);
```

**注意点**:
- クリーンアップを忘れずに（`observer.unobserve()`）
- Refが`null`の場合を考慮する
- 依存配列に必要な値を全て含める

### フレーズ単位のページネーション設計

**課題**:
- データはグループ化されているが、ページネーションはフレーズ数で行いたい
- グループを途中で切ると見づらい

**解決策**:
1. フレーズ数を累積カウント
2. offsetを超えたグループから表示開始
3. limitに達してもグループは最後まで含める

**トレードオフ**:
- グループを途中で切らないため、limit=50でも60件返る場合がある
- UX優先の設計判断

## パフォーマンス考慮

### バックエンド
- 全フレーズを一度に取得してからグループ化
- フィルタリングはクライアント側で実施（activity_ids, tag_ids）
- 大量データの場合はDB側でのフィルタリングが望ましい（今後の改善）

### フロントエンド
- Intersection Observerによる効率的なスクロール検出
- 不要なrenderを防ぐための適切な依存配列設定
- loadingMore状態で二重読み込みを防止

## 今後の改善案

### 1. DBレベルでのフィルタリング
現在、活動領域とタグのフィルタリングはクライアント側で実施している。これをDB側のクエリに含めることで、大量データでもパフォーマンスを維持できる。

```python
# 今後の実装案
if activity_ids:
    quotes_query = quotes_query.filter(
        'quote_activities.activity_id', 'in', activity_id_list
    )
```

### 2. 仮想スクロール（Virtual Scrolling）
数千件のデータを扱う場合、仮想スクロールを導入してDOMノード数を削減する。

### 3. プリフェッチ
次のページを先読みして、スクロール時の待ち時間を削減する。

```typescript
// threshold: 0.5 に設定し、50%見えたら次を読み込む
{ threshold: 0.5 }
```

### 4. スクロール位置の保存
ページ遷移後に戻った際、前のスクロール位置を復元する。

```typescript
// sessionStorageに位置を保存
sessionStorage.setItem('scrollPosition', window.scrollY);

// 復元
useEffect(() => {
  const savedPosition = sessionStorage.getItem('scrollPosition');
  if (savedPosition) {
    window.scrollTo(0, parseInt(savedPosition));
  }
}, []);
```

## 参考リンク

- [Intersection Observer API - MDN](https://developer.mozilla.org/ja/docs/Web/API/Intersection_Observer_API)
- [無限スクロールのベストプラクティス](https://web.dev/infinite-scroll/)
- [React での Intersection Observer の使い方](https://www.patterns.dev/posts/intersection-observer)

## まとめ

本作業により、以下を達成した：

1. ✅ フレーズ単位の正確なページネーション
   - グループ数に関わらず、フレーズ50件ごとに次ページ
   - グループを途中で切らない設計

2. ✅ 無限スクロールによるUX向上
   - 手動クリック不要で自動読み込み
   - スムーズな閲覧体験

3. ✅ パフォーマンスの考慮
   - Intersection Observer APIによる効率的な実装
   - 二重読み込み防止

フレーズ一覧の閲覧体験が大幅に向上し、ユーザーがストレスなく大量のデータを閲覧できるようになった。
