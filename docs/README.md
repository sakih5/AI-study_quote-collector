# ドキュメント

抜き書きアプリのドキュメント一覧です。

## 📋 コア設計書（v2: 現行仕様）

プロジェクトの正式な設計ドキュメントです。CLAUDE.mdで参照されています。

- [要件定義書 v2](./specs/要件定義書_v2.md) - 機能要件・非機能要件
- [画面設計書 v2（実装版）](./specs/画面設計書_実装版_v2.md) - UI/UX仕様
- [API設計書 v2](./specs/API設計書_v2.md) - REST API仕様
- [データベース設計書 v2](./specs/データベース設計書_v2.md) - スキーマ定義・RLS
- [技術仕様書 v2](./specs/技術仕様書_v2.md) - 実装詳細・技術選定

## 🚀 デプロイメント

デプロイに関するガイドです。

- [デプロイメント概要](./deployment/README.md) - デプロイ全般の説明
- [Vercelデプロイガイド](./deployment/VERCEL_DEPLOYMENT.md) - フロントエンドのデプロイ
- [FastAPIデプロイガイド](./deployment/FASTAPI_DEPLOYMENT.md) - バックエンドのデプロイ（v3想定）
- [Cloud Runデプロイガイド](./deployment/デプロイガイド_CloudRun.md) - GCP Cloud Runへのデプロイ
- [環境変数設定](./deployment/ENVIRONMENT_VARIABLES.md) - 環境変数の説明

## 🛠️ 開発ガイド

開発に役立つドキュメントです。

- [クイックスタート](./development/QUICKSTART.md) - 開発環境のセットアップ
- [進捗管理](./development/PROGRESS.md) - プロジェクトの進捗状況
- [作業ログ](./development/work_logs/) - 日々の開発ログ

## 📚 学習リソース

プロジェクトの理解を深めるための学習資料です。

- [学習資料インデックス](./learning/README.md) - 学習資料の概要
- [01: 基礎知識](./learning/01_basics.md)
- [02: プロジェクト構造](./learning/02_project_structure.md)
- [03: データフロー](./learning/03_data_flow.md)
- [04: Typesファイル](./learning/04_types_file.md)
- [05: Headerコンポーネント](./learning/05_header_component.md)
- [06: Activities API](./learning/06_api_activities.md)
- [付録: TypeScript vs FastAPI](./learning/appendix_typescript_vs_fastapi.md)
- [付録: uv Python Tools](./learning/appendix_uv_python_tools.md)

## 📦 アーカイブ

過去の検討資料や移行計画です。

### FastAPI移行関連（v3検討）

- [FastAPI移行計画書](./archive/fastapi-migration/FastAPI移行計画書.md)
- [API設計書 v3（FastAPI補足）](./archive/fastapi-migration/API設計書_v3_FastAPI補足.md)
- [技術仕様書 v3（FastAPI）](./archive/fastapi-migration/技術仕様書_v3_FastAPI.md)
- [FastAPIセットアップガイド](./archive/fastapi-migration/FastAPIセットアップガイド.md)

## 🖼️ アセット

画像などの静的リソースです。

- [images/](./assets/images/) - スクリーンショット、図表など

---

## ドキュメント構成について

このドキュメント群は以下のように整理されています：

- **specs/**: プロジェクトの正式仕様（CLAUDE.mdから参照）
- **deployment/**: デプロイ関連ドキュメント
- **development/**: 開発者向けガイド
- **learning/**: 学習・理解促進のための資料
- **archive/**: 過去の検討資料・移行計画
- **assets/**: 画像などの静的ファイル

新しいドキュメントを追加する際は、適切なディレクトリに配置し、このREADME.mdも更新してください。
