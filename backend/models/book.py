from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class Book(BaseModel):
    """書籍モデル"""
    id: int
    user_id: str
    title: str
    author: str
    cover_image_url: Optional[str] = None
    isbn: Optional[str] = None
    asin: Optional[str] = None
    publisher: Optional[str] = None
    publication_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookCreate(BaseModel):
    """書籍作成リクエスト"""
    title: str = Field(..., min_length=1, max_length=500, description="書籍タイトル")
    author: str = Field(..., min_length=1, max_length=200, description="著者名")
    cover_image_url: Optional[str] = Field(None, max_length=1000, description="カバー画像URL")
    isbn: Optional[str] = Field(None, max_length=20, description="ISBN")
    asin: Optional[str] = Field(None, max_length=20, description="Amazon ASIN")
    publisher: Optional[str] = Field(None, max_length=200, description="出版社")
    publication_date: Optional[str] = Field(None, description="出版日（YYYY-MM-DD形式）")


class BooksResponse(BaseModel):
    """書籍一覧レスポンス"""
    books: list[Book]
    total: int
    has_more: bool


class BookResponse(BaseModel):
    """書籍作成・取得レスポンス"""
    book: Book
