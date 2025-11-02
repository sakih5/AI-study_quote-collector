from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from config import settings

security = HTTPBearer()

def get_supabase_client() -> Client:
    """Supabaseクライアントを取得"""
    return create_client(settings.supabase_url, settings.supabase_key)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """JWTトークンからユーザーを取得"""
    token = credentials.credentials

    # デバッグログ
    print(f"[DEBUG] Received token: {token[:20]}..." if len(token) > 20 else f"[DEBUG] Received token: {token}")

    try:
        # トークンをセッションに設定してからユーザーを取得
        # supabase-py v2.xでは、まずセッションを設定する必要がある
        supabase.postgrest.auth(token)
        print("[DEBUG] Token set in postgrest session")

        # ユーザー情報を取得
        response = supabase.auth.get_user(token)
        print(f"[DEBUG] User response: {response}")

        if not response.user:
            print("[DEBUG] No user found in response")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="認証が必要です"
            )

        print(f"[DEBUG] User authenticated: {response.user.id}")
        return response.user

    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Exception occurred: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"認証エラー: {str(e)}"
        )
