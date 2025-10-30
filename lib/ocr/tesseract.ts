/**
 * Tesseract.jsのラッパー
 * 画像からテキストを抽出するためのユーティリティ
 */

import Tesseract from 'tesseract.js';
import type { OCRResult, OCRProgress, SelectionResult, SelectionBounds } from './types';

/**
 * 画像ファイルからテキストを抽出する
 *
 * @param imageFile - 画像ファイル（File または Blob）
 * @param language - 言語コード（デフォルト: 'jpn'）
 * @param onProgress - 進捗コールバック
 * @returns OCR実行結果
 *
 * @example
 * const result = await extractTextFromImage(file, 'jpn', (progress) => {
 *   console.log(`進捗: ${progress.progress * 100}%`);
 * });
 * console.log(result.text);
 */
export async function extractTextFromImage(
  imageFile: File | Blob,
  language: string = 'jpn',
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  // 1. Tesseract.jsのWorkerを作成
  const worker = await Tesseract.createWorker(language, 1, {
    logger: (m) => {
      if (onProgress) {
        onProgress({
          status: m.status as OCRProgress['status'],
          progress: m.progress,
          message: m.status
        });
      }
    }
  });

  try {
    // 2. OCRを実行
    const { data } = await worker.recognize(imageFile);

    // 3. 結果を整形
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

    // 4. Workerを終了
    await worker.terminate();

    return result;
  } catch (error) {
    // エラー時もWorkerを終了
    await worker.terminate();
    throw error;
  }
}

/**
 * 選択範囲内のテキストを抽出する
 *
 * @param ocrResult - OCR実行結果
 * @param selection - 選択範囲の座標
 * @returns 選択範囲内のテキスト
 *
 * @example
 * const selectionText = extractTextFromSelection(ocrResult, {
 *   x: 100,
 *   y: 200,
 *   width: 400,
 *   height: 50
 * });
 * console.log(selectionText.text);
 */
export function extractTextFromSelection(
  ocrResult: OCRResult,
  selection: SelectionBounds
): SelectionResult {
  // 1. 選択範囲と重なる単語をフィルタリング
  const wordsInSelection = ocrResult.words.filter(word =>
    isWordInSelection(word.bbox, selection)
  );

  // 選択範囲に単語がない場合
  if (wordsInSelection.length === 0) {
    return {
      text: '',
      confidence: 0,
      words: []
    };
  }

  // 2. 単語を位置順にソート（左上から右下へ）
  wordsInSelection.sort((a, b) => {
    // まず行（y座標）でソート
    const rowDiff = a.bbox.y0 - b.bbox.y0;
    if (Math.abs(rowDiff) > 10) { // 同じ行とみなす閾値
      return rowDiff;
    }
    // 同じ行なら列（x座標）でソート
    return a.bbox.x0 - b.bbox.x0;
  });

  // 3. テキストを結合（行ごとに改行を挿入）
  let text = '';
  let lastY = -1;
  for (const word of wordsInSelection) {
    if (lastY !== -1 && Math.abs(word.bbox.y0 - lastY) > 10) {
      text += '\n';
    }
    text += (text && Math.abs(word.bbox.y0 - lastY) <= 10 ? ' ' : '') + word.text;
    lastY = word.bbox.y0;
  }

  // 4. 平均信頼度を計算
  const avgConfidence = wordsInSelection.reduce((sum, word) => sum + word.confidence, 0) / wordsInSelection.length;

  return {
    text: text.trim(),
    confidence: avgConfidence,
    words: wordsInSelection
  };
}

/**
 * 単語が選択範囲内にあるかチェック
 *
 * @param wordBbox - 単語のバウンディングボックス
 * @param selection - 選択範囲
 * @returns 範囲内にある場合true
 */
function isWordInSelection(
  wordBbox: { x0: number; y0: number; x1: number; y1: number },
  selection: SelectionBounds
): boolean {
  // 選択範囲の右下座標を計算
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
}

/**
 * 画像を前処理する（コントラスト向上、ノイズ除去など）
 *
 * @param imageData - ImageDataオブジェクト
 * @returns 前処理済みのImageData
 */
export function preprocessImage(imageData: ImageData): ImageData {
  // TODO: 次回実装（オプション）
  // 1. グレースケール化
  // 2. コントラスト調整
  // 3. 二値化（白黒）
  // 4. ノイズ除去

  return imageData;
}

/**
 * Base64エンコードされた画像からOCRを実行
 *
 * @param base64Image - Base64エンコードされた画像
 * @param language - 言語コード
 * @param onProgress - 進捗コールバック
 * @returns OCR実行結果
 */
export async function extractTextFromBase64(
  base64Image: string,
  language: string = 'jpn',
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  // TODO: 次回実装
  // Base64をBlobに変換してextractTextFromImageを呼び出す

  throw new Error('Not implemented yet');
}
