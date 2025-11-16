-- ====================================
-- reference_linkカラムをquotesテーブルに追加
-- ====================================

-- quotesテーブルにreference_linkカラムを追加
ALTER TABLE quotes
ADD COLUMN reference_link TEXT;

-- コメント追加
COMMENT ON COLUMN quotes.reference_link IS 'フレーズの参考リンク（任意）';

-- ====================================
-- quotes_with_detailsビューを更新
-- ====================================
-- reference_linkカラムを含めるためビューを再作成
-- 既存のビューを削除してから再作成
DROP VIEW IF EXISTS quotes_with_details;

CREATE VIEW quotes_with_details AS
SELECT
  q.id,
  q.user_id,
  q.text,
  q.source_type,
  q.page_number,
  q.source_meta,
  q.is_public,
  q.reference_link,
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
  q.id, q.user_id, q.text, q.source_type, q.page_number, q.source_meta, q.is_public, q.reference_link,
  q.created_at, q.updated_at,
  b.id, b.title, b.author, b.cover_image_url,
  s.id, s.platform, s.handle, s.display_name;
