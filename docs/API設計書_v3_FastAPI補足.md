# API設計書 v3.0 - FastAPI 補足

**作成日**: 2025-11-01
**バージョン**: 3.0
**前提**: [API設計書_v2.md](./API設計書_v2.md) の内容を踏襲

---

## 📋 このドキュメントについて

**API設計書_v2.md** に記載されている全エンドポイントをFastAPIで実装します。

このドキュメントでは：
- **FastAPI特有の実装方法**
- **v2との違い**
- **Pydanticモデルの定義**
- **実装例**

を補足します。

**機能要件やエンドポイント仕様はv2と同じ**です。

---

## 🔄 v2からの変更点

### アーキテクチャ

```
【v2】
Next.js (TypeScript) → Next.js API Routes → Supabase

【v3】
Next.js (TypeScript) → FastAPI (Python) → Supabase
                    ↘ Next.js API Routes → Supabase（並行稼働）
```

### 技術スタック

| 項目 | v2 | v3 |
|-----|----|----|
| API言語 | TypeScript | Python + TypeScript（ハイブリッド） |
| Webフレームワーク | Next.js API Routes | FastAPI + Next.js API Routes |
| バリデーション | Zod | Pydantic |
| 型定義 | TypeScript interfaces | Pydantic models |
| ドキュメント | 手動 | 自動生成（Swagger） |

---

## 🏗️ FastAPI実装パターン

### 基本構造

```python
# routes/xxx.py
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from auth import get_current_user, get_supabase_client
from models.xxx import XxxModel, XxxResponse

router = APIRouter()

@router.get("/api/xxx", response_model=XxxResponse)
async def get_xxx(
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    # 実装
    pass
```

### 認証

全エンドポイントで `user = Depends(get_current_user)` を使用

### エラーハンドリング

```python
try:
    # 処理
except Exception as e:
    raise HTTPException(
        status_code=500,
        detail=f"エラーメッセージ: {str(e)}"
    )
```

---

## 📝 Pydanticモデル定義

### models/activity.py

```python
from pydantic import BaseModel
from datetime import datetime

class Activity(BaseModel):
    """活動領域"""
    id: int
    name: str
    description: str | None
    icon: str
    display_order: int
    created_at: datetime

    class Config:
        from_attributes = True

class ActivityListResponse(BaseModel):
    """活動領域一覧レスポンス"""
    activities: list[Activity]
```

### models/tag.py

```python
from pydantic import BaseModel, Field
from datetime import datetime

class Tag(BaseModel):
    """タグ"""
    id: int
    user_id: str
    name: str = Field(..., min_length=1, max_length=100)
    created_at: datetime
    updated_at: datetime

class TagCreate(BaseModel):
    """タグ作成リクエスト"""
    name: str = Field(..., min_length=1, max_length=100)

class TagUpdate(BaseModel):
    """タグ更新リクエスト"""
    name: str = Field(..., min_length=1, max_length=100)

class TagMerge(BaseModel):
    """タグ統合リクエスト"""
    target_tag_id: int

class TagListResponse(BaseModel):
    """タグ一覧レスポンス"""
    tags: list[Tag]
```

### models/book.py

```python
from pydantic import BaseModel, HttpUrl
from datetime import datetime

class Book(BaseModel):
    """書籍"""
    id: int
    user_id: str
    title: str
    author: str
    cover_image_url: HttpUrl | None = None
    isbn: str | None = None
    asin: str | None = None
    publisher: str | None = None
    publication_date: str | None = None
    created_at: datetime
    updated_at: datetime

class BookCreate(BaseModel):
    """書籍作成リクエスト"""
    title: str
    author: str
    cover_image_url: HttpUrl | None = None
    isbn: str | None = None
    asin: str | None = None
    publisher: str | None = None
    publication_date: str | None = None

class BookListResponse(BaseModel):
    """書籍一覧レスポンス"""
    books: list[Book]
```

### models/quote.py

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal

class Quote(BaseModel):
    """フレーズ"""
    id: int
    user_id: str
    text: str
    source_type: Literal["BOOK", "SNS", "OTHER"]
    book_id: int | None = None
    sns_user_id: int | None = None
    page_number: int | None = None
    source_meta: dict | None = None
    created_at: datetime
    updated_at: datetime

class QuoteCreate(BaseModel):
    """フレーズ作成リクエスト"""
    text: str = Field(..., min_length=1)
    source_type: Literal["BOOK", "SNS", "OTHER"]
    activity_ids: list[int] = Field(..., min_items=1)
    tag_ids: list[int] = []
    book_id: int | None = None
    sns_user_id: int | None = None
    page_number: int | None = None
    source_meta: dict | None = None

