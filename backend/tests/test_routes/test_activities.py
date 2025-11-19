"""
活動領域API（/api/activities）のテスト
"""

import pytest
from fastapi.testclient import TestClient


def test_get_activities(client):
    """
    GET /api/activities - 活動領域一覧取得のテスト

    期待される動作:
    - ステータスコード200
    - 10件の活動領域が返される
    - 各活動領域にid, name, icon, display_orderが含まれる
    """
    response = client.get("/api/activities")

    assert response.status_code == 200

    activities = response.json()
    assert len(activities) == 10

    # 最初の活動領域の構造を確認
    first_activity = activities[0]
    assert "id" in first_activity
    assert "name" in first_activity
    assert "icon" in first_activity
    assert "display_order" in first_activity


def test_activities_are_sorted(client):
    """
    活動領域がdisplay_order順にソートされていることを確認
    """
    response = client.get("/api/activities")
    activities = response.json()

    # display_orderが昇順になっているか確認
    for i in range(len(activities) - 1):
        assert activities[i]["display_order"] <= activities[i + 1]["display_order"]


# TODO: 他のテストケース
# - 特定の活動領域の取得
# - エラーハンドリング
