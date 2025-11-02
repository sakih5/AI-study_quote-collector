# 技術仕様書 v3.0 - FastAPI ハイブリッド構成

**作成日**: 2025-11-01
**バージョン**: 3.0
**前バージョンからの変更**: FastAPIバックエンドを追加（ハイブリッド構成）

---

## 📋 変更サマリー

### v2.0 → v3.0 の主な変更点

1. **バックエンドAPI**: Next.js API Routes + FastAPI（ハイブリッド）
2. **Python環境**: FastAPIプロジェクトを追加
3. **開発サーバー**: 2つのサーバーを並行稼働
4. **段階的移行**: 徐々にFastAPIへ移行可能

---

## 1. システムアーキテクチャ

### 1.1 全体構成（ハイブリッド）

```
┌─────────────────────────────────────┐
│ フロントエンド                       │
│ Next.js 14 (TypeScript)             │
│ Port: 3000                          │
└─────┬────────────────────┬──────────┘
      │                    │
      ↓                    ↓
┌──────────────┐    ┌──────────────────┐
│ Next.js API  │    │ FastAPI          │
│ (TypeScript) │    │ (Python)         │
│ :3000/api/*  │    │ :8000/api/*      │
└──────┬───────┘    └────────┬─────────┘
       │                     │
       └──────────┬──────────┘
                  ↓
┌─────────────────────────────────────┐
│ Supabase                            │
│ - PostgreSQL 15                     │
│ - Supabase Auth                     │
│ - Supabase Storage                  │
└─────────────────────────────────────┘
```

### 1.2 技術スタック

#### フロントエンド

| 技術 | バージョン | 用途 |
|-----|-----------|------|
| Next.js | 14.x | Reactフレームワーク |
| TypeScript | 5.x | プログラミング言語 |
| Tailwind CSS | 3.x | CSSフレームワーク |
| React | 18.x | UIライブラリ |
| Tesseract.js | 5.x | OCR（ブラウザ） |

#### バックエンド（Next.js API Routes）

| 技術 | バージョン | 用途 |
|-----|-----------|------|
| Next.js API Routes | 14.x | サーバーレス API |
| TypeScript | 5.x | プログラミング言語 |
| Supabase JS Client | 2.x | データベースクライアント |

#### バックエンド（FastAPI）**新規**

| 技術 | バージョン | 用途 |
|-----|-----------|------|
| Python | 3.11+ | プログラミング言語 |
| **uv** | 0.x+ | **パッケージマネージャー・環境管理** |
| FastAPI | 0.104+ | Webフレームワーク |
| Uvicorn | 0.24+ | ASGIサーバー |
| Pydantic | 2.5+ | バリデーション・型定義 |
| supabase-py | 2.0+ | Supabaseクライアント |
| python-jose | 3.3+ | JWT処理 |
| python-multipart | 0.0.6+ | ファイルアップロード対応 |

#### データベース・BaaS

| 技術 | バージョン | 用途 |
|-----|-----------|------|
| Supabase | - | BaaS（Backend as a Service） |
| PostgreSQL | 15.x | データベース |
| Supabase Auth | - | 認証サービス |
| Supabase Storage | - | ファイルストレージ |

#### インフラ

| 技術 | 用途 |
|-----|------|
| Vercel | フロントエンド・Next.js APIホスティング |
| Google Cloud Run | FastAPIホスティング |
| Supabase Cloud | データベース・認証 |

#### 開発ツール

**TypeScript**:
- ESLint
- Prettier
- Vitest（テスト）

**Python**:
- **uv**（パッケージ管理・環境構築）
- pytest（テスト）
- black（フォーマッター）
- ruff（リンター・フォーマッター - 高速）
- mypy（型チェック）

---

## 2. プロジェクト構成

### 2.1 ディレクトリ構造

