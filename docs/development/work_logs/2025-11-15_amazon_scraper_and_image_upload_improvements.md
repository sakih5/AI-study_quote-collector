# Amazon書籍情報取得と画像アップロード機能の改善

**日付**: 2025-11-15
**作業者**: Claude Code
**関連タスク**: Amazon URLスクレイピング改善、書籍画像アップロード機能追加

## 概要

Amazon URLから書籍情報を取得する際の問題を修正し、書籍画像の手動アップロード機能を追加しました。

## 実施した修正

### 1. デバッグprintステートメントのクリーンアップ（前回作業の続き）

**ファイル**: `backend/services/sns_scraper.py`

残っていたデバッグprint文を削除しました：

- Line 168: X プロフィールページ取得失敗時のログ
- Line 227: Threads プロフィールページ取得失敗時のログ

```python
# 削除した行
print(f"[DEBUG] Failed to fetch X profile page: {response.status_code}")
print(f"[DEBUG] Failed to fetch Threads profile page: {response.status_code}")
```

**注**: エラーレベルのログ（`[ERROR]`）は実際のエラー追跡に有用なため保持しています。

---

### 2. 出版社名の余分な空白を削除

**ファイル**: `backend/services/amazon_scraper.py`

**問題**: スクレイピングした出版社名に連続する空白が含まれていた

**解決策**: 正規表現を使用して、複数の連続する空白を1つにまとめ、前後の空白も削除

**修正箇所**:

#### Line 153-157 (detailBullets から取得する場合)
```python
if '出版社' in text or 'Publisher' in text:
    publisher_match = re.search(r'[：:]\s*([^(（]+)', text)
    if publisher_match:
        # 複数の空白を1つに、前後の空白も削除
        publisher = re.sub(r'\s+', ' ', publisher_match.group(1).strip())
```

#### Line 175-177 (productDetailsTable から取得する場合)
```python
if not publisher and ('出版社' in header or 'Publisher' in header):
    # 複数の空白を1つに、前後の空白も削除
    publisher = re.sub(r'\s+', ' ', value.split('(')[0].split('（')[0].strip())
```

**効果**:
- Before: `"ダイヤモンド  社"` (空白2つ)
- After: `"ダイヤモンド 社"` (空白1つ)

---

### 3. 書籍画像の手動アップロード機能を追加

**ファイル**: `app/(main)/components/QuoteModal.tsx`

**要件**:
- 本画像の抽出に失敗した場合に手作業でアップロードできるようにする
- Amazon URLを取り込む前から本の画像をアップロードするスペースを表示
- Amazon URLから取得した画像も同じスペースに表示
- ユーザーがフローの順序を理解しやすいよう、Amazon URL入力欄を上に配置

**実装内容**:

#### 画像アップロード欄を常時表示 (Line 720-781)

```tsx
{/* 書籍画像アップロード・プレビュー */}
<div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
  <label className="block text-sm font-medium text-gray-700 mb-3">
    書籍の画像
  </label>

  {bookData.newBook.cover_image_url ? (
    // 画像がある場合：プレビュー + 削除ボタン
    <div className="flex flex-col items-center gap-3">
      <Image
        src={bookData.newBook.cover_image_url}
        alt={bookData.newBook.title || '書籍カバー'}
        width={120}
        height={160}
        className="w-30 h-40 object-cover rounded shadow-md"
      />
      <button
        onClick={() => setBookData({
          ...bookData,
          newBook: { ...bookData.newBook, cover_image_url: '' }
        })}
        className="text-sm text-red-600 hover:text-red-700 transition-colors"
      >
        画像を削除
      </button>
    </div>
  ) : (
    // 画像がない場合：プレースホルダー + アップロードボタン
    <div className="flex flex-col items-center gap-3">
      <div className="w-30 h-40 bg-gray-100 rounded flex items-center justify-center shadow-sm">
        <span className="text-5xl">📚</span>
      </div>
      <label className="cursor-pointer">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setBookData({
                  ...bookData,
                  newBook: {
                    ...bookData.newBook,
                    cover_image_url: reader.result as string
                  }
                });
              };
              reader.readAsDataURL(file);
            }
          }}
        />
        <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors inline-block">
          画像をアップロード
        </span>
      </label>
    </div>
  )}
  <p className="text-xs text-gray-500 mt-2 text-center">
    ※ Amazon URLから自動取得、または手動でアップロードできます
  </p>
</div>
```

#### レイアウト順序の変更

**最終的な表示順序**:
1. **Amazon URLから自動取得欄**（Line 693-718）
2. **書籍の画像アップロード欄**（Line 720-781）
3. タイトル、著者、出版社の入力欄

この順序により、ユーザーは以下のフローで操作できます：
1. Amazon URLを入力して自動取得
2. 画像が取得できなかった場合は手動でアップロード
3. その他の情報を確認・編集

---

## UI/UX改善ポイント

### 画像表示の統一
- Amazon URLから取得した画像と手動アップロードした画像を同じスペースに表示
- 常に画像エリアが表示されるため、ユーザーは画像の有無を明確に把握できる

### フォールバック対応
- Amazon URLのスクレイピングが失敗しても、手動で画像をアップロード可能
- 画像削除ボタンにより、誤った画像を簡単に差し替え可能

### ファイル形式
- 手動アップロードした画像はBase64エンコードされてデータURLとして保存
- Amazon URLから取得した画像は外部URL（Amazon CDN）

---

## テスト項目

### 手動画像アップロード
- [ ] 画像ファイルを選択してアップロードできる
- [ ] アップロードした画像がプレビュー表示される
- [ ] 画像削除ボタンで画像をクリアできる
- [ ] 削除後、再度アップロードできる

### Amazon URL自動取得との連携
- [ ] Amazon URLから画像を含む書籍情報を取得できる
- [ ] 取得した画像が画像エリアに表示される
- [ ] 画像取得失敗時、手動アップロードに切り替えられる
- [ ] 既に手動アップロードした画像がある状態でAmazon URLから取得すると、自動取得した画像で上書きされる

### 出版社名の空白処理
- [ ] Amazon URLから取得した出版社名に余分な空白が含まれない
- [ ] 複数の連続する空白が1つにまとめられている

---

## 今後の改善案

1. **画像サイズ制限**: 手動アップロード時にファイルサイズや画像サイズのバリデーションを追加
2. **画像最適化**: Base64ではなくSupabase StorageにアップロードしてURLで管理
3. **プログレス表示**: 画像アップロード中のローディング表示
4. **エラーハンドリング**: 画像ファイル読み込みエラー時のメッセージ表示

---

## 関連ファイル

- `backend/services/amazon_scraper.py` - Amazon書籍情報スクレイピング
- `backend/services/sns_scraper.py` - SNSユーザー情報スクレイピング（デバッグクリーンアップ）
- `app/(main)/components/QuoteModal.tsx` - フレーズ登録モーダルUI
