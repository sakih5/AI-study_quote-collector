import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">利用規約</h1>

        <div className="space-y-6 text-gray-700">
          <p className="text-sm text-gray-500">最終更新日: 2025年11月15日</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">第1条（はじめに）</h2>
            <p>
              この利用規約（以下「本規約」といいます）は、「抜き書きアプリ」（以下「本サービス」といいます）の利用に関する条件を定めるものです。
              本サービスをご利用いただく際には、本規約に同意いただく必要があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">第2条（サービス概要）</h2>
            <p>
              本サービスは、書籍やSNS、その他の情報源から収集したフレーズ（抜き書き）を登録・整理・管理するためのWebアプリケーションです。
              ユーザーは以下の機能を利用できます：
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>フレーズの登録・編集・削除</li>
              <li>活動領域やタグによる分類</li>
              <li>検索機能によるフレーズの検索</li>
              <li>CSVエクスポート機能</li>
              <li>OCR機能による画像からのテキスト抽出</li>
              <li>フレーズの公開設定（任意）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">第3条（アカウント登録）</h2>
            <p>
              本サービスを利用するには、メールアドレスとパスワード、またはGoogleアカウント・GitHubアカウントを使用してアカウントを登録する必要があります。
              登録情報は正確かつ最新のものを提供してください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">第4条（ユーザーの責任）</h2>
            <p>ユーザーは以下の事項について責任を負うものとします：</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>自身のアカウント情報（パスワード等）の管理</li>
              <li>登録するフレーズの内容が第三者の著作権、プライバシー権、その他の権利を侵害しないこと</li>
              <li>他のユーザーや第三者に迷惑をかけない適切な利用</li>
              <li>公開設定したフレーズの内容に関する責任</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">第5条（禁止事項）</h2>
            <p>本サービスの利用にあたり、以下の行為を禁止します：</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>法令に違反する行為</li>
              <li>第三者の権利を侵害する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>不正アクセスやシステムへの攻撃行為</li>
              <li>他のユーザーになりすます行為</li>
              <li>その他、本サービスの趣旨に反する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">第6条（データの取り扱い）</h2>
            <p>
              ユーザーが登録したフレーズやその他のデータは、Supabase（PostgreSQL）を使用して安全に保管されます。
              公開設定されたフレーズは、未ログインユーザーを含む第三者から閲覧可能となります。
              非公開設定のフレーズは、ユーザー本人のみが閲覧できます。
            </p>
            <p className="mt-2">
              ユーザーのメールアドレスやその他の個人情報は、サービス提供の目的のみに使用され、第三者に開示されることはありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">第7条（著作権）</h2>
            <p>
              ユーザーが登録したフレーズの著作権は、元の著作物の著作権者に帰属します。
              本サービスは、フレーズの保管・整理を目的としたツールであり、著作権侵害を助長するものではありません。
              ユーザーは、著作権法の範囲内（私的使用目的の複製等）で本サービスを利用する責任を負います。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">第8条（免責事項）</h2>
            <p>
              本サービスは「現状有姿」で提供されます。サービスの正確性、完全性、有用性、安全性について、いかなる保証も行いません。
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>本サービスの利用によって生じた損害について、運営者は一切の責任を負いません</li>
              <li>データの消失、破損について、運営者は責任を負いません（定期的なバックアップを推奨します）</li>
              <li>OCR機能の精度や、外部サービス（Amazon、SNS等）からの情報取得の正確性について保証しません</li>
              <li>システム障害やメンテナンスによるサービス停止の可能性があります</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">第9条（サービスの変更・終了）</h2>
            <p>
              運営者は、ユーザーへの事前の通知なく、本サービスの内容を変更、追加、または終了することができます。
              サービス終了の際は、可能な限り事前に告知を行いますが、データのエクスポート機能（CSV）を利用してバックアップを取ることを推奨します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">第10条（規約の変更）</h2>
            <p>
              運営者は、必要に応じて本規約を変更することができます。
              変更後の規約は、本ページに掲載された時点で効力を生じるものとします。
              継続して本サービスを利用することで、変更後の規約に同意したものとみなされます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">第11条（準拠法・管轄裁判所）</h2>
            <p>
              本規約の解釈にあたっては、日本法を準拠法とします。
              本サービスに関して紛争が生じた場合、運営者の所在地を管轄する裁判所を専属的合意管轄とします。
            </p>
          </section>

          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">お問い合わせ</h2>
            <p>
              本規約またはサービスに関するご質問は、GitHubのissueまたはアカウント登録時のメールアドレスよりお問い合わせください。
            </p>
          </section>
        </div>

        {/* 戻るボタン */}
        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
