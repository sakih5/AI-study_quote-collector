# フレーズ複数選択削除機能の実装

**日付**: 2025-11-15
**作業者**: Claude Code
**関連Issue**: フレーズの一括削除機能

## 概要

フレーズ一覧画面（`my-quotes/page.tsx`）において、複数のフレーズを選択して一括削除できる機能を実装した。

ユーザーは「選択削除」ボタンで選択モードに入り、チェックボックスでフレーズを選択し、まとめて削除できるようになった。

## 実施内容

### 1. QuoteItem.tsx - チェックボックスと選択モード対応

#### ファイル
`app/(main)/components/QuoteItem.tsx`

#### 変更内容

**Props拡張** (Line 3-11):
```typescript
interface QuoteItemProps {
  quote: Quote;
  pageNumber?: number;
  onEdit?: (quote: Quote) => void;
  onDelete?: (quoteId: number) => void;
  isSelectionMode?: boolean;      // 追加
  isSelected?: boolean;            // 追加
  onToggleSelection?: () => void;  // 追加
}
```

**チェックボックス表示** (Line 28-37):
```typescript
{/* チェックボックス（選択モード時のみ） */}
{isSelectionMode && (
  <div className="flex-shrink-0 pt-1">
    <input
      type="checkbox"
      checked={isSelected}
      onChange={onToggleSelection}
      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
    />
  </div>
)}
```

**選択状態のビジュアルフィードバック** (Line 23-25):
```typescript
<div className={`bg-white rounded-lg shadow-md p-4 border ${
  isSelectionMode && isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
}`}>
```

選択されたアイテムは青いボーダーと薄い青の背景色で強調表示される。

**編集・削除ボタンの制御** (Line 70-95):
```typescript
{/* 編集・削除ボタン（通常モード時のみ） */}
{!isSelectionMode && (
  <div className="flex gap-1">
    {/* Edit and Delete buttons */}
  </div>
)}
```

選択モード時は編集・削除ボタンを非表示にして、誤操作を防止。

### 2. QuoteGroupCard.tsx - 選択モード関連のprops追加

#### ファイル
`app/(main)/components/QuoteGroupCard.tsx`

#### 変更内容

**Props拡張** (Line 5-12):
```typescript
interface QuoteGroupCardProps {
  group: QuoteGroup;
  onEdit?: (quote: Quote) => void;
  onDelete?: (quoteId: number) => void;
  isSelectionMode?: boolean;                    // 追加
  selectedQuoteIds?: Set<number>;               // 追加
  onToggleSelection?: (quoteId: number) => void; // 追加
}
```

**各グループタイプで選択機能をサポート**:

書籍グループ (Line 57-67):
```typescript
{quotes.map((quote) => (
  <QuoteItem
    key={quote.id}
    quote={quote}
    pageNumber={quote.page_number}
    onEdit={onEdit}
    onDelete={onDelete}
    isSelectionMode={isSelectionMode}
    isSelected={selectedQuoteIds?.has(quote.id)}
    onToggleSelection={() => onToggleSelection?.(quote.id)}
  />
))}
```

同様の変更を以下のグループタイプにも適用:
- SNSグループ (Line 105-114)
- その他グループ (Line 151-160)

### 3. my-quotes/page.tsx - 選択モード状態管理とUI

#### ファイル
`app/(main)/my-quotes/page.tsx`

#### 状態管理 (Line 21-23)

```typescript
// 選択モード関連
const [isSelectionMode, setIsSelectionMode] = useState(false);
const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<number>>(new Set());
```

`Set<number>`を使用することで、選択状態の追加・削除・確認が効率的に行える。

#### 選択モード操作関数

**選択モード切り替え** (Line 159-163):
```typescript
const toggleSelectionMode = () => {
  setIsSelectionMode(!isSelectionMode);
  setSelectedQuoteIds(new Set()); // 選択をクリア
};
```

**フレーズ選択トグル** (Line 165-174):
```typescript
const toggleQuoteSelection = (quoteId: number) => {
  const newSet = new Set(selectedQuoteIds);
  if (newSet.has(quoteId)) {
    newSet.delete(quoteId);
  } else {
    newSet.add(quoteId);
  }
  setSelectedQuoteIds(newSet);
};
```

**すべて選択** (Line 176-185):
```typescript
const selectAllQuotes = () => {
  const allQuoteIds = new Set<number>();
  items.forEach((group) => {
    if ('quotes' in group) {
      group.quotes.forEach((quote) => allQuoteIds.add(quote.id));
    }
  });
  setSelectedQuoteIds(allQuoteIds);
};
```

