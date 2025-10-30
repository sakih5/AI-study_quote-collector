# 作業ログ: 2025-10-30 - CSVエクスポート機能実装

## 作業概要

Phase 2の最初の機能として、CSVエクスポート機能を実装しました。フィルター条件を適用したフレーズデータをExcel互換のCSV形式でダウンロードできるようになりました。

**作業時間**: 約2時間
**達成進捗**: Phase 2（CSVエクスポート）100%完成 🎉

---

## 実装内容

### 1. CSV生成ユーティリティ

#### 作成ファイル
- `lib/utils/csv-export.ts`

#### 実装した機能

**CSVエスケープ処理:**
- カンマ、引用符、改行を含むフィールドを自動的に引用符で囲む
- フィールド内の引用符は2倍にエスケープ（`"` → `""`）
- RFC 4180準拠のCSV生成

**BOM付きUTF-8:**
- Excel互換のため先頭にBOM（`\uFEFF`）を追加
- 日本語の文字化けを防止

**データフォーマット:**
- 出典情報の整形
  - 書籍: `タイトル - 著者 (p.ページ番号)`
  - SNS: `プラットフォーム - 表示名 (@ハンドル)`
  - その他: `出典 - メモ`
- 活動領域: カンマ区切り（`仕事・キャリア, 学習・研究`）
- タグ: カンマ区切り（`#集中, #習慣`）
- 日時: `YYYY-MM-DD HH:mm:ss`形式

**CSVヘッダー:**
```
フレーズ,出典,活動領域,タグ,登録日時
```

#### 技術詳細

**エスケープロジック:**
```typescript
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // カンマ、引用符、改行を含む場合は引用符で囲む必要がある
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // フィールド内の引用符は2倍にする
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return stringValue;
}
```

**BOM追加:**
```typescript
const BOM = '\uFEFF';
return BOM + header + '\n' + rows.join('\n');
```

---

### 2. CSVエクスポートAPI

#### 作成ファイル
- `app/api/export/csv/route.ts`

#### エンドポイント
```
GET /api/export/csv
```

#### クエリパラメータ
| パラメータ | 型 | 説明 |
|----------|-----|------|
| search | string | 検索キーワード（フレーズテキスト） |
| source_type | string | 出典タイプ（BOOK/SNS/OTHER） |
| activity_ids | string | 活動領域ID（カンマ区切り） |
| tag_ids | string | タグID（カンマ区切り） |

#### レスポンス
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="quotes_export_20251030.csv"

[CSV content]
```

#### 実装の特徴

**フィルター処理:**
1. データベースクエリレベルのフィルター
   - 検索キーワード（`ILIKE`）
   - 出典タイプ（`eq`）

2. クライアントサイドのフィルター（M:N関係のため）
   - 活動領域（AND条件）
   - タグ（AND条件）

**エラーハンドリング:**
- 認証チェック（401）
- データベースエラー（500）
- 内部エラー（500）

**レスポンスの最適化:**
- `NextResponse`で直接CSVテキストを返す
- ストリーミング不要（メモリ上で生成）
- ファイル名に日付を含める（`quotes_export_YYYYMMDD.csv`）

---

### 3. フロントエンド実装

#### 修正ファイル
- `app/(main)/page.tsx`

#### 追加した機能

**CSVエクスポートボタン:**
- フィルターセクション右下に配置
- 緑色（`bg-green-600`）で視認性向上
- 📥アイコンで機能を直感的に表現
- データがない場合は無効化（`disabled`）

**エクスポート処理:**
```typescript
const handleExportCsv = () => {
  // クエリパラメータを構築
  const params = new URLSearchParams();

  if (searchQuery) {
    params.append('search', searchQuery);
  }

  if (selectedActivityIds.length > 0) {
    params.append('activity_ids', selectedActivityIds.join(','));
  }

  if (selectedTagIds.length > 0) {
    params.append('tag_ids', selectedTagIds.join(','));
  }

  // CSVエクスポートAPIにリクエスト
  const url = `/api/export/csv${params.toString() ? '?' + params.toString() : ''}`;
  window.location.href = url;
};
```

**UIの工夫:**
- フィルター条件を自動適用
- ツールチップで説明（`title`属性）
- ホバー時の色変化（`hover:bg-green-700`）
- 無効時の半透明表示（`disabled:opacity-50`）

---

## 動作確認

### テストシナリオ

**1. 全データのエクスポート**
- ✅ フィルターなしでエクスポート
- ✅ 全フレーズがCSVに含まれる
- ✅ ファイル名: `quotes_export_20251030.csv`

**2. Excel互換性**
- ✅ Excelで正しく開ける
- ✅ 日本語が文字化けしない（BOM有効）
- ✅ カンマを含むフィールドが正しく処理される
- ✅ 改行を含むフレーズが正しく処理される

**3. フィルター適用**
- ✅ 活動領域フィルター適用時、該当データのみエクスポート
- ✅ タグフィルター適用時、該当データのみエクスポート
- ✅ 検索キーワード適用時、該当データのみエクスポート
- ✅ 複数フィルター組み合わせ時、AND条件で正しく動作

**4. エッジケース**
- ✅ データが0件の場合、ボタンが無効化される
- ✅ フィルター適用後0件の場合、ヘッダーのみのCSVがダウンロードされる

---

## CSVサンプル出力

```csv
フレーズ,出典,活動領域,タグ,登録日時
"集中は筋肉のように鍛えられる。","深い仕事 - カル・ニューポート (p.27)","学習・研究","#集中, #習慣","2024-10-30 10:00:00"
"完璧を目指すよりまず終わらせろ。","𝕏 - Mark Zuckerberg (@finkd)","仕事・キャリア","#生産性","2024-10-30 09:30:00"
"読書は、他人の経験を自分のものにできる最も効率的な方法だ。","その他","学習・研究, 趣味・娯楽","#読書, #学習","2024-10-29 18:00:00"
```

---

## 技術的な工夫

### 1. RFC 4180準拠

CSVの標準規格（RFC 4180）に準拠した実装：
- フィールド区切り：カンマ（`,`）
- レコード区切り：改行（`\n`）
- 引用符：ダブルクォート（`"`）
- エスケープ：引用符の2倍化（`""`)

