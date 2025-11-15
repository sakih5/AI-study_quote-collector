# キーワード検索拡張とOTHERタイプのグループ化

**日付**: 2025-11-15
**作業者**: Claude Code
**関連Issue**: 検索機能の強化とフレーズ表示の改善

## 概要

フレーズ一覧表示において、以下2つの改善を実施した：
1. キーワード検索の対象拡大とリアルタイム検索の実装
2. 「その他」タイプのフレーズを出典とメモでグループ化

## 実施内容

### 1. キーワード検索の拡張とリアルタイム検索

#### 要件

**検索対象の拡大**:
- フレーズテキストだけでなく、本のタイトル・著者名、SNSのアカウント名・表示名でも検索できるようにする
- 検索ボックスは1つのまま（統合検索）

**リアルタイム検索**:
- 文字入力後、検索ボタンを押さなくても自動で絞り込み開始
- 文字入力を消すと該当件数が絞り込み前のものに戻る

**UI改善**:
- プレースホルダーに検索可能な対象を明示

#### バックエンド実装

**ファイル**: `backend/routes/quotes.py` (Line 409-451)

**変更前**:
```python
# 検索条件
if search:
    quotes_query = quotes_query.ilike('text', f'%{search}%')
```

問題点:
- フレーズテキスト（`text`）のみで検索
- 本のタイトルや著者名、SNSアカウント名では検索できない

**変更後**:
```python
# 検索条件（クライアント側で実施）
# フレーズテキスト、本のタイトル・著者名、SNSのアカウント名・表示名で部分一致検索
if search:
    search_lower = search.lower()
    filtered_quotes = []

    for quote in quotes:
        # フレーズテキストで検索
        if search_lower in quote.get('text', '').lower():
            filtered_quotes.append(quote)
            continue

        # 書籍タイトル・著者名で検索
        if quote.get('books'):
            book = quote['books']
            if (book.get('title') and search_lower in book['title'].lower()) or \
               (book.get('author') and search_lower in book['author'].lower()):
                filtered_quotes.append(quote)
                continue

        # SNSアカウント名・表示名で検索
        if quote.get('sns_users'):
            sns_user = quote['sns_users']
            if (sns_user.get('handle') and search_lower in sns_user['handle'].lower()) or \
               (sns_user.get('display_name') and search_lower in sns_user['display_name'].lower()):
                filtered_quotes.append(quote)
                continue

    quotes = filtered_quotes
```

**検索対象**:
1. **フレーズテキスト**: `quotes.text`
2. **本のタイトル**: `books.title`
3. **本の著者名**: `books.author`
4. **SNSアカウント名**: `sns_users.handle`
5. **SNS表示名**: `sns_users.display_name`

**検索仕様**:
- 大文字小文字を区別しない（`.lower()`で統一）
- 部分一致検索
- いずれかに一致すればヒット（OR条件）

**実装上の注意**:
- DB側のクエリではなく、クライアント側（Python）で実施
- 既にJOINされたデータを使用するため、追加クエリは不要
- 将来的にデータ量が増えた場合はDB側での検索に移行を検討

#### フロントエンド実装

**ファイル**: `app/(main)/my-quotes/page.tsx`

**1. デバウンス処理によるリアルタイム検索** (Line 59-68):

```typescript
// リアルタイム検索（デバウンス処理）
useEffect(() => {
  // 入力から500ms後に検索を実行
  const timer = setTimeout(() => {
    setSearchQuery(searchKeyword);
  }, 500);

  // クリーンアップ: 次の入力があったらタイマーをキャンセル
  return () => clearTimeout(timer);
}, [searchKeyword]);
```

**デバウンスの仕組み**:
1. ユーザーが文字を入力
2. 500msのタイマー開始
3. 500ms以内に新しい文字が入力されたら、タイマーをキャンセルして再度500msのタイマー開始
4. 500ms間何も入力されなければ、検索を実行

**メリット**:
- 連続入力中にAPIリクエストが発生しない
- 入力が完了してから検索が走る
- サーバー負荷を軽減

