from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from auth import get_current_user, get_supabase_client
from models.tag import (
    TagsResponse, TagWithMetadata, TagResponse, Tag,
    TagCreate, TagUpdate, TagMerge,
    TagDeleteResponse, TagMergeResponse, TagMergeResult
)
from typing import Optional

router = APIRouter(
    prefix="/api/tags",
    tags=["tags"]
)


@router.get("", response_model=TagsResponse)
async def get_tags(
    search: Optional[str] = Query(None, description="タグ名検索"),
    sort: str = Query("created_at", description="ソート項目（created_at, name, usage_count）"),
    order: str = Query("desc", description="ソート順（asc, desc）"),
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    タグ一覧を取得

    - **認証**: 必須
    - **検索**: タグ名で部分一致検索
    - **ソート**: created_at, name, usage_count
    - **メタデータ**: 各タグの使用数と活動領域別分布を含む
    """
    try:
        # タグ一覧を取得
        query = supabase.table('tags') \
            .select('id, name, created_at') \
            .eq('user_id', user.id) \
            .is_('deleted_at', 'null')

        # 検索条件を追加
        if search:
            query = query.ilike('name', f'%{search}%')

        # ソート条件を追加（usage_count以外）
        ascending = order == 'asc'
        if sort in ['name', 'created_at']:
            query = query.order(sort, desc=not ascending)

        response = query.execute()

        if response.data is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="タグの取得に失敗しました"
            )

        tags = response.data

        # 各タグのメタデータを取得
        tags_with_metadata = []
        for tag in tags:
            # 使用数を取得
            count_response = supabase.table('quote_tags') \
                .select('*', count='exact', head=True) \
                .eq('tag_id', tag['id']) \
                .execute()

            usage_count = count_response.count or 0

            # 活動領域別分布を取得
            # quote_tags -> quotes -> quote_activities -> activity_id
            distribution_response = supabase.table('quote_tags') \
                .select('quote_id, quotes!inner(quote_activities!inner(activity_id))') \
                .eq('tag_id', tag['id']) \
                .execute()

            # 活動領域別にカウント
            activity_distribution = {}
            if distribution_response.data:
                for item in distribution_response.data:
                    if item.get('quotes') and item['quotes'].get('quote_activities'):
                        for qa in item['quotes']['quote_activities']:
                            activity_id = qa['activity_id']
                            activity_distribution[activity_id] = activity_distribution.get(activity_id, 0) + 1

            tags_with_metadata.append(
                TagWithMetadata(
                    id=tag['id'],
                    name=tag['name'],
                    created_at=tag['created_at'],
                    usage_count=usage_count,
                    activity_distribution=activity_distribution
                )
            )

        # usage_countでソートする場合
        if sort == 'usage_count':
            tags_with_metadata.sort(
                key=lambda x: x.usage_count,
                reverse=(order == 'desc')
            )

        return TagsResponse(
            tags=tags_with_metadata,
            total=len(tags_with_metadata)
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] タグ取得エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_data: TagCreate,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    新規タグを作成

    - **認証**: 必須
    - **タグ名**: #は自動付与される
    - **重複チェック**: 同名の既存タグがあれば409エラー
    - **復活**: 削除済みタグが存在する場合は復活
    """
    try:
        # タグ名が#で始まっていない場合は追加
        tag_name = tag_data.name if tag_data.name.startswith('#') else f'#{tag_data.name}'

        # 同名のアクティブなタグが存在しないかチェック
        active_tag_response = supabase.table('tags') \
            .select('id') \
            .eq('user_id', user.id) \
            .eq('name', tag_name) \
            .is_('deleted_at', 'null') \
            .execute()

        if active_tag_response.data and len(active_tag_response.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="同じ名前のタグが既に存在します"
            )

        # 同名の削除済みタグがあるかチェック（全タグ取得後にPythonでフィルタ）
        all_tags_response = supabase.table('tags') \
            .select('id, name, created_at, deleted_at') \
            .eq('user_id', user.id) \
            .eq('name', tag_name) \
            .execute()

        # deleted_atがNoneでないもの（削除済み）を抽出
        deleted_tags = [tag for tag in (all_tags_response.data or []) if tag.get('deleted_at') is not None]

        tag = None

        if deleted_tags and len(deleted_tags) > 0:
            # 削除済みタグを復活させる
            deleted_tag = deleted_tags[0]
            restore_response = supabase.table('tags') \
                .update({'deleted_at': None}) \
                .eq('id', deleted_tag['id']) \
                .select('id, name, created_at') \
                .execute()

            if restore_response.data and len(restore_response.data) > 0:
                tag = restore_response.data[0]
        else:
            # 新しいタグを作成
            create_response = supabase.table('tags') \
                .insert({
                    'user_id': user.id,
                    'name': tag_name
                }) \
                .select('id, name, created_at') \
                .execute()

            if create_response.data and len(create_response.data) > 0:
                tag = create_response.data[0]

        if not tag:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="タグの作成に失敗しました"
            )

        return TagResponse(tag=Tag(**tag))

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] タグ作成エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    tag_data: TagUpdate,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    タグ名を変更

    - **認証**: 必須
    - **タグ名**: #は自動付与される
    - **権限チェック**: 自分のタグのみ更新可能
    - **重複チェック**: 同名の別タグがあれば409エラー
    """
    try:
        # タグ名が#で始まっていない場合は追加
        tag_name = tag_data.name if tag_data.name.startswith('#') else f'#{tag_data.name}'

        # タグの存在確認と権限チェック
        existing_tag_response = supabase.table('tags') \
            .select('id') \
            .eq('id', tag_id) \
            .eq('user_id', user.id) \
            .is_('deleted_at', 'null') \
            .execute()

        if not existing_tag_response.data or len(existing_tag_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="タグが見つかりません"
            )

        # 同名の別タグが存在しないかチェック
        duplicate_response = supabase.table('tags') \
            .select('id') \
            .eq('user_id', user.id) \
            .eq('name', tag_name) \
            .neq('id', tag_id) \
            .is_('deleted_at', 'null') \
            .execute()

        if duplicate_response.data and len(duplicate_response.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="同じ名前のタグが既に存在します"
            )

        # タグ名を更新
        update_response = supabase.table('tags') \
            .update({'name': tag_name}) \
            .eq('id', tag_id) \
            .eq('user_id', user.id) \
            .select('id, name, created_at, updated_at') \
            .execute()

        if not update_response.data or len(update_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="タグの更新に失敗しました"
            )

        return TagResponse(tag=Tag(**update_response.data[0]))

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] タグ更新エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )


@router.delete("/{tag_id}", response_model=TagDeleteResponse)
async def delete_tag(
    tag_id: int,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    タグを削除（ソフトデリート）

    - **認証**: 必須
    - **権限チェック**: 自分のタグのみ削除可能
    - **関連削除**: quote_tagsテーブルの関連レコードも削除
    """
    try:
        # タグの存在確認と権限チェック
        existing_tag_response = supabase.table('tags') \
            .select('id') \
            .eq('id', tag_id) \
            .eq('user_id', user.id) \
            .is_('deleted_at', 'null') \
            .execute()

        if not existing_tag_response.data or len(existing_tag_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="タグが見つかりません"
            )

        # quote_tagsテーブルから関連レコードを削除
        supabase.table('quote_tags') \
            .delete() \
            .eq('tag_id', tag_id) \
            .execute()

        # ソフトデリート（deleted_atに現在時刻を設定）
        from datetime import datetime
        delete_response = supabase.table('tags') \
            .update({'deleted_at': datetime.utcnow().isoformat()}) \
            .eq('id', tag_id) \
            .eq('user_id', user.id) \
            .execute()

        if not delete_response.data or len(delete_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="タグの削除に失敗しました"
            )

        return TagDeleteResponse(success=True)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] タグ削除エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )


