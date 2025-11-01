# 学習ガイド - 抜き書きアプリ

このディレクトリには、Next.jsとTypeScriptを学びながらこのプロジェクトを理解するためのガイドが含まれています。

## 📚 目次

### 基礎編

1. **[Next.jsとTypeScriptの基礎](./01_basics.md)**
   - Next.jsとは？
   - TypeScriptとは？
   - なぜこの技術を使うのか？

2. **[プロジェクト構造の理解](./02_project_structure.md)**
   - ディレクトリ構成
   - ファイルの役割
   - 命名規則

3. **[データの流れ](./03_data_flow.md)**
   - フロントエンドとバックエンド
   - APIの仕組み
   - データベース連携

### ファイル読み解き編

4. **[型定義ファイル](./04_types_file.md)**
   - `lib/supabase/types.ts`
   - データの形を理解する

5. **[シンプルなコンポーネント](./05_header_component.md)**
   - `app/(main)/components/Header.tsx`
   - Reactコンポーネントの基本

6. **[APIファイル](./06_api_activities.md)**
   - `app/api/activities/route.ts`
   - REST APIの実装

7. **画面ファイル**（予定）
   - `app/(main)/page.tsx`
   - ページの構成

8. **複雑なコンポーネント**（予定）
   - `app/(main)/components/QuoteModal.tsx`
   - 状態管理とフォーム

### 補足資料

- **[なぜTypeScript？FastAPIとの比較](./appendix_typescript_vs_fastapi.md)**
  - TypeScriptとPython FastAPIの比較
  - このプロジェクトでTypeScriptを選んだ理由
  - どちらを選ぶべきか？

## 🎯 学習の進め方

### 推奨順序

1. **基礎編を順番に読む**（1→2→3）
   - まず全体像を理解することが重要です

2. **ファイル読み解き編を進める**（4→5→6→7→8）
   - 実際のコードを見ながら理解を深めます

3. **自分で機能を追加してみる**
   - 学んだことを活かして新機能を実装

### 学習時間の目安

- **基礎編**: 30分〜1時間
- **ファイル読み解き編**: 各30分〜1時間
- **合計**: 4〜6時間

## 💡 学習のコツ

1. **焦らず1つずつ理解する**
   - 分からないことがあったら、そのたびに調べる

2. **実際にコードを動かしてみる**
   - 読むだけでなく、実際に変更して動作を確認

3. **エラーを恐れない**
   - エラーは学びのチャンス

4. **メモを取る**
   - 理解したことを自分の言葉で書き留める

## 🔗 参考リンク

### 公式ドキュメント

- [Next.js 公式ドキュメント](https://nextjs.org/docs)
- [TypeScript 公式ドキュメント](https://www.typescriptlang.org/docs/)
- [React 公式ドキュメント](https://react.dev/)
- [Supabase 公式ドキュメント](https://supabase.com/docs)
- [Tailwind CSS 公式ドキュメント](https://tailwindcss.com/docs)

### 日本語リソース

- [Next.js 日本語ドキュメント（非公式）](https://ja.next-community-docs.dev/)
- [TypeScript Deep Dive 日本語版](https://typescript-jp.gitbook.io/deep-dive/)
- [React チュートリアル（日本語）](https://ja.react.dev/learn)

## 📝 このプロジェクトについて

このプロジェクトは、書籍やSNSから重要なフレーズを記録・整理するための個人用ナレッジベースアプリです。

### 主な機能

- フレーズの登録・編集・削除
- 活動領域とタグによる分類
- キーワード検索とフィルタリング
- OCR機能（画像からテキスト抽出）
- CSVエクスポート
- タグ管理

### 使用技術

- **フロントエンド**: Next.js 14, React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Supabase
- **データベース**: PostgreSQL (Supabase)
- **認証**: Supabase Auth (Google, GitHub, Email)
- **OCR**: Tesseract.js

---

**作成日**: 2025-11-01
**最終更新**: 2025-11-01
