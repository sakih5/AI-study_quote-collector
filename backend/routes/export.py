from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from supabase import Client
from auth import get_current_user, get_supabase_client
from services.csv_generator import generate_csv_from_quotes, generate_csv_filename

router = APIRouter(
    prefix="/api/export",
    tags=["export"]
)


@router.get("/csv")
async def export_quotes_csv(
    search: str = Query("", description="検索キーワード（フレーズテキスト）"),
    source_type: str = Query("", description="出典タイプ（BOOK, SNS, OTHER）"),
    activity_ids: str = Query("", description="活動領域ID（カンマ区切り）"),
    tag_ids: str = Query("", description="タグID（カンマ区切り）"),
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    フレーズをCSV形式でエクスポートする

    - **認証**: 必須
    - **search**: 検索キーワード（フレーズテキスト）
    - **source_type**: 出典タイプ（BOOK, SNS, OTHER）
    - **activity_ids**: 活動領域ID（カンマ区切り）例: 1,2,3
    - **tag_ids**: タグID（カンマ区切り）例: 10,20,30
    """
    try:
        # フレーズを取得（フィルター条件付き）
        query = supabase.table('quotes') \
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
                quote_activities(
                    activities(id, name, icon)
                ),
                quote_tags(
                    tags(id, name)
                )
            ''') \
            .eq('user_id', user.id) \
            .is_('deleted_at', 'null')

        # 検索条件
        if search:
            query = query.ilike('text', f'%{search}%')

        # 出典タイプフィルター
        if source_type:
            query = query.eq('source_type', source_type)

        # 並び順（登録日時の降順）
        query = query.order('created_at', desc=True)

        response = query.execute()

        if not response.data:
            quotes = []
        else:
            quotes = response.data

        # 活動領域フィルター（クライアント側で実施）
        if activity_ids:
            activity_ids_list = [int(id.strip()) for id in activity_ids.split(',') if id.strip()]
            quotes = [
                q for q in quotes
                if any(
                    qa.get('activities', {}).get('id') in activity_ids_list
                    for qa in q.get('quote_activities', [])
                )
            ]

        # タグフィルター（クライアント側で実施）
        if tag_ids:
            tag_ids_list = [int(id.strip()) for id in tag_ids.split(',') if id.strip()]
            quotes = [
                q for q in quotes
                if any(
                    qt.get('tags', {}).get('id') in tag_ids_list
                    for qt in q.get('quote_tags', [])
                )
            ]

        # CSV生成
        csv_content = generate_csv_from_quotes(quotes)
        filename = generate_csv_filename()

        # CSVレスポンスを返す
        return Response(
            content=csv_content.encode('utf-8'),
            media_type='text/csv; charset=utf-8',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )

    except Exception as e:
        print(f"[ERROR] CSVエクスポートエラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )
