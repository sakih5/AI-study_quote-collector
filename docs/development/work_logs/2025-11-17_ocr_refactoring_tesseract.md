# OCR機能リファクタリング（PaddleOCR → Tesseract）

**日付**: 2025-11-17
**作業者**: Claude Code
**作業時間**: 約4時間

## 概要

OCR機能を軽量化するため、PaddleOCRからTesseractへの移行を実施。併せて、公開フレーズAPIのバグ修正と複数のUI改善を行った。

## 作業内容

### 1. OCR エンジンの移行（PaddleOCR → Tesseract）

#### 背景
- PaddleOCRは高精度だが、依存パッケージが265個と重量級
- メモリ使用量が大きく、デプロイコストが高い
- より軽量なソリューションが必要

#### 実施内容
- **依存パッケージの削減**: 265個 → 52個（80%減）
- **OCRライブラリの変更**:
  - 削除: `paddleocr`, `paddlepaddle`
  - 追加: `pytesseract`
- **Dockerfileの修正**:
  ```dockerfile
  # Tesseract OCRと日本語データのインストール
  RUN apt-get update && apt-get install -y \
      tesseract-ocr \
      tesseract-ocr-jpn \
      && rm -rf /var/lib/apt/lists/*
  ```

#### コード変更

**backend/services/ocr_service.py**:
- PaddleOCRのシングルトンパターンを削除
- pytesseractを使用した実装に置き換え
- 信頼度スコアの正規化（0-100 → 0-1）
- 画像前処理の追加:
  - グレースケール変換
  - コントラスト強化（2倍）
- Tesseract設定の最適化:
  - PSM mode: 6（単一テキストブロック）
  - OEM mode: 1（LSTM neural net）

**backend/routes/ocr.py**:
- レスポンスモデルに`average_confidence`フィールドを追加
- ログ出力に信頼度の平均値を追加

#### 発生した問題と解決

**問題1: Pydantic v2バリデーションエラー**
```
ValidationError: jwt_secret: Extra inputs are not permitted
```
- **原因**: .envに未定義フィールドが存在し、Pydantic v2がデフォルトで拒否
- **解決**: `config.py`でPydantic v2の`ConfigDict`に`extra='ignore'`を設定

**問題2: 信頼度スケールのバグ**
- **現象**: 381要素検出したが、0行にグループ化される
- **原因**: 信頼度を0-1に正規化後、min_confidence（0-100スケール）と比較
- **解決**: 正規化前にフィルタリング処理を実行

**問題3: OCR精度の低さ**
- **現象**: 信頼度が高いのにテキストがボロボロ
- **対策**: 画像前処理とTesseract設定の最適化
- **最終的な対応**: UIでテキストを編集可能にすることで回避

### 2. UI改善

#### 2.1 OCR信頼度の表示
**app/(main)/components/OCRTextSelector.tsx**:
- ヘッダーに信頼度バッジを追加
```tsx
<span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
  信頼度: {(averageConfidence * 100).toFixed(1)}%
</span>
```

#### 2.2 抽出テキストの編集可能化
- `<div>`から`<textarea>`に変更
- ユーザーが画像を見ながらOCR結果を修正可能に
- リアルタイムでテキスト選択→フレーズ追加が可能

#### 2.3 レイアウト調整
- 画像とテキストエリアの高さを500pxに統一
- `object-contain`で画像のアスペクト比を維持

#### 2.4 フレーズ挿入順序の修正
- **問題**: OCRテキスト選択時、フレーズ#1が空欄なのに#2に挿入される
- **解決**: フレーズ#1が空の場合は上書き、それ以外は追加
```tsx
if (quotes.length === 1 && quotes[0].text === '') {
  setQuotes([{ text: selectedText.trim(), activity_ids: [], tag_ids: [] }]);
} else {
  setQuotes([...quotes, { text: selectedText.trim(), activity_ids: [], tag_ids: [] }]);
}
```

### 3. Cloud Runへのデプロイ

#### デプロイ手順
1. docker-compose.ymlを作成してローカルテスト
2. deploy.shスクリプトを使用してCloud Buildでイメージ作成
3. Cloud Runへデプロイ

#### デプロイ設定
- **リージョン**: asia-northeast1
- **リソース**: メモリ512Mi, CPU 1, タイムアウト300秒
- **最大インスタンス**: 10
- **認証**: 未認証アクセス許可（公開API用）

#### サービスURL
- https://quote-collector-api-3276884015.asia-northeast1.run.app

### 4. 環境変数の問題修正

#### 問題: フロントエンドでAPI URL 404エラー
- **原因**:
  - Vercelでは`NEXT_PUBLIC_API_URL`を設定
  - コードでは`NEXT_PUBLIC_FASTAPI_URL`を参照
- **解決**: 両方の変数名をサポートするように修正
  ```typescript
  const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
                           process.env.NEXT_PUBLIC_FASTAPI_URL || '';
  ```

#### 修正ファイル
- `lib/api/client.ts`
- `app/page.tsx`
- `app/(main)/my-quotes/page.tsx`

### 5. 公開フレーズAPIのバグ修正

#### 問題: activities と tags が空配列
**現象**:
```json
{
  "activities": [],
  "tags": [],
  "source": {
    "sns_platform": null,
    "sns_handle": null,
    "sns_display_name": null
  }
}
```

#### 原因調査

1. **データベース確認**: データは存在
   - `quote_activities`: 8件
   - `quote_tags`: 11件
   - `sns_users`: 8件

2. **クエリテスト**: ローカルからのクエリは成功
   ```python
   activities_query = supabase.table('quote_activities') \
       .select('quote_id, activities(id, name, icon)') \
       .in_('quote_id', quote_ids) \
       .execute()
   # Result count: 8 ✓
   ```

