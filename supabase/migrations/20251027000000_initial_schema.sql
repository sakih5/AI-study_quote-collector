-- ====================================
-- 抜き書きアプリ - 初期スキーマ
-- ====================================

-- ====================================
-- 1. activities（活動領域マスタ）
-- ====================================
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL,
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX activities_display_order_idx ON activities(display_order);

-- 初期データ挿入
INSERT INTO activities (id, name, description, icon, display_order) VALUES
(1, '仕事・キャリア', '業務、スキル開発、キャリア形成に関連する活動', '💼', 1),
(2, '学習・研究', '勉強、調査、知識習得に関する活動', '📖', 2),
(3, '創作・制作活動', '執筆、プログラミング、デザイン、工作等', '🎨', 3),
(4, '趣味・娯楽', 'ゲーム、音楽鑑賞、映画、コレクション等', '🎮', 4),
(5, '運動・身体活動', 'スポーツ、トレーニング、散歩等', '🏃', 5),
(6, '読書・情報収集', '本、記事、SNS、ニュース等の閲覧', '📚', 6),
(7, '人間関係・コミュニケーション', '家族、友人、同僚との関わり', '👥', 7),
(8, '生活習慣・セルフケア', '睡眠、食事、メンタルケア、環境整備', '🌱', 8),
(9, '社会活動・貢献', 'ボランティア、地域活動、社会課題への取り組み', '🤝', 9),
(10, 'その他', '上記に当てはまらない活動', '📝', 10);

-- ====================================
-- 2. books（書籍）
-- ====================================
CREATE TABLE books (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover_image_url TEXT,
  isbn TEXT,
  asin TEXT,
  publisher TEXT,
  publication_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(user_id, title, author)
);

CREATE INDEX books_user_idx ON books(user_id) WHERE deleted_at IS NULL;
CREATE INDEX books_title_idx ON books(title) WHERE deleted_at IS NULL;
CREATE INDEX books_isbn_idx ON books(isbn) WHERE deleted_at IS NULL AND isbn IS NOT NULL;
CREATE INDEX books_asin_idx ON books(asin) WHERE deleted_at IS NULL AND asin IS NOT NULL;

-- RLS有効化
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- ポリシー：ユーザーは自分のデータのみアクセス可能
CREATE POLICY books_policy ON books
  USING (auth.uid() = user_id);

-- ====================================
-- 3. sns_users（SNSユーザー）
-- ====================================
CREATE TABLE sns_users (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('X', 'THREADS')),
  handle TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(user_id, platform, handle)
);

CREATE INDEX sns_users_user_idx ON sns_users(user_id) WHERE deleted_at IS NULL;
CREATE INDEX sns_users_handle_idx ON sns_users(handle) WHERE deleted_at IS NULL;
CREATE INDEX sns_users_platform_idx ON sns_users(platform) WHERE deleted_at IS NULL;

-- RLS有効化
ALTER TABLE sns_users ENABLE ROW LEVEL SECURITY;

-- ポリシー
CREATE POLICY sns_users_policy ON sns_users
  USING (auth.uid() = user_id);

-- ====================================
-- 4. tags（タグ）
-- ====================================
CREATE TABLE tags (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(user_id, name)
);

CREATE INDEX tags_user_idx ON tags(user_id) WHERE deleted_at IS NULL;
CREATE INDEX tags_name_idx ON tags(name) WHERE deleted_at IS NULL;

-- RLS有効化
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- ポリシー
CREATE POLICY tags_policy ON tags
  USING (auth.uid() = user_id);

-- ====================================
-- 5. quotes（フレーズ）
-- ====================================
CREATE TABLE quotes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('BOOK', 'SNS', 'OTHER')),
  book_id BIGINT REFERENCES books(id) ON DELETE CASCADE,
  sns_user_id BIGINT REFERENCES sns_users(id) ON DELETE CASCADE,
  page_number INT,
  source_meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT source_check CHECK (
    (source_type = 'BOOK' AND book_id IS NOT NULL AND sns_user_id IS NULL) OR
    (source_type = 'SNS' AND sns_user_id IS NOT NULL AND book_id IS NULL) OR
    (source_type = 'OTHER' AND book_id IS NULL AND sns_user_id IS NULL)
  )
);

