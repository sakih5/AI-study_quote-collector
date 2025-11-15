# CSVエクスポート修正と利用規約ページの追加

**日付**: 2025-11-16
**作業者**: Claude Code
**関連Issue**: CSVエクスポート404エラー、利用規約ページの実装

## 概要

以下2つの改善を実施した：
1. CSVエクスポート機能の404エラーを修正し、FastAPIバックエンドからCSVをダウンロードできるようにした
2. 利用規約ページを作成し、ログイン画面からリンクできるようにした

## 実施内容

### 1. CSVエクスポート機能の修正

#### 問題

CSVエクスポートボタンをクリックすると `/api/export/csv` に画面遷移して404エラーが発生していた。

**原因**:
- フロントエンドが `window.location.href` を使用してNext.jsのAPIルート（`/api/export/csv`）にアクセスしようとしていた
- しかし、実際のAPIはFastAPIバックエンドに存在する
- 認証トークンが渡されていなかった

#### 修正内容

**ファイル**: `app/(main)/my-quotes/page.tsx`

**変更前**:
```typescript
const handleExportCsv = () => {
  const params = new URLSearchParams();
  // パラメータ構築...

  const url = `/api/export/csv${params.toString() ? '?' + params.toString() : ''}`;
  window.location.href = url;
};
```

問題点:
- Next.jsのAPIルート（`/api/export/csv`）を使用していた
- `window.location.href` では認証トークンを渡せない

**変更後**:
```typescript
const handleExportCsv = async () => {
  try {
    // クエリパラメータを構築
    const params = new URLSearchParams();

    if (searchQuery) {
      params.append('search', searchQuery);
    }

    if (selectedActivityIds.length > 0) {
      params.append('activity_ids', selectedActivityIds.join(','));
    }

    if (selectedTagIds.length > 0) {
      params.append('tag_ids', selectedTagIds.join(','));
    }

    // FastAPI URLを使用
    const apiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || '';
    const url = `${apiUrl}/api/export/csv${params.toString() ? '?' + params.toString() : ''}`;

    // fetchで認証付きリクエスト
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      alert('認証が必要です。ログインしてください。');
      return;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error('CSVエクスポートに失敗しました');
    }

    // Blobとして取得
    const blob = await response.blob();

    // ダウンロード用のリンクを作成
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;

    // Content-Dispositionヘッダーからファイル名を取得
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'quotes.csv';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('CSVエクスポートエラー:', error);
    alert(error instanceof Error ? error.message : 'CSVエクスポートに失敗しました');
  }
};
```

#### 改善ポイント

1. **FastAPI URLの使用**:
   ```typescript
   const apiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || '';
   const url = `${apiUrl}/api/export/csv${params.toString() ? '?' + params.toString() : ''}`;
   ```
   環境変数からFastAPIのURLを取得して使用。

