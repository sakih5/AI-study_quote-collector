from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client
from auth import get_current_user, get_supabase_client
from models.sns_user import SnsUser, SnsUserCreate, SnsUsersResponse, SnsUserResponse

router = APIRouter(
    prefix="/api/sns-users",
    tags=["sns-users"]
)


@router.get("", response_model=SnsUsersResponse)
async def get_sns_users(
    limit: int = Query(50, ge=1, le=100, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    platform: str = Query("", description="プラットフォーム（X, THREADS）"),
    search: str = Query("", description="検索キーワード（ハンドル・表示名）"),
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    ユーザーのSNSユーザー一覧を取得

    - **認証**: 必須
    - **フィルター**: プラットフォーム、検索キーワード
    - **検索**: ハンドルと表示名で部分一致
    - **ソート**: created_at降順
    - **ページネーション**: limit, offset
    """
    try:
        # 基本クエリ
        query = supabase.table('sns_users') \
            .select('id, user_id, platform, handle, display_name, created_at, updated_at', count='exact') \
            .eq('user_id', user.id) \
            .is_('deleted_at', None)

        # プラットフォームフィルター
        if platform:
            query = query.eq('platform', platform)

        # 検索条件を追加
        if search:
            query = query.or_(f'handle.ilike.%{search}%,display_name.ilike.%{search}%')

        # ソート・ページネーション
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)

        response = query.execute()

        if response.data is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SNSユーザーの取得に失敗しました"
            )

        # Pydanticモデルに変換
        sns_users = [SnsUser(**sns_user) for sns_user in response.data]

        # totalとhas_moreを計算
        total = response.count if response.count is not None else 0
        has_more = offset + limit < total

        return SnsUsersResponse(sns_users=sns_users, total=total, has_more=has_more)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] SNSユーザー取得エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )


@router.post("", response_model=SnsUserResponse, status_code=status.HTTP_201_CREATED)
async def create_sns_user(
    sns_user_data: SnsUserCreate,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    新規SNSユーザーを登録

    - **認証**: 必須
    - **重複チェック**: 同じプラットフォーム・ハンドルのユーザーが存在する場合はエラー
    - **プラットフォーム**: XまたはTHREADS
    """
    try:
        # 重複チェック（同じプラットフォーム・ハンドルのユーザーが存在しないか）
        existing_response = supabase.table('sns_users') \
            .select('id') \
            .eq('user_id', user.id) \
            .eq('platform', sns_user_data.platform) \
            .eq('handle', sns_user_data.handle) \
            .is_('deleted_at', None) \
            .execute()

        if existing_response.data and len(existing_response.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="同じSNSユーザーが既に登録されています"
            )

        # SNSユーザーを登録
        insert_data = {
            'user_id': user.id,
            'platform': sns_user_data.platform,
            'handle': sns_user_data.handle,
            'display_name': sns_user_data.display_name,
        }

        # まずinsertを実行
        insert_response = supabase.table('sns_users') \
            .insert(insert_data) \
            .execute()

        if not insert_response.data or len(insert_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SNSユーザーの登録に失敗しました"
            )

        # 作成されたレコードのIDを取得
        sns_user_id = insert_response.data[0]['id']

        # 別途selectクエリで完全なデータを取得
        select_response = supabase.table('sns_users') \
            .select('id, user_id, platform, handle, display_name, created_at, updated_at') \
            .eq('id', sns_user_id) \
            .execute()

        if not select_response.data or len(select_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="作成されたSNSユーザーの取得に失敗しました"
            )

        # Pydanticモデルに変換
        sns_user = SnsUser(**select_response.data[0])

        return SnsUserResponse(sns_user=sns_user)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] SNSユーザー登録エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )
