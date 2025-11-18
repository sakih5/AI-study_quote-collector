# FastAPI セットアップガイド（uv版）

**作成日**: 2025-11-01
**最終更新**: 2025-11-01
**対象**: Phase 1-3（環境構築〜最初のエンドポイント）

このガイドでは、**uv**を使ったモダンなFastAPIバックエンドのセットアップ手順を説明します。

---

## 📋 目次

1. [前提条件](#前提条件)
2. [Phase 1: プロジェクトセットアップ](#phase-1-プロジェクトセットアップ)
3. [Phase 2: 認証基盤](#phase-2-認証基盤)
4. [Phase 3: 最初のエンドポイント](#phase-3-最初のエンドポイント)
5. [トラブルシューティング](#トラブルシューティング)

---

## 🔧 前提条件

### 必要なソフトウェア

- **Python**: 3.11 以上
- **uv**: 最新版（Pythonパッケージマネージャー）
- **Node.js**: 18.x 以上（フロントエンド用）
- **Git**: 最新版
- **エディタ**: VSCode 推奨

### 確認コマンド

```bash
# Python確認
python --version
# Python 3.11.x 以上

# Node.js確認
node --version
# v18.x.x 以上

# uv インストール確認（まだの場合は後述）
uv --version
# uv 0.x.x
```

### uvのインストール

まだuvをインストールしていない場合：

```bash
# Linux/macOS
curl -LsSf https://astral.sh/uv/install.sh | sh

# または pipx経由（既にpipxがある場合）
pipx install uv

# Windows（PowerShell）
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# インストール確認
uv --version
```

**参考**: [なぜuvを使うのか？](./learning/appendix_uv_python_tools.md)

---

## 📦 Phase 1: プロジェクトセットアップ

### ステップ1: ディレクトリ作成

```bash
cd /home/sakih/projects/AI-study_quote-collector

# backendディレクトリ作成
mkdir backend
cd backend
```

### ステップ2: pyproject.toml作成

```bash
# プロジェクト定義ファイル作成
cat > pyproject.toml << 'EOF'
[project]
name = "quote-api"
version = "1.0.0"
description = "抜き書きアプリ FastAPI Backend"
requires-python = ">=3.11"
dependencies = [
    "fastapi==0.104.1",
    "uvicorn[standard]==0.24.0",
    "pydantic==2.5.0",
    "pydantic-settings==2.1.0",
    "supabase==2.0.0",
    "python-jose[cryptography]==3.3.0",
    "python-multipart==0.0.6",
]

[project.optional-dependencies]
dev = [
    "pytest==7.4.3",
    "httpx==0.25.2",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
EOF
```

### ステップ3: 仮想環境作成

```bash
# .venv/ ディレクトリに仮想環境作成
uv venv

# 仮想環境を有効化
source .venv/bin/activate  # Linux/Mac
# または
.venv\Scripts\activate  # Windows
```

**確認**:

プロンプトに `(.venv)` が表示されればOK

```bash
(.venv) $
```

### ステップ4: 依存パッケージインストール

```bash
# pyproject.tomlから依存をインストール
uv pip install -e .

# 開発用パッケージもインストール
uv pip install -e ".[dev]"
```

**uvの高速性を体感！** pipの10-100倍速くインストールされます。

### ステップ5: ロックファイル生成（推奨）

```bash
# requirements.lock 生成（チーム開発で環境を完全再現するため）
uv pip compile pyproject.toml -o requirements.lock

# ロックファイルからインストール（今後はこちらを使用）
uv pip sync requirements.lock
```

**重要**: `requirements.lock` はGitにコミットします（後述）

### ステップ6: 環境変数設定

```bash
# .env ファイル作成
cat > .env << 'EOF'
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key

# CORS
CORS_ORIGINS=http://localhost:3000

# JWT
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
EOF
```

**⚠️ 重要**: `.env` ファイルに実際の値を設定してください

```bash
# Next.jsプロジェクトの .env.local から取得
cat ../.env.local | grep SUPABASE
```

### ステップ7: プロジェクト構造作成

```bash
# ディレクトリ作成
mkdir -p routes models services tests

# __init__.py 作成
touch routes/__init__.py
touch models/__init__.py
touch services/__init__.py
touch tests/__init__.py
```

### ステップ8: .gitignore作成

```bash
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python

# Virtual Environment
.venv/
venv/

# Environment variables
.env
.env.local

# IDE
.vscode/
.idea/

# Testing
.pytest_cache/
.coverage

# uv
.python-version

# Keep lock file (important!)
!requirements.lock
EOF
```

**重要**: `requirements.lock` は `.gitignore` に含めない（チーム開発で必要）

### ステップ9: 設定ファイル作成

```bash
# config.py
cat > config.py << 'EOF'
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    cors_origins: str = "http://localhost:3000"
    jwt_secret: str = "your-secret-key"
    jwt_algorithm: str = "HS256"

    class Config:
        env_file = ".env"

settings = Settings()
EOF
```

### ステップ10: main.py 作成

```bash
cat > main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="抜き書きアプリ API",
    version="1.0.0",
    description="FastAPI バックエンド"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "抜き書きアプリ FastAPI", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF
```

### ステップ11: 起動確認

```bash
# 開発サーバー起動
uvicorn main:app --reload --port 8000
```

**期待される出力**:

```text
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using StatReload
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### ステップ12: 動作確認

別のターミナルで：

```bash
# ルートエンドポイント確認
curl http://localhost:8000/
# {"message":"抜き書きアプリ FastAPI","status":"running"}

# ヘルスチェック
curl http://localhost:8000/health
# {"status":"healthy"}

# Swagger UI確認（ブラウザ）
# http://localhost:8000/docs
```

**✅ 成功基準**:

- サーバーが起動する
- `http://localhost:8000/` にアクセスできる
- `http://localhost:8000/docs` でSwagger UIが表示される

---

## 🔐 Phase 2: 認証基盤

### ステップ1: 認証モジュール作成

```bash
cat > auth.py << 'EOF'
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

    try:
        # Supabase Auth でトークン検証
        response = supabase.auth.get_user(token)

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="認証が必要です"
            )

        return response.user

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"認証エラー: {str(e)}"
        )
EOF
```

### ステップ2: テストエンドポイント追加

```bash
# main.py に追加
cat >> main.py << 'EOF'

from auth import get_current_user
from fastapi import Depends

@app.get("/api/me")
async def get_me(user = Depends(get_current_user)):
    """認証テスト用エンドポイント"""
    return {
        "user_id": user.id,
        "email": user.email
    }
EOF
```

### ステップ3: 認証テスト

```bash
# Next.jsアプリでログインしてトークンを取得

# 別のターミナルで
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:8000/api/me
```

**期待される出力**:

```json
{
  "user_id": "xxx-xxx-xxx",
  "email": "user@example.com"
}
```

---

## 📝 Phase 3: 最初のエンドポイント

### ステップ1: Pydanticモデル作成

```bash
cat > models/activity.py << 'EOF'
from pydantic import BaseModel
from datetime import datetime

class Activity(BaseModel):
    id: int
    name: str
    description: str | None
    icon: str
    display_order: int
    created_at: datetime

    class Config:
        from_attributes = True

class ActivityResponse(BaseModel):
    activities: list[Activity]
EOF
```

### ステップ2: APIルート作成

```bash
cat > routes/activities.py << 'EOF'
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from auth import get_current_user, get_supabase_client
from models.activity import Activity, ActivityResponse

router = APIRouter()

@router.get("/activities", response_model=ActivityResponse)
async def get_activities(
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """活動領域一覧を取得"""
    try:
        response = supabase.table('activities') \
            .select('*') \
            .order('display_order') \
            .execute()

        return {"activities": response.data}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"データベースエラー: {str(e)}"
        )
EOF
```

### ステップ3: ルーター登録

```python
# main.py の修正（手動で編集）
from routes import activities

# CORS設定の後に追加
app.include_router(activities.router, prefix="/api", tags=["activities"])
```

### ステップ4: 動作確認

```bash
# サーバー再起動
# Ctrl+C で停止して、再度起動
uvicorn main:app --reload --port 8000

# テスト
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8000/api/activities
```

---

## 🔄 フロントエンドの切り替え

### ステップ1: 環境変数設定

```bash
# Next.jsプロジェクトの .env.local
cd ..
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" >> .env.local
```

### ステップ2: APIクライアント作成

```typescript
// lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function fetchActivities() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${API_BASE}/api/activities`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}
```

### ステップ3: 両方のサーバーを起動

```bash
# ターミナル1: Next.js
cd /home/sakih/projects/AI-study_quote-collector
npm run dev

# ターミナル2: FastAPI
cd /home/sakih/projects/AI-study_quote-collector/backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

---

## 🐛 トラブルシューティング

### エラー1: `ModuleNotFoundError: No module named 'xxx'`

**原因**: 依存パッケージがインストールされていない

**解決策**:

```bash
# ロックファイルから再インストール
uv pip sync requirements.lock

# または pyproject.toml から
uv pip install -e .
```

### エラー2: `uv: command not found`

**原因**: uvがインストールされていない

**解決策**:

```bash
# uvインストール
curl -LsSf https://astral.sh/uv/install.sh | sh

# シェル再起動
source ~/.bashrc  # または ~/.zshrc
```

### エラー3: `CORS policy: No 'Access-Control-Allow-Origin' header`

**原因**: CORS設定が正しくない

**解決策**:

```python
# main.py のCORS設定を確認
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.jsのURL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### エラー4: `401 Unauthorized`

**原因**: トークンが無効または期限切れ

**解決策**:

1. Next.jsで再ログイン
2. 新しいトークンを取得
3. リクエストに含める

### エラー5: `connection refused`

**原因**: FastAPIサーバーが起動していない

**解決策**:

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

### エラー6: Python仮想環境が有効化できない

**原因**: 仮想環境が作成されていない

**解決策**:

```bash
uv venv
source .venv/bin/activate
```

### エラー7: `uv pip sync` が遅い

**原因**: requirements.lock が古い、または存在しない

**解決策**:

```bash
# ロックファイル再生成
uv pip compile pyproject.toml -o requirements.lock

# 再インストール
uv pip sync requirements.lock
```

---

## 🔄 チーム開発ワークフロー

### 新メンバーの環境構築

```bash
# 1. リポジトリクローン
git clone https://github.com/your/repo.git
cd repo/backend

# 2. uv インストール（初回のみ）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 3. 仮想環境作成
uv venv

# 4. 有効化
source .venv/bin/activate

# 5. ロックファイルから完全再現
uv pip sync requirements.lock

# 完了！
```

### 依存パッケージ追加

```bash
# 1. pyproject.toml に追加
# dependencies = [
#     "fastapi==0.104.1",
#     "new-package==1.0.0",  # ← 追加
# ]

# 2. インストール
uv pip install -e .

# 3. ロックファイル更新
uv pip compile pyproject.toml -o requirements.lock

# 4. Gitコミット
git add pyproject.toml requirements.lock
git commit -m "Add new-package dependency"
```

---

## ✅ チェックリスト

Phase 1完了の確認:

- [ ] Pythonバージョンが3.11以上
- [ ] uvがインストールされている
- [ ] 仮想環境が作成・有効化されている（`.venv/`）
- [ ] 依存パッケージがインストールされている
- [ ] `requirements.lock` が生成されている
- [ ] `.env` ファイルが設定されている
- [ ] `.gitignore` が作成されている
- [ ] FastAPIサーバーが起動する
- [ ] `http://localhost:8000/` にアクセスできる
- [ ] `http://localhost:8000/docs` でSwagger UIが表示される

Phase 2完了の確認:

- [ ] 認証ミドルウェアが実装されている
- [ ] テストエンドポイント `/api/me` が動作する
- [ ] Next.jsからのトークンで認証できる

Phase 3完了の確認:

- [ ] `/api/activities` が実装されている
- [ ] Supabaseからデータを取得できる
- [ ] フロントエンドから呼び出せる
- [ ] Next.js APIとFastAPIを切り替えられる

---

## 📚 次のステップ

Phase 1-3が完了したら、[FastAPI移行計画書.md](./FastAPI移行計画書.md) の Phase 4 以降に進みましょう。

1. Phase 4: タグAPI移行
2. Phase 5: 書籍API移行
3. Phase 6: SNSユーザーAPI移行
4. Phase 7: フレーズAPI移行
5. ...

---

## 🔗 参考リンク

- [FastAPI 公式ドキュメント](https://fastapi.tiangolo.com/)
- [FastAPI チュートリアル（日本語）](https://fastapi.tiangolo.com/ja/)
- [uv 公式ドキュメント](https://docs.astral.sh/uv/)
- [Supabase Python クライアント](https://github.com/supabase-community/supabase-py)
- [Pydantic ドキュメント](https://docs.pydantic.dev/)

---

**作成日**: 2025-11-01
**最終更新**: 2025-11-01