**2. 検索ボタンの動作保持** (Line 70-78):

```typescript
const handleSearch = () => {
  // 検索ボタン押下時は即座に検索
  setSearchQuery(searchKeyword);
};

const handleKeyPress = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
};
```

**動作**:
- 検索ボタン押下: デバウンスを待たず即座に検索
- Enterキー押下: デバウンスを待たず即座に検索

**3. プレースホルダー変更** (Line 165):

```tsx
placeholder="本のタイトル/著者名・SNSのアカウント名・フレーズで検索"
```

**変更前**: `"キーワードで絞り込み..."`
**変更後**: 検索可能な対象を明示

#### 動作フロー

**ケース1: リアルタイム検索**
1. ユーザーが「村上春樹」と入力
2. 各文字入力後、500msのタイマーが開始
3. 入力が完了し500ms経過
4. `setSearchQuery('村上春樹')` が実行
5. `useQuotesGrouped` フックが再実行され、検索結果を取得
6. 画面が更新される

**ケース2: 検索ボタン押下**
1. ユーザーが「@kabasawa」と入力中（デバウンス待機中）
2. 検索ボタンをクリック
3. デバウンスを待たず即座に `setSearchQuery('@kabasawa')`
4. 検索結果を取得・表示

**ケース3: 入力クリア**
1. ユーザーが検索フィールドを空にする
2. `searchKeyword` が `""` になる
3. 500ms後、`setSearchQuery('')`
4. フィルターが解除され、全件表示に戻る

#### 検索例

**例1: 「村上春樹」で検索**
- 本のタイトルに「村上春樹」を含む → ヒット
- 著者名に「村上春樹」を含む → ヒット
- フレーズテキストに「村上春樹」を含む → ヒット

**例2: 「@kabasawa」で検索**
- SNSアカウント名に「kabasawa」を含む → ヒット
- SNS表示名に「kabasawa」を含む → ヒット
- フレーズテキストに「@kabasawa」を含む → ヒット

**例3: 「経済学」で検索**
- 本のタイトルに「経済学」を含む → ヒット
- フレーズテキストに「経済学」を含む → ヒット

### 2. 「その他」タイプのフレーズのグループ化

#### 要件

**変更前の問題**:
- 「その他」タイプのフレーズは個別に表示されていた
- 同じ出典・メモのフレーズがバラバラに表示される
- 書籍やSNSと比べて一貫性がない

**変更後の仕様**:
- 出典（`source`）とメモ（`note`）の組み合わせでグループ化
- 同じ出典・メモのフレーズをまとめて表示
- 書籍やSNSと同じUIレイアウト

#### バックエンド実装

**1. モデル変更**

**ファイル**: `backend/models/quote.py` (Line 169-179)

**変更前**:
```python
class OtherGroupItem(BaseModel):
    """その他グループアイテム"""
    type: Literal["other"] = "other"
    quote: QuoteWithDetails  # 単一のquoteを持つ
```

**変更後**:
```python
class OtherSource(BaseModel):
    """その他の出典情報"""
    source: Optional[str] = None
    note: Optional[str] = None


class OtherGroupItem(BaseModel):
    """その他グループアイテム"""
    type: Literal["other"] = "other"
    source_info: OtherSource    # 出典情報を分離
    quotes: list[QuoteInGroup]  # 複数のquotesを持つ
```

**変更点**:
- 単一の`quote`から複数の`quotes`へ
- `source_info`として出典情報を明示的に分離
- 書籍（`BookGroupItem`）やSNS（`SnsGroupItem`）と同じ構造に統一

**2. グループ化ロジック**

**ファイル**: `backend/routes/quotes.py` (Line 539-569, 739-769)

**変更前**:
```python
# その他のフレーズ（グループ化なし）
for quote in quotes:
    if quote['source_type'] == 'OTHER':
        quote_with_details = QuoteWithDetails(...)
        grouped_items.append(
            OtherGroupItem(quote=quote_with_details)
        )
```

問題点:
- 1フレーズ = 1グループ
- グループ化されていない

