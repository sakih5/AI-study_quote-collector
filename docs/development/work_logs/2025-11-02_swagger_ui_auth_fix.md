# Swagger UI認証問題の解決作業ログ

**作業日**: 2025-11-02
**作業者**: sakih
**作業時間**: 約1時間

---

## 📋 作業概要

FastAPI移行Phase 2で残っていたSwagger UI認証エラーを解決しました。curlでは認証が成功していたものの、Swagger UIでは失敗していた問題に対処しました。

---

## 🔍 問題の詳細

### 症状

- **curl**: ✅ 認証成功（トークンを送信すると正常にユーザー情報を取得できる）
- **Swagger UI**: ❌ 認証失敗（エラーメッセージ: `"認証エラー: This endpoint requires a valid Bearer token"`）

### 影響範囲

- 開発時のSwagger UIでのAPI手動テストができない
- 本質的な機能には影響なし（curlやNext.jsからのAPI呼び出しは正常）

---

## 🛠️ 実施した対策

### 1. デバッグログの追加

**ファイル**: `backend/auth.py`

```python
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """JWTトークンからユーザーを取得"""
    token = credentials.credentials

    # デバッグログ
    print(f"[DEBUG] Received token: {token[:20]}..." if len(token) > 20 else f"[DEBUG] Received token: {token}")

    try:
        supabase.postgrest.auth(token)
        print("[DEBUG] Token set in postgrest session")

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
```

**目的**: どのステップで失敗しているかを特定するため

---

### 2. OpenAPIスキーマのカスタマイズ

**ファイル**: `backend/main.py`

**追加内容**:

```python
from fastapi.openapi.utils import get_openapi

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
```

**変更点**:

1. **セキュリティスキームの明示的定義**
   - OpenAPIスキーマに `HTTPBearer` を明示的に追加
   - `bearerFormat: "JWT"` を指定してトークン形式を明確化

2. **Swagger UIパラメータの追加**
   - `persistAuthorization: True` で認証情報をブラウザに保持

3. **説明文の追加**
   - ユーザーが `Bearer` プレフィックスを付けないように注意書きを追加

---

## ✅ テスト結果

### トークン取得方法（課題と解決）

**課題**: `/api/get-token` に直接アクセスすると `/login` にリダイレクトされる

**原因**: `middleware.ts` が `/api/*` を認証必須パスとして扱っている

**解決策**: ブラウザの開発者ツールで認証済みセッションからトークンを取得

```javascript
// ブラウザコンソールで実行
fetch('/api/get-token')
  .then(res => res.json())
  .then(data => {
    console.log('Access Token:', data.access_token);
    navigator.clipboard.writeText(data.access_token);
    console.log('トークンをクリップボードにコピーしました！');
  });
```

### Swagger UIでの認証テスト

**手順**:

1. `http://localhost:3000` でログイン
2. 開発者ツールコンソールで上記スクリプトを実行してトークンを取得
3. `http://localhost:8000/docs` を開く
4. 右上の **"Authorize"** ボタンをクリック
5. 取得したトークンを貼り付け（`Bearer` プレフィックスなし）
6. **"Authorize"** をクリック
7. `/api/me` エンドポイントで **"Try it out"** → **"Execute"**

**結果**: ✅ 成功

```json
{
  "user_id": "26c01d9c-69dd-40ff-b561-fe39c2798ac8",
  "email": "sakihamamura5@gmail.com"
}
```

---

## 📊 進捗状況

### 完了したフェーズ

| Phase | タスク | 進捗 | 状態 |
|-------|--------|------|------|
| Phase 1 | 環境構築 | 100% | ✅ 完了 |
| Phase 2 | 認証基盤 | 100% | ✅ 完了 |
| Phase 3 | /api/activities | 0% | ⏳ 次回 |

**Phase 2完全完了！**

---

## 💡 学んだこと

### 1. FastAPIのOpenAPIカスタマイズ

- `app.openapi` をオーバーライドすることでSwagger UIの挙動を制御可能
- セキュリティスキームは明示的に定義することで、UIでの認証フローが改善される
- `swagger_ui_parameters` でSwagger UI固有の設定が可能

### 2. Next.jsのミドルウェアとAPIルート

- ミドルウェアは `/api/*` にも適用される
- APIルートで認証不要のエンドポイントを作る場合は、`publicPaths` に追加する必要がある
- または、認証済みブラウザから `fetch()` でアクセスする方法が簡単

### 3. デバッグログの重要性

- サーバーサイドのデバッグログは問題特定に不可欠
- ただし、本番環境では削除またはログレベルで制御する必要がある

### 4. curlとSwagger UIの違い

- curlは直接HTTPリクエストを送信するため、シンプルで確実
- Swagger UIはブラウザベースでOpenAPIスキーマに依存するため、スキーマ定義が重要
- 両方でテストすることで、実装の堅牢性を確認できる

---

## 🎯 次回の作業予定

### Phase 3: /api/activities エンドポイント実装

1. **Pydanticモデル作成**
   - `backend/models/activity.py`
   - Activity レスポンスモデル定義

2. **APIルート作成**
   - `backend/routes/activities.py`
   - GET `/api/activities` エンドポイント

3. **Supabase連携**
   - `activities` テーブルからデータ取得
   - RLSポリシーは不要（固定10件のマスタデータ）

4. **main.pyへルーター登録**
   - `app.include_router(activities.router)`

5. **動作確認**
   - curl テスト
   - Swagger UI テスト
   - Next.jsから呼び出しテスト（既存コードと比較）

---

## 📁 修正したファイル

### 更新ファイル

```
backend/
├── auth.py          # デバッグログ追加
└── main.py          # OpenAPIスキーマカスタマイズ
```

### 新規作成

```
docs/development/work_logs/
└── 2025-11-02_swagger_ui_auth_fix.md  # 本ファイル
```

---

## 🚀 次回の開始方法

次回作業を再開する際は、以下のコマンドでサーバーを起動してください：

### FastAPI起動

```bash
cd /home/sakih/projects/AI-study_quote-collector/backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Next.js起動（別ターミナル）

```bash
cd /home/sakih/projects/AI-study_quote-collector
npm run dev
```

### Swagger UIアクセス

```
http://localhost:8000/docs
```

### トークン取得（ブラウザコンソール）

```javascript
fetch('/api/get-token').then(res => res.json()).then(data => {
  navigator.clipboard.writeText(data.access_token);
  console.log('トークンコピー完了！');
});
```

---

## 📝 メモ

### デバッグログについて

現在、`auth.py` にデバッグログが残っています。開発中は有用ですが、本番環境では削除または以下のようにログレベルで制御することを推奨：

```python
import logging

logger = logging.getLogger(__name__)

# 開発時
logger.debug(f"Received token: {token[:20]}...")

# 本番時は環境変数で DEBUG レベルを無効化
```

### 今後の改善案

1. **ロガーの導入**
   - `print()` ではなく `logging` モジュールを使用
   - 環境変数でログレベルを制御

2. **エラーハンドリングの改善**
   - 例外の種類ごとに適切なHTTPステータスコードを返す
   - ユーザー向けエラーメッセージと開発者向けログを分離

3. **テストコードの追加**
   - pytest で認証エンドポイントのテストを追加
   - トークン検証のユニットテスト

---

**作成日**: 2025-11-02
**最終更新**: 2025-11-02
**Phase 2 完全完了！**