```
AI-study_quote-collector/
├── app/                          # フロントエンド（Next.js）
│   ├── (auth)/
│   │   └── login/
│   ├── (main)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── settings/
│   └── api/                      # Next.js API Routes（既存）
│       ├── activities/
│       ├── books/
│       ├── sns-users/
│       ├── tags/
│       ├── quotes/
│       └── export/
│
├── backend/                      # FastAPI（新規追加）
│   ├── main.py                   # FastAPIエントリーポイント
│   ├── config.py                 # 設定
│   ├── auth.py                   # 認証ミドルウェア
│   ├── database.py               # Supabase接続
│   ├── dependencies.py           # 依存性注入
│   ├── models/                   # Pydanticモデル
│   │   ├── __init__.py
│   │   ├── activity.py
│   │   ├── tag.py
│   │   ├── book.py
│   │   ├── sns_user.py
│   │   └── quote.py
│   ├── routes/                   # APIルート
│   │   ├── __init__.py
│   │   ├── activities.py
│   │   ├── tags.py
│   │   ├── books.py
│   │   ├── sns_users.py
│   │   ├── quotes.py
│   │   └── export.py
│   ├── services/                 # ビジネスロジック
│   │   ├── __init__.py
│   │   ├── activity_service.py
│   │   ├── tag_service.py
│   │   └── quote_service.py
│   ├── tests/                    # テスト
│   │   ├── __init__.py
│   │   ├── test_activities.py
│   │   ├── test_tags.py
│   │   └── test_quotes.py
│   ├── requirements.txt          # 依存パッケージ
│   ├── .env                      # 環境変数
│   └── README.md                 # セットアップガイド
│
├── lib/                          # 共通ライブラリ
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts
│   └── utils/
│
├── docs/                         # ドキュメント
│   ├── 要件定義書_v2.md
│   ├── 技術仕様書_v3_FastAPI.md  # このファイル
│   ├── API設計書_v3_FastAPI.md
│   ├── FastAPI移行計画書.md
│   └── learning/
│
├── .env.local                    # Next.js環境変数
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. FastAPI実装詳細

### 3.1 プロジェクト構造（backend/）

#### main.py - エントリーポイント

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import activities, tags, books, sns_users, quotes, export

app = FastAPI(
    title="抜き書きアプリ API",
    version="1.0.0",
    description="FastAPI バックエンド"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(activities.router, prefix="/api", tags=["activities"])
app.include_router(tags.router, prefix="/api", tags=["tags"])
app.include_router(books.router, prefix="/api", tags=["books"])
app.include_router(sns_users.router, prefix="/api", tags=["sns-users"])
app.include_router(quotes.router, prefix="/api", tags=["quotes"])
app.include_router(export.router, prefix="/api", tags=["export"])

@app.get("/")
def root():
    return {"message": "抜き書きアプリ FastAPI"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

#### config.py - 設定

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_key: str

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # JWT
    jwt_secret: str = "your-secret-key"
    jwt_algorithm: str = "HS256"

    class Config:
        env_file = ".env"

settings = Settings()
```

#### auth.py - 認証ミドルウェア

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from config import settings

security = HTTPBearer()

def get_supabase_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_key)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """JWTトークンからユーザーを取得"""
    token = credentials.credentials

    try:
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="認証が必要です"
            )
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです"
        )
```

#### models/activity.py - Pydanticモデル

```python
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
```

#### routes/activities.py - APIルート

```python
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
        raise HTTPException(status_code=500, detail=str(e))
```

---

### 3.2 認証フロー

#### Supabase Authとの連携

```python
# フロントエンド（Next.js）
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

