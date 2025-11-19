# uvパッケージマネージャー完全移行作業ログ

**日付**: 2025-11-19
**作業者**: Claude Code
**目的**: pipからuvへの移行、PaddleOCR関連クリーンアップ、依存関係競合解決

## 背景

### 移行前の状態

**パッケージ管理の混乱:**
- `pyproject.toml` が存在（uv/pip-tools用）
- `requirements.lock` が存在（元はuvで生成、その後手動編集）
- `requirements.lock.backup` にPaddleOCR依存関係が残存
- Docker環境ではpip使用、ローカル環境ではREADMEにuv記載（実際には動作しない）

**課題:**
1. **依存関係競合**: httpx==0.25.2（dev依存）とsupabase>=2.10.0（httpx>=0.26要求）が競合
2. **ツール不統一**: Docker（pip）とローカル（uv想定）で異なる
3. **PaddleOCR残存**: Tesseractに切り替え済みだがファイルに痕跡
4. **環境再現性**: uv.lockが存在せず、依存関係の固定が不完全

### 移行方針

1. **pyproject.tomlを修正**して依存競合を解決
2. **uv lockで正式なuv.lockを生成**
3. **Dockerfileをuvベースに書き換え**
4. **README.mdを統一**
5. **不要ファイルを削除**（requirements.lock系、PaddleOCR痕跡）

## 実施内容

### 1. pyproject.toml の依存関係修正

#### 変更前

```toml
[project.optional-dependencies]
dev = [
    "pytest==7.4.3",
    "httpx==0.25.2",  # ← supabase>=2.10.0と競合
]
```

**競合内容:**
- supabase>=2.10.0 は httpx>=0.26 を要求
- dev依存でhttpx==0.25.2を固定していた

#### 変更後

```toml
[project.optional-dependencies]
dev = [
    "pytest>=7.4.3",   # ← バージョン固定を緩和
    "httpx>=0.26.0",   # ← supabaseと互換性のあるバージョンに変更
]
```

**修正理由:**
- バージョン範囲を緩和することで、uvが柔軟に解決可能に
- httpx>=0.26.0でsupabaseの要求を満たす

### 2. uv.lock の生成

#### 実行コマンド

```bash
cd backend
uv lock
```

#### 結果

```
Using CPython 3.12.11 interpreter at: /home/sakih/.pyenv/versions/3.12.11/bin/python3.12
Resolved 62 packages in 250ms
```

**生成されたファイル:**
- `backend/uv.lock` (315KB)
- 62パッケージの完全な依存グラフを記録
- クロスプラットフォーム対応（Linux/macOS/Windows）

**主要パッケージ:**
- fastapi==0.121.2
- uvicorn==0.38.0
- supabase==2.24.0
- pytesseract==0.3.13（PaddleOCRから置き換え済み）
- httpx==0.28.1（競合解決済み）

### 3. Dockerfile のuvベース書き換え

#### Stage 1: Build stage

**変更前（pipベース）:**
```dockerfile
# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY requirements.lock ./

# Create virtual environment and install dependencies
RUN python -m venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.lock
```

**変更後（uvベース）:**
```dockerfile
# Install system dependencies and uv
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh

# Add uv to PATH
ENV PATH="/root/.local/bin:$PATH"

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv (without installing the project itself)
RUN uv sync --frozen --no-dev --no-install-project
```

**重要ポイント:**
- `--frozen`: uv.lockを厳密に再現（再解決しない）
- `--no-dev`: dev依存を除外（本番環境）
- `--no-install-project`: パッケージ自体はインストールせず依存のみ（COPYで後から追加）

#### トラブルシューティング: hatchling エラー

**初回ビルド時のエラー:**
```
ValueError: Unable to determine which files to ship inside the wheel
The most likely cause is that there is no directory that matches the name of your project (quote_api).
```

**原因:**
- `uv sync`がプロジェクト自体をeditable installしようとした
- backend/配下にquote_api/ディレクトリが存在しない（フラット構造）
- hatchlingがパッケージ構造を認識できなかった

**解決策:**
- `--no-install-project`フラグを追加
- 依存関係のみインストールし、アプリコードは`COPY . .`で後から追加

#### Stage 2: Runtime stage

変更なし（既存のまま）:
```dockerfile
FROM python:3.12-slim AS runner

# Install Tesseract OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-jpn \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY . .

# ... (以下同じ)
```

### 4. README.md の統一

#### バックエンド起動セクション

**変更前（実際には動作しない記述）:**
```bash
cd backend
uv sync
uv run uvicorn main:app --reload
```

**変更後（コメント追加）:**
```bash
cd backend
uv sync  # 依存関係をインストール（初回のみ）
uv run uvicorn main:app --reload
```

#### テストコマンド

**変更前:**
```bash
pytest
pytest -v
pytest --cov
```

**変更後（uvで実行）:**
```bash
uv run pytest
uv run pytest -v
uv run pytest --cov
```

**理由:** uvの仮想環境を使用するため、`uv run`経由で実行

### 5. 不要ファイルの削除

#### 削除対象

```bash
rm -v requirements.lock requirements.lock.backup
```

**削除されたファイル:**
- `requirements.lock` (912 bytes) - 手動編集されたpip形式ファイル
- `requirements.lock.backup` (4985 bytes) - PaddleOCR依存266行含む

#### PaddleOCR痕跡の確認

```bash
# コードベース内のPaddleOCR参照を検索
grep -ri "paddle" --exclude-dir=.venv
# → requirements.lock.backupのみヒット（削除済み）
```

**結果:** ソースコードからPaddleOCR関連は完全に削除済み

### 6. Docker環境での検証

