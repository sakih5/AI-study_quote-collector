# FastAPI Phase 3-1: /api/activities 実装作業ログ

**作業日**: 2025-11-02
**作業者**: sakih
**作業時間**: 約1.5時間

---

## 📋 作業概要

FastAPI移行のPhase 3-1として、最初のビジネスロジックAPI `/api/activities` エンドポイントを実装しました。

---

## ✅ 完了した作業

### 1. Pydanticモデル作成

**ファイル**: `backend/models/activity.py`

```python
from pydantic import BaseModel
from typing import Optional


class Activity(BaseModel):
    """活動領域モデル"""
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: int

    class Config:
        from_attributes = True  # Pydantic v2での設定


class ActivitiesResponse(BaseModel):
    """活動領域一覧レスポンス"""
    activities: list[Activity]
```

**ポイント**:
- `id`の型を`int`に設定（最初は`str`で実装してエラーが発生）
- Pydantic v2の設定 `from_attributes = True` を使用
- レスポンスモデルを分離して型安全性を確保

---

### 2. APIルート作成

**ファイル**: `backend/routes/activities.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from auth import get_current_user, get_supabase_client
from models.activity import Activity, ActivitiesResponse

router = APIRouter(
    prefix="/api/activities",
    tags=["activities"]
)


@router.get("", response_model=ActivitiesResponse)
async def get_activities(
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    活動領域一覧を取得（システム固定の10個）

    - **認証**: 必須
    - **ソート**: display_order昇順
    """
    try:
        # 活動領域一覧を取得（display_order順）
        response = supabase.table('activities') \
            .select('id, name, description, icon, display_order') \
            .order('display_order', desc=False) \
            .execute()

        if response.data is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="活動領域の取得に失敗しました"
            )

        # Pydanticモデルに変換
        activities = [Activity(**activity) for activity in response.data]

        return ActivitiesResponse(activities=activities)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 活動領域取得エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )
```

**ポイント**:
- 依存性注入で認証とSupabaseクライアントを取得
- エラーハンドリングを実装
- デバッグログを追加（開発用）
- Swagger UIにドキュメントを自動生成

---

### 3. main.pyへルーター登録

**ファイル**: `backend/main.py`

```python
from routes import activities

# ルーター登録
app.include_router(activities.router)
```

**変更内容**:
- activitiesルーターをインポート
- `app.include_router()`でルーターを登録

---

### 4. 動作確認

#### 4-1. curlテスト

**コマンド**:
```bash
curl -X GET "http://localhost:8000/api/activities" \
  -H "Authorization: Bearer TOKEN"
```

**結果**: ✅ 成功

```json
{
  "activities": [
    {
      "id": 1,
      "name": "仕事・キャリア",
      "description": "業務、スキル開発、キャリア形成に関連する活動",
      "icon": "💼",
      "display_order": 1
    },
    // ... 10件取得
  ]
}
```

---

#### 4-2. Swagger UIテスト

**URL**: `http://localhost:8000/docs`

**手順**:
1. **"Authorize"** で認証
2. **GET /api/activities** を **"Try it out"** → **"Execute"**

**結果**: ✅ 成功（ステータスコード 200）

**注意点**:
- トークンの有効期限切れエラーが発生した場合は、新しいトークンを取得して再認証

---

#### 4-3. Next.jsからの呼び出しテスト

**ブラウザコンソールで実行**:
```javascript
// トークンを取得
const tokenResponse = await fetch('/api/get-token');
const { access_token } = await tokenResponse.json();

// FastAPI /api/activities を呼び出し
const activitiesResponse = await fetch('http://localhost:8000/api/activities', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

const data = await activitiesResponse.json();
console.log('FastAPIからの活動領域データ:', data);

// Next.js既存APIとの比較
const nextjsResponse = await fetch('/api/activities');
const nextjsData = await nextjsResponse.json();
console.log('Next.js APIからの活動領域データ:', nextjsData);
```

**結果**: ✅ 成功

```
FastAPI: 10 件
Next.js: 10 件
```

**確認できたこと**:
- FastAPIエンドポイントが正常に動作
- Next.js既存APIと同じデータが取得できる
- データ構造の互換性が保証されている

---

## 🐛 発生した問題と解決

### 問題1: Pydanticバリデーションエラー

**エラーメッセージ**:
```
1 validation error for Activity
id
  Input should be a valid string [type=string_type, input_value=1, input_type=int]
```

