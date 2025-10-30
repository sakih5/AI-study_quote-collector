'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { OCRResult, SelectionBounds, SelectionResult } from '@/lib/ocr/types';
import { extractTextFromSelection } from '@/lib/ocr/tesseract';

type OCRCanvasProps = {
  imageUrl: string;
  ocrResult: OCRResult;
  onSelectionsComplete: (selections: SelectionResult[]) => void;
  onBack: () => void;
};

type Selection = {
  bounds: SelectionBounds;
  result: SelectionResult;
};

export default function OCRCanvas({ imageUrl, ocrResult, onSelectionsComplete, onBack }: OCRCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [selections, setSelections] = useState<Selection[]>([]);
  const [currentSelection, setCurrentSelection] = useState<SelectionBounds | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // 画像を読み込んでCanvasに描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;

      // Canvas のサイズを画像に合わせる（最大幅800px）
      const maxWidth = 800;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const width = img.width * scale;
      const height = img.height * scale;

      setCanvasSize({ width, height });
      canvas.width = width;
      canvas.height = height;

      // 画像を描画
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 選択範囲とハイライトを再描画
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 画像を再描画
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 確定済みの選択範囲を描画
    selections.forEach((selection, index) => {
      const { bounds } = selection;
      ctx.strokeStyle = '#3b82f6'; // blue-600
      ctx.lineWidth = 2;
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

      // 半透明の背景
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

      // 番号を表示
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${index + 1}`, bounds.x + 5, bounds.y + 20);
    });

    // 現在描画中の選択範囲
    if (currentSelection && currentSelection.width !== 0 && currentSelection.height !== 0) {
      ctx.strokeStyle = '#10b981'; // green-500
      ctx.lineWidth = 2;
      ctx.strokeRect(
        currentSelection.x,
        currentSelection.y,
        currentSelection.width,
        currentSelection.height
      );
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.fillRect(
        currentSelection.x,
        currentSelection.y,
        currentSelection.width,
        currentSelection.height
      );
    }
  }, [selections, currentSelection]);

  // 選択範囲が変わったら再描画
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // マウスダウン - 選択開始
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentSelection({ x, y, width: 0, height: 0 });
  };

  // マウス移動 - 選択範囲を更新
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

  // マウスアップ - 選択確定
  const handleMouseUp = () => {
    if (!isDrawing || !currentSelection) return;

    // 最小サイズチェック（誤クリック防止）
    if (Math.abs(currentSelection.width) > 20 && Math.abs(currentSelection.height) > 20) {
      // 負の幅・高さを正規化
      const normalizedBounds: SelectionBounds = {
        x: currentSelection.width < 0 ? currentSelection.x + currentSelection.width : currentSelection.x,
        y: currentSelection.height < 0 ? currentSelection.y + currentSelection.height : currentSelection.y,
        width: Math.abs(currentSelection.width),
        height: Math.abs(currentSelection.height),
      };

      // 画像の実際のサイズに変換（Canvasのスケールを考慮）
      const img = imageRef.current;
      if (img) {
        const scaleX = img.width / canvasSize.width;
        const scaleY = img.height / canvasSize.height;

        const actualBounds: SelectionBounds = {
          x: normalizedBounds.x * scaleX,
          y: normalizedBounds.y * scaleY,
          width: normalizedBounds.width * scaleX,
          height: normalizedBounds.height * scaleY,
        };

        // テキスト抽出
        const result = extractTextFromSelection(ocrResult, actualBounds);

        // 選択範囲を追加（表示用にはCanvasサイズのまま）
        setSelections([...selections, { bounds: normalizedBounds, result }]);
      }
    }

    setIsDrawing(false);
    setCurrentSelection(null);
  };

  // 選択範囲を削除
  const handleRemoveSelection = (index: number) => {
    setSelections(selections.filter((_, i) => i !== index));
  };

  // すべてクリア
  const handleClearAll = () => {
    setSelections([]);
  };

  // 完了
  const handleComplete = () => {
    const results = selections.map(s => s.result);
    onSelectionsComplete(results);
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">テキスト範囲を選択</h3>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← 戻る
        </button>
      </div>

      {/* 説明 */}
      <p className="text-sm text-gray-400">
        マウスでドラッグして、抽出したいテキスト範囲を選択してください。
        複数の範囲を選択できます。
      </p>

      {/* Canvas */}
      <div className="relative border border-gray-700 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair"
          style={{ display: 'block' }}
        />
      </div>

      {/* 選択済み範囲リスト */}
      {selections.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-300">
              選択済み ({selections.length})
            </h4>
            <button
              onClick={handleClearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              すべてクリア
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selections.map((selection, index) => (
              <div
                key={index}
                className="p-3 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">範囲 {index + 1}</div>
                    <p className="text-sm text-gray-300 line-clamp-2">
                      {selection.result.text || '(テキストなし)'}
                    </p>
                    <div className="text-xs text-gray-500 mt-1">
                      信頼度: {Math.round(selection.result.confidence)}%
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveSelection(index)}
                    className="text-red-400 hover:text-red-300 transition-colors text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アクション */}
      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={handleComplete}
          disabled={selections.length === 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          選択完了 ({selections.length})
        </button>
      </div>
    </div>
  );
}
