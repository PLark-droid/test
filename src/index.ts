/**
 * Larkカレンダー空き時間提案アプリ
 *
 * Larkカレンダーと連携して、空いている時間帯を自動的に検出し、候補日時を提案します
 */

import 'dotenv/config';
import { MeetingSuggestionService } from './services/meetingSuggestionService.js';
import { MessageService } from './services/messageService.js';
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
    const shouldSendToChat = process.env.SEND_TO_CHAT === 'true';
    const userId = process.env.LARK_USER_ID;

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

    // チャットに送信
    if (shouldSendToChat && userId && hasLarkCredentials && !suggestions.isDemo) {
      console.log('\n📤 チャットに送信中...\n');

      const messageService = new MessageService();
      await messageService.sendMeetingSuggestions(suggestions, {
        userId,
        receiveIdType: 'open_id',
      });

      console.log('✅ チャットへの送信が完了しました！\n');
    } else if (shouldSendToChat && suggestions.isDemo) {
      console.log('\n💡 デモモードではチャット送信はスキップされます');
      console.log('💡 実際のLarkアカウントに送信するには .env に認証情報を設定してください\n');
    } else if (shouldSendToChat && !userId) {
      console.log('\n⚠️  LARK_USER_ID が設定されていないため、チャット送信をスキップしました');
      console.log('💡 .env に LARK_USER_ID を設定してください\n');
    }

    if (suggestions.isDemo) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('実際のLarkカレンダーを使用してチャットに送信する方法:');
      console.log('1. .env ファイルに以下を設定:');
      console.log('   LARK_APP_ID=your_app_id');
      console.log('   LARK_APP_SECRET=your_app_secret');
      console.log('   LARK_USER_ID=your_open_id');
      console.log('   SEND_TO_CHAT=true');
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
