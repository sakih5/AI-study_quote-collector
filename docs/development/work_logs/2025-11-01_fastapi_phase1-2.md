# FastAPI移行 Phase 1-2 作業ログ

**作業日**: 2025-11-01
**作業者**: sakih
**作業時間**: 約3時間

---

## 📋 作業概要

FastAPI移行計画のPhase 1（環境構築）とPhase 2（認証基盤）を実装しました。

---

## ✅ 完了した作業

### Phase 1: プロジェクトセットアップ（100%完了）

#### 1.1 環境構築

- ✅ **uvのインストール**
  - バージョン: uv 0.9.7
  - インストール先: `/home/sakih/.local/bin/uv`
  - 高速パッケージマネージャーとして採用

- ✅ **backendディレクトリ作成**

  ```
  /home/sakih/projects/AI-study_quote-collector/backend/
  ```

- ✅ **プロジェクト構造作成**

  ```
  backend/
  ├── .env                    # 環境変数（Supabase設定済み）
  ├── .gitignore             # Gitignore設定
  ├── .venv/                 # 仮想環境（uv作成）
  ├── config.py              # 設定ファイル
  ├── main.py                # FastAPIアプリケーション
  ├── auth.py                # 認証モジュール
  ├── pyproject.toml         # プロジェクト定義
  ├── requirements.lock      # ロックファイル
  ├── models/                # Pydanticモデル
  ├── routes/                # APIルート
  ├── services/              # ビジネスロジック
  └── tests/                 # テストコード
  ```

#### 1.2 依存パッケージインストール

**使用ツール**: uv（超高速パッケージマネージャー）

**インストールしたパッケージ**:

- fastapi==0.104.1
- uvicorn[standard]==0.24.0
- pydantic==2.5.0
- pydantic-settings==2.1.0
- supabase==2.0.0
- python-jose[cryptography]==3.3.0
- python-multipart==0.0.6

**インストール速度**:

- 49パッケージを**49ms**で完了（pipの10-100倍速）

#### 1.3 設定ファイル作成

**pyproject.toml**:

```toml
[project]
name = "quote-api"
version = "1.0.0"
description = "抜き書きアプリ FastAPI Backend"
requires-python = ">=3.11"
dependencies = [
    "fastapi==0.104.1",
    "uvicorn[standard]==0.24.0",
    # ... 他のパッケージ
]
```

**config.py**:

- Supabase URL/KEY設定
- CORS設定
- JWT設定

**.env**:

- Supabase認証情報を設定
- Next.jsの`.env.local`から取得

#### 1.4 FastAPIアプリケーション作成

**main.py**:

```python
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
```

#### 1.5 サーバー起動確認

- ✅ 起動成功: `http://localhost:8000`
- ✅ ヘルスチェック: `http://localhost:8000/health`
- ✅ Swagger UI: `http://localhost:8000/docs`

---

### Phase 2: 認証基盤（95%完了）

#### 2.1 認証モジュール作成

**auth.py**:

```python
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
        # トークンをセッションに設定してからユーザーを取得
        supabase.postgrest.auth(token)

        # ユーザー情報を取得
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
```

#### 2.2 認証エンドポイント追加

**main.pyに追加**:

```python
from auth import get_current_user
from fastapi import Depends

@app.get("/api/me")
async def get_me(user = Depends(get_current_user)):
    """認証テスト用エンドポイント"""
    return {
        "user_id": user.id,
        "email": user.email
    }
```

#### 2.3 Next.js側トークン取得エンドポイント作成

