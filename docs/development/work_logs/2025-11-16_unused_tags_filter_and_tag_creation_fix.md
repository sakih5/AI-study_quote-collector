# 未使用タグの非表示化とタグ作成機能の修正

**日付**: 2025-11-16
**作業者**: Claude Code
**関連Issue**: 未使用タグの表示問題、タグ作成機能のエラー

## 概要

以下2つの改善を実施した：
1. フレーズに使われていないタグをホーム画面とタグ管理画面から非表示にする
2. フレーズ登録・編集モーダルでタグ追加ができない問題を修正

## 実施内容

### 1. 未使用タグの非表示化

#### 問題

- ホーム画面のタグフィルタに、フレーズに1件も使われていないタグが表示されていた
- タグ管理画面にも未使用タグが表示されていた
- 原因：バックエンドの`usage_count`計算時に、削除済みフレーズに紐づいた`quote_tags`レコードもカウントしていた

#### 修正内容

##### バックエンド（`backend/routes/tags.py`）

**ファイル**: `backend/routes/tags.py` (Line 59-95)

**変更前**:
```python
# 各タグのメタデータを取得
tags_with_metadata = []
for tag in tags:
    # 使用数を取得
    count_response = supabase.table('quote_tags') \
        .select('*', count='exact', head=True) \
        .eq('tag_id', tag['id']) \
        .execute()

    usage_count = count_response.count or 0

    # 活動領域別分布を取得
    distribution_response = supabase.table('quote_tags') \
        .select('quote_id, quotes!inner(quote_activities!inner(activity_id))') \
        .eq('tag_id', tag['id']) \
        .execute()
```

問題点：
- `quote_tags`テーブルのレコードをすべてカウント
- 削除済みフレーズに紐づいたレコードもカウントされる
- 削除済みフレーズの`quote_tags`レコードは削除されないため、カウントが不正確

**変更後**:
```python
# 各タグのメタデータを取得
tags_with_metadata = []
for tag in tags:
    # 使用数を取得（削除済みフレーズを除外）
    count_response = supabase.table('quote_tags') \
        .select('*, quotes!inner(id)', count='exact', head=True) \
        .eq('tag_id', tag['id']) \
        .is_('quotes.deleted_at', 'null') \
        .execute()

    usage_count = count_response.count or 0

    # 活動領域別分布を取得（削除済みフレーズを除外）
    distribution_response = supabase.table('quote_tags') \
        .select('quote_id, quotes!inner(deleted_at, quote_activities!inner(activity_id))') \
        .eq('tag_id', tag['id']) \
        .is_('quotes.deleted_at', 'null') \
        .execute()
```

改善点：
1. **INNER JOIN による結合**:
   ```python
   .select('*, quotes!inner(id)', count='exact', head=True)
   ```
   - `quotes!inner(id)` で `quotes` テーブルとINNER JOINを実行
   - 結合に失敗したレコード（存在しないフレーズ）は除外される

2. **削除済みフレーズの除外**:
   ```python
   .is_('quotes.deleted_at', 'null')
   ```
   - `deleted_at` が `null`（削除されていない）フレーズのみをカウント

3. **活動領域別分布も同様に修正**:
   - 削除済みフレーズを除外して分布を計算
   - タグ管理画面での活動領域別表示が正確になる

##### フロントエンド（`app/(main)/my-quotes/page.tsx`）

**ファイル**: `app/(main)/my-quotes/page.tsx` (Line 28-32, 317-334)

**変更内容**:
```typescript
const { activities } = useActivities();
const { tags: allTags } = useTags();

// 使用中のタグのみをフィルタリング
const tags = allTags.filter(tag => (tag.usage_count || 0) > 0);
```

- APIから取得した全タグを `allTags` として受け取る
- `usage_count > 0` のタグのみをフィルタリング
- フィルタリング後の `tags` をタグフィルタUIで使用

**タグフィルター表示部分**:
```typescript
{/* タグフィルター */}
<div>
  <h3 className="text-sm font-medium text-gray-600 mb-2">タグ</h3>
  <div className="flex gap-2 overflow-x-auto pb-2">
    {tags.length === 0 ? (
      <p className="text-gray-500 text-sm">タグがまだありません</p>
    ) : (
      tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggleTag(tag.id)}
          className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTagIds.includes(tag.id)
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {tag.name}
        </button>
      ))
    )}
  </div>
</div>
```

