"""
Tesseract画像文字認識サービス

pytesseractを使用して画像からテキストを抽出
"""

import base64
import io
from typing import List, Dict, Any, Optional
from PIL import Image
import pytesseract


class OCRService:
    """OCRサービスクラス"""

    @staticmethod
    def _group_words_into_lines(data: Dict[str, Any], min_confidence: float = 0.5) -> List[Dict[str, Any]]:
        """
        pytesseractの単語レベルデータを行レベルにグループ化

        Args:
            data: pytesseract.image_to_dataの出力
            min_confidence: 最小信頼度スコア（0-100のスケール）

        Returns:
            行ごとにグループ化されたデータのリスト
        """
        lines = []
        line_map = {}  # {(page_num, block_num, par_num, line_num): [word_data]}

        n_boxes = len(data['text'])
        filtered_count = 0
        total_text_count = 0

        for i in range(n_boxes):
            # テキストが空、または信頼度が閾値未満の場合はスキップ
            conf = float(data['conf'][i])
            text = data['text'][i].strip()

            if not text or conf < 0:  # -1は非テキスト要素
                continue

            total_text_count += 1

            # 信頼度フィルタリング（0-100スケール）
            if conf < min_confidence:
                filtered_count += 1
                continue

            # confidenceを0-1スケールに正規化（レスポンス用）
            confidence = conf / 100.0

            # 行を識別するキー
            line_key = (
                data['page_num'][i],
                data['block_num'][i],
                data['par_num'][i],
                data['line_num'][i]
            )

            if line_key not in line_map:
                line_map[line_key] = []

            line_map[line_key].append({
                'text': text,
                'confidence': confidence,
                'left': data['left'][i],
                'top': data['top'][i],
                'width': data['width'][i],
                'height': data['height'][i]
            })

        # 各行のデータを整形
        for line_key, words in sorted(line_map.items()):
            if not words:
                continue

            # 行全体のテキストを結合（日本語は空白なしで結合）
            line_text = ''.join(word['text'] for word in words)

            # 行全体の平均信頼度を計算
            avg_confidence = sum(word['confidence'] for word in words) / len(words)

            # 行全体のbboxを計算（4点の座標）
            min_left = min(word['left'] for word in words)
            min_top = min(word['top'] for word in words)
            max_right = max(word['left'] + word['width'] for word in words)
            max_bottom = max(word['top'] + word['height'] for word in words)

            bbox = [
                [min_left, min_top],           # 左上
                [max_right, min_top],          # 右上
                [max_right, max_bottom],       # 右下
                [min_left, max_bottom]         # 左下
            ]

            lines.append({
                'text': line_text,
                'confidence': avg_confidence,
                'bbox': bbox
            })

        print(f"[OCR DEBUG] Total text elements: {total_text_count}, Filtered by confidence: {filtered_count}, Grouped into {len(lines)} lines, Min confidence: {min_confidence}")
        return lines

    @classmethod
    def extract_text_from_image(
        cls,
        image_data: str,
        min_confidence: float = 0.5
    ) -> Dict[str, Any]:
        """
        画像からテキストを抽出

        Args:
            image_data: Base64エンコードされた画像データ（data:image/...形式可）
            min_confidence: 最小信頼度スコア（0.0-1.0）

        Returns:
            OCR結果の辞書
            {
                "text": "抽出されたテキスト全文",
                "lines": [
                    {
                        "text": "行のテキスト",
                        "confidence": 0.95,
                        "bbox": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
                    },
                    ...
                ]
            }
        """
        try:
            print(f"[OCR] 画像データ処理開始: length={len(image_data)}")

            # Base64データURLからデータ部分を抽出
            if ',' in image_data:
                image_data = image_data.split(',')[1]

            print("[OCR] Base64デコード中...")
            # Base64デコード
            image_bytes = base64.b64decode(image_data)
            print(f"[OCR] デコード完了: {len(image_bytes)} bytes")

            # PIL Imageに変換
            print("[OCR] PIL Image変換中...")
            image = Image.open(io.BytesIO(image_bytes))
            print(f"[OCR] Image mode: {image.mode}, size: {image.size}")

            # 画像の前処理（OCR精度向上のため）
            print("[OCR] 画像の前処理中...")

            # グレースケール化
            if image.mode != 'L':
                image = image.convert('L')
                print(f"[OCR] グレースケール変換完了")

            # コントラスト強化（PIL ImageEnhance使用）
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)  # コントラストを2倍に
            print("[OCR] コントラスト強化完了")

            # Tesseract OCR実行
            print("[OCR] Tesseract OCR実行中...")

            # 詳細データ取得（bbox, confidence含む）
            # lang='jpn': 日本語モデル使用
            # --psm 6: 単一の均一なテキストブロックと想定（文書向け）
            # --oem 1: LSTM neural netモード（高精度）
            data = pytesseract.image_to_data(
                image,
                lang='jpn',
                output_type=pytesseract.Output.DICT,
                config='--psm 6 --oem 1'
            )
            print(f"[OCR] OCR実行完了: {len(data['text'])} 要素検出")

            # 単語レベルデータを行レベルにグループ化
            # min_confidenceは0-1スケールだが、内部で0-100に変換される
            print("[OCR] 結果を行単位にグループ化中...")
            lines = cls._group_words_into_lines(data, min_confidence * 100)
            print(f"[OCR] {len(lines)} 行検出")

            # 全文を改行で結合
            full_text = '\n'.join(line['text'] for line in lines)

            # 平均信頼度を計算
            average_confidence = 0.0
            if lines:
                average_confidence = sum(line['confidence'] for line in lines) / len(lines)

            return {
                'text': full_text,
                'lines': lines,
                'average_confidence': average_confidence
            }

        except pytesseract.TesseractNotFoundError:
            raise Exception(
                "Tesseractがインストールされていません。"
                "システムにtesseract-ocrと日本語データ(tesseract-ocr-jpn)をインストールしてください。"
            )
        except Exception as e:
            raise Exception(f"OCR処理に失敗しました: {str(e)}")

    @classmethod
    def extract_text_from_file(
        cls,
        file_bytes: bytes,
        min_confidence: float = 0.5
    ) -> Dict[str, Any]:
        """
        アップロードされた画像ファイルからテキストを抽出

        Args:
            file_bytes: 画像ファイルのバイトデータ
            min_confidence: 最小信頼度スコア（0.0-1.0）

        Returns:
            OCR結果の辞書
        """
        try:
            print(f"[OCR] ファイル処理開始: {len(file_bytes)} bytes")

            # PIL Imageに変換
            image = Image.open(io.BytesIO(file_bytes))
            print(f"[OCR] Image mode: {image.mode}, size: {image.size}")

            # 画像の前処理（OCR精度向上のため）
            print("[OCR] 画像の前処理中...")

            # グレースケール化
            if image.mode != 'L':
                image = image.convert('L')
                print(f"[OCR] グレースケール変換完了")

            # コントラスト強化
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            print("[OCR] コントラスト強化完了")

            # Tesseract OCR実行
            print("[OCR] Tesseract OCR実行中...")
            data = pytesseract.image_to_data(
                image,
                lang='jpn',
                output_type=pytesseract.Output.DICT,
                config='--psm 6 --oem 1'
            )
            print(f"[OCR] OCR実行完了: {len(data['text'])} 要素検出")

            # 単語レベルデータを行レベルにグループ化
            print("[OCR] 結果を行単位にグループ化中...")
            lines = cls._group_words_into_lines(data, min_confidence * 100)
            print(f"[OCR] {len(lines)} 行検出")

            # 全文を改行で結合
            full_text = '\n'.join(line['text'] for line in lines)

            # 平均信頼度を計算
            average_confidence = 0.0
            if lines:
                average_confidence = sum(line['confidence'] for line in lines) / len(lines)

            return {
                'text': full_text,
                'lines': lines,
                'average_confidence': average_confidence
            }

        except pytesseract.TesseractNotFoundError:
            raise Exception(
                "Tesseractがインストールされていません。"
                "システムにtesseract-ocrと日本語データ(tesseract-ocr-jpn)をインストールしてください。"
            )
        except Exception as e:
            raise Exception(f"OCR処理に失敗しました: {str(e)}")