**変更後**:
```python
# その他のフレーズ（出典とメモでグループ化）
other_groups = defaultdict(list)
for quote in quotes:
    if quote['source_type'] == 'OTHER':
        source_meta = quote.get('source_meta') or {}
        source = source_meta.get('source', '') or ''
        note = source_meta.get('note', '') or ''
        # sourceとnoteの組み合わせでグループ化
        group_key = (source, note)
        other_groups[group_key].append(quote)

for (source, note), other_quotes in other_groups.items():
    quote_list = [
        QuoteInGroup(
            id=q['id'],
            text=q['text'],
            page_number=q.get('page_number'),
            is_public=q.get('is_public', False),
            activities=[ActivityNested(**qa['activities']) for qa in q.get('quote_activities', [])],
            tags=[TagNested(**qt['tags']) for qt in q.get('quote_tags', [])],
            created_at=q['created_at']
        )
        for q in other_quotes
    ]

    grouped_items.append(
        OtherGroupItem(
            source_info=OtherSource(source=source if source else None, note=note if note else None),
            quotes=quote_list
        )
    )
```

**グループ化キー**:
- `(source, note)` のタプル
- 両方が一致するフレーズを同じグループにまとめる

**グループ化例**:

| フレーズ | 出典 | メモ | グループ |
|---------|------|------|---------|
| フレーズA | 会議資料 | 2024年度 | グループ1 |
| フレーズB | 会議資料 | 2024年度 | グループ1 |
| フレーズC | 講演会 | 東京 | グループ2 |
| フレーズD | 講演会 | 大阪 | グループ3 |
| フレーズE | (なし) | (なし) | グループ4 |
| フレーズF | (なし) | (なし) | グループ4 |

**空文字の扱い**:
```python
source = source_meta.get('source', '') or ''
note = source_meta.get('note', '') or ''
```

- `None` や空文字列は全て `''` に統一
- 出典・メモが両方ない場合も1つのグループにまとめる

#### フロントエンド実装

**1. 型定義更新**

**ファイル**: `app/(main)/hooks/useQuotesGrouped.ts` (Line 52-61)

**変更前**:
```typescript
export interface OtherGroup {
  type: 'other';
  quote: Quote & {
    source_meta: {
      source?: string;
      note?: string;
    };
  };
}
```

**変更後**:
```typescript
export interface OtherSource {
  source?: string | null;
  note?: string | null;
}

export interface OtherGroup {
  type: 'other';
  source_info: OtherSource;
  quotes: Quote[];
}
```

**2. 表示コンポーネント更新**

**ファイル**: `app/(main)/components/QuoteGroupCard.tsx` (Line 102-138)

**変更前**:
```tsx
// OTHER タイプ
const { quote } = group;
return (
  <div className="bg-white p-6">
    <div className="flex gap-6 items-start">
      {/* 左側：その他メタ情報 */}
      <div className="w-1/3 flex-shrink-0 sticky top-6 self-start bg-gray-50 p-4 rounded-lg">
        <div className="text-center">
          <h3 className="text-sm font-medium text-gray-900 mb-1">その他</h3>
          {quote.source_meta?.source && (
            <p className="text-xs text-gray-500">出典: {quote.source_meta.source}</p>
          )}
          {quote.source_meta?.note && (
            <p className="text-xs text-gray-400 mt-1">{quote.source_meta.note}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">1件のフレーズ</p>
        </div>
      </div>

      {/* 右側：フレーズ本体 */}
      <div className="flex-1">
        <QuoteItem quote={quote} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  </div>
);
```

問題点:
- 常に「1件のフレーズ」と表示
- アイコンがない
- 単一のフレーズのみ表示