- すでにフィルタリング済みの `tags` を使用
- 重複したフィルタリングを削除してコードを簡潔化

##### タグ管理画面（`app/(main)/settings/tags/page.tsx`）

**ファイル**: `app/(main)/settings/tags/page.tsx` (Line 20-27)

**変更内容**:
```typescript
const { tags: allTags, loading, error, refetch } = useTagsManagement({
  search: searchQuery,
  sort: sortBy,
  order: sortOrder,
});

// 使用中のタグのみをフィルタリング
const tags = allTags.filter(tag => (tag.usage_count || 0) > 0);
```

- `allTags` を受け取ってフィルタリング
- 以降のコード（一覧表示、統合モーダルなど）は `tags` を参照
- 統合先の選択肢にも使用中のタグのみが表示される

#### 動作

修正後の動作：
- ✅ タグに紐づいたフレーズがすべて削除された場合、`usage_count = 0` になる
- ✅ `usage_count = 0` のタグは、ホーム画面のタグフィルタで非表示
- ✅ `usage_count = 0` のタグは、タグ管理画面で非表示
- ✅ 削除されていないフレーズに紐づいているタグのみが表示される
- ✅ UIが整理され、実際に使用しているタグのみに集中できる

---

### 2. タグ作成機能の修正

#### 問題

フレーズ登録・編集モーダルでタグを追加しようとすると、以下のエラーが発生：
```
[ERROR] タグ作成エラー: AttributeError: 'SyncQueryRequestBuilder' object has no attribute 'select'
```

**原因**:
- Supabase Python SDKで、`.update()`や`.insert()`の後に直接`.select()`を呼ぶとエラーになる
- フロントエンドのボタンが`text-gray-900`（黒）で見づらかった
- Enterキーでの追加ができなかった

#### 修正内容

##### バックエンド（`backend/routes/tags.py`）

**ファイル**: `backend/routes/tags.py` (Line 164-199)

**変更前**:
```python
if deleted_tags and len(deleted_tags) > 0:
    # 削除済みタグを復活させる
    deleted_tag = deleted_tags[0]
    restore_response = supabase.table('tags') \
        .update({'deleted_at': None}) \
        .eq('id', deleted_tag['id']) \
        .select('id, name, created_at') \
        .execute()

    if restore_response.data and len(restore_response.data) > 0:
        tag = restore_response.data[0]
else:
    # 新しいタグを作成
    create_response = supabase.table('tags') \
        .insert({
            'user_id': user.id,
            'name': tag_name
        }) \
        .select('id, name, created_at') \
        .execute()

    if create_response.data and len(create_response.data) > 0:
        tag = create_response.data[0]
```

問題点：
- `.update()`の後に`.select()`を直接チェーン
- `.insert()`の後に`.select()`を直接チェーン
- Supabase Python SDKではこの書き方がサポートされていない

**変更後**:
```python
if deleted_tags and len(deleted_tags) > 0:
    # 削除済みタグを復活させる
    deleted_tag = deleted_tags[0]
    supabase.table('tags') \
        .update({'deleted_at': None}) \
        .eq('id', deleted_tag['id']) \
        .execute()

    # 復活したタグを取得
    restore_response = supabase.table('tags') \
        .select('id, name, created_at') \
        .eq('id', deleted_tag['id']) \
        .execute()

    if restore_response.data and len(restore_response.data) > 0:
        tag = restore_response.data[0]
else:
    # 新しいタグを作成
    create_response = supabase.table('tags') \
        .insert({
            'user_id': user.id,
            'name': tag_name
        }) \
        .execute()

    if create_response.data and len(create_response.data) > 0:
        created_tag_id = create_response.data[0]['id']

        # 作成したタグを取得
        select_response = supabase.table('tags') \
            .select('id, name, created_at') \
            .eq('id', created_tag_id) \
            .execute()

        if select_response.data and len(select_response.data) > 0:
            tag = select_response.data[0]
```

改善点：
1. **操作の分離**:
   - `.update()` / `.insert()` と `.select()` を別々のクエリに分離
   - 各操作を独立して実行

