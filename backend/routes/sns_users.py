from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client
from pydantic import BaseModel
from auth import get_current_user, get_supabase_client
from models.sns_user import SnsUser, SnsUserCreate, SnsUsersResponse, SnsUserResponse, SnsUserWithMetadata
from services.sns_scraper import SnsUrlParser, SnsScraper

router = APIRouter(
    prefix="/api/sns-users",
    tags=["sns-users"]
)


class SnsUserFromUrlRequest(BaseModel):
    """URLからSNSユーザー情報を取得するリクエスト"""
    url: str


class SnsUserFromUrlResponse(BaseModel):
    """URLからSNSユーザー情報を取得するレスポンス"""
    user_info: dict


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
            .is_('deleted_at', 'null')

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

        # 各SNSユーザーのメタデータ（使用数）を取得
        sns_users_with_metadata = []
        for sns_user in response.data:
            # 使用数を取得（削除済みフレーズを除外）
            count_response = supabase.table('quotes') \
                .select('id', count='exact', head=True) \
                .eq('sns_user_id', sns_user['id']) \
                .is_('deleted_at', 'null') \
                .execute()

            usage_count = count_response.count or 0

            sns_users_with_metadata.append(
                SnsUserWithMetadata(
                    id=sns_user['id'],
                    user_id=sns_user['user_id'],
                    platform=sns_user['platform'],
                    handle=sns_user['handle'],
                    display_name=sns_user['display_name'],
                    created_at=sns_user['created_at'],
                    updated_at=sns_user['updated_at'],
                    usage_count=usage_count
                )
            )

        # totalとhas_moreを計算
        total = response.count if response.count is not None else 0
        has_more = offset + limit < total

        return SnsUsersResponse(sns_users=sns_users_with_metadata, total=total, has_more=has_more)

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
            .is_('deleted_at', 'null') \
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


@router.post("/from-url", response_model=SnsUserFromUrlResponse)
async def fetch_sns_user_from_url(
    request: SnsUserFromUrlRequest,
    user=Depends(get_current_user),
):
    """
    SNS URLからユーザー情報を取得

    - **認証**: 必須
    - **url**: SNS URL (X または Threads)
    """
    try:
        url = request.url

        if not url or not isinstance(url, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URLが指定されていません"
            )

        # SNS URLかチェック
        if not SnsUrlParser.is_sns_url(url):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="サポートされているSNS URLではありません（X, Threadsのみ対応）"
            )

        # URLを解析
        parsed = SnsUrlParser.parse_sns_url(url)

        if not parsed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL の解析に失敗しました"
            )

        # ユーザー情報を取得
        user_info = await SnsScraper.fetch_sns_user_info(
            parsed['platform'],
            parsed['handle']
        )

        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ユーザー情報の取得に失敗しました"
            )

        return SnsUserFromUrlResponse(user_info=user_info)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] SNSユーザー情報取得エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )
