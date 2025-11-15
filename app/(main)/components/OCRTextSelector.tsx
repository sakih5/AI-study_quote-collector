'use client';

import { useState, useRef, useEffect } from 'react';

interface OCRTextSelectorProps {
  text: string;
  imageUrl: string;
  onTextSelect: (selectedText: string) => void;
  onClose: () => void;
}

export default function OCRTextSelector({
  text,
  imageUrl,
  onTextSelect,
  onClose,
}: OCRTextSelectorProps) {
  const [selectedText, setSelectedText] = useState('');
  const textRef = useRef<HTMLDivElement>(null);

  // テキスト選択の監視
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString().trim());
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const handleAddSelection = () => {
    if (selectedText) {
      onTextSelect(selectedText);
      setSelectedText('');
      // 選択をクリア
      window.getSelection()?.removeAllRanges();
    }
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          抽出されたテキスト
        </h3>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900 transition-colors text-2xl"
        >
          ×
        </button>
      </div>

      <p className="text-sm text-gray-600">
        テキストをドラッグして選択し、「選択したテキストを追加」ボタンでフレーズとして登録できます
      </p>

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

      {/* 選択されたテキストのプレビュー */}
      {selectedText && (
        <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg">
          <p className="text-sm text-gray-700 mb-2 font-medium">選択中のテキスト:</p>
          <p className="text-gray-900 whitespace-pre-wrap">{selectedText}</p>
        </div>
      )}

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
    </div>
  );
}
