from pydantic import BaseModel
from typing import Optional


class Activity(BaseModel):
    """活動領域モデル"""
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: int

    class Config:
        from_attributes = True  # Pydantic v2での設定（旧: orm_mode = True）


class ActivitiesResponse(BaseModel):
    """活動領域一覧レスポンス"""
    activities: list[Activity]