#### ビルド成功

```bash
$ docker compose build backend
...
#10 [builder 5/5] RUN uv sync --frozen --no-dev --no-install-project
#10 0.399 Using CPython 3.12.12 interpreter at: /usr/local/bin/python3
#10 0.399 Creating virtual environment at: .venv
#10 1.061 Prepared 56 packages in 651ms
#10 1.112 Installed 56 packages in 50ms
#10 1.112  + annotated-doc==0.0.4
#10 1.112  + fastapi==0.121.2
#10 1.112  + supabase==2.24.0
#10 1.112  + pytesseract==0.3.13
#10 1.112  + httpx==0.28.1
#10 1.112  ... (以下省略)
#10 DONE 1.2s
```

**インストールされたパッケージ:** 56個（dev依存を除く）

#### 起動確認

```bash
$ docker compose up -d
$ docker compose ps

NAME                                  STATUS
ai-study_quote-collector-backend-1    Up (healthy)
ai-study_quote-collector-frontend-1   Up
```

#### エンドポイントテスト

```bash
$ curl http://localhost:8000/health
{"status":"healthy"}

$ docker compose logs backend --tail 10
backend-1  | INFO:     Uvicorn running on http://0.0.0.0:8000
backend-1  | Environment: development
backend-1  | Supabase URL: https://rrtcpgizbgghxylhnvtu.supabase.co
backend-1  | INFO:     Application startup complete.
```

## 成果

### ✅ 達成されたこと

1. **パッケージ管理の統一**
   - Docker環境もローカル環境もuvに統一
   - `uv sync`一発で環境再現可能

2. **依存関係競合の解決**
   - httpxバージョン競合を完全解決
   - uv.lockで厳密な依存グラフを記録

3. **PaddleOCRクリーンアップ**
   - requirements.lock.backup削除（266行のPaddleOCR依存）
   - Tesseractへの完全移行完了

4. **ビルド時間短縮**
   - pip: 約3-5秒（requirements.lock 53行）
   - uv: 約1.2秒（56パッケージ）
   - uvの並列ダウンロードで高速化

5. **開発体験向上**
   - `uv add <package>` で即座に依存追加
   - `uv lock` で自動的にuv.lock更新
   - pip-compile不要

### パッケージ数比較

| 管理方法 | パッケージ数 | ファイルサイズ | 特徴 |
|---------|------------|--------------|------|
| requirements.lock | 53 | 912 bytes | 手動編集、コメントなし |
| requirements.lock.backup | 266 | 4985 bytes | PaddleOCR含む、uv生成 |
| uv.lock | 62 | 315 KB | 完全な依存グラフ、ハッシュ付き |

**uv.lockが大きい理由:**
- 全パッケージのメタデータ（バージョン、ハッシュ、依存関係）を含む
- クロスプラットフォーム対応（OS別の依存も記録）
- ロックファイルの完全性保証

## トラブルシューティング

### 問題1: hatchlingビルドエラー

**エラー:**
```
ValueError: Unable to determine which files to ship inside the wheel
```

**原因:** `uv sync`がプロジェクト自体をインストールしようとした

**解決策:** `--no-install-project`フラグ追加

### 問題2: httpx依存競合（移行前の問題）

**エラー:**
```
quote-api[dev] depends on httpx==0.25.2 and supabase>=2.10.0 are incompatible
```

**原因:** dev依存でhttpx==0.25.2を固定、supabaseはhttpx>=0.26が必要

**解決策:** pyproject.tomlでhttpx>=0.26.0に変更

## ファイル変更サマリー

| ファイル | 変更内容 | サイズ |
|---------|---------|--------|
| `backend/pyproject.toml` | httpx依存修正 | 629 bytes |
| `backend/uv.lock` | 新規作成 | 315 KB |
| `backend/Dockerfile` | uvベースに書き換え | 1.67 KB |
| `README.md` | uvコマンドに統一 | 更新 |
| `requirements.lock` | 削除 | - |
| `requirements.lock.backup` | 削除（PaddleOCR痕跡） | - |

## uvの主要コマンド

### 依存関係管理

```bash
# 依存をインストール（uv.lockから）
uv sync

# 依存を追加
uv add <package>

# dev依存を追加
uv add --dev <package>

# 依存を削除
uv remove <package>

# uv.lockを更新
uv lock

# 依存ツリーを表示
uv tree
```

### アプリケーション実行

```bash
# Pythonスクリプト実行
uv run python script.py

# uvicorn実行
uv run uvicorn main:app --reload

# pytest実行
uv run pytest
```

### Docker環境での使用

```dockerfile
# 依存のみインストール（本番）
RUN uv sync --frozen --no-dev --no-install-project

# 依存のみインストール（開発）
RUN uv sync --frozen --no-install-project
```

## uvのメリット

1. **高速**: Rustで書かれており、pipより10-100倍高速
2. **厳密な依存解決**: uv.lockで完全なグラフを記録
3. **統一ツール**: add/remove/run すべてuvで完結
4. **モダン**: pyproject.toml標準対応、PEP準拠
5. **デバッグ容易**: 依存競合時のエラーメッセージが明確

## 参考リンク

- [uv Documentation](https://docs.astral.sh/uv/)
- [uv GitHub Repository](https://github.com/astral-sh/uv)
- [Python Packaging Guide](https://packaging.python.org/)
- [PEP 621 - pyproject.toml](https://peps.python.org/pep-0621/)

## 次のステップ

- [ ] CI/CDでuvキャッシュを活用（高速化）
- [ ] pre-commit hookでuv lockチェック（自動更新）
- [ ] uvの定期的なバージョンアップ（機能追加・高速化）
