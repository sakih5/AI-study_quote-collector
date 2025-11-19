/**
 * テストデータ自動登録スクリプト（100件以上）
 *
 * 使い方：
 * 1. ブラウザでアプリにログイン（http://localhost:3001）
 * 2. F12でDevToolsを開く
 * 3. Consoleタブを開く
 * 4. このスクリプトをコピー&ペーストして実行
 */

async function seedTestData() {
  console.log('🚀 テストデータの登録を開始します...');
  console.log('📊 目標: 100件以上のフレーズを登録');

  // サンプル書籍データ（10冊）
  const books = [
    { title: '深い仕事', author: 'カル・ニューポート', publisher: 'ダイヤモンド社' },
    { title: 'エッセンシャル思考', author: 'グレッグ・マキューン', publisher: 'かんき出版' },
    { title: 'アルゴリズム思考術', author: 'ブライアン・クリスチャン', publisher: '早川書房' },
    { title: 'FACTFULNESS', author: 'ハンス・ロスリング', publisher: '日経BP' },
    { title: 'サピエンス全史', author: 'ユヴァル・ノア・ハラリ', publisher: '河出書房新社' },
    { title: '習慣の力', author: 'チャールズ・デュヒッグ', publisher: '講談社' },
    { title: 'LIFE SHIFT', author: 'リンダ・グラットン', publisher: '東洋経済新報社' },
    { title: '7つの習慣', author: 'スティーブン・コヴィー', publisher: 'キングベアー出版' },
    { title: 'ゼロ秒思考', author: '赤羽雄二', publisher: 'ダイヤモンド社' },
    { title: 'イシューからはじめよ', author: '安宅和人', publisher: '英治出版' },
  ];

  // サンプルSNSユーザー
  const snsUsers = [
    { platform: 'X', handle: 'paulg', display_name: 'Paul Graham' },
    { platform: 'X', handle: 'naval', display_name: 'Naval Ravikant' },
    { platform: 'THREADS', handle: 'zuck', display_name: 'Mark Zuckerberg' },
  ];

  // サンプルフレーズ
  const sampleQuotes = [
    '集中は筋肉のように鍛えられる。',
    '重要な少数へ資源を配分せよ。',
    'やらないことリストは、やることリスト以上に強力だ。',
    'トレードオフを直視する勇気。',
    '停止問題は日常の締切にも該当する。',
    '探索と活用のバランスを取れ。',
    '完璧を目指すな、まず終わらせろ。',
    '失敗から学ぶより、成功から学べ。',
    '時間は最も貴重な資源である。',
    '単純さは洗練の極みである。',
    '知識は力なり、しかし実行はそれ以上だ。',
    '質問することは知恵の始まりである。',
    '変化を恐れるな、停滞を恐れよ。',
    '小さな一歩が大きな変化を生む。',
    '批判は成長の種である。',
    'マルチタスクは生産性の敵だ。',
    '習慣が人生を形作る。',
    '今日できることを明日に延ばすな。',
    '読書は心の栄養である。',
    '創造性は制約から生まれる。',
  ];

  // 活動領域ID（1〜10）
  const activityIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  let successCount = 0;
  let errorCount = 0;

  try {
    // 1. 既存の書籍を取得
    console.log('📚 既存の書籍を確認中...');
    let bookIds = [];
    try {
      const existingBooksRes = await fetch('/api/books?limit=100');
      if (existingBooksRes.ok) {
        const existingData = await existingBooksRes.json();
        bookIds = existingData.books.map(b => b.id);
        console.log(`✅ 既存の書籍: ${bookIds.length}冊`);
      }
    } catch (e) {
      console.log('既存の書籍取得失敗、新規登録のみ行います');
    }

    // 2. 新しい書籍を登録
    console.log('📚 新しい書籍を登録中...');
    for (const book of books) {
      try {
        const response = await fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(book),
        });
        if (response.ok) {
          const data = await response.json();
          if (!bookIds.includes(data.book.id)) {
            bookIds.push(data.book.id);
          }
          console.log(`✅ 書籍「${book.title}」を登録しました`);
        }
      } catch (e) {
        console.log(`⚠️ 書籍「${book.title}」はスキップ（既存）`);
      }
    }

    console.log(`📚 利用可能な書籍: ${bookIds.length}冊`);

    if (bookIds.length === 0) {
      console.error('❌ 書籍が1冊も登録できませんでした。処理を中断します。');
      return;
    }

    // 3. SNSユーザーの処理（オプション - エラーでも続行）
    console.log('👤 SNSユーザーを登録中...');
    let snsUserIds = [];
    try {
      const existingSnsRes = await fetch('/api/sns-users?limit=100');
      if (existingSnsRes.ok) {
        const existingSnsData = await existingSnsRes.json();
        snsUserIds = existingSnsData.sns_users.map(u => u.id);
        console.log(`✅ 既存のSNSユーザー: ${snsUserIds.length}人`);
      }
    } catch (e) {
      console.log('既存のSNSユーザー取得失敗');
    }

    for (const user of snsUsers) {
      try {
        const response = await fetch('/api/sns-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        if (response.ok) {
          const data = await response.json();
          if (!snsUserIds.includes(data.sns_user.id)) {
            snsUserIds.push(data.sns_user.id);
          }
          console.log(`✅ SNSユーザー「@${user.handle}」を登録しました`);
        }
      } catch (e) {
        console.log(`⚠️ SNSユーザー「@${user.handle}」はスキップ`);
      }
    }

    console.log(`👤 利用可能なSNSユーザー: ${snsUserIds.length}人`);

    // 4. タグを登録
    console.log('🏷️ タグを登録中...');
    const tagNames = ['#集中', '#生産性', '#習慣', '#意思決定', '#学習', '#時間管理'];
    let tagIds = [];

    try {
      const existingTagsRes = await fetch('/api/tags');
      if (existingTagsRes.ok) {
        const existingTagsData = await existingTagsRes.json();
        tagIds = existingTagsData.tags.map(t => t.id);
        console.log(`✅ 既存のタグ: ${tagIds.length}個`);
      }
    } catch (e) {
      console.log('既存のタグ取得失敗');
    }

    for (const tagName of tagNames) {
      try {
        const response = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: tagName }),
        });
        if (response.ok) {
          const data = await response.json();
          if (!tagIds.includes(data.tag.id)) {
            tagIds.push(data.tag.id);
          }
          console.log(`✅ タグ「${tagName}」を登録しました`);
        }
      } catch (e) {
        console.log(`⚠️ タグ「${tagName}」はスキップ`);
      }
    }

    console.log(`🏷️ 利用可能なタグ: ${tagIds.length}個`);

    // 5. フレーズを登録（合計120件：書籍のみで確実に100件以上）
    console.log('💬 フレーズを登録中...');
    console.log('📝 書籍のフレーズを120件登録します...');

    // 書籍のフレーズ（120件）
    if (bookIds.length > 0) {
      for (let i = 0; i < 120; i++) {
        const bookId = bookIds[i % bookIds.length];
        const quote = sampleQuotes[i % sampleQuotes.length];
        const randomActivityIds = activityIds
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 3) + 1);
        const randomTagIds = tagIds.length > 0
          ? tagIds.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3))
          : [];

        try {
          const response = await fetch('/api/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quotes: [
                {
                  text: `${quote} (書籍テスト #${i + 1})`,
                  activity_ids: randomActivityIds,
                  tag_ids: randomTagIds,
                },
              ],
              source_type: 'BOOK',
              book_id: bookId,
              page_number: Math.floor(Math.random() * 300) + 1,
            }),
          });

          if (response.ok) {
            successCount++;
            if ((i + 1) % 10 === 0) {
              console.log(`  ✅ ${i + 1}/120 件完了...`);
            }
          } else {
            errorCount++;
            const errorData = await response.json();
            console.error(`  ❌ ${i + 1}件目失敗:`, errorData.error?.message);
          }
        } catch (e) {
          errorCount++;
          console.error(`  ❌ ${i + 1}件目エラー:`, e.message);
        }

        // 少し待機（APIの負荷を軽減）
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      console.log(`✅ 書籍のフレーズ ${successCount}/${120} 件登録完了`);
    }

    console.log('\n🎉 テストデータの登録が完了しました！');
    console.log('='.repeat(50));
    console.log(`📊 結果: ${successCount}件成功 / ${errorCount}件失敗`);
    console.log(`📚 登録された書籍: ${bookIds.length}冊`);
    console.log(`🏷️ 登録されたタグ: ${tagIds.length}個`);
    console.log('='.repeat(50));

    if (successCount >= 50) {
      console.log('\n✅ 50件以上のフレーズが登録されました！');
      console.log('📄 ページをリロードすると「もっと見る」ボタンが表示されます。');
    } else {
      console.warn('\n⚠️ 50件未満です。スクリプトを再実行してください。');
    }

    console.log('\n🔄 ページをリロードしてください (F5 または Cmd+R)');
    console.log('\n💡 テストデータを削除する場合:');
    console.log('   各フレーズの🗑️ボタンで削除できます');

  } catch (err) {
    console.error('❌ エラーが発生しました:', err);
  }
}

// 実行
seedTestData();
