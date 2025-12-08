import { LarkClient } from './larkClient.js';
import { MeetingSuggestion } from './meetingSuggestionService.js';

export interface SendMessageOptions {
  userId: string;
  receiveIdType?: 'open_id' | 'user_id' | 'email';
}

export class MessageService {
  private client: LarkClient;

  constructor() {
    this.client = new LarkClient();
  }

  /**
   * 候補日時をカードメッセージとして送信
   */
  async sendMeetingSuggestions(
    suggestion: MeetingSuggestion,
    options: SendMessageOptions
  ): Promise<void> {
    const card = this.buildMeetingSuggestionCard(suggestion);

    await this.sendMessage(options.userId, card, options.receiveIdType || 'open_id');
  }

  /**
   * カードメッセージを構築
   */
  private buildMeetingSuggestionCard(suggestion: MeetingSuggestion): object {
    const elements: any[] = [];

    // ヘッダー
    elements.push({
      tag: 'markdown',
      content: `**🗓️ 空き時間候補**\n検索期間: ${suggestion.searchPeriod.start.split('T')[0]} 〜 ${suggestion.searchPeriod.end.split('T')[0]}`,
    });

    elements.push({
      tag: 'hr',
    });

    // おすすめの候補
    if (suggestion.suggestedSlots.length > 0) {
      elements.push({
        tag: 'markdown',
        content: '**📌 おすすめの候補日時**',
      });

      suggestion.suggestedSlots.forEach((slot, index) => {
        const start = slot.start.toLocaleString('ja-JP', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const end = slot.end.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        });

        elements.push({
          tag: 'div',
          text: {
            tag: 'plain_text',
            content: `${index + 1}. ${start} 〜 ${end} (${slot.duration}分)`,
          },
        });
      });

      elements.push({
        tag: 'hr',
      });
    }

    // 日別の空き時間（最初の3日分のみ）
    elements.push({
      tag: 'markdown',
      content: '**📅 日別の空き時間（抜粋）**',
    });

    suggestion.availableSlots.slice(0, 3).forEach(daySlot => {
      elements.push({
        tag: 'markdown',
        content: `**${daySlot.date}**`,
      });

      daySlot.timeSlots.slice(0, 3).forEach(slot => {
        const start = slot.start.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const end = slot.end.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        });

        elements.push({
          tag: 'div',
          text: {
            tag: 'plain_text',
            content: `  • ${start} 〜 ${end} (${slot.duration}分)`,
          },
        });
      });
    });

    // カード全体の構造
    return {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: '🗓️ カレンダー空き時間提案',
          },
          template: 'blue',
        },
        elements,
      },
    };
  }

  /**
   * テキストメッセージを送信（シンプル版）
   */
  async sendTextMessage(
    userId: string,
    text: string,
    receiveIdType: 'open_id' | 'user_id' | 'email' = 'open_id'
  ): Promise<void> {
    const message = {
      msg_type: 'text',
      content: JSON.stringify({
        text,
      }),
    };

    await this.sendMessage(userId, message, receiveIdType);
  }

  /**
   * メッセージ送信の共通処理
   */
  private async sendMessage(
    userId: string,
    message: object,
    receiveIdType: 'open_id' | 'user_id' | 'email'
  ): Promise<void> {
    try {
      const response = await this.client.post<{ message_id: string }>(
        `/im/v1/messages?receive_id_type=${receiveIdType}`,
        {
          receive_id: userId,
          ...message,
        }
      );

      console.log(`✅ メッセージ送信成功: ${response.message_id}`);
    } catch (error) {
      console.error('❌ メッセージ送信エラー:', error);
      throw error;
    }
  }
}