@router.post("/{source_tag_id}/merge", response_model=TagMergeResponse)
async def merge_tag(
    source_tag_id: int,
    merge_data: TagMerge,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    タグを統合

    - **認証**: 必須
    - **統合元**: source_tag_id（パス）
    - **統合先**: target_tag_id（ボディ）
    - **処理**: source使用中のフレーズをtargetに変更し、sourceを削除
    """
    try:
        target_tag_id = merge_data.target_tag_id

        # 同じタグ同士の統合チェック
        if source_tag_id == target_tag_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="同じタグ同士を統合することはできません"
            )

        # sourceタグの存在確認と権限チェック
        source_tag_response = supabase.table('tags') \
            .select('id, name') \
            .eq('id', source_tag_id) \
            .eq('user_id', user.id) \
            .is_('deleted_at', 'null') \
            .execute()

        if not source_tag_response.data or len(source_tag_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="統合元のタグが見つかりません"
            )

        # targetタグの存在確認と権限チェック
        target_tag_response = supabase.table('tags') \
            .select('id, name') \
            .eq('id', target_tag_id) \
            .eq('user_id', user.id) \
            .is_('deleted_at', 'null') \
            .execute()

        if not target_tag_response.data or len(target_tag_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="統合先のタグが見つかりません"
            )

        # sourceタグが使用されているquote_tagsを取得
        source_quote_tags_response = supabase.table('quote_tags') \
            .select('quote_id') \
            .eq('tag_id', source_tag_id) \
            .execute()

        merged_count = 0

        if source_quote_tags_response.data:
            for quote_tag in source_quote_tags_response.data:
                quote_id = quote_tag['quote_id']

                # targetタグが既に存在するかチェック
                existing_response = supabase.table('quote_tags') \
                    .select('quote_id') \
                    .eq('quote_id', quote_id) \
                    .eq('tag_id', target_tag_id) \
                    .execute()

                if not existing_response.data or len(existing_response.data) == 0:
                    # 存在しない場合は更新
                    update_response = supabase.table('quote_tags') \
                        .update({'tag_id': target_tag_id}) \
                        .eq('quote_id', quote_id) \
                        .eq('tag_id', source_tag_id) \
                        .execute()

                    if update_response.data:
                        merged_count += 1
                else:
                    # 既に存在する場合はsourceを削除
                    supabase.table('quote_tags') \
                        .delete() \
                        .eq('quote_id', quote_id) \
                        .eq('tag_id', source_tag_id) \
                        .execute()

        # sourceタグを削除（ソフトデリート）
        from datetime import datetime
        supabase.table('tags') \
            .update({'deleted_at': datetime.utcnow().isoformat()}) \
            .eq('id', source_tag_id) \
            .eq('user_id', user.id) \
            .execute()

        # targetタグの使用数を取得
        count_response = supabase.table('quote_tags') \
            .select('*', count='exact', head=True) \
            .eq('tag_id', target_tag_id) \
            .execute()

        target_tag = target_tag_response.data[0]

        return TagMergeResponse(
            success=True,
            merged_count=merged_count,
            target_tag=TagMergeResult(
                id=target_tag['id'],
                name=target_tag['name'],
                usage_count=count_response.count or 0
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] タグ統合エラー: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"サーバーエラーが発生しました: {str(e)}"
        )