2. **IDによる再取得**:
   - 作成/復活後、IDを使って最新データを取得
   - データの一貫性を保証

##### フロントエンド（`app/(main)/components/QuoteModal.tsx`）

**ファイル**: `app/(main)/components/QuoteModal.tsx` (Line 666-707)

**変更内容**:

1. **Enterキー対応**:
```typescript
<input
  type="text"
  value={newTagName}
  onChange={(e) => setNewTagName(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && newTagName.trim()) {
      e.preventDefault();
      (async () => {
        const tag = await createTag(newTagName.trim());
        if (tag) {
          const newQuotes = [...quotes];
          newQuotes[index].tag_ids.push(tag.id);
          setQuotes(newQuotes);
          setNewTagName('');
        }
      })();
    }
  }}
  placeholder="新しいタグ名を入力（例: 生産性）"
  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

- `onKeyPress` → `onKeyDown` に変更（非推奨警告の解消）
- Enterキーでタグ追加が可能に

2. **ボタンの視認性改善**:
```typescript
<button
  type="button"
  onClick={async () => {
    if (newTagName.trim()) {
      const tag = await createTag(newTagName.trim());
      if (tag) {
        const newQuotes = [...quotes];
        newQuotes[index].tag_ids.push(tag.id);
        setQuotes(newQuotes);
        setNewTagName('');
      }
    }
  }}
  disabled={!newTagName.trim()}
  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  + 追加
</button>
```

改善点：
- `text-gray-900` → `text-white`（見やすい白色に変更）
- `bg-blue-500` → `bg-blue-600`（他のボタンと統一）
- `type="button"` を追加（フォーム誤送信防止）
- `disabled` 属性を追加（入力が空の場合は無効化）
- `disabled:opacity-50` と `disabled:cursor-not-allowed` を追加

3. **プレースホルダーの改善**:
```typescript
// 変更前
placeholder="例: 生産性"

// 変更後
placeholder="新しいタグ名を入力（例: 生産性）"
```

##### フロントエンド（`app/(main)/components/QuoteEditModal.tsx`）

**ファイル**: `app/(main)/components/QuoteEditModal.tsx` (Line 197-234)

**変更内容**:

QuoteModalと同じ改善を適用：
- Enterキー対応
- ボタンの視認性改善
- 無効化制御
- プレースホルダーの改善
- type属性の追加

```typescript
{/* 新規タグ作成 */}
<div className="flex gap-2">
  <input
    type="text"
    value={newTagName}
    onChange={(e) => setNewTagName(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && newTagName.trim()) {
        e.preventDefault();
        (async () => {
          const tag = await createTag(newTagName.trim());
          if (tag) {
            setTagIds([...tagIds, tag.id]);
            setNewTagName('');
          }
        })();
      }
    }}
    placeholder="新しいタグ名を入力（例: 生産性）"
    className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  <button
    type="button"
    onClick={async () => {
      if (newTagName.trim()) {
        const tag = await createTag(newTagName.trim());
        if (tag) {
          setTagIds([...tagIds, tag.id]);
          setNewTagName('');
        }
      }
    }}
    disabled={!newTagName.trim()}
    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    + 追加
  </button>
</div>
```

#### 動作

修正後の動作：
- ✅ フレーズ登録モーダルでタグ追加が可能
- ✅ フレーズ編集モーダルでタグ追加が可能
- ✅ タグ名を入力して「+ 追加」ボタンをクリック → タグが作成される
- ✅ タグ名を入力してEnterキーを押す → タグが作成される
- ✅ ボタンのテキストが白色で見やすい
- ✅ 入力が空の場合はボタンが無効化される
- ✅ バックエンドエラーが発生しない
- ✅ タグ作成後、すぐにフレーズに紐付けられる

## 修正ファイル一覧

```
backend/routes/tags.py                      # usage_count計算の修正、タグ作成の修正
app/(main)/my-quotes/page.tsx               # 未使用タグのフィルタリング
app/(main)/settings/tags/page.tsx          # 未使用タグのフィルタリング
app/(main)/components/QuoteModal.tsx        # タグ追加機能の改善
app/(main)/components/QuoteEditModal.tsx    # タグ追加機能の改善
app/(main)/hooks/useTags.ts                 # デバッグログの削除（クリーンアップ）
```

## 技術的なポイント

### 1. Supabaseでの削除済みレコードの除外

```python
# INNER JOINを使用
.select('*, quotes!inner(id)', count='exact', head=True)