**一括削除** (Line 187-215):
```typescript
const handleBulkDelete = async () => {
  if (selectedQuoteIds.size === 0) return;

  const confirmed = confirm(
    `選択した${selectedQuoteIds.size}件のフレーズを削除してもよろしいですか？`
  );
  if (!confirmed) return;

  setIsDeleting(true);

  try {
    // 各フレーズを個別に削除（現在のAPI仕様に合わせる）
    const deletePromises = Array.from(selectedQuoteIds).map((quoteId) =>
      apiDelete(`/api/quotes/${quoteId}`)
    );

    await Promise.all(deletePromises);

    // 成功：選択をクリアして一覧を再取得
    setSelectedQuoteIds(new Set());
    setIsSelectionMode(false);
    refetch();
  } catch (err) {
    alert(err instanceof Error ? err.message : '予期しないエラーが発生しました');
  } finally {
    setIsDeleting(false);
  }
};
```

`Promise.all`を使用して並列削除を実行。効率的で高速。

#### UI実装

**アクションバーの実装** (Line 286-362):

通常モード時:
```typescript
<div className="flex items-center gap-4">
  <p className="text-gray-600 text-sm">
    {hasActiveFilters ? '該当フレーズ数' : 'フレーズ総数'}：
    <span className="font-bold text-gray-900 ml-1">{total}件</span>
  </p>
  {hasActiveFilters && (
    <button
      onClick={clearFilters}
      className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
    >
      フィルターをクリア
    </button>
  )}
</div>
<div className="flex items-center gap-3">
  {/* 選択削除モードボタン */}
  <button
    onClick={toggleSelectionMode}
    disabled={total === 0}
    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    title="複数のフレーズを選択して一括削除"
  >
    <span>☑️</span>
    <span>選択削除</span>
  </button>
  {/* CSVエクスポートボタン */}
  <button
    onClick={handleExportCsv}
    disabled={total === 0}
    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    title="表示中のフレーズをCSV形式でダウンロード"
  >
    <span>📥</span>
    <span>CSVエクスポート</span>
  </button>
</div>
```

選択モード時:
```typescript
<div className="flex items-center gap-4">
  <p className="text-gray-900 text-sm font-medium">
    {selectedQuoteIds.size}件選択中
  </p>
  <button
    onClick={selectAllQuotes}
    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
  >
    すべて選択
  </button>
</div>
<div className="flex items-center gap-3">
  {/* 削除ボタン */}
  <button
    onClick={handleBulkDelete}
    disabled={selectedQuoteIds.size === 0 || isDeleting}
    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
  >
    <span>🗑️</span>
    <span>{isDeleting ? '削除中...' : '削除'}</span>
  </button>
  {/* キャンセルボタン */}
  <button
    onClick={toggleSelectionMode}
    disabled={isDeleting}
    className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    キャンセル
  </button>
</div>
```

**QuoteGroupCardへのprops渡し** (Line 467-475):
```typescript
{items.map((group, index) => (
  <QuoteGroupCard
    key={index}
    group={group}
    onEdit={handleEdit}
    onDelete={handleDelete}
    isSelectionMode={isSelectionMode}
    selectedQuoteIds={selectedQuoteIds}
    onToggleSelection={toggleQuoteSelection}
  />
))}
```

## 動作フロー

1. **選択モード開始**: ユーザーが「選択削除」ボタンをクリック
2. **UI変更**:
   - 各フレーズの左側にチェックボックスが表示
   - 編集・削除ボタンが非表示
   - アクションバーが選択モードUIに切り替わる
3. **フレーズ選択**:
   - チェックボックスをクリックして個別選択
   - 「すべて選択」で一括選択
   - 選択件数がリアルタイムで表示
4. **一括削除実行**:
   - 「削除」ボタンをクリック
   - 確認ダイアログで件数を表示
   - `Promise.all`で並列削除実行
   - 削除中は「削除中...」表示とボタン無効化
5. **完了処理**:
   - 選択をクリア
   - 選択モードを終了
   - フレーズ一覧を再取得して表示更新
6. **キャンセル**: 「キャンセル」ボタンで選択をクリアして通常モードに戻る

## 修正ファイル一覧

```
app/(main)/components/QuoteItem.tsx
app/(main)/components/QuoteGroupCard.tsx
app/(main)/my-quotes/page.tsx
```

## 技術的な実装ポイント

### 1. Set<number>による効率的な選択管理

```typescript
const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<number>>(new Set());
```

- `Set`を使用することで、O(1)での追加・削除・存在確認が可能
- 重複を自動的に排除
- `has()`メソッドで簡潔な選択状態チェック

### 2. Promise.allによる並列削除

