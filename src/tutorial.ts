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
  console.log('✅ ステップ4: カレンダー権限を設定');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. 左メニューから「权限管理」（権限管理）を選択\n');

  console.log('2. 「日历」（カレンダー）セクションを見つける\n');

  console.log('3. 以下の権限をONにする:');
  console.log('   ✓ 获取日历信息（カレンダー情報の取得）');
  console.log('   ✓ 获取日历日程信息（カレンダーイベント情報の取得）\n');

  console.log('   具体的な権限スコープ:');
  console.log('   • calendar:calendar.event:readonly\n');

  console.log('4. 「保存」をクリック\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 ステップ5: アプリを公開');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. 左メニューから「版本管理与发布」（バージョン管理と公開）を選択\n');

  console.log('2. 「创建版本」（バージョン作成）をクリック\n');

  console.log('3. バージョン情報を入力して「保存」\n');

  console.log('4. 「申请线上版本发布」（本番公開申請）をクリック\n');

  console.log('5. 承認されるまで待つ（通常数分〜数時間）\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚙️  ステップ6: このアプリに認証情報を設定');
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
