/**
 * Larkカレンダー空き時間提案アプリ
 *
 * Larkカレンダーと連携して、空いている時間帯を自動的に検出し、候補日時を提案します
 */

import 'dotenv/config';
import { MeetingSuggestionService } from './services/meetingSuggestionService.js';

export async function main(): Promise<void> {
  try {
    console.log('🗓️  Larkカレンダー空き時間提案アプリ\n');

    const service = new MeetingSuggestionService();

    console.log('カレンダーを確認中...\n');

    const suggestions = await service.suggestMeetingTimes({
      daysAhead: 7,
      maxSuggestions: 5,
    });

    const formattedOutput = service.formatSuggestions(suggestions);
    console.log(formattedOutput);

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