class QuoteBatchCreate(BaseModel):
    """フレーズ一括作成リクエスト"""
    quotes: list[QuoteCreate]
    source_type: Literal["BOOK", "SNS", "OTHER"]
    book_id: int | None = None
    sns_user_id: int | None = None

class QuoteUpdate(BaseModel):
    """フレーズ更新リクエスト"""
    text: str | None = None
    activity_ids: list[int] | None = None
    tag_ids: list[int] | None = None
    page_number: int | None = None
```

---

## 📡 エンドポイント実装例

### 1. GET /api/activities

```python
# routes/activities.py
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from auth import get_current_user, get_supabase_client
from models.activity import Activity, ActivityListResponse

router = APIRouter()

@router.get("/activities", response_model=ActivityListResponse)
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

### 2. GET /api/tags

```python
# routes/tags.py
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from auth import get_current_user, get_supabase_client
from models.tag import Tag, TagListResponse

router = APIRouter()

@router.get("/tags", response_model=TagListResponse)
async def get_tags(
    search: str | None = Query(None, description="検索キーワード"),
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """タグ一覧を取得"""
    try:
        query = supabase.table('tags') \
            .select('*') \
            .eq('user_id', user.id) \
            .is_('deleted_at', 'null')

        if search:
            query = query.ilike('name', f'%{search}%')

        response = query.order('created_at', desc=True).execute()

        return {"tags": response.data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 3. POST /api/tags

```python
@router.post("/tags", response_model=Tag, status_code=201)
async def create_tag(
    tag: TagCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """タグを作成"""
    try:
        # 重複チェック
        existing = supabase.table('tags') \
            .select('id') \
            .eq('user_id', user.id) \
            .eq('name', tag.name) \
            .is_('deleted_at', 'null') \
            .execute()

        if existing.data:
            raise HTTPException(
                status_code=400,
                detail="同じ名前のタグが既に存在します"
            )

        # 作成
        response = supabase.table('tags').insert({
            'user_id': user.id,
            'name': tag.name
        }).execute()

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 4. POST /api/quotes（一括登録）

```python
# routes/quotes.py
@router.post("/quotes", status_code=201)
async def create_quotes(
    batch: QuoteBatchCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """フレーズを一括登録"""
    try:
        # バリデーション
        if batch.source_type == "BOOK" and not batch.book_id:
            raise HTTPException(
                status_code=400,
                detail="書籍IDが必要です"
            )

        created_quotes = []

        for quote_data in batch.quotes:
            # フレーズ作成
            quote = {
                'user_id': user.id,
                'text': quote_data.text,
                'source_type': batch.source_type,
                'book_id': batch.book_id,
                'sns_user_id': batch.sns_user_id,
                'page_number': quote_data.page_number,
                'source_meta': quote_data.source_meta
            }

            quote_response = supabase.table('quotes') \
                .insert(quote) \
                .execute()

            quote_id = quote_response.data[0]['id']

            # 活動領域の関連付け
            for activity_id in quote_data.activity_ids:
                supabase.table('quote_activities').insert({
                    'quote_id': quote_id,
                    'activity_id': activity_id
                }).execute()

            # タグの関連付け
            for tag_id in quote_data.tag_ids:
                supabase.table('quote_tags').insert({
                    'quote_id': quote_id,
                    'tag_id': tag_id
                }).execute()

            created_quotes.append(quote_response.data[0])

        return {
            "success": True,
            "created_count": len(created_quotes),
            "quotes": created_quotes
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 5. GET /api/quotes/grouped

```python
@router.get("/quotes/grouped")
async def get_quotes_grouped(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None),
    source_type: str | None = Query(None),
    activity_ids: str | None = Query(None),  # カンマ区切り
    tag_ids: str | None = Query(None),  # カンマ区切り
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """フレーズをグループ化して取得"""
    try:
        # quotes_with_details ビューから取得
        query = supabase.table('quotes_with_details') \
            .select('*') \
            .eq('user_id', user.id) \
            .is_('deleted_at', 'null')

        # フィルター適用
        if search:
            query = query.or_(
                f'text.ilike.%{search}%,'
                f'book_title.ilike.%{search}%,'
                f'sns_handle.ilike.%{search}%'
            )

        if source_type:
            query = query.eq('source_type', source_type)

        # PostgreSQL配列フィルター
        if activity_ids:
            ids = [int(id) for id in activity_ids.split(',')]
            query = query.overlaps('activity_ids', ids)

        if tag_ids:
            ids = [int(id) for id in tag_ids.split(',')]
            query = query.overlaps('tag_ids', ids)

        response = query \
            .order('created_at', desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        # グループ化処理（Python）
        grouped = group_quotes_by_source(response.data)

        return grouped

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def group_quotes_by_source(quotes):
    """フレーズを出典別にグループ化"""
    books = {}
    sns_users = {}
    others = []

    for quote in quotes:
        if quote['source_type'] == 'BOOK' and quote['book_id']:
            book_id = quote['book_id']
            if book_id not in books:
                books[book_id] = {
                    'type': 'book',
                    'book': {
                        'id': book_id,
                        'title': quote['book_title'],
                        'author': quote['book_author'],
                        'cover_image_url': quote['book_cover_image_url']
                    },
                    'quotes': []
                }
            books[book_id]['quotes'].append(quote)

        elif quote['source_type'] == 'SNS' and quote['sns_user_id']:
            sns_id = quote['sns_user_id']
            if sns_id not in sns_users:
                sns_users[sns_id] = {
                    'type': 'sns_user',
                    'sns_user': {
                        'id': sns_id,
                        'platform': quote['sns_platform'],
                        'handle': quote['sns_handle'],
                        'display_name': quote['sns_display_name']
                    },
                    'quotes': []
                }
            sns_users[sns_id]['quotes'].append(quote)

        else:
            others.append({
                'type': 'other',
                'quote': quote
            })

    return {
        'items': list(books.values()) + list(sns_users.values()) + others,
        'total': len(quotes)
    }
```

---

## 🔄 v2（Next.js）とv3（FastAPI）の対応表

| エンドポイント | v2実装 | v3実装 | 備考 |
|---------------|--------|--------|------|
| `GET /api/activities` | app/api/activities/route.ts | routes/activities.py | ✅ |
| `GET /api/tags` | app/api/tags/route.ts | routes/tags.py | ✅ |
| `POST /api/tags` | app/api/tags/route.ts | routes/tags.py | ✅ |
| `PUT /api/tags/{id}` | app/api/tags/[id]/route.ts | routes/tags.py | ✅ |
| `DELETE /api/tags/{id}` | app/api/tags/[id]/route.ts | routes/tags.py | ✅ |
| `POST /api/tags/{id}/merge` | app/api/tags/[id]/merge/route.ts | routes/tags.py | ✅ |
| `GET /api/books` | app/api/books/route.ts | routes/books.py | ✅ |
| `POST /api/books` | app/api/books/route.ts | routes/books.py | ✅ |
| `GET /api/sns-users` | app/api/sns-users/route.ts | routes/sns_users.py | ✅ |
| `POST /api/sns-users` | app/api/sns-users/route.ts | routes/sns_users.py | ✅ |
| `GET /api/quotes/grouped` | app/api/quotes/grouped/route.ts | routes/quotes.py | ✅ |
| `POST /api/quotes` | app/api/quotes/route.ts | routes/quotes.py | ✅ |
| `PUT /api/quotes/{id}` | app/api/quotes/[id]/route.ts | routes/quotes.py | ✅ |
| `DELETE /api/quotes/{id}` | app/api/quotes/[id]/route.ts | routes/quotes.py | ✅ |
| `GET /api/export/csv` | app/api/export/csv/route.ts | routes/export.py | ✅ |

**すべてのエンドポイントがv3で実装可能**

---

## 📚 Swagger UI（自動ドキュメント）

FastAPIでは、コードから自動的にAPIドキュメントが生成されます。

### アクセス方法

```
http://localhost:8000/docs
```

### 機能

- 全エンドポイントの一覧
- リクエスト/レスポンスの型定義
- 認証付きリクエストのテスト
- APIの試験実行

**v2との違い**: Next.jsでは手動でドキュメント作成が必要だったが、FastAPIでは自動生成

---

## ✅ まとめ

### v2 vs v3

| 項目 | v2（Next.js） | v3（FastAPI） |
|-----|--------------|--------------|
| 実装言語 | TypeScript | Python |
| 型チェック | コンパイル時 | 実行時 + 型ヒント |
| バリデーション | Zod | Pydantic（自動） |
| ドキュメント | 手動 | 自動生成（Swagger） |
| パフォーマンス | 中 | 高（非同期処理） |
| エコシステム | フロントエンド寄り | データ処理・AI寄り |

### 移行の進め方

1. [FastAPIセットアップガイド.md](./FastAPIセットアップガイド.md) に従って環境構築
2. [FastAPI移行計画書.md](./FastAPI移行計画書.md) に従って段階的に移行
3. 各Phaseで動作確認
4. 最終的にNext.js API Routesを削除（任意）

---

**作成日**: 2025-11-01
**最終更新**: 2025-11-01
