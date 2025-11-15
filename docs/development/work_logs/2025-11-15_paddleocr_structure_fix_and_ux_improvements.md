# PaddleOCR結果構造の修正とUX改善

**日付**: 2025-11-15
**作業者**: Claude Code
**関連Issue**: OCR機能の完成とユーザビリティ改善

## 概要

前回のセッションでTesseract.jsからPaddleOCRへの移行を実施したが、PaddleOCR 3.xの結果構造の違いによりエラーが発生していた。本作業では、結果構造の修正と、ユーザー体験向上のためのUI/UX改善を実施した。

## 実施内容

### 1. PaddleOCR 3.x結果構造への対応

#### 問題
- PaddleOCR 3.xの結果が辞書形式で返されていたが、コードはオブジェクト属性アクセスを想定
- `IndexError: string index out of range` が発生

#### 実際の結果構造
```python
result = [{
    'rec_texts': ['植神科医·识苑宝』元', '@kabasawa', ...],
    'rec_scores': [0.5086402297019958, 0.9947454929351807, ...],
    'rec_polys': [array([[37, 0], ...]), array([[35, 12], ...]), ...],
    ...
}]
```

#### 修正内容
**ファイル**: `backend/services/ocr_service.py`

```python
# 新しいPaddleOCR (3.x) の構造に対応（辞書形式）
if isinstance(ocr_result, dict) and 'rec_texts' in ocr_result:
    rec_texts = ocr_result['rec_texts']
    rec_scores = ocr_result.get('rec_scores', [])
    rec_polys = ocr_result.get('rec_polys', [])

    for i, text in enumerate(rec_texts):
        confidence = float(rec_scores[i]) if i < len(rec_scores) else 1.0

        # rec_polysはnumpy arrayなのでtolist()で変換
        if i < len(rec_polys):
            bbox = rec_polys[i].tolist() if hasattr(rec_polys[i], 'tolist') else rec_polys[i]
        else:
            bbox = []

        # 信頼度フィルタリング
        if confidence >= min_confidence:
            lines.append({
                'text': text,
                'confidence': confidence,
                'bbox': bbox
            })
            full_text_parts.append(text)
```

**変更箇所**:
- Line 115: 属性チェックから辞書チェックに変更
- Line 116-118: 辞書アクセス（`ocr_result['rec_texts']`、`ocr_result.get()`）に変更
- Line 125-129: NumPy配列の安全な変換処理を追加

### 2. OCR処理の進捗見える化

#### 問題
- OCR処理中に「抽出中...」とだけ表示され、いつ終わるのか不明
- ユーザーが不安を感じる体験

#### 改善内容
**ファイル**: `app/(main)/components/QuoteModal.tsx`

**段階的な進捗メッセージ**:
```typescript
const handleOCRExtractText = async (imageDataUrl: string) => {
  setIsOCRProcessing(true);
  setOcrError('');
  setOcrProgress('画像を読み込んでいます...');

  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    setOcrProgress('AIが文字を認識しています...');

    const response = await apiPost<{ text: string; lines: any[] }>('/api/ocr/extract-text', {
      image_data: imageDataUrl,
      min_confidence: 0.5
    });

    setOcrProgress('テキストを整形しています...');
    await new Promise(resolve => setTimeout(resolve, 200));

    setOcrText(response.text);
    setOcrProgress('');
  } catch (err) {
    console.error('OCR error:', err);
    setOcrError('テキスト抽出に失敗しました。画像を確認してください。');
    setOcrProgress('');
  } finally {
    setIsOCRProcessing(false);
  }
};
```

**視覚的な進捗表示UI**:
```tsx
{isOCRProcessing && (
  <div className="py-6 px-4 bg-blue-50 border border-blue-200 rounded-lg">
    <div className="flex items-center justify-center gap-3 mb-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="text-lg font-medium text-blue-900">{ocrProgress}</p>
    </div>

    {/* プログレスバー */}
    <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
      <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: '70%' }}></div>
    </div>

    <p className="mt-3 text-sm text-gray-600 text-center">
      処理には数秒かかる場合があります
    </p>
  </div>
)}
```

**変更箇所**:
- Line 90: `ocrProgress` state追加
- Line 102-130: 段階的な進捗メッセージの実装
- Line 503-519: 進捗表示UIの強化（スピナー、プログレスバー、説明文）

### 3. 画像とテキストの横並び表示

#### 問題
- 抽出されたテキストが正しいか、画像と見比べて確認しづらい

#### 改善内容
**ファイル**: `app/(main)/components/OCRTextSelector.tsx`

**2カラムレイアウト**:
```tsx
{/* 画像とテキストの横並び表示 */}
<div className="grid grid-cols-2 gap-4">
  {/* 左側: 元画像 */}
  <div className="space-y-2">
    <h4 className="text-sm font-medium text-gray-700">元画像</h4>
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
      <img
        src={imageUrl}
        alt="OCR対象画像"
        className="w-full h-auto max-h-[500px] object-contain"
      />
    </div>
  </div>

  {/* 右側: 抽出されたテキスト */}
  <div className="space-y-2">
    <h4 className="text-sm font-medium text-gray-700">抽出されたテキスト</h4>
    <div
      ref={textRef}
      className="p-4 bg-white border border-gray-300 rounded-lg min-h-[300px] max-h-[500px] overflow-y-auto select-text"
      style={{
        userSelect: 'text',
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
      }}
    >
      <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
        {text}
      </div>
    </div>
  </div>
</div>
```

**変更箇所**:
- Line 5-9: `imageUrl` propsを追加
- Line 65-95: 2カラムグリッドレイアウトに変更

