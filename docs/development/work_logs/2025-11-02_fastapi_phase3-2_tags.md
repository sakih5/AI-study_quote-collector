# FastAPI Phase 3-2: /api/tags 実装作業ログ

**作業日**: 2025-11-02
**作業者**: sakih
**作業時間**: 約3時間
**状態**: ⚠️ 部分完了（重大な問題あり）

---

## 📋 作業概要

FastAPI移行のPhase 3-2として、タグ管理API `/api/tags` の全エンドポイントを実装しました。
しかし、supabase-pyクライアントの動作に問題があり、POST/PUT操作でエラーが発生しています。

---

## ✅ 完了した作業

### 1. Pydanticモデル作成

**ファイル**: `backend/models/tag.py`

以下のモデルを作成：
- `Tag`: 基本タグモデル
- `TagWithMetadata`: メタデータ付きタグモデル（usage_count, activity_distribution）
- `TagCreate`: タグ作成リクエスト
- `TagUpdate`: タグ更新リクエスト
- `TagMerge`: タグ統合リクエスト
- `TagsResponse`: タグ一覧レスポンス
- `TagResponse`: タグ作成・更新レスポンス
- `TagDeleteResponse`: タグ削除レスポンス
- `TagMergeResponse`: タグ統合レスポンス

**ポイント**:
- Next.js側のAPIと同じデータ構造を維持
- usage_countと活動領域別分布をメタデータとして含む

---

### 2. APIルート作成

**ファイル**: `backend/routes/tags.py`

実装したエンドポイント：
1. **GET /api/tags** - タグ一覧取得（✅ 動作確認済み）
2. **POST /api/tags** - タグ作成（❌ エラー発生）
3. **PUT /api/tags/{tag_id}** - タグ更新（❌ エラー発生）
4. **DELETE /api/tags/{tag_id}** - タグ削除（✅ 動作確認済み）
5. **POST /api/tags/{source_tag_id}/merge** - タグ統合（❓ 未確認）

**実装した機能**:
- 検索機能（タグ名で部分一致）
- ソート機能（created_at, name, usage_count）
- タグ名の自動#付与
- 削除済みタグの復活機能
- タグ統合時の重複処理

---

### 3. main.pyへルーター登録

**ファイル**: `backend/main.py`

```python
from routes import activities, tags

app.include_router(activities.router)
app.include_router(tags.router)
```

---

### 4. 動作確認（部分的）

#### ✅ 成功したエンドポイント

**GET /api/tags**:
```bash
curl -X GET "http://localhost:8000/api/tags" \
  -H "Authorization: Bearer TOKEN"
```

**結果**: 8件のタグを正常に取得

**DELETE /api/tags/{id}**:
- ソフトデリート機能が正常に動作

---

## 🐛 発生した問題

### 問題: supabase-pyクライアントの動作不良

**エラーメッセージ**:
```
AttributeError: 'SyncQueryRequestBuilder' object has no attribute 'select'
```

**発生箇所**: POST /api/tags, PUT /api/tags/{id}

**調査結果**:

1. **デバッグログから判明した事実**:
   ```python
   [DEBUG] supabase type: <class 'supabase._sync.client.SyncClient'>
   [DEBUG] supabase.table type: <class 'method'>
   [DEBUG] table object type: <class 'postgrest._sync.request_builder.SyncRequestBuilder'>
   ```

2. **問題の詳細**:
   - `supabase.table('tags')` が `SyncRequestBuilder` を返している
   - しかし、この段階では `.select()` メソッドが使えない
   - GET /api/tags では正常に動作するが、POST では失敗する

3. **試した解決策**（すべて失敗）:
   - ✗ `.is_('deleted_at', None)` の使用（正しい構文）
   - ✗ `.not_.is_('deleted_at', None)` の使用
   - ✗ `.neq('deleted_at', None)` の使用
   - ✗ Python側でフィルタリング（全タグ取得後）
   - ✗ `supabase.postgrest.auth(token)` の削除
   - ✗ デバッグログの削除

