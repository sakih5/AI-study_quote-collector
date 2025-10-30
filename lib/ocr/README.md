# OCR機能実装ガイド

## 概要

Tesseract.jsを使用して、画像からテキストを抽出する機能を実装します。

## 準備完了

- ✅ Tesseract.jsインストール済み（v5.x）
- ✅ 型定義作成済み（`types.ts`）
- ✅ ユーティリティのスケルトン作成済み（`tesseract.ts`）

## 次回実装タスク

### 1. OCR基本機能の実装（`tesseract.ts`）

#### `extractTextFromImage()`
```typescript
export async function extractTextFromImage(
  imageFile: File | Blob,
  language: string = 'jpn',
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult>
```

**実装手順:**
1. Tesseract.jsのWorkerを作成
   ```typescript
   const worker = await Tesseract.createWorker(language, 1, {
     logger: (m) => {
       if (onProgress) {
         onProgress({
           status: m.status,
           progress: m.progress,
           message: m.status
         });
       }
     }
   });
   ```

2. OCRを実行
   ```typescript
   const { data } = await worker.recognize(imageFile);
   ```

3. 結果を整形
   ```typescript
   const result: OCRResult = {
     text: data.text,
     confidence: data.confidence,
     lines: data.lines.map(line => ({
       text: line.text,
       confidence: line.confidence,
       bbox: line.bbox,
       words: line.words.map(word => ({
         text: word.text,
         confidence: word.confidence,
         bbox: word.bbox
       }))
     })),
     words: data.words.map(word => ({
       text: word.text,
       confidence: word.confidence,
       bbox: word.bbox
     }))
   };
   ```

4. Workerを終了
   ```typescript
   await worker.terminate();
   ```

#### `extractTextFromSelection()`
```typescript
export function extractTextFromSelection(
  ocrResult: OCRResult,
  selection: SelectionBounds
): SelectionResult
```

**実装手順:**
1. 選択範囲と重なる単語をフィルタリング
   ```typescript
   const wordsInSelection = ocrResult.words.filter(word =>
     isWordInSelection(word.bbox, selection)
   );
   ```

2. 単語を位置順にソート（左上から右下へ）
   ```typescript
   wordsInSelection.sort((a, b) => {
     // まず行（y座標）でソート
     const rowDiff = a.bbox.y0 - b.bbox.y0;
     if (Math.abs(rowDiff) > 10) { // 同じ行とみなす閾値
       return rowDiff;
     }
     // 同じ行なら列（x座標）でソート
     return a.bbox.x0 - b.bbox.x0;
   });
   ```

3. テキストを結合（行ごとに改行を挿入）
   ```typescript
   let text = '';
   let lastY = -1;
   for (const word of wordsInSelection) {
     if (lastY !== -1 && Math.abs(word.bbox.y0 - lastY) > 10) {
       text += '\n';
     }
     text += (text && lastY === word.bbox.y0 ? ' ' : '') + word.text;
     lastY = word.bbox.y0;
   }
   ```

#### `isWordInSelection()`
```typescript
function isWordInSelection(
  wordBbox: { x0: number; y0: number; x1: number; y1: number },
  selection: SelectionBounds
): boolean
```

**実装手順:**
矩形の重なり判定
```typescript
const selectionX1 = selection.x + selection.width;
const selectionY1 = selection.y + selection.height;

// 重なりがない場合を判定
if (
  wordBbox.x1 < selection.x ||
  wordBbox.x0 > selectionX1 ||
  wordBbox.y1 < selection.y ||
  wordBbox.y0 > selectionY1
) {
  return false;
}

// 中心点が選択範囲内にあるかチェック
const centerX = (wordBbox.x0 + wordBbox.x1) / 2;
const centerY = (wordBbox.y0 + wordBbox.y1) / 2;

return (
  centerX >= selection.x &&
  centerX <= selectionX1 &&
  centerY >= selection.y &&
  centerY <= selectionY1
);
```

---

### 2. UIコンポーネントの実装

#### `OCRUploader.tsx`
画像アップロードコンポーネント

