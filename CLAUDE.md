# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**抜き書きアプリ** - A personal knowledge base application for collecting and organizing quotes/phrases from books, SNS posts, and other sources. Users can categorize quotes by activity domains and tags for easy retrieval.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript 5.x, Tailwind CSS 3.x
- **Backend**: Supabase (PostgreSQL 15, Auth, Storage), Next.js API Routes
- **OCR**: Tesseract.js 5.x for Japanese text extraction
- **Deployment**: Vercel (frontend), Supabase (backend)
- **Testing**: Vitest (unit tests), Playwright (E2E)
- **Development Tools**: ESLint, Prettier, pnpm/npm

## Project Structure

```
app/
├── (auth)/              # Authentication routes (login, callback)
├── (main)/              # Main application routes
│   ├── layout.tsx       # Main layout with navigation
│   ├── page.tsx         # Home screen (quote list)
│   ├── settings/        # Settings and tag management
│   └── components/      # Page-specific components
│       ├── QuoteCard.tsx
│       ├── QuoteModal.tsx
│       └── OCRTextSelector.tsx
└── api/                 # API routes
    ├── activities/      # Fixed 10 activity domains
    ├── books/           # Book management + Amazon scraping
    ├── sns-users/       # SNS user management + info fetching
    ├── tags/            # Tag CRUD + merge operations
    ├── quotes/          # Quote CRUD + grouped queries
    ├── ocr/             # OCR text extraction
    └── export/          # CSV export

lib/
├── supabase/
│   ├── client.ts        # Browser client
│   ├── server.ts        # Server client with cookies
│   └── types.ts         # Database types
├── ocr/
│   ├── tesseract.ts     # OCR processing with Tesseract.js
│   ├── preprocess.ts    # Image preprocessing for accuracy
│   └── selection.ts     # Extract text from user selection bounds
├── scraping/
│   ├── amazon.ts        # Scrape book info from Amazon URLs
│   ├── google-search.ts # Get SNS display names via Google
│   ├── sns-url-parser.ts # Parse X/Threads URLs
│   └── rate-limiter.ts  # Rate limiting for external APIs
└── utils/
    ├── csv-export.ts    # Generate CSV with proper escaping
    └── validators.ts    # Zod schemas

components/
├── ui/                  # Shared UI components
└── layouts/             # Layout components

middleware.ts            # Auth middleware (redirect logic)
```

## Architecture & Data Flow

### Core Entities

1. **Activities (活動領域)**: System-fixed 10 domains (仕事・キャリア, 学習・研究, etc.) with icons
2. **Books**: Scraped from Amazon URLs (title, author, cover image, ISBN, ASIN)
3. **SNS Users**: X/Threads users (platform, handle, display_name)
4. **Tags**: User-defined tags (can be merged/renamed)
5. **Quotes**: Main entity with text, source type (BOOK/SNS/OTHER), M:N relations to activities and tags

### Key Relationships

- Quotes → Books/SNS Users (source reference)
- Quotes ↔ Activities (M:N via `quote_activities`)
- Quotes ↔ Tags (M:N via `quote_tags`)
- All user data uses Supabase RLS for security

### Authentication Flow

- Supabase Auth with Google, GitHub, Email (Magic Link)
- `middleware.ts` handles redirects: unauthenticated → `/login`, authenticated at `/login` → `/`
- Use `lib/supabase/server.ts` for server components, `lib/supabase/client.ts` for client components

### Quote Registration Flow

1. User opens registration modal (new or from existing source)
2. Input text manually OR upload image for OCR
3. If OCR: draw selection boxes on image → Tesseract.js extracts text → fill input fields
4. Select activity domains (required, multi-select)
5. Add/select tags (optional, multi-select)
6. Choose source type:
   - **BOOK**: Enter Amazon URL → scrape book info → auto-fill
   - **SNS**: Select platform (X/Threads) → enter post URL → extract handle + fetch display name
   - **OTHER**: Free text fields (source, note)
7. Batch registration: Add more quote input fields with same source
8. Submit → save to Supabase

### Home Screen Display

- Quotes are **grouped by source** (book or SNS user)
- Each group shows source info + list of quotes with activities/tags
- Filters: keyword search, activity domains, tags (multi-select)
- Infinite scroll: 50 items initially, +20 on scroll
- Display shows registration date

## Database Schema (PostgreSQL)

### Key Tables