**原因**:
- データベースの`activities.id`は`int`型
- Pydanticモデルでは`id: str`と定義していた

**解決**:
```python
# 修正前
id: str

# 修正後
id: int
```

---

### 問題2: ポート衝突

**エラーメッセージ**:
```
ERROR: [Errno 98] Address already in use
```

**原因**:
- 複数のuvicornプロセスが起動していた

**解決**:
```bash
lsof -ti:8000 | xargs kill -9
```

---

### 問題3: トークン有効期限切れ

**エラーメッセージ**:
```
invalid JWT: token is expired
```

**原因**:
- JWTトークンの有効期限が切れていた

**解決**:
- 新しいトークンを取得して再認証
```javascript
fetch('/api/get-token').then(res => res.json()).then(data => {
  console.log('新しいトークン:', data.access_token);
});
```

---

## 📊 進捗状況

### 完了したフェーズ

| Phase | タスク | 進捗 | 状態 |
|-------|--------|------|------|
| Phase 1 | 環境構築 | 100% | ✅ 完了 |
| Phase 2 | 認証基盤 | 100% | ✅ 完了 |
| Phase 3-1 | /api/activities | 100% | ✅ 完了 |
| Phase 3-2 | /api/tags | 0% | ⏳ 次回 |

---

## 💡 学んだこと

### 1. Pydanticの型安全性

- データベースの型とPydanticモデルの型を一致させる重要性
- バリデーションエラーで型の不一致を早期に検出できる
- `from_attributes = True`でORM/辞書からの変換が容易

### 2. FastAPIのルーター設計

- `APIRouter`で機能ごとにルートを分離
- `prefix`でエンドポイントのパスをグループ化
- `tags`でSwagger UIでのカテゴリ分け

### 3. 依存性注入の利便性

- `Depends()`で認証やDBクライアントを各エンドポイントに注入
- コードの重複を削減
- テスタビリティの向上

### 4. Supabase Python Client

- `supabase.table().select().order().execute()`のメソッドチェーン
- `response.data`でデータを取得
- Next.js版と同じSupabase APIを使用できる

---

## 🎯 次回の作業予定

### Phase 3-2: /api/tags エンドポイント実装

**実装内容**（見積もり: 3〜4時間）:
1. Pydanticモデル作成（`backend/models/tag.py`）
2. APIルート作成（`backend/routes/tags.py`）
3. CRUD操作実装
   - GET /api/tags（一覧取得）
   - POST /api/tags（新規作成）
   - PUT /api/tags/{id}（更新）
   - DELETE /api/tags/{id}（削除）
4. タグ統合機能実装
   - POST /api/tags/{id}/merge
5. 動作確認（curl → Swagger UI → Next.js）

---

## 📁 作成・更新したファイル

### 新規作成

```
backend/
├── models/
│   └── activity.py          # Pydanticモデル
└── routes/
    └── activities.py        # APIルート
```

### 更新

```
backend/
└── main.py                  # ルーター登録
```

### ドキュメント

```
docs/development/work_logs/
└── 2025-11-02_fastapi_phase3-1_activities.md  # 本ファイル
```

---

## 🔧 技術スタック

### 使用したライブラリ

| カテゴリ | ライブラリ | バージョン | 用途 |
|---------|----------|-----------|------|
| Webフレームワーク | FastAPI | 0.104.1 | APIエンドポイント |
| バリデーション | Pydantic | 2.5.0 | データ検証・型安全性 |
| Supabaseクライアント | supabase-py | 2.0.0 | データベースアクセス |

---

## 📝 メモ・気づき

1. **型の一致が重要**
   - データベーススキーマとPydanticモデルの型を正確に一致させる
   - エラーメッセージから型の不一致を素早く特定できる

2. **既存Next.js APIとの互換性**
   - レスポンス形式を既存APIと同じにすることで、フロントエンドの修正を最小化
   - `{activities: [...]}` の形式を維持

3. **認証の動作確認**
   - curlでの手動テストが最も確実
   - Swagger UIは開発時の手動テストに便利
   - ブラウザコンソールでのテストはフロントエンド統合の確認に有効

4. **デバッグログの活用**
   - `print()`で簡易ログ出力
   - 本番環境では`logging`モジュールに置き換える予定

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
  console.log('トークン:', data.access_token);
});
```

---

**作成日**: 2025-11-02
**最終更新**: 2025-11-02
**FastAPI Phase 3-1 完了！**
