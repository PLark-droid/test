/**
 * Larkカスタムアプリ作成チュートリアル
 */

export function showLarkSetupTutorial(): void {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║      📚 Larkカスタムアプリ作成チュートリアル                  ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('このアプリを実際のLarkカレンダーと連携するには、');
  console.log('Lark開発者コンソールでカスタムアプリを作成する必要があります。\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 ステップ1: Lark開発者コンソールにアクセス');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. ブラウザで以下のURLを開く:');
  console.log('   🔗 https://open.feishu.cn/app\n');

  console.log('2. Larkアカウントでログイン\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 ステップ2: 新しいアプリを作成');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. 「创建企业自建应用」（企業向けカスタムアプリを作成）をクリック\n');

  console.log('2. アプリ情報を入力:');
  console.log('   • アプリ名: 「カレンダー空き時間提案」など');
  console.log('   • アプリ説明: 適当な説明を入力');
  console.log('   • アイコン: お好きな画像をアップロード（オプション）\n');

  console.log('3. 「确定」（確定）をクリック\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 ステップ3: App IDとApp Secretを取得');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. 作成したアプリをクリック\n');

  console.log('2. 左メニューから「凭证与基础信息」（認証情報と基本情報）を選択\n');

  console.log('3. 以下の情報をコピー:');
  console.log('   • App ID: cli_xxxxxxxxxx の形式');
  console.log('   • App Secret: クリックして表示 → コピー\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ステップ4: 権限設定（APIスコープ）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('このアプリには3つのAPIスコープが必要です。');
  console.log('Developer Consoleの「权限管理」(Permissions) で設定してください。\n');

  console.log('📌 画面左メニューから以下をクリック:');
  console.log('   「权限管理」(Permissions)\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🔍 【スコープ1/3】カレンダー読み取り');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('スコープ識別子:');
  console.log('   ┌─────────────────────────────┐');
  console.log('   │ calendar:calendar:readonly  │');
  console.log('   └─────────────────────────────┘\n');

  console.log('設定方法:');
  console.log('   1. 検索ボックスに "calendar" と入力');
  console.log('   2. Calendar セクションを展開');
  console.log('   3. アプリ身分でのカレンダー読み取り権限をチェック\n');

  console.log('UI表示例:');
  console.log('   🇺🇸 Access calendar and schedule information as the app');
  console.log('   🇨🇳 以应用身份读取日历信息\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🔍 【スコープ2/3】メッセージ送受信');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('スコープ識別子:');
  console.log('   ┌─────────────────────────────┐');
  console.log('   │ im:message                  │');
  console.log('   └─────────────────────────────┘\n');

  console.log('設定方法:');
  console.log('   1. 検索ボックスに "message" と入力');
  console.log('   2. Messaging セクションを展開');
  console.log('   3. メッセージ取得・送信権限をチェック\n');

  console.log('UI表示例:');
  console.log('   🇺🇸 Obtain and send messages in private and group chats');
  console.log('   🇨🇳 获取与发送单聊、群组消息\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🔍 【スコープ3/3】Bot送信');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('スコープ識別子:');
  console.log('   ┌─────────────────────────────────┐');
  console.log('   │ im:message:send_as_bot          │');
  console.log('   └─────────────────────────────────┘\n');

  console.log('設定方法:');
  console.log('   1. 検索ボックスに "send as bot" と入力');
  console.log('   2. Messaging セクションを展開');
  console.log('   3. アプリとしてのメッセージ送信権限をチェック\n');

  console.log('UI表示例:');
  console.log('   🇺🇸 Send messages as the app');
  console.log('   🇨🇳 以应用的身份发送消息\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ 設定完了');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. ページ右上の「保存」(Save) ボタンをクリック\n');

  console.log('2. 確認方法:');
  console.log('   ページをリロードして、3つのスコープにチェックが入っていればOK！\n');

  console.log('💡 重要:');
  console.log('   スコープ識別子 (例: calendar:calendar:readonly) は言語設定に');
  console.log('   関係なく常に同じです。UIの表示名は言語で変わります。\n');

  console.log('📚 詳細なスコープ情報:');
  console.log('   プロジェクトの PERMISSIONS.md を参照してください\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 ステップ5: アプリを公開');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. 左メニューから「版本管理与发布」（バージョン管理と公開）を選択\n');

  console.log('2. 「创建版本」（バージョン作成）をクリック\n');

  console.log('3. バージョン情報を入力して「保存」\n');

  console.log('4. 「申请线上版本发布」（本番公開申請）をクリック\n');

  console.log('5. 承認されるまで待つ（通常数分〜数時間）\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 ステップ6: あなたのUser IDを取得（チャット送信用）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('チャットに送信するには、あなたのLark User ID（Open ID）が必要です。\n');

  console.log('取得方法:');
  console.log('1. Larkアプリで「マイページ」を開く\n');

  console.log('2. 自分のプロフィールをクリック\n');

  console.log('3. 「詳細情報」または「ユーザーID」をコピー\n');

  console.log('   または、開発者コンソールで:');
  console.log('   - 左メニュー「开发配置」→「通讯录权限」');
  console.log('   - テストユーザーとして自分を追加してIDを確認\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚙️  ステップ7: このアプリに認証情報を設定');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. プロジェクトディレクトリで .env ファイルを作成:');
  console.log('   ```bash');
  console.log('   cp .env.example .env');
  console.log('   ```\n');

  console.log('2. .env ファイルを開いて以下を設定:');
  console.log('   ```');
  console.log('   LARK_APP_ID=cli_xxxxxxxxxx      # ← ステップ3で取得');
  console.log('   LARK_APP_SECRET=xxxxxxxxxxxxx   # ← ステップ3で取得');
  console.log('   LARK_CALENDAR_ID=primary        # デフォルトのまま');
  console.log('   LARK_USER_ID=ou_xxxxxxxxxx      # ← ステップ6で取得');
  console.log('   SEND_TO_CHAT=true               # チャット送信を有効化');
  console.log('   ```\n');

  console.log('3. アプリを実行:');
  console.log('   ```bash');
  console.log('   npm run dev');
  console.log('   ```\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 完了！');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('これで実際のLarkカレンダーと連携できます！\n');

  console.log('💡 トラブルシューティング:\n');
  console.log('  • エラーが出る場合:');
  console.log('    - App IDとApp Secretが正しいか確認');
  console.log('    - アプリが公開されているか確認');
  console.log('    - 権限が正しく設定されているか確認\n');

  console.log('  • カレンダーが見つからない場合:');
  console.log('    - LARK_CALENDAR_ID を確認');
  console.log('    - Larkアカウントにカレンダーがあるか確認\n');

  console.log('  • 質問がある場合:');
  console.log('    - Lark開発者ドキュメント: https://open.feishu.cn/document/\n');

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  設定が完了したら npm run dev を実行してください！           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}