4. **根本原因の推測**:
   - `auth.py` の `get_current_user` で `supabase.postgrest.auth(token)` を呼んでいる
   - これにより、Supabaseクライアントの内部状態が変わっている可能性
   - しかし、この呼び出しを削除してもエラーが解消しない

---

### 試行したデバッグ方法

1. **サーバーの再起動**:
   ```bash
   lsof -ti:8000 | xargs kill -9
   uvicorn main:app --reload --port 8000
   ```

2. **デバッグログの追加**:
   - `type(supabase)`, `type(supabase.table)` の確認
   - `dir(table_obj)` でメソッド一覧を取得

3. **curlでの直接テスト**:
   - GET: 成功
   - POST: 失敗
   - DELETE: 成功

---

## 📊 進捗状況

### 完了したフェーズ

| Phase | タスク | 進捗 | 状態 |
|-------|--------|------|------|
| Phase 1 | 環境構築 | 100% | ✅ 完了 |
| Phase 2 | 認証基盤 | 100% | ✅ 完了 |
| Phase 3-1 | /api/activities | 100% | ✅ 完了 |
| Phase 3-2 | /api/tags | 40% | ⚠️ ブロック中 |

**Phase 3-2の内訳**:
- コード実装: 100%
- GET動作確認: 100%
- POST/PUT動作確認: 0%（エラー発生）
- DELETE動作確認: 100%
- MERGE動作確認: 0%

---

## 🔍 現在の状態

### 動作するエンドポイント
- ✅ GET /api/tags
- ✅ DELETE /api/tags/{id}

### 動作しないエンドポイント
- ❌ POST /api/tags
- ❌ PUT /api/tags/{id}
- ❓ POST /api/tags/{id}/merge（未確認）

### コードの品質
- ✅ Pydanticモデル: 完成
- ✅ エラーハンドリング: 実装済み
- ✅ ドキュメント: Swagger UIに自動生成
- ⚠️ 動作確認: 部分的のみ

---

## 🤔 考察

### なぜGETは成功してPOSTは失敗するのか？

1. **推測1: リクエストごとのクライアント状態**
   - GET: シンプルなクエリのみ
   - POST: 複数のクエリを実行（重複チェック → 削除タグチェック → 作成/復活）
   - 複数クエリの実行で内部状態が壊れている可能性

2. **推測2: supabase-pyのバージョン問題**
   - 使用中: supabase-py 2.0.0
   - 最新版との互換性問題の可能性

3. **推測3: 依存性注入の問題**
   - `Depends(get_supabase_client)` で取得したクライアント
   - 複数のエンドポイント間で状態が共有されている可能性

---

## 💡 今後の方針

### オプション1: supabase-pyのバージョン確認・更新
```bash
pip list | grep supabase
pip install --upgrade supabase
```

### オプション2: 直接HTTPクライアントでPostgRESTを呼ぶ
- supabase-pyを使わず、`httpx`で直接PostgRESTを呼ぶ
- より低レベルだが、制御しやすい

### オプション3: クライアントの初期化方法を変更
- リクエストごとに新しいクライアントを作成
- 状態の共有を避ける

### オプション4: Next.js APIとの併用
- しばらくNext.js側のタグAPIを使い続ける
- FastAPIは他のエンドポイントから実装

---

## 📁 作成・更新したファイル

### 新規作成

```
backend/
├── models/
│   └── tag.py              # Pydanticモデル
└── routes/
    └── tags.py             # APIルート（動作に問題あり）
```

### 更新

```
backend/
├── main.py                 # tagsルーター登録
└── auth.py                 # デバッグと試行錯誤
```

### ドキュメント

```
docs/development/work_logs/
└── 2025-11-02_fastapi_phase3-2_tags.md  # 本ファイル
```

---

## 🔧 技術スタック

