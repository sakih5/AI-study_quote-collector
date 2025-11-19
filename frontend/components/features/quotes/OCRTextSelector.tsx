'use client';

import { useState, useRef, useEffect } from 'react';

interface OCRTextSelectorProps {
  text: string;
  imageUrl: string;
  averageConfidence: number;
  onTextSelect: (selectedText: string) => void;
  onClose: () => void;
}

export default function OCRTextSelector({
  text,
  imageUrl,
  averageConfidence,
  onTextSelect,
  onClose,
}: OCRTextSelectorProps) {
  const [editedText, setEditedText] = useState(text);
  const [selectedText, setSelectedText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // textが変更されたら編集テキストも更新
  useEffect(() => {
    setEditedText(text);
  }, [text]);

  // テキスト選択の監視
  const handleTextareaSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        const selected = editedText.substring(start, end);
        setSelectedText(selected);
      }
    }
  };

  const handleAddSelection = () => {
    if (selectedText) {
      onTextSelect(selectedText);
      setSelectedText('');
      // textareaの選択をクリア
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd;
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            抽出されたテキスト
          </h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
            信頼度: {(averageConfidence * 100).toFixed(1)}%
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900 transition-colors text-2xl"
        >
          ×
        </button>
      </div>

      <p className="text-sm text-gray-600">
        左の画像を見ながら、右のテキストを編集できます。編集後、テキストをドラッグして選択し、「選択したテキストを追加」ボタンでフレーズとして登録できます
      </p>

      {/* 画像とテキストの横並び表示 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 左側: 元画像 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">元画像</h4>
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 h-[500px] flex items-center justify-center">
            <img
              src={imageUrl}
              alt="OCR対象画像"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* 右側: 抽出されたテキスト（編集可能） */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">抽出されたテキスト（編集可能）</h4>
          <textarea
            ref={textareaRef}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            onSelect={handleTextareaSelect}
            className="w-full h-[500px] p-4 bg-white border border-gray-300 rounded-lg resize-none font-sans text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="OCRで抽出されたテキストがここに表示されます"
          />
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