- `activities`: 10 fixed domains (id, name, description, icon, display_order)
- `books`: user_id, title, author, cover_image_url, isbn, asin, publisher
- `sns_users`: user_id, platform (X/THREADS), handle, display_name
- `tags`: user_id, name (includes #)
- `quotes`: user_id, text, source_type (BOOK/SNS/OTHER), book_id, sns_user_id, page_number, source_meta (JSONB)
- `quote_activities`: quote_id, activity_id (junction)
- `quote_tags`: quote_id, tag_id (junction)

### Important Constraints

- All tables have `deleted_at` for soft deletes
- `quotes` has CHECK constraint: source_type must match correct foreign key
- Unique constraints prevent duplicate books, SNS users, tags per user
- RLS policies ensure users only access their own data

### Useful View

- `quotes_with_details`: Pre-joined view with books, SNS users, activities, tags as arrays

## Development Commands

When the project is implemented, these commands will be used:

```bash
# Development
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run format       # Run Prettier

# Testing
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run test:watch   # Run tests in watch mode

# Database (Supabase CLI)
npx supabase start   # Start local Supabase
npx supabase db reset # Reset local database
npx supabase migration new <name> # Create new migration
```

## Key Implementation Details

### OCR with Tesseract.js

- Process: Upload image → preprocess (grayscale + threshold) → Tesseract.js → extract words with bounding boxes
- User interaction: Draw selection rectangle on canvas → extract words within bounds → sort by position → concatenate
- Support multiple selections: Each selection fills a separate quote input field
- Language: Japanese (`jpn`) by default

### Amazon Book Scraping

- Extract ASIN from URL patterns: `/dp/{ASIN}`, `/product/{ASIN}`, etc.
- Fetch page HTML with proper User-Agent
- Use cheerio to parse: `#productTitle`, `.author`, `#landingImage`, ISBN from detail bullets
- **Important**: Implement rate limiting (10 req/min) to avoid blocks
- Fallback to manual input if scraping fails

### SNS User Info Fetching

- Parse URL to extract platform + handle (X: `twitter.com|x.com/{handle}/status/{id}`, Threads: `threads.net/@{handle}/post/{id}`)
- **Method 1** (gray area): Google search `"{platform} {handle}"` → scrape result titles for `{name} (@{handle})` pattern
- **Method 2** (recommended): Use SerpAPI for legal Google searches
- Fallback to manual input if fetching fails

### CSV Export

- Export filtered/searched quotes as CSV
- Columns: フレーズ, 出典, 活動領域, タグ, 登録日時
- Include BOM (`\uFEFF`) for Excel compatibility
- Properly escape commas, quotes, newlines in CSV cells

### Tag Management

- **Merge operation**: Update all `quote_tags` where `tag_id = source` to `tag_id = target`, handle duplicates with `ON CONFLICT DO NOTHING`, soft-delete source tag
- **Rename**: Simply update `tags.name`
- **Delete**: Soft-delete (set `deleted_at`), cascade removes `quote_tags` entries

## Environment Variables

Required in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Optional: SerpAPI for legal Google searches
SERPAPI_KEY=xxx

# Development
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Important Patterns

### Supabase Client Usage

```typescript
// Server Components/API Routes
import { createClient } from '@/lib/supabase/server'
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()

// Client Components
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

### Querying Grouped Quotes

Use the `/api/quotes/grouped` endpoint which returns:

- Books with their quotes array
- SNS users with their quotes array
- "Other" type quotes individually

This avoids N+1 queries and matches the UI grouping structure.

### Filtering with Multiple Conditions

Combine: keyword search (text/source), activity IDs (array contains), tag IDs (array contains)

```typescript
// In API route
WHERE
  user_id = $1
  AND deleted_at IS NULL
  AND (text ILIKE $2 OR book_title ILIKE $2)
  AND activity_ids && $3  -- array overlap operator
  AND tag_ids && $4
```

## Testing Strategy

- **Unit tests**: OCR text extraction, CSV generation, URL parsing, rate limiting
- **E2E tests**: Full quote registration flow (manual + OCR), search/filter, tag management
- Mock external services (Amazon, Google) in tests

## Security Considerations

- Never expose Supabase service role key in client code
- All database access goes through RLS policies
- Validate all user inputs with Zod schemas
- Rate limit scraping endpoints (10 req/min for Amazon/SNS)
- Sanitize HTML/text to prevent XSS (React handles this automatically)

## Performance Optimization

- Use `quotes_with_details` view to reduce JOIN overhead
- Implement infinite scroll pagination (offset-based)
- Cache OCR results in browser (5 min)
- Optimize images with Next.js `<Image>` component
- Index frequently queried columns: user_id, created_at, text (GIN for full-text search)

## Common Gotchas

1. **Soft deletes**: Always filter `WHERE deleted_at IS NULL` in queries
2. **Source type constraint**: When creating quotes, ensure correct foreign key is set based on source_type
3. **RLS policies**: Test policies work correctly for multi-user scenarios
4. **Amazon scraping**: HTML structure may change, implement error handling
5. **Tesseract.js**: Large images can be slow, consider client-side preprocessing
6. **Japanese text**: Ensure Tesseract.js Japanese model is loaded
7. **Array operators in Postgres**: Use `&&` for overlap, `@>` for contains

## Future Enhancements (Phase 3)

- AI summarization of quotes
- Mobile app (React Native)
- Quote sharing between users
- Browser extension for one-click registration
- More SNS platforms (Bluesky, Mastodon)

---

## Additional Guidance for Claude

### 参照ドキュメント

When writing or editing code, always refer to the following latest design documents in `/docs/`:

- 要件定義書_v2.md
- 画面設計書_実装版_v2.md
- API設計書_v2.md
- データベース設計書_v2.md
- 技術仕様書_v2.md

These documents define the functional requirements, UI/UX behavior, API specs, DB schema, and implementation details.
Use them as the single source of truth when implementing or refactoring code.

### Claudeへの指示

- コード提案時は、上記ドキュメントの内容と整合性を常に確認すること
- 曖昧な仕様があれば、まずドキュメントを引用して整合性を検討した上で質問すること
- コードはESLint・Prettier・TypeScriptルールに従うこと
- 命名規則は英語（camelCaseまたはsnake_case）を使用
- UI設計ではTailwindのユーティリティクラスを優先し、複雑なスタイルは`className`で調整
- Supabase操作では`lib/supabase/`配下のclient/serverを利用（直接fetch禁止）
- 記述時に必要なら、関連ドキュメントの該当箇所を参照としてコメントに残すこと

### 作業スタイル

- 1タスク＝1PR（小さく早く）
- `/plan` で実装計画を立て、 `/edit` でファイルを更新
- 生成コードは即コミットせず、まずClaudeの提案をレビューしてから採用
