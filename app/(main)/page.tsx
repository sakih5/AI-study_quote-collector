export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* ウェルカムメッセージ */}
      <div className="bg-[#2a2a2a] rounded-lg p-8 mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">
          ようこそ、抜き書きアプリへ
        </h1>
        <p className="text-gray-400 mb-6">
          本やSNSから気になったフレーズを保存して、あなただけの知識ベースを作りましょう
        </p>
        <div className="flex justify-center gap-4">
          <div className="bg-[#1a1a1a] rounded-lg p-6 flex-1 max-w-xs">
            <div className="text-4xl mb-2">📚</div>
            <h3 className="text-white font-semibold mb-2">フレーズを登録</h3>
            <p className="text-gray-400 text-sm">
              本やSNSから気になった言葉を保存
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-6 flex-1 max-w-xs">
            <div className="text-4xl mb-2">🏷️</div>
            <h3 className="text-white font-semibold mb-2">タグで整理</h3>
            <p className="text-gray-400 text-sm">
              活動領域やタグで分類して管理
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-6 flex-1 max-w-xs">
            <div className="text-4xl mb-2">🔍</div>
            <h3 className="text-white font-semibold mb-2">簡単に検索</h3>
            <p className="text-gray-400 text-sm">
              キーワードやフィルターで素早く見つける
            </p>
          </div>
        </div>
      </div>

      {/* クイックスタートガイド */}
      <div className="bg-[#2a2a2a] rounded-lg p-8">
        <h2 className="text-2xl font-bold text-white mb-6">はじめ方</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              1
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">
                フレーズを登録する
              </h3>
              <p className="text-gray-400 text-sm">
                右下の「+ 新規登録」ボタンから、気になったフレーズを登録しましょう
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              2
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">
                活動領域とタグを付ける
              </h3>
              <p className="text-gray-400 text-sm">
                「仕事・キャリア」「学習・研究」などの活動領域や、自分でタグを作成して整理できます
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              3
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">検索とフィルター</h3>
              <p className="text-gray-400 text-sm">
                キーワード検索や、活動領域・タグのフィルターで必要な情報をすぐに見つけられます
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 未登録メッセージ */}
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">
          まだフレーズが登録されていません
        </p>
        <p className="text-gray-500 text-sm mt-2">
          フレーズを登録すると、ここに一覧が表示されます
        </p>
      </div>

      {/* 固定フローティングボタン（将来の実装用） */}
      <button
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-3xl transition-colors"
        title="新規登録"
      >
        +
      </button>
    </div>
  );
}