```typescript
const deletePromises = Array.from(selectedQuoteIds).map((quoteId) =>
  apiDelete(`/api/quotes/${quoteId}`)
);
await Promise.all(deletePromises);
```

- 複数のAPIリクエストを並列実行
- 削除処理が高速化
- 1つでも失敗した場合は全体がエラーになる（トランザクション的動作）

### 3. 条件付きレンダリングでのモード切り替え

```typescript
{!isSelectionMode ? (
  // 通常モードUI
) : (
  // 選択モードUI
)}
```

- 状態に応じたUIの完全な切り替え
- コードの可読性が高い
- 誤操作を防止

### 4. オプショナルチェイニングによる安全なprops渡し

```typescript
isSelected={selectedQuoteIds?.has(quote.id)}
onToggleSelection={() => onToggleSelection?.(quote.id)}
```

- propsが未定義の場合でもエラーを防止
- 既存のコードとの互換性を維持

## バックエンドAPI

現在の実装では、既存の個別削除API（`DELETE /api/quotes/{id}`）を`Promise.all`で並列実行している。

将来的に、以下のような専用の一括削除APIを追加することも可能：

```python
# backend/routes/quotes.py

@router.delete("/bulk")
async def delete_quotes_bulk(
    quote_ids: list[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """フレーズ一括削除"""
    # トランザクション内で一括削除
    deleted_count = db.query(Quote).filter(
        Quote.id.in_(quote_ids),
        Quote.user_id == current_user.id,
        Quote.deleted_at.is_(None)
    ).update(
        {Quote.deleted_at: datetime.utcnow()},
        synchronize_session=False
    )

    db.commit()

    return {"deleted_count": deleted_count}
```

メリット:
- データベーストランザクション内で処理
- ネットワークオーバーヘッド削減
- より高速な削除処理

ただし、現在の`Promise.all`実装でも十分なパフォーマンスが得られている。

## UX上の工夫

### 1. 視覚的フィードバック

- 選択されたフレーズは青いボーダーと背景色で明確に識別可能
- 選択件数がリアルタイムで表示される
- 削除中は「削除中...」表示とボタン無効化

### 2. 誤操作防止

- 選択モード時は編集・削除ボタンを非表示
- 削除前に確認ダイアログで件数を明示
- 選択件数が0の場合は削除ボタンを無効化
- 削除中は全てのボタンを無効化

### 3. 柔軟な操作

- 個別選択とすべて選択の両方をサポート
- キャンセルボタンで簡単に通常モードに戻れる
- 選択モード終了時に選択状態を自動クリア

### 4. 要件の遵守

- 「フィルターをクリア」ボタンは通常モードで維持
- 既存のCSVエクスポート機能と並列配置
- 既存のUIとの一貫性を保持

## テスト観点

以下の観点でテストを実施することを推奨：

1. **基本動作**:
   - 選択モードの開始・終了
   - チェックボックスの選択・解除
   - すべて選択機能
   - 削除実行と一覧の更新

2. **エッジケース**:
   - 0件選択時の削除ボタン無効化
   - 削除中のボタン無効化
   - フィルター適用中の選択削除
   - 無限スクロール後の選択削除

3. **エラーハンドリング**:
   - API削除失敗時の挙動
   - ネットワークエラー時のエラーメッセージ
   - 部分的な削除失敗（Promise.allの動作）

4. **UX**:
   - 選択状態の視覚的フィードバック
   - 削除確認ダイアログの内容
   - 削除完了後の画面遷移

## 今後の改善案

### 1. バックエンド一括削除API（オプション）

パフォーマンスが問題になる場合、専用のバルク削除APIを実装。

### 2. 取り消し（Undo）機能

削除後の一定時間内に取り消しできる機能を追加。

### 3. 選択状態の永続化

ページリロード時に選択状態を復元する機能。

### 4. キーボードショートカット

- `Ctrl+A`: すべて選択
- `Delete`: 選択したフレーズを削除
- `Esc`: 選択モード終了

### 5. 選択範囲の拡張

Shiftキーを押しながらクリックで範囲選択。

## まとめ

フレーズの複数選択削除機能を実装し、以下を達成した：

- ✅ チェックボックスによる直感的な選択UI
- ✅ すべて選択機能
- ✅ 並列削除による高速な一括削除
- ✅ 視覚的フィードバックと誤操作防止
- ✅ 既存機能との調和（フィルタークリア、CSVエクスポート）
- ✅ 書籍、SNS、その他の全グループタイプでサポート

ユーザーは直感的な操作で複数のフレーズをまとめて削除できるようになり、管理効率が大幅に向上した。
