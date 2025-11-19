"""
OCRサービス（ocr_service.py）のテスト
"""

import pytest
from io import BytesIO
from PIL import Image


# TODO: 実際のテストを実装
#
# def test_extract_text_from_image():
#     """
#     画像からテキストを抽出するテスト
#     """
#     # テスト用の画像を作成
#     img = Image.new('RGB', (100, 30), color='white')
#     img_bytes = BytesIO()
#     img.save(img_bytes, format='PNG')
#     img_bytes.seek(0)
#
#     # OCR実行
#     result = extract_text_from_image(img_bytes.read())
#
#     # 結果の検証
#     assert "text" in result
#     assert "confidence" in result


def test_placeholder():
    """
    プレースホルダーテスト（pytest実行確認用）
    """
    assert True