# 削除済みを除外
.is_('quotes.deleted_at', 'null')
```

- `!inner` でINNER JOINを明示
- 結合に失敗したレコードを除外
- ソフトデリートされたレコードを確実に除外

### 2. Supabase Python SDKの制約

**NG**: `.update()`や`.insert()`の後に直接`.select()`をチェーン
```python
# これはエラーになる
response = supabase.table('tags') \
    .insert({...}) \
    .select('id, name') \
    .execute()
```

**OK**: 操作を分離して、IDで再取得
```python
# まず作成
create_response = supabase.table('tags') \
    .insert({...}) \
    .execute()

created_id = create_response.data[0]['id']

# IDで取得
select_response = supabase.table('tags') \
    .select('id, name') \
    .eq('id', created_id) \
    .execute()
```

### 3. React での非推奨APIの回避

```typescript
// 非推奨
onKeyPress={(e) => { ... }}

// 推奨
onKeyDown={(e) => { ... }}
```

- `onKeyPress` は React 17以降で非推奨
- `onKeyDown` または `onKeyUp` を使用

### 4. フィルタリングの最適化

```typescript
// APIレスポンスを一度フィルタリング
const tags = allTags.filter(tag => (tag.usage_count || 0) > 0);

// フィルタリング済みデータを使用
{tags.map((tag) => (
  <button key={tag.id}>{tag.name}</button>
))}
```

- フィルタリングを1箇所で行う
- 重複したフィルタリング処理を削除
- コードの可読性と保守性が向上

## テスト観点

### 未使用タグの非表示

1. **基本動作**:
   - タグを作成しても、フレーズに紐づけるまで表示されない
   - フレーズを削除すると、タグの`usage_count`が減少
   - すべてのフレーズを削除すると、タグが非表示になる

2. **削除済みフレーズの扱い**:
   - ソフトデリートされたフレーズはカウントされない
   - ハードデリートされたフレーズもカウントされない
   - 復活したフレーズは再度カウントされる

3. **表示の一貫性**:
   - ホーム画面とタグ管理画面で同じタグが表示される
   - タグフィルタと統合先選択肢が一致する

### タグ作成機能

1. **基本動作**:
   - タグ名を入力して「+ 追加」ボタンをクリック
   - Enterキーでタグ追加
   - 作成後すぐにフレーズに紐付けられる

2. **バリデーション**:
   - 空の入力ではボタンが無効化される
   - 重複したタグ名でエラーが表示される
   - `#`が自動的に付与される

3. **UI/UX**:
   - ボタンの視認性（白色テキスト）
   - 無効化状態の視覚的フィードバック
   - プレースホルダーの説明性

## 今後の改善案

### パフォーマンス

1. **usage_countのキャッシュ**:
   - タグ一覧取得時のN+1クエリ問題
   - データベースビューやマテリアライズドビューの使用
   - Redis等でのキャッシング

2. **一括クエリの最適化**:
   - 複数タグのusage_countを1クエリで取得
   - PostgreSQLのWINDOW関数の活用

### 機能

1. **タグの自動整理**:
   - 未使用タグの自動削除機能
   - 使用頻度の低いタグの警告

2. **タグの推奨機能**:
   - フレーズ内容からタグを推奨
   - 過去の使用パターンからサジェスト

## まとめ

今回の作業により、以下を達成した：

### 未使用タグの非表示化
- ✅ バックエンドでのusage_count計算の正確化
- ✅ 削除済みフレーズの適切な除外
- ✅ ホーム画面とタグ管理画面でのフィルタリング
- ✅ UIの整理と使いやすさの向上

### タグ作成機能の修正
- ✅ Supabase Python SDKの制約に対応
- ✅ フレーズ登録・編集モーダルでのタグ追加を実現
- ✅ Enterキー対応による操作性向上
- ✅ ボタンの視認性改善
- ✅ 適切なバリデーションと無効化制御

ユーザーは実際に使用しているタグのみに集中でき、スムーズにタグを作成・管理できるようになった。