**変更後**:
```tsx
// OTHER タイプ
const { source_info, quotes } = group;
return (
  <div className="bg-white p-6">
    <div className="flex gap-6 items-start">
      {/* 左側：その他メタ情報（1/3） */}
      <div className="w-1/3 flex-shrink-0 sticky top-6 self-start bg-gray-50 p-4 rounded-lg">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
            <span className="text-3xl">📝</span>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">その他</h3>
          {source_info?.source && (
            <p className="text-xs text-gray-500">出典: {source_info.source}</p>
          )}
          {source_info?.note && (
            <p className="text-xs text-gray-400 mt-1">{source_info.note}</p>
          )}
          {!source_info?.source && !source_info?.note && (
            <p className="text-xs text-gray-400">出典情報なし</p>
          )}
          <p className="text-xs text-gray-400 mt-2">{quotes.length}件のフレーズ</p>
        </div>
      </div>

      {/* 右側：フレーズ一覧（2/3） */}
      <div className="flex-1">
        <div className="space-y-3">
          {quotes.map((quote) => (
            <QuoteItem key={quote.id} quote={quote} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </div>
    </div>
  </div>
);
```

**追加・変更点**:
1. **アイコン追加**: 📝（書籍の📚、SNSの𝕏/@と同じスタイル）
2. **出典情報なしの表示**: 両方ないときに「出典情報なし」と表示
3. **正確なフレーズ件数**: `{quotes.length}件のフレーズ`
4. **複数フレーズ表示**: `quotes.map()`でリスト表示
5. **レイアウト統一**: 書籍・SNSと同じ1/3 - 2/3の比率

#### 表示例

**グループ1: 会議資料（2024年度）- 3件**
```
┌─────────────────────────────────────────────┐
│ 左側（1/3）          │ 右側（2/3）           │
│ ┌─────────┐         │ ・フレーズ1          │
│ │   📝    │         │   [仕事] [経営]      │
│ └─────────┘         │                      │
│ その他               │ ・フレーズ2          │
│ 出典: 会議資料       │   [仕事]             │
│ 2024年度             │                      │
│ 3件のフレーズ        │ ・フレーズ3          │
│                     │   [仕事] [戦略]      │
└─────────────────────────────────────────────┘
```

**グループ2: 出典情報なし - 2件**
```
┌─────────────────────────────────────────────┐
│ 左側（1/3）          │ 右側（2/3）           │
│ ┌─────────┐         │ ・フレーズ4          │
│ │   📝    │         │   [学習]             │
│ └─────────┘         │                      │
│ その他               │ ・フレーズ5          │
│ 出典情報なし         │   [学習] [技術]      │
│ 2件のフレーズ        │                      │
└─────────────────────────────────────────────┘
```

## 影響範囲

### 変更されたファイル

**バックエンド**:
1. `backend/routes/quotes.py` (Line 409-451, 539-569, 739-769)
2. `backend/models/quote.py` (Line 169-179)

**フロントエンド**:
1. `app/(main)/my-quotes/page.tsx` (Line 59-68, 70-78, 165)
2. `app/(main)/hooks/useQuotesGrouped.ts` (Line 52-61)
3. `app/(main)/components/QuoteGroupCard.tsx` (Line 102-138)

## テスト項目

### キーワード検索

- [x] フレーズテキストで検索できる
- [x] 本のタイトルで検索できる
- [x] 本の著者名で検索できる
- [x] SNSアカウント名で検索できる
- [x] SNS表示名で検索できる
- [x] 大文字小文字を区別しない
- [x] 部分一致で検索される
- [x] 文字入力後500msで自動検索される
- [x] 検索ボタン押下で即座に検索される
- [x] Enterキー押下で即座に検索される
- [x] 検索フィールドをクリアすると全件表示に戻る

### 「その他」グループ化

- [x] 同じ出典・メモのフレーズがグループ化される
- [x] 異なる出典・メモのフレーズは別グループになる
- [x] 出典・メモが両方ないフレーズは1つのグループにまとめられる
- [x] フレーズ件数が正しく表示される
- [x] 複数のフレーズがリスト表示される
- [x] 書籍・SNSと同じレイアウトになる
- [x] 📝アイコンが表示される
- [x] 出典・メモが正しく表示される
- [x] 出典・メモがない場合「出典情報なし」と表示される

## 技術的な知見

### デバウンス処理

