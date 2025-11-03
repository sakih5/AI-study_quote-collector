from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class SnsUser(BaseModel):
    """SNSユーザーモデル"""
    id: int
    user_id: str
    platform: Literal["X", "THREADS"]
    handle: str
    display_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SnsUserCreate(BaseModel):
    """SNSユーザー作成リクエスト"""
    platform: Literal["X", "THREADS"] = Field(..., description="プラットフォーム（XまたはTHREADS）")
    handle: str = Field(..., min_length=1, max_length=100, description="ハンドル名（@なし）")
    display_name: str = Field(..., min_length=1, max_length=200, description="表示名")


class SnsUsersResponse(BaseModel):
    """SNSユーザー一覧レスポンス"""
    sns_users: list[SnsUser]
    total: int
    has_more: bool


class SnsUserResponse(BaseModel):
    """SNSユーザー作成・取得レスポンス"""
    sns_user: SnsUser
