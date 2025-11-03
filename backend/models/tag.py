from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime


class Tag(BaseModel):
    """基本タグモデル"""
    id: int
    name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TagWithMetadata(BaseModel):
    """メタデータ付きタグモデル（一覧取得用）"""
    id: int
    name: str
    created_at: datetime
    usage_count: int = 0
    activity_distribution: Dict[int, int] = Field(default_factory=dict)

    class Config:
        from_attributes = True


class TagCreate(BaseModel):
    """タグ作成リクエスト"""
    name: str = Field(..., min_length=1, description="タグ名（#は自動付与）")


class TagUpdate(BaseModel):
    """タグ更新リクエスト"""
    name: str = Field(..., min_length=1, description="新しいタグ名（#は自動付与）")


class TagMerge(BaseModel):
    """タグ統合リクエスト"""
    target_tag_id: int = Field(..., description="統合先のタグID")


class TagsResponse(BaseModel):
    """タグ一覧レスポンス"""
    tags: list[TagWithMetadata]
    total: int


class TagResponse(BaseModel):
    """タグ作成・更新レスポンス"""
    tag: Tag


class TagDeleteResponse(BaseModel):
    """タグ削除レスポンス"""
    success: bool = True


class TagMergeResult(BaseModel):
    """タグ統合結果（targetタグ情報）"""
    id: int
    name: str
    usage_count: int


class TagMergeResponse(BaseModel):
    """タグ統合レスポンス"""
    success: bool = True
    merged_count: int
    target_tag: TagMergeResult
