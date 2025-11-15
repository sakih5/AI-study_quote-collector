from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from auth import get_current_user, get_supabase_client
from routes import activities, tags, books, sns_users, quotes, export, ocr
from supabase import Client

app = FastAPI(
    title="抜き書きアプリ API",
    version="1.0.0",
    description="FastAPI バックエンド",
    swagger_ui_parameters={
        "persistAuthorization": True  # 認証情報を保持
    }
)

# カスタムOpenAPIスキーマ（セキュリティスキームを明示的に定義）
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # HTTPBearer認証スキームを明示的に追加
    openapi_schema["components"]["securitySchemes"] = {
        "HTTPBearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Supabase JWT トークンを入力してください（'Bearer' プレフィックスは不要）"
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(activities.router)
app.include_router(tags.router)
app.include_router(books.router)
app.include_router(sns_users.router)
app.include_router(quotes.router)
app.include_router(export.router)
app.include_router(ocr.router)

@app.get("/")
def root():
    return {"message": "抜き書きアプリ FastAPI", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/me")
async def get_me(user = Depends(get_current_user)):
    """認証テスト用エンドポイント"""
    return {
        "user_id": user.id,
        "email": user.email
    }


@app.get("/api/get-token")
async def get_token(
    supabase: Client = Depends(get_supabase_client)
):
    """
    現在のセッションのアクセストークンを取得

    認証済みの場合、access_tokenとユーザー情報を返す
    """
    try:
        session_response = await supabase.auth.get_session()
        session = session_response.session

        if not session:
            raise HTTPException(
                status_code=401,
                detail="Not authenticated"
            )

        return {
            "access_token": session.access_token,
            "user": {
                "id": session.user.id,
                "email": session.user.email
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] トークン取得エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