const response = await fetch('http://localhost:8000/api/activities', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

```python
# バックエンド（FastAPI）
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    user = supabase.auth.get_user(token)
    return user
```

---

### 3.3 データベースアクセス

#### Supabase Python Client

```python
from supabase import create_client, Client

supabase: Client = create_client(
    supabase_url="https://xxx.supabase.co",
    supabase_key="your-anon-key"
)

# データ取得
response = supabase.table('quotes').select('*').execute()

# データ挿入
response = supabase.table('quotes').insert({
    "text": "フレーズ",
    "user_id": user.id
}).execute()

# データ更新
response = supabase.table('quotes') \
    .update({"text": "新しいテキスト"}) \
    .eq('id', 1) \
    .execute()

# データ削除
response = supabase.table('quotes') \
    .delete() \
    .eq('id', 1) \
    .execute()
```

---

## 4. API切り替え設定

### 4.1 フロントエンド環境変数

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000  # FastAPI使用
# NEXT_PUBLIC_API_BASE_URL=                      # Next.js API Routes使用
```

### 4.2 APIクライアント実装

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function fetchActivities() {
  const response = await fetch(`${API_BASE}/api/activities`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}
```

---

## 5. テスト戦略

### 5.1 単体テスト（pytest）

```python
# backend/tests/test_activities.py
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_activities():
    response = client.get("/api/activities")
    assert response.status_code == 200
    data = response.json()
    assert "activities" in data
    assert isinstance(data["activities"], list)
```

### 5.2 E2Eテスト（Playwright）

既存のE2Eテストは、環境変数で切り替えて両方のバックエンドをテスト可能。

---

## 6. デプロイ戦略

### 6.1 開発環境

```
フロントエンド: localhost:3000（Next.js）
Next.js API:   localhost:3000/api/*
FastAPI:       localhost:8000/api/*
```

### 6.2 本番環境（案）

**Option 1: Vercel + Heroku**

```
フロントエンド: https://your-app.vercel.app
FastAPI:       https://your-app-api.herokuapp.com
```

**Option 2: Vercel + Railway**

```
フロントエンド: https://your-app.vercel.app
FastAPI:       https://your-app.railway.app
```

**Option 3: Docker + AWS**

```
フロントエンド: AWS Amplify / Vercel
FastAPI:       AWS ECS / Lambda（Docker）
```

---

## 7. パフォーマンス比較

### 7.1 測定方法

```python
# ベンチマークスクリプト
import time
import requests

def benchmark_api(url, iterations=100):
    times = []
    for _ in range(iterations):
        start = time.time()
        requests.get(url)
        times.append(time.time() - start)

    avg = sum(times) / len(times)
    print(f"平均応答時間: {avg * 1000:.2f}ms")

# Next.js API Routes
benchmark_api("http://localhost:3000/api/activities")

# FastAPI
benchmark_api("http://localhost:8000/api/activities")
```

### 7.2 期待される結果

| API | 応答時間（予測） | 備考 |
|-----|--------------|------|
| Next.js API Routes | 50-100ms | サーバーレス関数 |
| FastAPI | 20-50ms | 非同期処理、より高速 |

---

## 8. セキュリティ

### 8.1 認証・認可

- Supabase Auth継続利用
- JWTトークン検証
- RLS（Row Level Security）活用

### 8.2 CORS設定

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",           # 開発環境
        "https://your-app.vercel.app"      # 本番環境
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 8.3 環境変数管理

```python
# .env（Gitにコミットしない）
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secret-key
```

---

## 9. 今後の拡張

### 9.1 AI機能追加（Phase 3）

FastAPIなら簡単に統合可能：

```python
from transformers import pipeline

summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

@router.post("/api/quotes/summarize")
async def summarize_quote(quote_id: int):
    # フレーズを取得
    quote = get_quote(quote_id)

    # AI要約
    summary = summarizer(quote.text, max_length=50)

    return {"summary": summary[0]['summary_text']}
```

### 9.2 非同期処理（Celery）

重い処理をバックグラウンドで実行：

```python
from celery import Celery

celery_app = Celery('tasks', broker='redis://localhost:6379')

@celery_app.task
def process_ocr(image_url: str):
    # OCR処理
    pass

@router.post("/api/ocr/async")
async def ocr_async(image_url: str):
    task = process_ocr.delay(image_url)
    return {"task_id": task.id}
```

---

## 10. まとめ

### v3の主な変更点

1. **FastAPI追加**: Pythonバックエンドを並行稼働
2. **段階的移行**: リスクを抑えながら移行可能
3. **パフォーマンス向上**: FastAPIの高速性を活用
4. **拡張性向上**: AI機能追加が容易に

### 次のステップ

1. Phase 1: 環境構築
2. Phase 2: 認証基盤
3. Phase 3-8: エンドポイント移行
4. Phase 9-10: テスト・デプロイ

---

**作成日**: 2025-11-01
**最終更新**: 2025-11-01
