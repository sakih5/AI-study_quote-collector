/**
 * OCR機能の型定義
 */

/**
 * Tesseract.jsから返される単語情報
 */
export type OCRWord = {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
};

/**
 * Tesseract.jsから返される行情報
 */
export type OCRLine = {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  words: OCRWord[];
};

/**
 * OCR実行結果
 */
export type OCRResult = {
  text: string;
  confidence: number;
  lines: OCRLine[];
  words: OCRWord[];
};

/**
 * 選択範囲の座標
 */
export type SelectionBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * 選択範囲内のテキスト抽出結果
 */
export type SelectionResult = {
  text: string;
  confidence: number;
  words: OCRWord[];
};

/**
 * OCRの進捗状態
 */
export type OCRProgress = {
  status: 'loading' | 'recognizing' | 'completed' | 'error';
  progress: number; // 0-1
  message?: string;
};
