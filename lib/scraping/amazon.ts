/**
 * Amazon書籍情報取得機能
 *
 * AmazonのURLから書籍情報（タイトル、著者、画像、ISBN、ASIN）を取得
 */

import * as cheerio from 'cheerio';
import { amazonRateLimiter } from './rate-limiter';

export interface BookInfo {
  title: string;
  author?: string;
  cover_image_url?: string;
  isbn?: string;
  asin: string;
  publisher?: string;
}

/**
 * AmazonのURLからASINを抽出
 */
export function extractAsin(url: string): string | null {
  // Amazon URLのパターン
  // https://www.amazon.co.jp/dp/ASIN
  // https://www.amazon.co.jp/gp/product/ASIN
  // https://www.amazon.co.jp/product-title/dp/ASIN
  // https://www.amazon.com/dp/ASIN
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/,
    /\/product\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * AmazonのURLから書籍情報を取得
 */
export async function fetchBookInfo(url: string): Promise<BookInfo | null> {
  try {
    // ASINを抽出
    const asin = extractAsin(url);
    if (!asin) {
      throw new Error('Invalid Amazon URL: ASIN not found');
    }

    // レート制限付きでリクエスト
    const html = await amazonRateLimiter.executeWithLimit(async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.text();
    });

    // cheerioでHTMLをパース
    const $ = cheerio.load(html);

    // タイトルを取得
    const title =
      $('#productTitle').text().trim() ||
      $('span[id="productTitle"]').text().trim() ||
      $('h1.a-size-large').text().trim();

    if (!title) {
      throw new Error('Book title not found');
    }

    // 著者を取得
    const authorElement = $(
      '.author a.contributorNameID, .author .a-link-normal, #bylineInfo .author a, #bylineInfo .contributorNameID'
    ).first();
    const author = authorElement.text().trim() || undefined;

    // カバー画像を取得
    const coverImageUrl =
      $('#landingImage').attr('src') ||
      $('#imgBlkFront').attr('src') ||
      $('#ebooksImgBlkFront').attr('src') ||
      $('.a-dynamic-image').first().attr('src') ||
      undefined;

    // ISBNを取得（商品詳細から）
    let isbn: string | undefined;
    $('#detailBullets_feature_div li, #detail_bullets_id .content li').each(
      (_, element) => {
        const text = $(element).text();
        const isbnMatch = text.match(/ISBN-13[:\s]*(\d{13})/);
        if (isbnMatch) {
          isbn = isbnMatch[1];
        }
      }
    );

    // 出版社を取得
    let publisher: string | undefined;
    $('#detailBullets_feature_div li, #detail_bullets_id .content li').each(
      (_, element) => {
        const text = $(element).text();
        const publisherMatch = text.match(/出版社[:\s]*([^(;]+)/);
        if (publisherMatch) {
          publisher = publisherMatch[1].trim();
        }
      }
    );

    return {
      title,
      author,
      cover_image_url: coverImageUrl,
      isbn,
      asin,
      publisher,
    };
  } catch (error) {
    console.error('Error fetching book info from Amazon:', error);
    return null;
  }
}

/**
 * URLがAmazonのURLかチェック
 */
export function isAmazonUrl(url: string): boolean {
  return (
    url.includes('amazon.co.jp') ||
    url.includes('amazon.com') ||
    url.includes('amzn.to')
  );
}

/**
 * 短縮URLを展開
 */
export async function expandShortUrl(shortUrl: string): Promise<string> {
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
    });
    return response.url;
  } catch (error) {
    console.error('Error expanding short URL:', error);
    return shortUrl;
  }
}
