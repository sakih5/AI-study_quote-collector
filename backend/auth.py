from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from config import settings

security = HTTPBearer()

def get_supabase_client(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Client:
    """認証トークンを含むSupabaseクライアントを取得"""
    token = credentials.credentials
    supabase = create_client(settings.supabase_url, settings.supabase_key)
    # 認証トークンをPostgRESTセッションに設定
    supabase.postgrest.auth(token)
    return supabase

def get_supabase_client_public() -> Client:
    """
    認証不要のSupabaseクライアントを取得（公開エンドポイント用）

    サービスロールキーが設定されている場合はそれを使用し、RLSをバイパスする
    設定されていない場合は通常のanon keyを使用
    """
    # サービスロールキーがある場合はそれを使用（RLSをバイパス）
    if settings.supabase_service_role_key:
        return create_client(settings.supabase_url, settings.supabase_service_role_key)
    # なければ通常のanon keyを使用
    return create_client(settings.supabase_url, settings.supabase_key)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """JWTトークンからユーザーを取得"""
    token = credentials.credentials

    try:
        # ユーザー情報を取得
        supabase = create_client(settings.supabase_url, settings.supabase_key)
        response = supabase.auth.get_user(token)

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="認証が必要です"
            )

        return response.user

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"認証エラー: {str(e)}"
        )
