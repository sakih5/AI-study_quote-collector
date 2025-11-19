# Backend Tests

FastAPIバックエンドのテストディレクトリです。

## ディレクトリ構成

```
tests/
├── conftest.py              # pytest設定・共有フィクスチャ
├── test_routes/             # APIルートのテスト
│   ├── test_activities.py
│   ├── test_books.py
│   ├── test_quotes.py
│   ├── test_sns_users.py
│   └── test_tags.py
└── test_services/           # サービス層のテスト
    ├── test_ocr_service.py
    ├── test_amazon_scraper.py
    └── test_csv_generator.py
```

## テストの実行

### 全テスト実行

```bash
cd backend
uv run pytest
```

### 特定のファイルのみ実行

```bash
uv run pytest tests/test_routes/test_activities.py
```

### カバレッジ付き実行

```bash
uv run pytest --cov=. --cov-report=html
```

## テストの書き方

### APIルートのテスト例

```python
def test_get_activities(client):
    """活動領域一覧取得のテスト"""
    response = client.get("/api/activities")

    assert response.status_code == 200
    activities = response.json()
    assert len(activities) == 10
```

### 認証が必要なエンドポイントのテスト例

```python
def test_create_quote(client, auth_headers):
    """フレーズ作成のテスト（認証必要）"""
    response = client.post(
        "/api/quotes",
        headers=auth_headers,
        json={"text": "テストフレーズ", "activity_ids": [1, 2]}
    )

    assert response.status_code == 201
```

## TODO

- [ ] Supabaseクライアントのモック実装
- [ ] 認証トークン生成の実装
- [ ] 各エンドポイントの網羅的なテスト
- [ ] サービス層のユニットテスト
- [ ] CI/CDでのテスト自動実行