| カテゴリ | ライブラリ | バージョン | 状態 |
|---------|----------|-----------|------|
| Webフレームワーク | FastAPI | 0.104.1 | ✅ 正常 |
| バリデーション | Pydantic | 2.5.0 | ✅ 正常 |
| Supabaseクライアント | supabase-py | 2.0.0 | ⚠️ 問題あり |

---

## 📝 メモ・気づき

1. **supabase-pyの癖**
   - JavaScriptクライアントとは挙動が異なる
   - ドキュメントが不十分
   - エラーメッセージがわかりにくい

2. **FastAPIの依存性注入**
   - 複数のエンドポイントで同じクライアントインスタンスを共有
   - 状態が壊れる可能性がある

3. **デバッグの難しさ**
   - エラーが発生する箇所と原因が異なる
   - ログだけでは問題を特定しづらい

4. **時間の消費**
   - 単純なCRUD実装のつもりが、3時間かかっても解決せず
   - ライブラリの問題に対処するのは予想以上に時間がかかる

---

## 🚀 次回の作業予定

### 優先度1: 問題の根本解決

**選択肢A: supabase-pyのバージョン確認・更新**
- 所要時間: 30分
- リスク: 低
- 成功率: 中

**選択肢B: 直接PostgRESTを呼ぶ実装に変更**
- 所要時間: 2時間
- リスク: 中
- 成功率: 高

**選択肢C: Next.js APIを継続使用**
- 所要時間: 0分
- リスク: なし（現状維持）
- 成功率: N/A

### 優先度2: 他のエンドポイントの実装継続

Phase 3-2をスキップして、先に進む：
- Phase 3-3: /api/books
- Phase 3-4: /api/sns-users
- Phase 3-5: /api/quotes

後でタグAPIの問題に戻る。

---

## ❓ ユーザーへの質問

1. **タグAPI の実装を続けるべきか？**
   - A: 問題を解決してから次へ（時間がかかる可能性）
   - B: 一旦スキップして他のAPIを先に実装

2. **解決方法の選択**
   - A: supabase-pyのバージョンアップを試す
   - B: 直接PostgRESTを呼ぶ実装に変更
   - C: しばらくNext.js APIを使い続ける

3. **作業の優先度**
   - タグ管理機能は重要か？（ユーザーが頻繁に使う機能か？）
   - 他のAPIの方が優先度が高いか？

---

---

## 🚦 次回作業再開時の手順

### 1. 現状の確認

**動作するエンドポイント**:
```bash
# GET /api/tags - タグ一覧取得
curl -X GET "http://localhost:8000/api/tags" \
  -H "Authorization: Bearer YOUR_TOKEN"

# DELETE /api/tags/{id} - タグ削除
curl -X DELETE "http://localhost:8000/api/tags/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**動作しないエンドポイント**:
```bash
# POST /api/tags - タグ作成（エラー発生）
curl -X POST "http://localhost:8000/api/tags" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "テスト"}'
```

**エラー内容**:
```
AttributeError: 'SyncQueryRequestBuilder' object has no attribute 'select'
```

---

### 2. 次回の判断ポイント

以下の3つの選択肢から選んでください：

#### 選択肢A: supabase-pyの問題解決を優先

**実施内容**:
1. supabase-pyのバージョン確認・アップデート
   ```bash
   cd /home/sakih/projects/AI-study_quote-collector/backend
   source .venv/bin/activate
   pip list | grep supabase
   pip install --upgrade supabase
   ```

2. supabase-pyの公式ドキュメント・GitHubイシューを確認
   - https://github.com/supabase-community/supabase-py

3. 最悪の場合、直接PostgRESTを呼ぶ実装に変更

**所要時間**: 1〜2時間
**リスク**: 解決しない可能性あり

---

#### 選択肢B: タグAPIをスキップして次のAPIへ

**実施内容**:
1. Phase 3-3: /api/books の実装
2. Phase 3-4: /api/sns-users の実装
3. Phase 3-5: /api/quotes の実装
4. 後でタグAPIの問題に戻る

**メリット**:
- 進捗を止めない
- 他のAPIで同じ問題が起きるか確認できる
- タグAPIはNext.js側が使えるので、影響は限定的

**所要時間**: スキップ（すぐに次へ）
**リスク**: なし

---

#### 選択肢C: タグAPIはNext.jsを継続使用

**実施内容**:
- FastAPIでは他のAPIのみ実装
- タグAPIはNext.js側を使い続ける
- 問題が解決したら移行

**メリット**:
- 時間を無駄にしない
- 実用的な解決策

**所要時間**: 0分
**リスク**: なし

---

### 3. サーバー起動方法

次回作業時は以下のコマンドでサーバーを起動してください：

#### FastAPI起動
```bash
cd /home/sakih/projects/AI-study_quote-collector/backend
source .venv/bin/activate