**app/api/get-token/route.ts**（新規作成）:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  return NextResponse.json({
    access_token: session.access_token,
    user: {
      id: session.user.id,
      email: session.user.email
    }
  })
}
```

#### 2.4 認証テスト

**curlでのテスト結果**:

```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/me
```

**レスポンス**:

```json
{
  "user_id": "26c01d9c-69dd-40ff-b561-fe39c2798ac8",
  "email": "sakihamamura5@gmail.com"
}
```

✅ **curlでの認証テスト成功**

---

## ⚠️ 未解決の課題

### Swagger UIでの認証エラー

**問題**:

- curlでは認証が成功するが、Swagger UIでは失敗する
- エラーメッセージ: `"認証エラー: This endpoint requires a valid Bearer token"`

**考えられる原因**:

1. Swagger UIのトークン送信方式の違い
2. supabase-pyライブラリのトークン検証方法
3. ブラウザキャッシュの問題

**次回の対応**:

1. supabase-pyのバージョン確認
2. 別の認証方式の検討（python-jose直接利用など）
3. Swagger UIのデバッグログ確認

---

## 📊 進捗状況

### 完了したフェーズ

| Phase | タスク | 進捗 | 状態 |
|-------|--------|------|------|
| Phase 1 | 環境構築 | 100% | ✅ 完了 |
| Phase 2 | 認証基盤 | 95% | 🔶 ほぼ完了 |
| Phase 3 | /api/activities | 0% | ⏳ 未着手 |

### タイムライン

- **14:00-15:00**: Phase 1 環境構築
  - uvインストール
  - プロジェクトセットアップ
  - 依存パッケージインストール

- **15:00-16:00**: Phase 1 完了
  - FastAPIアプリ作成
  - サーバー起動確認
  - Swagger UI確認

- **16:00-17:00**: Phase 2 認証基盤
  - 認証モジュール作成
  - ログイン・トークン取得
  - 認証テスト

- **17:00-18:00**: デバッグ
  - Swagger UI認証エラー調査
  - auth.py修正
  - curl動作確認

---

## 🎯 次回の作業予定

### Phase 2完了（残り5%）

1. **Swagger UI認証エラー解決**
   - supabase-pyの認証方式を調査
   - 必要に応じて認証ロジックを修正

### Phase 3開始

1. **Pydanticモデル作成**
   - `models/activity.py`

2. **APIルート作成**
   - `routes/activities.py`

3. **/api/activitiesエンドポイント実装**
   - Supabaseからデータ取得
   - レスポンス返却

4. **動作確認**
   - curlテスト
   - Swagger UIテスト
   - Next.jsから呼び出しテスト

---

## 📚 学んだこと

### uvの高速性

- パッケージインストールが圧倒的に速い
- `requirements.lock`でチーム開発の再現性を保証
- pip互換コマンドで学習コストが低い

### Supabase認証の仕組み

- JWTトークンによる認証
- Cookieベースのセッション管理（Next.js App Router）
- supabase-pyでのトークン検証方法

### FastAPIの開発体験

- 自動Swagger UI生成
- Pydanticによる型安全性
- 依存性注入（Depends）の便利さ

---

## 🔧 技術スタック

### 採用したツール・ライブラリ

| カテゴリ | ツール | バージョン | 理由 |
|---------|--------|-----------|------|
| パッケージ管理 | uv | 0.9.7 | 超高速、pip互換 |
| Webフレームワーク | FastAPI | 0.104.1 | 型安全、自動ドキュメント |
| ASGIサーバー | Uvicorn | 0.24.0 | 高速、非同期対応 |
| バリデーション | Pydantic | 2.5.0 | 型安全なデータ検証 |
| Supabaseクライアント | supabase-py | 2.0.0 | 公式Pythonクライアント |
| JWT処理 | python-jose | 3.3.0 | JWT検証・生成 |

---

## 📁 作成・更新したファイル

### 新規作成

```
backend/
├── .env
├── .gitignore
├── pyproject.toml
├── requirements.lock
├── config.py
├── main.py
├── auth.py
├── models/__init__.py
├── routes/__init__.py
├── services/__init__.py
└── tests/__init__.py

app/
└── api/
    └── get-token/
        └── route.ts
```

### ドキュメント作成

```
docs/
├── learning/
│   ├── README.md
│   ├── 01_basics.md
│   ├── 02_project_structure.md
│   ├── 03_data_flow.md
│   ├── 04_types_file.md
│   ├── 05_header_component.md
│   ├── 06_api_activities.md
│   ├── appendix_typescript_vs_fastapi.md
│   └── appendix_uv_python_tools.md
│
├── FastAPI移行計画書.md
├── 技術仕様書_v3_FastAPI.md
├── FastAPIセットアップガイド.md
├── API設計書_v3_FastAPI補足.md
└── デプロイガイド_CloudRun.md
```

---

## 💡 メモ・気づき

1. **uvの導入効果**
   - インストール時間が劇的に短縮
   - `requirements.lock`による完全な再現性
   - チーム開発に最適

2. **認証の複雑さ**
   - Cookieベース認証はlocalStorageより安全
   - トークン取得にNext.js側のエンドポイントが必要
   - supabase-pyの認証方式がドキュメント不足

3. **FastAPIの開発体験**
   - Swagger UIが非常に便利
   - 型ヒントによる自動バリデーション
   - 非同期処理のサポート

---

## 📞 次回のアクション

1. **Swagger UI認証問題の解決**
   - supabase-pyのドキュメント確認
   - 代替認証方式の検討

2. **Phase 3: /api/activitiesの実装**
   - FastAPIセットアップガイドの手順に従う

3. **テストの追加**
   - pytest環境構築
   - 認証エンドポイントのテスト

## 🚀 次回の開始方法

次回作業を再開する際は、以下のコマンドでサーバーを起動してください：

**FastAPI起動**
cd /home/sakih/projects/AI-study_quote-collector/backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

**Next.js起動（別ターミナル）**
cd /home/sakih/projects/AI-study_quote-collector
npm run dev

作業ログを確認：
cat docs/development/work_logs/2025-11-01_fastapi_phase1-2.md
---

**作成日**: 2025-11-01
**最終更新**: 2025-11-01
