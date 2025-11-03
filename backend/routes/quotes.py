from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from auth import get_current_user, get_supabase_client
from models.quote import (
    QuoteCreate,
    QuoteUpdate,
    QuotesCreateResponse,
    QuoteResponse,
    QuoteDeleteResponse,
    QuotesGroupedResponse,
    BookGroupItem,
    SnsGroupItem,
    OtherGroupItem,
    QuoteInGroup,
    ActivityNested,
    TagNested,
    BookNested,
    SnsUserNested,
    Quote,
    QuoteWithDetails,
)
from typing import Optional, Literal
from collections import defaultdict

router = APIRouter(
    prefix="/api/quotes",
    tags=["quotes"]
)


# ====================================
# DELETE /api/quotes/{quote_id}
# ====================================
@router.delete("/{quote_id}", response_model=QuoteDeleteResponse)
async def delete_quote(
    quote_id: int,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    フレーズを削除（ソフトデリート）

    - **認証**: 必須
    - **quote_id**: フレーズID
    """
    try:
        # フレーズの存在確認と権限チェック
        existing_response = supabase.table('quotes') \
            .select('id') \
            .eq('id', quote_id) \
            .eq('user_id', user.id) \
            .is_('deleted_at', None) \
            .execute()

        if not existing_response.data or len(existing_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="フレーズが見つかりません"
            )

        # ソフトデリート
        from datetime import datetime
        delete_response = supabase.table('quotes') \
            .update({'deleted_at': datetime.now().isoformat()}) \
            .eq('id', quote_id) \
            .eq('user_id', user.id) \
            .execute()

        if not delete_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="フレーズの削除に失敗しました"
            )

        return QuoteDeleteResponse(success=True)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] フレーズ削除エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )


# ====================================
# PUT /api/quotes/{quote_id}
# ====================================
@router.put("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: int,
    quote_update: QuoteUpdate,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    フレーズを更新

    - **認証**: 必須
    - **quote_id**: フレーズID
    - **text**: フレーズテキスト（任意）
    - **activity_ids**: 活動領域IDリスト（任意）
    - **tag_ids**: タグIDリスト（任意）
    """
    try:
        # フレーズの存在確認と権限チェック
        existing_response = supabase.table('quotes') \
            .select('id') \
            .eq('id', quote_id) \
            .eq('user_id', user.id) \
            .is_('deleted_at', None) \
            .execute()

        if not existing_response.data or len(existing_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="フレーズが見つかりません"
            )

        # テキストを更新
        if quote_update.text is not None:
            update_response = supabase.table('quotes') \
                .update({'text': quote_update.text}) \
                .eq('id', quote_id) \
                .eq('user_id', user.id) \
                .execute()

            if not update_response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="フレーズの更新に失敗しました"
                )

        # 活動領域を更新
        if quote_update.activity_ids is not None:
            # 既存の活動領域を削除
            supabase.table('quote_activities') \
                .delete() \
                .eq('quote_id', quote_id) \
                .execute()

            # 新しい活動領域を挿入
            if len(quote_update.activity_ids) > 0:
                activity_inserts = [
                    {'quote_id': quote_id, 'activity_id': activity_id}
                    for activity_id in quote_update.activity_ids
                ]
                activity_response = supabase.table('quote_activities') \
                    .insert(activity_inserts) \
                    .execute()

                if not activity_response.data:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="活動領域の更新に失敗しました"
                    )

        # タグを更新
        if quote_update.tag_ids is not None:
            # 既存のタグを削除
            supabase.table('quote_tags') \
                .delete() \
                .eq('quote_id', quote_id) \
                .execute()

            # 新しいタグを挿入
            if len(quote_update.tag_ids) > 0:
                tag_inserts = [
                    {'quote_id': quote_id, 'tag_id': tag_id}
                    for tag_id in quote_update.tag_ids
                ]
                tag_response = supabase.table('quote_tags') \
                    .insert(tag_inserts) \
                    .execute()

                if not tag_response.data:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="タグの更新に失敗しました"
                    )

        # 更新後のフレーズを取得
        # Supabaseの機能で関連データを取得
        quote_response = supabase.table('quotes') \
            .select('id, text, page_number, created_at, quote_activities(activities(id, name, icon)), quote_tags(tags(id, name))') \
            .eq('id', quote_id) \
            .single() \
            .execute()

        if not quote_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="更新後のフレーズの取得に失敗しました"
            )

        # レスポンスを構築
        quote_data = quote_response.data
        activities = [
            ActivityNested(**qa['activities'])
            for qa in quote_data.get('quote_activities', [])
        ]
        tags = [
            TagNested(**qt['tags'])
            for qt in quote_data.get('quote_tags', [])
        ]

        quote_with_details = QuoteWithDetails(
            id=quote_data['id'],
            text=quote_data['text'],
            page_number=quote_data.get('page_number'),
            activities=activities,
            tags=tags,
            created_at=quote_data['created_at']
        )

        return QuoteResponse(quote=quote_with_details)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] フレーズ更新エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )


