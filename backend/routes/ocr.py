"""
OCR API エンドポイント
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.ocr_service import OCRService


router = APIRouter(
    prefix="/api/ocr",
    tags=["ocr"]
)


class OCRRequest(BaseModel):
    """OCRリクエスト（Base64画像データ）"""
    image_data: str
    min_confidence: Optional[float] = 0.5


class OCRResponse(BaseModel):
    """OCRレスポンス"""
    text: str
    lines: list


@router.post('/extract-text', response_model=OCRResponse)
async def extract_text_from_base64(request: OCRRequest):
    """
    Base64エンコードされた画像からテキストを抽出

    Args:
        request: OCRリクエスト（image_data, min_confidence）

    Returns:
        OCRResponse: 抽出されたテキストと行情報
    """
    try:
        print(f"[OCR] リクエスト受信: image_data length={len(request.image_data)}, min_confidence={request.min_confidence}")
        result = OCRService.extract_text_from_image(
            image_data=request.image_data,
            min_confidence=request.min_confidence
        )
        print(f"[OCR] 処理成功: text length={len(result['text'])}, lines={len(result['lines'])}")
        return OCRResponse(**result)
    except Exception as e:
        import traceback
        print(f"[OCR ERROR] {type(e).__name__}: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/extract-text-from-file', response_model=OCRResponse)
async def extract_text_from_uploaded_file(
    file: UploadFile = File(...),
    min_confidence: float = 0.5
):
    """
    アップロードされた画像ファイルからテキストを抽出

    Args:
        file: アップロードされた画像ファイル
        min_confidence: 最小信頼度スコア（0.0-1.0）

    Returns:
        OCRResponse: 抽出されたテキストと行情報
    """
    try:
        # ファイルを読み込む
        file_bytes = await file.read()

        # OCR実行
        result = OCRService.extract_text_from_file(
            file_bytes=file_bytes,
            min_confidence=min_confidence
        )
        return OCRResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