**機能:**
- ファイル選択（ドラッグ&ドロップ対応）
- 画像プレビュー
- OCR実行ボタン
- 進捗表示

#### `OCRCanvas.tsx`
Canvas上での選択範囲指定コンポーネント

**機能:**
- 画像を表示
- マウスドラッグで矩形選択
- 複数の選択範囲を管理
- 選択範囲のハイライト表示
- 選択範囲ごとにテキスト抽出

**実装の参考:**
```typescript
const [selections, setSelections] = useState<SelectionBounds[]>([]);
const [currentSelection, setCurrentSelection] = useState<SelectionBounds | null>(null);
const [isDrawing, setIsDrawing] = useState(false);

const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return;

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  setIsDrawing(true);
  setCurrentSelection({ x, y, width: 0, height: 0 });
};

const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (!isDrawing || !currentSelection) return;

  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return;

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  setCurrentSelection({
    ...currentSelection,
    width: x - currentSelection.x,
    height: y - currentSelection.y,
  });
};

const handleMouseUp = () => {
  if (currentSelection && currentSelection.width !== 0 && currentSelection.height !== 0) {
    setSelections([...selections, currentSelection]);
  }
  setIsDrawing(false);
  setCurrentSelection(null);
};
```

---

### 3. フレーズ登録モーダルへの統合

`QuoteModal.tsx`に以下を追加：

**セクション0（新規）: OCR**
- 画像アップロードボタン
- OCRモーダルを開く
- OCR結果を各フレーズ入力欄に自動入力

**実装の流れ:**
1. ユーザーが「OCRで入力」ボタンをクリック
2. OCRモーダルが開く
3. 画像をアップロード
4. OCR実行（進捗表示）
5. Canvas上で選択範囲を指定
6. 各選択範囲からテキストを抽出
7. フレーズ入力欄に自動入力
8. モーダルを閉じる

---

## 参考資料

### Tesseract.jsドキュメント
- GitHub: https://github.com/naptha/tesseract.js
- API: https://github.com/naptha/tesseract.js/blob/master/docs/api.md

### 日本語認識の設定
```typescript
// 日本語のみ
const worker = await Tesseract.createWorker('jpn');

// 日本語と英語
const worker = await Tesseract.createWorker(['jpn', 'eng']);
```

### パフォーマンスの最適化
- 画像サイズが大きい場合は、事前にリサイズ（最大2000px程度）
- Worker数を増やして並列処理（複数画像を処理する場合）
- キャッシュを利用（5分間保持）

### 精度向上のコツ
- コントラストを上げる
- グレースケール化
- 二値化（白黒）
- 傾き補正（必要に応じて）

---

## テスト

### 単体テスト（Vitest）
- `extractTextFromImage()`: モック画像でOCR実行
- `extractTextFromSelection()`: 選択範囲内のテキスト抽出
- `isWordInSelection()`: 矩形の重なり判定

### E2Eテスト（Playwright）
- 画像アップロード → OCR実行 → 選択範囲指定 → テキスト抽出
- フレーズ登録モーダルでOCR機能を使った登録フロー

---

## 次回作業の開始手順

1. 開発サーバー起動
   ```bash
   npm run dev
   ```

2. `lib/ocr/tesseract.ts` の実装を開始
   - `extractTextFromImage()` から実装
   - テストコードを書きながら進める

3. UIコンポーネントの作成
   - `OCRUploader.tsx` → `OCRCanvas.tsx` の順で実装

4. フレーズ登録モーダルへの統合
   - セクション0を追加
   - OCR結果を入力欄に反映

5. 動作確認
   - 日本語の書籍ページ画像でテスト
   - 複数の選択範囲でテスト

---

## 推定作業時間

- OCR基本機能: 2〜3時間
- UIコンポーネント: 3〜4時間
- フレーズ登録モーダル統合: 2〜3時間
- テスト・調整: 2〜3時間
- **合計**: 9〜13時間

---

**作成日**: 2025-10-30
**作成者**: Claude Code