# ====================================
# POST /api/quotes
# ====================================
@router.post("", response_model=QuotesCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_quotes(
    quote_create: QuoteCreate,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    フレーズを一括登録

    - **認証**: 必須
    - **quotes**: フレーズリスト（各フレーズにtext, activity_ids, tag_ids）
    - **source_type**: 出典タイプ（BOOK, SNS, OTHER）
    - **book_id**: 書籍ID（source_type=BOOKの場合必須）
    - **sns_user_id**: SNSユーザーID（source_type=SNSの場合必須）
    - **page_number**: ページ番号（任意）
    - **source_meta**: その他の出典情報（source_type=OTHERの場合使用）
    """
    try:
        # source_typeに応じたバリデーション
        if quote_create.source_type == "BOOK" and not quote_create.book_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="source_typeがBOOKの場合、book_idが必要です"
            )

        if quote_create.source_type == "SNS" and not quote_create.sns_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="source_typeがSNSの場合、sns_user_idが必要です"
            )

        created_quotes = []

        # 各フレーズを登録
        for quote_item in quote_create.quotes:
            # フレーズを登録
            quote_data = {
                'user_id': user.id,
                'text': quote_item.text,
                'source_type': quote_create.source_type,
                'book_id': quote_create.book_id if quote_create.source_type == "BOOK" else None,
                'sns_user_id': quote_create.sns_user_id if quote_create.source_type == "SNS" else None,
                'page_number': quote_create.page_number,
                'source_meta': quote_create.source_meta if quote_create.source_type == "OTHER" else None,
            }

            # Phase 3-3で確立したパターン: insert後に別途select
            insert_response = supabase.table('quotes').insert(quote_data).execute()

            if not insert_response.data or len(insert_response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="フレーズの登録に失敗しました"
                )

            quote_id = insert_response.data[0]['id']

            # 活動領域を関連付け
            activity_inserts = [
                {'quote_id': quote_id, 'activity_id': activity_id}
                for activity_id in quote_item.activity_ids
            ]
            activity_response = supabase.table('quote_activities') \
                .insert(activity_inserts) \
                .execute()

            if not activity_response.data:
                # ロールバック: 登録したフレーズを削除
                supabase.table('quotes').delete().eq('id', quote_id).execute()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="活動領域の関連付けに失敗しました"
                )

            # タグを関連付け
            if quote_item.tag_ids and len(quote_item.tag_ids) > 0:
                tag_inserts = [
                    {'quote_id': quote_id, 'tag_id': tag_id}
                    for tag_id in quote_item.tag_ids
                ]
                tag_response = supabase.table('quote_tags') \
                    .insert(tag_inserts) \
                    .execute()

                if not tag_response.data:
                    # ロールバック: 登録したフレーズと活動領域を削除
                    supabase.table('quote_activities').delete().eq('quote_id', quote_id).execute()
                    supabase.table('quotes').delete().eq('id', quote_id).execute()
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="タグの関連付けに失敗しました"
                    )

            # 登録したフレーズを取得（別途select）
            select_response = supabase.table('quotes') \
                .select('*') \
                .eq('id', quote_id) \
                .single() \
                .execute()

            if select_response.data:
                created_quotes.append(Quote(**select_response.data))

        return QuotesCreateResponse(
            quotes=created_quotes,
            created_count=len(created_quotes)
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] フレーズ作成エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )


# ====================================
# GET /api/quotes/grouped
# ====================================
@router.get("/grouped", response_model=QuotesGroupedResponse)
async def get_quotes_grouped(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    source_type: Optional[Literal["BOOK", "SNS", "OTHER"]] = Query(None),
    activity_ids: Optional[str] = Query(None),
    tag_ids: Optional[str] = Query(None),
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    フレーズ一覧を取得（グループ化あり）

    - **認証**: 必須
    - **limit**: 取得件数（デフォルト: 50、最大: 100）
    - **offset**: オフセット（デフォルト: 0）
    - **search**: 検索キーワード（フレーズテキストで部分一致）
    - **source_type**: 出典タイプフィルター（BOOK, SNS, OTHER）
    - **activity_ids**: 活動領域IDフィルター（カンマ区切り）
    - **tag_ids**: タグIDフィルター（カンマ区切り）

    **グループ化ルール**:
    - BOOK: 書籍単位でグループ化
    - SNS: SNSユーザー単位でグループ化
    - OTHER: グループ化なし（個別表示）
    """
    try:
        # フレーズを取得
        quotes_query = supabase.table('quotes') \
            .select('''
                id,
                text,
                source_type,
                book_id,
                sns_user_id,
                page_number,
                source_meta,
                created_at,
                books(id, title, author, cover_image_url),
                sns_users(id, platform, handle, display_name),
                quote_activities(activities(id, name, icon)),
                quote_tags(tags(id, name))
            ''') \
            .eq('user_id', user.id) \
            .is_('deleted_at', None)

        # 検索条件
        if search:
            quotes_query = quotes_query.ilike('text', f'%{search}%')

        # 出典タイプフィルター
        if source_type:
            quotes_query = quotes_query.eq('source_type', source_type)

        # 並び順
        quotes_query = quotes_query.order('created_at', desc=True)

        quotes_response = quotes_query.execute()

        if not quotes_response.data:
            return QuotesGroupedResponse(items=[], total=0, has_more=False)

        quotes = quotes_response.data

        # 活動領域フィルター（クライアント側で実施）
        if activity_ids:
            activity_id_list = [int(id) for id in activity_ids.split(',')]
            quotes = [
                quote for quote in quotes
                if any(
                    qa['activities']['id'] in activity_id_list
                    for qa in quote.get('quote_activities', [])
                )
            ]

        # タグフィルター（クライアント側で実施）
        if tag_ids:
            tag_id_list = [int(id) for id in tag_ids.split(',')]
            quotes = [
                quote for quote in quotes
                if any(
                    qt['tags']['id'] in tag_id_list
                    for qt in quote.get('quote_tags', [])
                )
            ]

        # グループ化処理
        grouped_items = []

        # 書籍単位でグループ化
        book_groups = defaultdict(list)
        for quote in quotes:
            if quote['source_type'] == 'BOOK' and quote['book_id']:
                book_groups[quote['book_id']].append(quote)

        for book_id, book_quotes in book_groups.items():
            first_quote = book_quotes[0]
            book_data = first_quote['books']

            quote_list = [
                QuoteInGroup(
                    id=q['id'],
                    text=q['text'],
                    page_number=q.get('page_number'),
                    activities=[ActivityNested(**qa['activities']) for qa in q.get('quote_activities', [])],
                    tags=[TagNested(**qt['tags']) for qt in q.get('quote_tags', [])],
                    created_at=q['created_at']
                )
                for q in book_quotes
            ]

            grouped_items.append(
                BookGroupItem(
                    book=BookNested(**book_data),
                    quotes=quote_list
                )
            )

        # SNSユーザー単位でグループ化
        sns_groups = defaultdict(list)
        for quote in quotes:
            if quote['source_type'] == 'SNS' and quote['sns_user_id']:
                sns_groups[quote['sns_user_id']].append(quote)

        for sns_user_id, sns_quotes in sns_groups.items():
            first_quote = sns_quotes[0]
            sns_user_data = first_quote['sns_users']

            quote_list = [
                QuoteInGroup(
                    id=q['id'],
                    text=q['text'],
                    page_number=None,
                    activities=[ActivityNested(**qa['activities']) for qa in q.get('quote_activities', [])],
                    tags=[TagNested(**qt['tags']) for qt in q.get('quote_tags', [])],
                    created_at=q['created_at']
                )
                for q in sns_quotes
            ]

            grouped_items.append(
                SnsGroupItem(
                    sns_user=SnsUserNested(**sns_user_data),
                    quotes=quote_list
                )
            )

        # その他のフレーズ（グループ化なし）
        for quote in quotes:
            if quote['source_type'] == 'OTHER':
                quote_with_details = QuoteWithDetails(
                    id=quote['id'],
                    text=quote['text'],
                    page_number=quote.get('page_number'),
                    activities=[ActivityNested(**qa['activities']) for qa in quote.get('quote_activities', [])],
                    tags=[TagNested(**qt['tags']) for qt in quote.get('quote_tags', [])],
                    created_at=quote['created_at']
                )
                grouped_items.append(
                    OtherGroupItem(quote=quote_with_details)
                )

        # ページネーション適用
        total = len(grouped_items)
        paginated_items = grouped_items[offset:offset + limit]
        has_more = offset + limit < total

        return QuotesGroupedResponse(
            items=paginated_items,
            total=total,
            has_more=has_more
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] グループ化フレーズ取得エラー: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )
