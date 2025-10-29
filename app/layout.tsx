import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: '抜き書きアプリ',
  description: '書籍やSNSから重要なフレーズを記録・整理する個人用ナレッジベースアプリ',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