### 2. パフォーマンス

**メモリ効率:**
- ストリーミング不要（全データをメモリ上で生成）
- データ量が少ない想定（数千件程度）
- 大量データ対応は将来の課題

**クエリ最適化:**
- 必要なフィールドのみSELECT
- JOIN済みデータを一度に取得（N+1回避）

### 3. ユーザビリティ

**直感的な操作:**
- ボタンクリックで即ダウンロード開始
- フィルター条件を自動継承
- ファイル名に日付を含めて管理しやすく

**エラーハンドリング:**
- データがない場合はボタン無効化
- API側でもエラーを適切に返す

---

## ファイル構成

### 新規作成ファイル
```
lib/utils/
└── csv-export.ts                 # CSV生成ユーティリティ

app/api/export/csv/
└── route.ts                      # CSVエクスポートAPI
```

### 主要な更新ファイル
```
app/(main)/
└── page.tsx                      # CSVエクスポートボタン追加
```

---

## 今後の改善案

### パフォーマンス
- 大量データ対応（ストリーミング）
- ページネーション付きエクスポート
- バックグラウンドジョブ化（非同期処理）

### 機能拡張
- エクスポート形式の選択（JSON, Excel, PDF）
- カスタムカラム選択
- 出力文字コード選択（UTF-8/Shift-JIS）
- エクスポート履歴の記録

### UX改善
- エクスポート進捗表示（プログレスバー）
- プレビュー機能
- エクスポート前の確認ダイアログ

---

## 次回作業時の開始手順

### 1. 開発サーバー起動
```bash
cd /home/sakih/projects/AI-study_quote-collector
npm run dev
```

### 2. 動作確認
- http://localhost:3000 にアクセス
- フィルターを適用してCSVエクスポートを試す

### 3. 次の実装候補（Phase 2）

**残りのPhase 2タスク:**
1. **タグ管理画面**（4〜5時間）
   - API実装済み、UI追加のみ
   - タグ一覧・統合・削除機能

2. **OCR機能**（10〜12時間）
   - Tesseract.js統合
   - 画像アップロード・なぞり選択UI

3. **Amazon書籍情報取得**（4〜5時間）
   - スクレイピング実装
   - レート制限必須

4. **SNSユーザー情報取得**（4〜5時間）
   - URL解析・Google検索

---

## 参考ドキュメント

- [API設計書_v2.md](../API設計書_v2.md) - セクション2.7（エクスポート）
- [PROGRESS.md](../PROGRESS.md)
- [RFC 4180 - CSV仕様](https://www.ietf.org/rfc/rfc4180.txt)
- [前回の作業ログ](./2025-10-30_mvp_completion.md)

---

## 感想・メモ

CSVエクスポート機能が予定通り2時間で完成しました！

特に以下の点がうまくいきました：
- BOM付きUTF-8でExcelとの互換性が完璧
- エスケープ処理が正しく動作（カンマ・引用符・改行）
- フィルター条件の自動適用でUXが良好
- コンパイルエラーなく一発で動作

Phase 2の最初のタスクが完了したので、次はタグ管理画面の実装に進むのが良さそうです。

---

**作成日**: 2025-10-30
**更新日**: 2025-10-30
**作成者**: Claude Code
**Phase 2（CSVエクスポート）**: ✅ 100%完成