### 4. 画像プレビューの非表示制御

#### 問題
- テキスト抽出後、左側に画像が表示されているのに、上部にも小さな画像プレビューが残る
- 画面が冗長で見づらい

#### 改善内容
**ファイル**: `app/(main)/components/QuoteModal.tsx`

```tsx
{/* 画像プレビュー（処理前のみ） */}
{ocrImageFile && !isOCRProcessing && !ocrText && (
  <div className="space-y-3">
    <div className="relative">
      <Image
        src={ocrImageUrl}
        alt="プレビュー"
        width={400}
        height={300}
        className="max-w-full max-h-48 mx-auto rounded-lg object-contain"
        unoptimized
      />
    </div>
  </div>
)}
```

**変更箇所**:
- Line 477: 条件に `!ocrText` を追加
- テキスト抽出後は上部のプレビュー画像が非表示になる

### 5. 「別の画像を選択」ボタンの配置改善

#### 問題
- テキスト抽出後、別の画像を選択するためのボタンが消えてしまう

#### 改善内容
**ファイル**: `app/(main)/components/OCRTextSelector.tsx`

```tsx
{/* ボタン */}
<div className="flex gap-3 justify-between">
  <button
    onClick={onClose}
    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
  >
    別の画像を選択
  </button>
  <button
    onClick={handleAddSelection}
    disabled={!selectedText}
    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
  >
    選択したテキストを追加
  </button>
</div>
```

**変更箇所**:
- Line 106: レイアウトを `justify-between` に変更
- Line 108-112: 「閉じる」を「別の画像を選択」に変更
- テキスト抽出後も別の画像を選択できるように改善

### 6. Tesseract.js関連ファイルの完全削除

#### 削除内容

**package.json**:
```json
// 削除
"tesseract.js": "^5.1.1",
```

**削除されたディレクトリとファイル**:
- `lib/ocr/` ディレクトリ全体
  - `lib/ocr/tesseract.ts`
  - `lib/ocr/types.ts`
  - `lib/ocr/README.md`
- `app/(main)/components/OCRUploader.tsx`
- `app/(main)/components/OCRCanvas.tsx`

**残されたファイル**:
- `app/(main)/components/OCRTextSelector.tsx` （現在使用中）

## 影響範囲

### 変更されたファイル
- `backend/services/ocr_service.py`
- `app/(main)/components/QuoteModal.tsx`
- `app/(main)/components/OCRTextSelector.tsx`
- `package.json`

### 削除されたファイル
- `lib/ocr/` （ディレクトリごと）
- `app/(main)/components/OCRUploader.tsx`
- `app/(main)/components/OCRCanvas.tsx`

## テスト項目

- [x] 画像アップロードでOCR処理が正常に完了する
- [x] 進捗メッセージが段階的に表示される
- [x] プログレスバーがアニメーションする
- [x] 抽出後、画像とテキストが横並びで表示される
- [x] テキストをドラッグ選択できる
- [x] 選択したテキストをフレーズとして追加できる
- [x] 「別の画像を選択」ボタンで新しい画像を選択できる
- [x] テキスト抽出後、上部の小さな画像プレビューが非表示になる

## 技術的な知見

### PaddleOCR 3.x vs 2.x

**2.x の結果構造**:
```python
result = [[
    [bbox, (text, confidence)],
    ...
]]
```

**3.x の結果構造**:
```python
result = [{
    'rec_texts': [...],
    'rec_scores': [...],
    'rec_polys': [...]
}]
```

- 3.xでは辞書形式で各要素が分離されている
- `rec_polys` はNumPy配列なので `.tolist()` で変換が必要
- 後方互換性のため、2.x形式もサポートするコードを維持

### UX設計のポイント

1. **進捗の見える化**: 処理が進行中であることを明確に示す
   - 段階的なメッセージで現在の処理内容を伝える
   - プログレスバーで視覚的にフィードバック
   - 処理時間の目安を表示

2. **比較しやすいレイアウト**: 画像とテキストを横並び
   - ユーザーが抽出結果の正確性を確認しやすい
   - 2カラムグリッドで同じ高さに揃える

3. **状態に応じたUI表示**: 処理前/処理中/処理後で適切に切り替え
   - 処理前: プレビューとボタンを表示
   - 処理中: 進捗表示
   - 処理後: 結果表示（画像＋テキスト）

## 今後の改善案

1. **OCR精度の向上**
   - PaddleOCRのパラメータチューニング
   - 画像前処理の追加（コントラスト調整、ノイズ除去）

2. **複数画像の一括処理**
   - ドラッグ&ドロップで複数画像を受け付け
   - バッチ処理でまとめて抽出

3. **抽出結果の編集機能**
   - テキストエリア内で直接編集可能に
   - 誤認識箇所の手動修正

4. **信頼度スコアの可視化**
   - 低信頼度のテキストをハイライト表示
   - ユーザーが確認すべき箇所を明示

## 参考リンク

- [PaddleOCR Documentation](https://github.com/PaddlePaddle/PaddleOCR)
- [PaddleOCR Python API](https://paddlepaddle.github.io/PaddleOCR/latest/ppocr/infer.html)

## まとめ

本作業により、PaddleOCRへの移行が完全に完了し、以下を達成した：

1. ✅ PaddleOCR 3.x結果構造への完全対応
2. ✅ 処理進捗の見える化によるUX向上
3. ✅ 画像とテキストの横並び表示で確認しやすいUI
4. ✅ Tesseract.js関連の不要ファイル完全削除
5. ✅ クリーンなコードベースの維持

OCR機能は本番環境で使用可能な状態となった。
