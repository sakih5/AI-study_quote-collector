from pydantic import BaseModel, Field
from typing import Optional, Literal, Any
from datetime import datetime


# ====================================
# ネストモデル（関連エンティティ）
# ====================================

class ActivityNested(BaseModel):
    """活動領域のネストモデル"""
    id: int
    name: str
    icon: str

    class Config:
        from_attributes = True


class TagNested(BaseModel):
    """タグのネストモデル"""
    id: int
    name: str

    class Config:
        from_attributes = True


class BookNested(BaseModel):
    """書籍のネストモデル"""
    id: int
    title: str
    author: str
    cover_image_url: Optional[str] = None

    class Config:
        from_attributes = True


class SnsUserNested(BaseModel):
    """SNSユーザーのネストモデル"""
    id: int
    platform: Literal["X", "THREADS"]
    handle: str
    display_name: Optional[str] = None

    class Config:
        from_attributes = True


# ====================================
# フレーズモデル
# ====================================

class Quote(BaseModel):
    """フレーズ基本モデル"""
    id: int
    user_id: str
    text: str
    source_type: Literal["BOOK", "SNS", "OTHER"]
    book_id: Optional[int] = None
    sns_user_id: Optional[int] = None
    page_number: Optional[int] = None
    source_meta: Optional[dict] = None
    is_public: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuoteWithDetails(BaseModel):
    """詳細情報付きフレーズモデル"""
    id: int
    text: str
    page_number: Optional[int] = None
    is_public: bool = False
    activities: list[ActivityNested]
    tags: list[TagNested]
    created_at: datetime

    class Config:
        from_attributes = True


class QuoteInGroup(BaseModel):
    """グループ内のフレーズモデル"""
    id: int
    text: str
    page_number: Optional[int] = None
    is_public: bool = False
    activities: list[ActivityNested] = []
    tags: list[TagNested] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ====================================
# リクエストモデル
# ====================================

class QuoteItemCreate(BaseModel):
    """個別フレーズ作成リクエスト（一括登録の1件分）"""
    text: str = Field(..., min_length=1, max_length=10000)
    activity_ids: list[int] = Field(..., min_items=1)
    tag_ids: list[int] = Field(default_factory=list)


class QuoteCreate(BaseModel):
    """フレーズ一括作成リクエスト"""
    quotes: list[QuoteItemCreate] = Field(..., min_items=1)
    source_type: Literal["BOOK", "SNS", "OTHER"]
    book_id: Optional[int] = None
    sns_user_id: Optional[int] = None
    page_number: Optional[int] = None
    source_meta: Optional[dict] = None
    is_public: bool = False


class QuoteUpdate(BaseModel):
    """フレーズ更新リクエスト"""
    text: Optional[str] = Field(None, min_length=1, max_length=10000)
    activity_ids: Optional[list[int]] = None
    tag_ids: Optional[list[int]] = None
    is_public: Optional[bool] = None


# ====================================
# レスポンスモデル
# ====================================

class QuoteResponse(BaseModel):
    """フレーズ作成レスポンス"""
    quote: QuoteWithDetails


class QuotesCreateResponse(BaseModel):
    """フレーズ一括作成レスポンス"""
    quotes: list[Quote]
    created_count: int


class QuoteDeleteResponse(BaseModel):
    """フレーズ削除レスポンス"""
    success: bool


# ====================================
# グループ化レスポンスモデル
# ====================================

class BookGroupItem(BaseModel):
    """書籍グループアイテム"""
    type: Literal["book"] = "book"
    book: BookNested
    quotes: list[QuoteInGroup]


class SnsGroupItem(BaseModel):
    """SNSグループアイテム"""
    type: Literal["sns"] = "sns"
    sns_user: SnsUserNested
    quotes: list[QuoteInGroup]


class OtherSource(BaseModel):
    """その他の出典情報"""
    source: Optional[str] = None
    note: Optional[str] = None


class OtherGroupItem(BaseModel):
    """その他グループアイテム"""
    type: Literal["other"] = "other"
    source_info: OtherSource
    quotes: list[QuoteInGroup]


class QuotesGroupedResponse(BaseModel):
    """グループ化フレーズ一覧レスポンス"""
    items: list[BookGroupItem | SnsGroupItem | OtherGroupItem]
    total: int
    has_more: bool


# ====================================
# 公開フレーズ用モデル
# ====================================

class PublicQuoteSource(BaseModel):
    """公開フレーズの出典情報"""
    type: Literal["BOOK", "SNS", "OTHER"]
    # BOOK用
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    # SNS用
    sns_platform: Optional[str] = None
    sns_handle: Optional[str] = None
    sns_display_name: Optional[str] = None
    # OTHER用
    other_source: Optional[str] = None
    other_note: Optional[str] = None
    # 共通
    page_number: Optional[int] = None


class PublicQuoteItem(BaseModel):
    """公開フレーズアイテム"""
    id: int
    text: str
    source: PublicQuoteSource
    activities: list[ActivityNested] = []
    tags: list[TagNested] = []
    created_at: datetime


class PublicQuotesResponse(BaseModel):
    """公開フレーズ一覧レスポンス"""
    items: list[PublicQuoteItem]
    total: int
    has_more: bool
