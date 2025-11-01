'use client';

import { useState, useCallback, useRef } from 'react';
import type { OCRResult, OCRProgress } from '@/lib/ocr/types';
import { extractTextFromImage } from '@/lib/ocr/tesseract';

type OCRUploaderProps = {
  onOCRComplete: (result: OCRResult, imageUrl: string) => void;
  onCancel: () => void;
};

export default function OCRUploader({ onOCRComplete, onCancel }: OCRUploaderProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ドラッグ&ドロップ対応
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file);
    } else {
      setError('画像ファイルを選択してください');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // ファイル選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    setError('');
    // プレビュー用のURLを作成
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  // ファイル選択ダイアログを開く
  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  // OCR実行
  const handleExtractText = async () => {
    if (!imageFile) return;

    setIsProcessing(true);
    setError('');
    setProgress({ status: 'loading', progress: 0 });

    try {
      const result = await extractTextFromImage(
        imageFile,
        'jpn',
        (prog) => setProgress(prog)
      );

      setProgress({ status: 'completed', progress: 1, message: '完了' });
      onOCRComplete(result, imageUrl);
    } catch (err) {
      console.error('OCR error:', err);
      setError('テキスト抽出に失敗しました。画像を確認してください。');
      setProgress({ status: 'error', progress: 0, message: 'エラーが発生しました' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* タイトル */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">画像からテキストを抽出</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* ファイル選択エリア */}
      {!imageFile && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleClickUpload}
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
          >
            <div className="text-4xl mb-4">📷</div>
            <p className="text-gray-300 mb-2">画像をドラッグ&ドロップ</p>
            <p className="text-gray-500 text-sm">または クリックして選択</p>
          </div>
        </>
      )}

      {/* 画像プレビュー */}
      {imageFile && !isProcessing && (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={imageUrl}
              alt="プレビュー"
              className="max-w-full max-h-96 mx-auto rounded-lg"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setImageFile(null);
                setImageUrl('');
                setError('');
              }}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              別の画像を選択
            </button>
            <button
              onClick={handleExtractText}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              テキストを抽出
            </button>
          </div>
        </div>
      )}

      {/* 進捗表示 */}
      {isProcessing && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{progress.message || '処理中...'}</span>
            <span className="text-gray-400">{Math.round(progress.progress * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