2. **認証トークンの付与**:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();

   const response = await fetch(url, {
     headers: {
       'Authorization': `Bearer ${session.access_token}`
     }
   });
   ```
   Supabaseセッションからアクセストークンを取得し、Authorizationヘッダーに含める。

3. **Blobダウンロードの実装**:
   ```typescript
   const blob = await response.blob();
   const downloadUrl = window.URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = downloadUrl;
   link.download = filename;
   link.click();
   ```
   `window.location.href`ではなく、fetchでBlobを取得してプログラマティックにダウンロード。
   これにより、認証トークンを含むリクエストが可能。

4. **ファイル名の自動取得**:
   ```typescript
   const contentDisposition = response.headers.get('Content-Disposition');
   let filename = 'quotes.csv';
   if (contentDisposition) {
     const filenameMatch = contentDisposition.match(/filename="(.+)"/);
     if (filenameMatch) {
       filename = filenameMatch[1];
     }
   }
   ```
   バックエンドが返す`Content-Disposition`ヘッダーからファイル名を抽出。
   フォールバックとして`quotes.csv`を使用。

5. **エラーハンドリング**:
   - セッションがない場合のアラート
   - レスポンスエラーのキャッチ
   - ユーザーフレンドリーなエラーメッセージ

#### バックエンドAPI（既存）

`backend/routes/export.py` には既にCSVエクスポートAPIが実装されている：

```python
@router.get("/csv")
async def export_quotes_csv(
    search: str = Query("", description="検索キーワード（フレーズテキスト）"),
    source_type: str = Query("", description="出典タイプ（BOOK, SNS, OTHER）"),
    activity_ids: str = Query("", description="活動領域ID（カンマ区切り）"),
    tag_ids: str = Query("", description="タグID（カンマ区切り）"),
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    # フレーズを取得してフィルタリング
    # CSV生成
    csv_content = generate_csv_from_quotes(quotes)
    filename = generate_csv_filename()

    return Response(
        content=csv_content.encode('utf-8'),
        media_type='text/csv; charset=utf-8',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
    )
```

このAPIはSupabaseの認証トークン（Bearer）を必要とする。

---

### 2. 利用規約ページの作成とリンク追加

#### 要件

- ログイン画面の但し書き「ログインすることで、利用規約に同意したものとみなされます」の「利用規約」部分に下線を引いて、リンクとして機能させる
- 利用規約ページは、アプリの現状を踏まえた実現可能で簡潔な内容

#### 実装内容

##### 2.1 利用規約ページの作成

**ファイル**: `app/terms/page.tsx`（新規作成）

利用規約ページを作成。以下の条文を含む：

1. **第1条（はじめに）**: 本規約の適用範囲
2. **第2条（サービス概要）**: アプリの機能説明
   - フレーズの登録・編集・削除
   - 活動領域やタグによる分類
   - 検索機能
   - CSVエクスポート
   - OCR機能
   - フレーズの公開設定

3. **第3条（アカウント登録）**:
   - メールアドレス/パスワード、またはOAuth（Google/GitHub）による登録
   - 正確な情報提供の責任

4. **第4条（ユーザーの責任）**:
   - アカウント情報の管理
   - 著作権・プライバシー権の尊重
   - 他ユーザーへの配慮
   - 公開フレーズの内容責任

5. **第5条（禁止事項）**:
   - 法令違反行為
   - 第三者の権利侵害
   - 運営妨害行為
   - 不正アクセス
   - なりすまし行為

6. **第6条（データの取り扱い）**:
   - Supabase（PostgreSQL）での安全な保管
   - 公開/非公開設定の動作
   - 個人情報の第三者非開示

7. **第7条（著作権）**:
   - 元の著作物の著作権者への帰属
   - 私的使用目的での複製を前提
   - 著作権侵害を助長しないツールであることの明示

8. **第8条（免責事項）**:
   - 現状有姿（AS-IS）での提供
   - データ消失・破損の免責
   - OCR精度、外部サービス連携の保証なし
   - システム障害の可能性

9. **第9条（サービスの変更・終了）**:
   - 事前通知なしの変更・終了権
   - CSVエクスポートによるバックアップ推奨

10. **第10条（規約の変更）**:
    - 必要に応じた規約変更権
    - ページ掲載時点での効力発生

11. **第11条（準拠法・管轄裁判所）**:
    - 日本法準拠
    - 運営者所在地の専属的合意管轄

**ページ構成**:
```tsx
<div className="min-h-screen bg-gray-50 py-12 px-4">
  <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
    <h1 className="text-3xl font-bold text-gray-900 mb-8">利用規約</h1>

    <div className="space-y-6 text-gray-700">
      <p className="text-sm text-gray-500">最終更新日: 2025年11月15日</p>

      {/* 各条文 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">第1条（はじめに）</h2>
        <p>...</p>
      </section>

      {/* ... 他の条文 ... */}
    </div>

    {/* 戻るボタン */}
    <div className="mt-8 text-center">
      <Link
        href="/login"
        className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        ログイン画面に戻る
      </Link>
    </div>
  </div>
</div>
```

##### 2.2 ログイン画面の修正

**ファイル**: `app/(auth)/login/page.tsx`

**変更内容**:

1. **Linkコンポーネントのインポート**:
   ```typescript
   import Link from 'next/link';
   ```

2. **フッター部分の修正**:

   **変更前**:
   ```tsx
   <p className="text-center text-gray-500 text-sm mt-8">
     ログインすることで、利用規約に同意したものとみなされます
   </p>
   ```

   **変更後**:
   ```tsx
   <p className="text-center text-gray-500 text-sm mt-8">
     ログインすることで、
     <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
       利用規約
     </Link>
     に同意したものとみなされます
   </p>
   ```

   スタイリング:
   - `text-blue-600`: 青色のテキスト
   - `hover:text-blue-700`: ホバー時に濃い青
   - `underline`: 下線を表示

##### 2.3 Middlewareの修正

**ファイル**: `middleware.ts`

**問題**:
初期実装では `/terms` ページにアクセスしようとすると、middlewareが認証を要求して `/login` にリダイレクトされていた。

**修正内容**:

```typescript
// 認証不要のパス
const publicPaths = ['/login', '/auth/callback', '/api/quotes/public', '/terms'];
const isPublicPath = publicPaths.some(
  (path) => pathname === path || pathname.startsWith(path + '/')
);
```

`publicPaths` に `/terms` を追加して、認証なしでアクセス可能にした。

これにより：
- 未ログインユーザーも利用規約ページにアクセス可能
- ログイン前に規約内容を確認できる
- ログイン済みユーザーも規約を参照可能

#### 利用規約の特徴

1. **個人開発アプリに適した内容**:
   - 現状有姿（AS-IS）での提供を明示
   - データ消失の免責
   - サービス終了の可能性を明記

2. **著作権への配慮**:
   - フレーズの著作権は元の著作物の著作権者に帰属
   - 私的使用目的の複製を前提
   - 著作権侵害を助長しないツールであることを明示

3. **実装機能を反映**:
   - OCR機能
   - 公開/非公開設定
   - CSVエクスポート
   - 外部サービス連携（Amazon、SNS）

4. **ユーザーへの推奨事項**:
   - 定期的なCSVエクスポートによるバックアップ
   - 著作権法の範囲内での利用

5. **法的基礎**:
   - 日本法準拠
   - 専属的合意管轄の明示

#### ユーザーフロー

1. **ログイン画面**:
   - フッターに「ログインすることで、利用規約に同意したものとみなされます」と表示
   - 「利用規約」部分が青色で下線付きのリンク

2. **利用規約ページ**:
   - 全11条の規約を読みやすく表示
   - 最終更新日を明記
   - 「ログイン画面に戻る」ボタンで簡単に戻れる

3. **認証状態による違い**:
   - **未ログイン**: `/terms` に直接アクセス可能、規約を確認してからログイン可能
   - **ログイン済み**: `/terms` に直接アクセス可能、いつでも規約を参照可能

## 修正ファイル一覧

```
app/(main)/my-quotes/page.tsx         # CSVエクスポート修正
app/terms/page.tsx                    # 利用規約ページ（新規）
app/(auth)/login/page.tsx             # 利用規約リンク追加
middleware.ts                         # /terms を公開パスに追加
```

## 技術的なポイント

### CSVエクスポート

1. **Fetch APIの使用**:
   - `window.location.href`では認証ヘッダーを付与できない
   - `fetch`を使用してAuthorizationヘッダーを明示的に設定

2. **Blob処理**:
   - `response.blob()`でバイナリデータとして取得
   - `URL.createObjectURL()`で一時URLを生成
   - ダウンロード後に`URL.revokeObjectURL()`でメモリ解放

3. **動的なファイル名**:
   - `Content-Disposition`ヘッダーから正規表現でファイル名を抽出
   - バックエンドが生成するタイムスタンプ付きファイル名を使用

### 利用規約ページ

1. **認証不要のパス**:
   - Middlewareの`publicPaths`に追加
   - 未ログインユーザーもアクセス可能

2. **アクセシビリティ**:
   - セマンティックHTMLの使用（`<section>`, `<h2>`等）
   - 読みやすい行間・余白設定
   - 明確な見出し階層

3. **ナビゲーション**:
   - Next.jsの`Link`コンポーネントで高速なクライアントサイドルーティング
   - ホバー時の視覚的フィードバック

## テスト観点

### CSVエクスポート

1. **基本動作**:
   - CSVエクスポートボタンのクリック
   - ファイルのダウンロード成功
   - ファイル名の正確性

2. **フィルター適用**:
   - 検索キーワード適用時のエクスポート
   - 活動領域フィルター適用時
   - タグフィルター適用時
   - 複数フィルター併用時

3. **エラーハンドリング**:
   - 未ログイン時のエラーメッセージ
   - ネットワークエラー時の挙動
   - バックエンドエラー時のアラート

4. **データ整合性**:
   - エクスポートされたCSVの内容が正しいか
   - UTF-8エンコーディングの確認
   - BOM付きでExcel互換か

### 利用規約ページ

1. **アクセス**:
   - ログイン画面からのリンククリック
   - 直接URL（`/terms`）でのアクセス
   - ログイン済み/未ログインの両方でアクセス可能

2. **表示**:
   - 全条文が正しく表示される
   - レスポンシブデザインの確認
   - 各セクションの読みやすさ

3. **ナビゲーション**:
   - 「ログイン画面に戻る」ボタンの動作
   - ホバー時のスタイル変化

## 今後の改善案

### CSVエクスポート

1. **エクスポート範囲の選択**:
   - 選択したフレーズのみエクスポート
   - 日付範囲指定でのエクスポート

2. **進捗表示**:
   - 大量データのエクスポート時にプログレスバー表示

3. **フォーマットオプション**:
   - Excel形式（.xlsx）のサポート
   - JSON形式のエクスポート

### 利用規約ページ

1. **バージョン管理**:
   - 規約変更履歴の保持
   - 過去バージョンの閲覧機能

2. **多言語対応**:
   - 英語版の提供

3. **目次の追加**:
   - ページ内リンクで各条文に素早くジャンプ

4. **通知機能**:
   - 規約変更時にユーザーへの通知
   - 最終閲覧日時の記録

## まとめ

今回の作業により、以下を達成した：

### CSVエクスポート修正
- ✅ 404エラーを解消
- ✅ FastAPIバックエンドとの正しい連携
- ✅ 認証トークンの適切な付与
- ✅ ユーザーフレンドリーなエラーハンドリング
- ✅ Content-Dispositionからのファイル名自動取得

### 利用規約ページ
- ✅ 包括的で実現可能な利用規約の作成
- ✅ ログイン画面からのリンク追加（下線付き）
- ✅ 認証不要でアクセス可能
- ✅ 読みやすいレイアウトとナビゲーション
- ✅ 著作権への適切な配慮

ユーザーは正常にCSVエクスポートを利用でき、ログイン前に利用規約を確認できるようになった。
