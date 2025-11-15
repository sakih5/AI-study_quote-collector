from supabase import create_client
from config import settings

supabase = create_client(settings.supabase_url, settings.supabase_key)

# book_id=7を確認
response = supabase.table('books').select('*').eq('id', 7).execute()
print(f"Book ID=7: {response.data}")

# 全ての書籍を確認
all_books = supabase.table('books').select('id, title, deleted_at').execute()
print(f"\n全書籍: {all_books.data}")
