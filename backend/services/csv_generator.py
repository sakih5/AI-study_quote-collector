"""
CSVエクスポート機能
"""

import csv
import io
from datetime import datetime
from typing import List, Dict, Any


def generate_csv_from_quotes(quotes: List[Dict[str, Any]]) -> str:
    """
    フレーズリストからCSVを生成

    Args:
        quotes: フレーズデータのリスト

    Returns:
        CSV文字列（BOM付き）
    """
    # BOM付きCSV（Excel対応）
    output = io.StringIO()
    output.write('\ufeff')  # BOM

    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    # ヘッダー
    writer.writerow(['フレーズ', '出典', '活動領域', 'タグ', '登録日時'])

    # データ行
    for quote in quotes:
        # フレーズテキスト
        text = quote.get('text', '')

        # 出典
        source = format_source(quote)

        # 活動領域
        activities = format_activities(quote)

        # タグ
        tags = format_tags(quote)

        # 登録日時
        created_at = format_datetime(quote.get('created_at', ''))

        writer.writerow([text, source, activities, tags, created_at])

    return output.getvalue()


def format_source(quote: Dict[str, Any]) -> str:
    """出典情報をフォーマット"""
    source_type = quote.get('source_type', 'OTHER')

    if source_type == 'BOOK':
        book = quote.get('books')
        if book:
            title = book.get('title', '')
            author = book.get('author', '')
            page = quote.get('page_number')

            source_parts = [title]
            if author:
                source_parts.append(f" - {author}")
            if page:
                source_parts.append(f" (p.{page})")

            return ''.join(source_parts)
        return '（書籍）'

    elif source_type == 'SNS':
        sns_user = quote.get('sns_users')
        if sns_user:
            platform = sns_user.get('platform', 'X')
            handle = sns_user.get('handle', '')
            display_name = sns_user.get('display_name', '')

            if display_name:
                return f"{platform}: {display_name} (@{handle})"
            return f"{platform}: @{handle}"
        return '（SNS）'

    else:  # OTHER
        source_meta = quote.get('source_meta', {})
        if source_meta:
            source_text = source_meta.get('source', '')
            note = source_meta.get('note', '')

            if source_text and note:
                return f"{source_text} - {note}"
            elif source_text:
                return source_text
            elif note:
                return note

        return '（その他）'


def format_activities(quote: Dict[str, Any]) -> str:
    """活動領域をフォーマット"""
    quote_activities = quote.get('quote_activities', [])

    if not quote_activities:
        return ''

    activity_names = []
    for qa in quote_activities:
        activity = qa.get('activities')
        if activity:
            name = activity.get('name', '')
            if name:
                activity_names.append(name)

    return ', '.join(activity_names)


def format_tags(quote: Dict[str, Any]) -> str:
    """タグをフォーマット"""
    quote_tags = quote.get('quote_tags', [])

    if not quote_tags:
        return ''

    tag_names = []
    for qt in quote_tags:
        tag = qt.get('tags')
        if tag:
            name = tag.get('name', '')
            if name:
                tag_names.append(name)

    return ', '.join(tag_names)


def format_datetime(dt_str: str) -> str:
    """日時を日本語フォーマットに変換"""
    if not dt_str:
        return ''

    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        return dt.strftime('%Y年%m月%d日 %H:%M:%S')
    except Exception:
        return dt_str


def generate_csv_filename() -> str:
    """CSVファイル名を生成"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    return f"quotes_export_{timestamp}.csv"