**メリット**:
- ユーザーが入力中にAPIリクエストが発生しない
- サーバー負荷を軽減
- UX向上（入力途中で結果が変わらない）

**実装パターン**:
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    // 実行したい処理
  }, delay);

  return () => clearTimeout(timer);
}, [dependency]);
```

**注意点**:
- クリーンアップ関数でタイマーをキャンセル
- 依存配列に監視対象を含める
- delayは500ms程度が一般的（ユーザーの入力速度を考慮）

### グループ化のキー設計

**タプルを使ったグループ化**:
```python
group_key = (source, note)
other_groups[group_key].append(quote)
```

**メリット**:
- 複数の値を1つのキーにできる
- 辞書のキーとして使用可能（タプルはハッシュ可能）
- 可読性が高い

**代替案**:
```python
# 文字列結合（非推奨）
group_key = f"{source}||{note}"  # 区切り文字が含まれる可能性

# ハッシュ化（可読性低い）
group_key = hash((source, note))
```

### 空値の正規化

```python
source = source_meta.get('source', '') or ''
note = source_meta.get('note', '') or ''
```

**意図**:
- `None`, `''`, 欠損キーを全て `''` に統一
- グループ化キーの一貫性を保つ

**動作**:
- `source_meta.get('source', '')`: キーがない場合は`''`
- `or ''`: `None`の場合も`''`に変換

## 今後の改善案

### 1. 検索のDB最適化

現在はクライアント側（Python）で検索を実施しているが、データ量が増えた場合はDB側でのフルテキスト検索に移行。

```python
# PostgreSQLのフルテキスト検索（将来的な実装案）
quotes_query = quotes_query.filter(
    or_(
        Quote.text.ilike(f'%{search}%'),
        Book.title.ilike(f'%{search}%'),
        Book.author.ilike(f'%{search}%'),
        SnsUser.handle.ilike(f'%{search}%'),
        SnsUser.display_name.ilike(f'%{search}%')
    )
)
```

### 2. 検索履歴機能

ユーザーの過去の検索キーワードを保存し、サジェストする。

```typescript
// LocalStorageに検索履歴を保存
const saveSearchHistory = (keyword: string) => {
  const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  const updated = [keyword, ...history.filter(k => k !== keyword)].slice(0, 10);
  localStorage.setItem('searchHistory', JSON.stringify(updated));
};
```

### 3. 検索結果のハイライト

検索キーワードに一致した部分を強調表示。

```tsx
const highlightText = (text: string, keyword: string) => {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};
```

### 4. 高度な検索オプション

- AND/OR検索
- フレーズ検索（完全一致）
- 除外キーワード（NOT検索）

### 5. 「その他」グループの編集機能

グループ化された「その他」タイプのフレーズの出典・メモを一括編集できる機能。

## パフォーマンス考慮

### 検索

**現在の実装**:
- 全フレーズを取得後、クライアント側でフィルタリング
- フレーズ数が1000件程度までは問題なし
- それ以上はDB側での検索が推奨

**ベンチマーク目安**:
- 100件: <50ms
- 500件: <200ms
- 1000件: <500ms

### デバウンス

**500msの根拠**:
- ユーザーの平均入力速度: 1文字/200-300ms
- 2-3文字入力後に検索が走る
- 体感的にストレスのない遅延

## 参考リンク

- [Debouncing and Throttling in React](https://www.patterns.dev/posts/debouncing-throttling)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)

## まとめ

本作業により、以下を達成した：

1. ✅ キーワード検索の拡張
   - 本のタイトル・著者名での検索
   - SNSアカウント名・表示名での検索
   - 大文字小文字を区別しない部分一致検索

2. ✅ リアルタイム検索の実装
   - デバウンス処理による自動検索
   - 検索ボタン・Enterキーでの即座検索
   - 入力クリアでフィルター解除

3. ✅ 「その他」タイプのグループ化
   - 出典とメモでグループ化
   - 書籍・SNSと統一されたUIレイアウト
   - 複数フレーズのリスト表示

これにより、フレーズの検索性と表示の一貫性が大幅に向上した。
