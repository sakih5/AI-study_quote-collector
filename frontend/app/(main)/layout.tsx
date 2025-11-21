import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Header from '@/components/layouts/Header';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 認証チェック
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">{children}</main>
    </div>
  );
}