CREATE INDEX quotes_user_idx ON quotes(user_id) WHERE deleted_at IS NULL;
CREATE INDEX quotes_source_type_idx ON quotes(source_type) WHERE deleted_at IS NULL;
CREATE INDEX quotes_book_idx ON quotes(book_id) WHERE deleted_at IS NULL;
CREATE INDEX quotes_sns_user_idx ON quotes(sns_user_id) WHERE deleted_at IS NULL;
CREATE INDEX quotes_created_idx ON quotes(created_at DESC) WHERE deleted_at IS NULL;
-- 全文検索用インデックス（simple設定を使用）
-- 注: より高度な日本語検索が必要な場合は pg_bigm 拡張の使用を検討
CREATE INDEX quotes_text_idx ON quotes USING gin(to_tsvector('simple', text)) WHERE deleted_at IS NULL;

-- RLS有効化
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- ポリシー
CREATE POLICY quotes_policy ON quotes
  USING (auth.uid() = user_id);

-- ====================================
-- 6. quote_activities（フレーズ-活動領域）
-- ====================================
CREATE TABLE quote_activities (
  id BIGSERIAL PRIMARY KEY,
  quote_id BIGINT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  activity_id INT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quote_id, activity_id)
);

CREATE INDEX quote_activities_quote_idx ON quote_activities(quote_id);
CREATE INDEX quote_activities_activity_idx ON quote_activities(activity_id);

-- RLS有効化
ALTER TABLE quote_activities ENABLE ROW LEVEL SECURITY;

-- ポリシー：quotes経由でアクセス制御
CREATE POLICY quote_activities_policy ON quote_activities
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_activities.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

-- ====================================
-- 7. quote_tags（フレーズ-タグ）
-- ====================================
CREATE TABLE quote_tags (
  id BIGSERIAL PRIMARY KEY,
  quote_id BIGINT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quote_id, tag_id)
);

CREATE INDEX quote_tags_quote_idx ON quote_tags(quote_id);
CREATE INDEX quote_tags_tag_idx ON quote_tags(tag_id);

-- RLS有効化
ALTER TABLE quote_tags ENABLE ROW LEVEL SECURITY;

-- ポリシー：quotes経由でアクセス制御
CREATE POLICY quote_tags_policy ON quote_tags
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_tags.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

-- ====================================
-- 8. updated_at自動更新トリガー
-- ====================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sns_users_updated_at BEFORE UPDATE ON sns_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- 9. quotes_with_details ビュー
-- ====================================
CREATE VIEW quotes_with_details AS
SELECT
  q.id,
  q.user_id,
  q.text,
  q.source_type,
  q.page_number,
  q.source_meta,
  q.created_at,
  q.updated_at,
  -- 書籍情報
  b.id AS book_id,
  b.title AS book_title,
  b.author AS book_author,
  b.cover_image_url AS book_cover_image_url,
  -- SNSユーザー情報
  s.id AS sns_user_id,
  s.platform AS sns_platform,
  s.handle AS sns_handle,
  s.display_name AS sns_display_name,
  -- 活動領域（配列）
  ARRAY_AGG(DISTINCT a.id) FILTER (WHERE a.id IS NOT NULL) AS activity_ids,
  ARRAY_AGG(DISTINCT a.name || ' ' || a.icon) FILTER (WHERE a.id IS NOT NULL) AS activity_names,
  -- タグ（配列）
  ARRAY_AGG(DISTINCT t.id) FILTER (WHERE t.id IS NOT NULL) AS tag_ids,
  ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL) AS tag_names
FROM quotes q
LEFT JOIN books b ON q.book_id = b.id AND b.deleted_at IS NULL
LEFT JOIN sns_users s ON q.sns_user_id = s.id AND s.deleted_at IS NULL
LEFT JOIN quote_activities qa ON q.id = qa.quote_id
LEFT JOIN activities a ON qa.activity_id = a.id
LEFT JOIN quote_tags qt ON q.id = qt.quote_id
LEFT JOIN tags t ON qt.tag_id = t.id AND t.deleted_at IS NULL
WHERE q.deleted_at IS NULL
GROUP BY
  q.id, q.user_id, q.text, q.source_type, q.page_number, q.source_meta,
  q.created_at, q.updated_at,
  b.id, b.title, b.author, b.cover_image_url,
  s.id, s.platform, s.handle, s.display_name;