# 既存プロセスを停止
lsof -ti:8000 | xargs kill -9 2>/dev/null

# サーバー起動
uvicorn main:app --reload --port 8000
```

#### Next.js起動（別ターミナル）
```bash
cd /home/sakih/projects/AI-study_quote-collector
npm run dev
```

#### トークン取得（ブラウザコンソール）
```javascript
fetch('/api/get-token').then(res => res.json()).then(data => {
  console.log('トークン:', data.access_token);
});
```

---

### 4. 問題の再現方法

1. サーバー起動後、Swagger UIにアクセス
   ```
   http://localhost:8000/docs
   ```

2. 「Authorize」でトークンを設定

3. POST /api/tags を実行
   ```json
   {
     "name": "テスト"
   }
   ```

4. エラーを確認
   ```
   AttributeError: 'SyncQueryRequestBuilder' object has no attribute 'select'
   ```

---

### 5. デバッグ方法

問題解決を試みる場合は、以下のデバッグ方法を使用：

```bash
# ログファイルを確認
tail -f /tmp/fastapi.log | grep -E "DEBUG|ERROR"

# supabase-pyのバージョン確認
pip show supabase

# Python環境の確認
pip list
```

---

## 📌 重要な判断

**推奨**: 選択肢Bまたは選択肢C

理由：
1. タグAPI以外のエンドポイントでも同じ問題が起きるか確認する必要がある
2. もし他のAPIで問題が起きなければ、タグAPI固有の問題として切り分けられる
3. もし他のAPIでも問題が起きれば、supabase-pyの根本的な問題として対処が必要

**次回の最初のステップ**:
1. /api/books の実装を開始（Phase 3-3）
2. 同じsupabase-pyクライアントを使って動作確認
3. 問題が再現するかチェック
4. 再現しなければ、タグAPI固有の問題として切り分け

---

## 🗂️ 関連ファイル

**実装済み**:
- `backend/models/tag.py` - Pydanticモデル（完成）
- `backend/routes/tags.py` - APIルート（部分動作）
- `backend/main.py` - ルーター登録済み

**参考**:
- `app/api/tags/route.ts` - Next.js側のタグAPI（動作中）
- `backend/routes/activities.py` - 正常動作している参考実装
- `backend/auth.py` - 認証モジュール

---

## 💭 最終コメント

3時間かけても解決できなかったsupabase-pyの問題ですが、以下の可能性があります：

1. **ライブラリのバグ**: supabase-py 2.0.0の既知の問題
2. **使い方の問題**: ドキュメント化されていない正しい使い方がある
3. **依存性注入の問題**: FastAPIのDependsとsupabase-pyの相性問題
4. **環境固有の問題**: 特定のPythonバージョンやOS環境での問題

いずれにせよ、**進捗を止めるべきではない**ので、他のAPIの実装を優先することを強く推奨します。

---

**作成日**: 2025-11-02
**最終更新**: 2025-11-02（次回再開用の情報追加）
**FastAPI Phase 3-2: 部分完了（問題あり）**
**次回アクション**: Phase 3-3 (/api/books) の実装を推奨
