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

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """JWTトークンからユーザーを取得"""
    token = credentials.credentials

    # デバッグログ
    print(f"[DEBUG] Received token: {token[:20]}..." if len(token) > 20 else f"[DEBUG] Received token: {token}")

    try:
        # ユーザー情報を取得
        supabase = create_client(settings.supabase_url, settings.supabase_key)
        response = supabase.auth.get_user(token)
        print(f"[DEBUG] User authenticated: {response.user.id if response.user else 'None'}")

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="認証が必要です"
            )

        return response.user

    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Exception occurred: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"認証エラー: {str(e)}"
        )