3. **環境変数チェック**: Cloud Runで`SUPABASE_SERVICE_ROLE_KEY`が未設定
   ```
   {'name': 'SUPABASE_SERVICE_ROLE_KEY'}  # 値が空！
   ```

#### 根本原因
- RLS（Row Level Security）ポリシーが有効
- サービスロールキーがないとジャンクションテーブルへのアクセスがブロックされる
- `get_supabase_client_public()`はサービスロールキーがある場合のみRLSをバイパス

#### 解決策

**1. deploy.shの修正**:
```bash
cat > /tmp/env-vars.yaml <<EOF
SUPABASE_URL: "${SUPABASE_URL}"
SUPABASE_KEY: "${SUPABASE_KEY}"
SUPABASE_SERVICE_ROLE_KEY: "${SUPABASE_SERVICE_ROLE_KEY}"  # 追加
CORS_ORIGINS: "${CORS_ORIGINS}"
ENVIRONMENT: "production"
EOF
```

**2. 環境変数の手動更新**:
```bash
gcloud run services update quote-collector-api \
  --env-vars-file=/tmp/update-env-vars.yaml
```

**3. クエリロジックの改善**:
- ネストされたJOINクエリの代わりに、別クエリで取得
- books, sns_users, activities, tagsをそれぞれ個別にクエリ
- quote_idでマッピングしてデータを結合

```python
# booksとsns_usersを個別取得
books_map = {}
if book_ids:
    books_query = supabase.table('books').select('*').in_('id', book_ids).execute()
    for book in books_query.data:
        books_map[book['id']] = book

# activitiesとtagsをジャンクションテーブル経由で取得
activities_query = supabase.table('quote_activities') \
    .select('quote_id, activities(id, name, icon)') \
    .in_('quote_id', quote_ids) \
    .execute()

# マッピング作成
activities_map = defaultdict(list)
for qa in activities_query.data:
    if qa.get('activities'):
        activities_map[qa['quote_id']].append(qa['activities'])
```

#### 検証結果

修正後のAPIレスポンス:
```json
{
  "id": 219,
  "source": {
    "type": "SNS",
    "sns_platform": "X",
    "sns_handle": "thecure2392",
    "sns_display_name": "かぽ"
  },
  "activities": [
    {"id": 1, "name": "仕事・キャリア", "icon": "💼"},
    {"id": 2, "name": "学習・研究", "icon": "📖"}
  ],
  "tags": [
    {"id": 1, "name": "#集中"},
    {"id": 4, "name": "#生産性"},
    {"id": 5, "name": "#習慣"}
  ]
}
```

✅ **成功！**

## 成果物

### コミット履歴
1. `OCR機能リファクタリング: PaddleOCR→Tesseract移行`
2. `公開フレーズAPI: デバッグログ追加`
3. `公開フレーズAPI: activitiesとtagsを別クエリで取得`
4. `公開フレーズAPI: books/sns_usersも別クエリで取得`
5. `公開フレーズAPI修正: サービスロールキーを環境変数に追加`

### デプロイ実績
- **Cloud Run リビジョン**: quote-collector-api-00013-d94
- **Docker イメージサイズ**: 大幅削減（265→52パッケージ）
- **メモリ使用量**: 512Mi（将来的に256Miへ削減可能）

## 学んだこと

### 1. Supabase RLS とサービスロールキー
- 公開エンドポイントでもジャンクションテーブルにアクセスする場合、サービスロールキーが必要
- RLSポリシーは想定外の場所でアクセスをブロックする可能性がある
- デバッグ時は環境変数の値が実際に設定されているか必ず確認

### 2. Tesseract の特性
- PaddleOCRほど精度は高くないが、軽量で十分実用的
- 日本語認識には`tesseract-ocr-jpn`が必須
- 画像前処理（グレースケール、コントラスト調整）で精度向上
- PSM/OEMモードの調整が重要
- ユーザー編集機能と組み合わせることで実用性を確保

### 3. Cloud Run 環境変数管理
- YAMLファイル経由での設定が確実
- 特殊文字を含むトークンは引用符で囲む
- デプロイ後は`gcloud run services describe`で実際の値を確認

### 4. Next.js 環境変数のベストプラクティス
- 後方互換性のため複数の変数名をサポート
- `process.env.VAR1 || process.env.VAR2 || ''`パターンが有効

## 次のステップ

### 短期
- [ ] パフォーマンステスト実施（メモリ256Miへ削減可能か検証）
- [ ] OCR精度の定量的評価
- [ ] エラーハンドリングの強化

### 中長期
- [ ] OCR結果のキャッシュ機能
- [ ] バッチOCR処理（複数画像の一括処理）
- [ ] ユーザーフィードバックによるOCR精度の継続的改善
- [ ] 他のOCRエンジン（Google Vision API等）との比較検討

## 参考資料

- [Tesseract OCR Documentation](https://tesseract-ocr.github.io/)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [pytesseract GitHub](https://github.com/madmaze/pytesseract)

## トラブルシューティング

### OCRの精度が低い場合
1. 画像の解像度を上げる
2. コントラスト強化パラメータを調整（現在2.0）
3. PSM/OEMモードを変更
4. 言語データを追加（英語+日本語: `lang='eng+jpn'`）

### activitiesやtagsが空の場合
1. Cloud Runの環境変数でSUPABASE_SERVICE_ROLE_KEYを確認
2. Supabase RLSポリシーを確認
3. データベースに実際にデータが存在するか確認
4. ログでクエリ結果を確認（空配列かnullか）

### デプロイエラー
1. .envファイルが正しく読み込まれているか確認
2. YAMLファイルの構文エラーをチェック
3. gcloud認証が有効か確認
4. プロジェクトIDが正しいか確認
