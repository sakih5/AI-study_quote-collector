"""
PaddleOCR画像文字認識サービス

PaddleOCRを使用して画像からテキストを抽出
"""

import base64
import io
from typing import List, Dict, Any, Optional
from PIL import Image
import numpy as np


class OCRService:
    """OCRサービスクラス"""

    _ocr = None

    @classmethod
    def get_ocr(cls):
        """PaddleOCRインスタンスをシングルトンで取得"""
        if cls._ocr is None:
            try:
                print("[OCR] PaddleOCRを初期化中...")
                from paddleocr import PaddleOCR
                # lang='japan': 日本語モデル使用
                # use_angle_cls=True: テキストの向きを自動検出
                cls._ocr = PaddleOCR(
                    lang='japan',
                    use_angle_cls=True
                )
                print("[OCR] PaddleOCR初期化完了")
            except ImportError as e:
                print(f"[OCR ERROR] ImportError: {e}")
                raise ImportError(
                    "PaddleOCRがインストールされていません。"
                    "pip install paddleocr paddlepaddle を実行してください。"
                )
            except Exception as e:
                print(f"[OCR ERROR] PaddleOCR初期化エラー: {type(e).__name__}: {str(e)}")
                raise
        return cls._ocr

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

            # RGBに変換（PNGのアルファチャンネル対策）
            if image.mode != 'RGB':
                print(f"[OCR] RGB変換中... ({image.mode} -> RGB)")
                image = image.convert('RGB')

            # NumPy配列に変換（PaddleOCRの入力形式）
            print("[OCR] NumPy配列変換中...")
            image_array = np.array(image)
            print(f"[OCR] NumPy shape: {image_array.shape}")

            # OCR実行
            print("[OCR] OCR実行中...")
            ocr = cls.get_ocr()
            result = ocr.ocr(image_array)
            print(f"[OCR] OCR実行完了: result type={type(result)}")

            # 結果を整形
            lines = []
            full_text_parts = []

            print(f"[OCR] 結果処理開始")

            if result and len(result) > 0:
                ocr_result = result[0]
                print(f"[OCR] ocr_result type={type(ocr_result)}")

                # 新しいPaddleOCR (3.x) の構造に対応（辞書形式）
                if isinstance(ocr_result, dict) and 'rec_texts' in ocr_result:
                    rec_texts = ocr_result['rec_texts']
                    rec_scores = ocr_result.get('rec_scores', [])
                    rec_polys = ocr_result.get('rec_polys', [])

                    print(f"[OCR] テキスト数: {len(rec_texts)}")

                    for i, text in enumerate(rec_texts):
                        confidence = float(rec_scores[i]) if i < len(rec_scores) else 1.0

                        # rec_polysはnumpy arrayなのでtolist()で変換
                        if i < len(rec_polys):
                            bbox = rec_polys[i].tolist() if hasattr(rec_polys[i], 'tolist') else rec_polys[i]
                        else:
                            bbox = []

                        print(f"[OCR] Line {i}: text={text}, confidence={confidence}")

                        # 信頼度フィルタリング
                        if confidence >= min_confidence:
                            lines.append({
                                'text': text,
                                'confidence': confidence,
                                'bbox': bbox
                            })
                            full_text_parts.append(text)
                # 古いPaddleOCR (2.x) の構造にも対応（リスト形式）
                elif isinstance(ocr_result, list):
                    print(f"[OCR] 古い形式の結果")
                    for line in ocr_result:
                        bbox = line[0]
                        text_info = line[1]

                        if isinstance(text_info, str):
                            text = text_info
                            confidence = 1.0
                        elif isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                            text = text_info[0]
                            confidence = float(text_info[1])
                        else:
                            continue

                        if confidence >= min_confidence:
                            lines.append({
                                'text': text,
                                'confidence': confidence,
                                'bbox': bbox
                            })
                            full_text_parts.append(text)

            # 全文を改行で結合
            full_text = '\n'.join(full_text_parts)

            return {
                'text': full_text,
                'lines': lines
            }

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
            # PIL Imageに変換
            image = Image.open(io.BytesIO(file_bytes))

            # RGBに変換
            if image.mode != 'RGB':
                image = image.convert('RGB')

            # NumPy配列に変換
            image_array = np.array(image)

            # OCR実行
            ocr = cls.get_ocr()
            result = ocr.ocr(image_array)

            # 結果を整形
            lines = []
            full_text_parts = []

            if result and result[0]:
                for line in result[0]:
                    bbox = line[0]
                    text_info = line[1]

                    # text_infoが文字列の場合とタプルの場合で処理を分ける
                    if isinstance(text_info, str):
                        text = text_info
                        confidence = 1.0
                    elif isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                        text = text_info[0]
                        confidence = float(text_info[1])
                    else:
                        continue

                    if confidence >= min_confidence:
                        lines.append({
                            'text': text,
                            'confidence': confidence,
                            'bbox': bbox
                        })
                        full_text_parts.append(text)

            full_text = '\n'.join(full_text_parts)

            return {
                'text': full_text,
                'lines': lines
            }

        except Exception as e:
            raise Exception(f"OCR処理に失敗しました: {str(e)}")
