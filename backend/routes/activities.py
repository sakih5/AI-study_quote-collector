from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from auth import get_current_user, get_supabase_client
from models.activity import Activity, ActivitiesResponse

router = APIRouter(
    prefix="/api/activities",
    tags=["activities"]
)


@router.get("", response_model=ActivitiesResponse)
async def get_activities(
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    活動領域一覧を取得（システム固定の10個）

    - **認証**: 必須
    - **ソート**: display_order昇順
    """
    try:
        # 活動領域一覧を取得（display_order順）
        response = supabase.table('activities') \
            .select('id, name, description, icon, display_order') \
            .order('display_order', desc=False) \
            .execute()

        if response.data is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="活動領域の取得に失敗しました"
            )

        # Pydanticモデルに変換
        activities = [Activity(**activity) for activity in response.data]

        return ActivitiesResponse(activities=activities)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 活動領域取得エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )
