'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // 認証済みユーザーは /my-quotes にリダイレクト
    router.push('/my-quotes');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    </div>
  );
}
