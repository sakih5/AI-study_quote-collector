"""
pytest設定ファイル

テスト全体で共有されるフィクスチャや設定を定義します。
"""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """
    FastAPIのTestClientフィクスチャ

    使い方:
        def test_example(client):
            response = client.get("/api/activities")
            assert response.status_code == 200
    """
    return TestClient(app)


@pytest.fixture
def mock_supabase_client(monkeypatch):
    """
    Supabaseクライアントのモック

    使い方:
        def test_example(mock_supabase_client):
            # テスト内でSupabaseへの実際のアクセスがモック化される
            pass
    """
    # TODO: Supabaseクライアントのモック実装
    pass


@pytest.fixture
def auth_headers():
    """
    認証ヘッダーのフィクスチャ

    使い方:
        def test_protected_route(client, auth_headers):
            response = client.get("/api/quotes", headers=auth_headers)
            assert response.status_code == 200
    """
    # TODO: テスト用の認証トークン生成
    return {
        "Authorization": "Bearer test_token_here"
    }
