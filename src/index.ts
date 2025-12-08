/**
 * Larkカレンダー空き時間提案アプリ
 *
 * Larkカレンダーと連携して、空いている時間帯を自動的に検出し、候補日時を提案します
 */

import 'dotenv/config';
import { MeetingSuggestionService } from './services/meetingSuggestionService.js';
import { showLarkSetupTutorial } from './tutorial.js';

export async function main(): Promise<void> {
  // チュートリアルモードチェック
  const args = process.argv.slice(2);
  if (args.includes('--tutorial') || args.includes('--help-setup')) {
    showLarkSetupTutorial();
    return;
  }

  try {
    console.log('🗓️  Larkカレンダー空き時間提案アプリ\n');

    // 環境変数チェック
    const hasLarkCredentials = process.env.LARK_APP_ID && process.env.LARK_APP_SECRET;

    if (!hasLarkCredentials) {
      console.log('💡 Lark API認証情報が設定されていないため、デモモードで実行します');
      console.log('💡 実際のカレンダーを使用する場合は .env に設定を追加してください\n');
    }

    const service = new MeetingSuggestionService();

    console.log('カレンダーを確認中...\n');

    const suggestions = await service.suggestMeetingTimes({
      daysAhead: 7,
      maxSuggestions: 5,
    });

    const formattedOutput = service.formatSuggestions(suggestions);
    console.log(formattedOutput);

    if (suggestions.isDemo) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('実際のLarkカレンダーを使用する方法:');
      console.log('1. .env ファイルに以下を設定:');
      console.log('   LARK_APP_ID=your_app_id');
      console.log('   LARK_APP_SECRET=your_app_secret');
      console.log('2. npm run dev を再実行');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n💡 詳しいセットアップ手順を見るには:');
      console.log('   npm run dev -- --tutorial');
      console.log('');
    }

  } catch (error) {
    console.error('エラーが発生しました:', error);
    if (error instanceof Error) {
      console.error('詳細:', error.message);
    }
    throw error;
  }
}

// Run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
