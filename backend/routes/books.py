from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client
from auth import get_current_user, get_supabase_client
from models.book import Book, BookCreate, BooksResponse, BookResponse

router = APIRouter(
    prefix="/api/books",
    tags=["books"]
)


@router.get("", response_model=BooksResponse)
async def get_books(
    limit: int = Query(50, ge=1, le=100, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    search: str = Query("", description="検索キーワード（タイトル・著者名）"),
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    ユーザーの書籍一覧を取得

    - **認証**: 必須
    - **検索**: タイトルと著者名で部分一致
    - **ソート**: created_at降順
    - **ページネーション**: limit, offset
    """
    try:
        # 基本クエリ
        query = supabase.table('books') \
            .select('id, user_id, title, author, cover_image_url, isbn, asin, publisher, publication_date, created_at, updated_at', count='exact') \
            .eq('user_id', user.id) \
            .is_('deleted_at', None)

        # 検索条件を追加
        if search:
            query = query.or_(f'title.ilike.%{search}%,author.ilike.%{search}%')

        # ソート・ページネーション
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)

        response = query.execute()

        if response.data is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="書籍の取得に失敗しました"
            )

        # Pydanticモデルに変換
        books = [Book(**book) for book in response.data]

        # totalとhas_moreを計算
        total = response.count if response.count is not None else 0
        has_more = offset + limit < total

        return BooksResponse(books=books, total=total, has_more=has_more)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 書籍取得エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )


@router.post("", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book(
    book_data: BookCreate,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    新規書籍を登録

    - **認証**: 必須
    - **重複チェック**: 同じタイトル・著者の書籍が存在する場合はエラー
    """
    try:
        # 重複チェック（同じタイトル・著者の書籍が存在しないか）
        existing_response = supabase.table('books') \
            .select('id') \
            .eq('user_id', user.id) \
            .eq('title', book_data.title) \
            .eq('author', book_data.author) \
            .is_('deleted_at', None) \
            .execute()

        if existing_response.data and len(existing_response.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="同じ書籍が既に登録されています"
            )

        # 書籍を登録
        insert_data = {
            'user_id': user.id,
            'title': book_data.title,
            'author': book_data.author,
            'cover_image_url': book_data.cover_image_url,
            'isbn': book_data.isbn,
            'asin': book_data.asin,
            'publisher': book_data.publisher,
            'publication_date': book_data.publication_date,
        }

        # まずinsertを実行
        insert_response = supabase.table('books') \
            .insert(insert_data) \
            .execute()

        if not insert_response.data or len(insert_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="書籍の登録に失敗しました"
            )

        # 作成されたレコードのIDを取得
        book_id = insert_response.data[0]['id']

        # 別途selectクエリで完全なデータを取得
        select_response = supabase.table('books') \
            .select('id, user_id, title, author, cover_image_url, isbn, asin, publisher, publication_date, created_at, updated_at') \
            .eq('id', book_id) \
            .execute()

        if not select_response.data or len(select_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="作成された書籍の取得に失敗しました"
            )

        # Pydanticモデルに変換
        book = Book(**select_response.data[0])

        return BookResponse(book=book)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 書籍登録エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )
