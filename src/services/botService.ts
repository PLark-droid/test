/**
 * Lark Bot Service
 * Botへのメッセージを処理し、空き時間を返答する
 */

import { LarkClient } from './larkClient.js';
import { MeetingSuggestion } from './meetingSuggestionService.js';
import { UserCalendarService } from './userCalendarService.js';
import { tokenStorage } from './tokenStorage.js';
import { LarkOAuthService } from './larkOAuthService.js';
import { getLarkConfig } from '../config/lark.js';
import { CalendarEvent, AvailableSlot, TimeSlot } from '../types/calendar.js';
import crypto from 'crypto';

interface LarkEventMessage {
  schema: string;
  header: {
    event_id: string;
    event_type: string;
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event: {
    sender: {
      sender_id: {
        open_id: string;
        user_id?: string;
      };
      sender_type: string;
    };
    message: {
      message_id: string;
      root_id?: string;
      parent_id?: string;
      create_time: string;
      chat_id: string;
      chat_type: string;
      message_type: string;
      content: string;
      mentions?: Array<{
        key: string;
        id: {
          open_id: string;
          user_id?: string;
        };
        name: string;
      }>;
    };
  };
}

interface MentionedUser {
  openId: string;
  userId?: string;
  name: string;
}

export class BotService {
  private client: LarkClient;
  private oauthService: LarkOAuthService;
  private processedEvents: Set<string> = new Set();

  constructor() {
    this.client = new LarkClient();
    this.oauthService = new LarkOAuthService();
  }

  /**
   * Webhookリクエストの検証
   */
  verifyRequest(timestamp: string, nonce: string, signature: string, body: string): boolean {
    const verificationToken = process.env.LARK_VERIFICATION_TOKEN;
    if (!verificationToken) {
      console.warn('LARK_VERIFICATION_TOKEN not set, skipping verification');
      return true;
    }

    const content = timestamp + nonce + verificationToken + body;
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return hash === signature;
  }

  /**
   * URL検証チャレンジに応答
   */
  handleChallenge(body: { challenge: string; token: string; type: string }): { challenge: string } {
    console.log('🔐 URL verification challenge received');
    return { challenge: body.challenge };
  }

  /**
   * イベントを処理
   */
  async handleEvent(event: LarkEventMessage): Promise<void> {
    const eventId = event.header.event_id;
    const eventType = event.header.event_type;

    // 重複イベントをスキップ
    if (this.processedEvents.has(eventId)) {
      console.log(`⏭️ Skipping duplicate event: ${eventId}`);
      return;
    }
    this.processedEvents.add(eventId);

    // 古いイベントIDをクリーンアップ（メモリリーク防止）
    if (this.processedEvents.size > 1000) {
      const oldestEvents = Array.from(this.processedEvents).slice(0, 500);
      oldestEvents.forEach(id => this.processedEvents.delete(id));
    }

    console.log(`📨 Event received: ${eventType} (${eventId})`);

    if (eventType === 'im.message.receive_v1') {
      await this.handleMessage(event);
    } else if (eventType === 'im.chat.member.bot.added_v1') {
      // Botがグループに追加されたイベント
      await this.handleBotAddedToGroup(event);
    }
  }

  /**
   * Botがグループに追加された時の処理
   */
  private async handleBotAddedToGroup(event: LarkEventMessage): Promise<void> {
    // イベント構造を柔軟に解析
    const eventData = event.event as unknown as {
      chat_id?: string;
      operator_id?: { open_id: string };
    };

    const chatId = eventData.chat_id;
    if (!chatId) {
      console.log('⚠️ No chat_id in bot added event');
      return;
    }

    console.log(`🤖 Bot added to group: ${chatId}`);

    // ウェルカムメッセージと認証案内を送信
    await this.sendWelcomeMessage(chatId);
  }

  /**
   * ウェルカムメッセージと認証案内を送信
   */
  private async sendWelcomeMessage(chatId: string): Promise<void> {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const authUrl = `${baseUrl}/auth/login`;

    const welcomeCard = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: 'Lark Calendar Bot',
          },
          template: 'blue',
        },
        elements: [
          {
            tag: 'markdown',
            content: '**Botが追加されました！**\n\nこのBotは、あなたとメンバーの共通空き時間を検索できます。',
          },
          {
            tag: 'hr',
          },
          {
            tag: 'markdown',
            content: '**初回セットアップ**\n\n空き時間機能を使うには、カレンダーへのアクセス許可が必要です。\n下のボタンをクリックして認証してください。',
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: {
                  tag: 'plain_text',
                  content: 'カレンダー認証',
                },
                type: 'primary',
                url: authUrl,
              },
            ],
          },
          {
            tag: 'hr',
          },
          {
            tag: 'markdown',
            content: '**使い方**\n\n認証完了後、以下のように話しかけてください：\n\n- 自分の空き時間: `@Bot 空き時間教えて`\n- メンバーとの共通空き時間: `@Bot @田中さん 空き時間教えて`',
          },
          {
            tag: 'note',
            elements: [
              {
                tag: 'plain_text',
                content: 'グループの全員が認証すると、より正確な共通空き時間を検索できます',
              },
            ],
          },
        ],
      },
    };

    try {
      await this.client.post<{ message_id: string }>(
        `/im/v1/messages?receive_id_type=chat_id`,
        {
          receive_id: chatId,
          msg_type: welcomeCard.msg_type,
          content: JSON.stringify(welcomeCard.card),
        }
      );
      console.log(`✅ Welcome message sent to chat: ${chatId}`);
    } catch (error) {
      console.error('❌ Failed to send welcome message:', error);
    }
  }

  /**
   * メッセージを処理
   */
  private async handleMessage(event: LarkEventMessage): Promise<void> {
    const message = event.event.message;
    const sender = event.event.sender;

    // テキストメッセージのみ処理
    if (message.message_type !== 'text') {
      return;
    }

    // メッセージ内容をパース
    const content = JSON.parse(message.content);
    const text = content.text as string;

    console.log(`💬 Message from ${sender.sender_id.open_id}: ${text}`);

    // 空き時間リクエストかチェック
    if (this.isAvailabilityRequest(text)) {
      await this.handleAvailabilityRequest(
        message.chat_id,
        sender.sender_id.open_id,
        message.mentions || []
      );
    }
  }

  /**
   * 空き時間リクエストかどうかを判定
   */
  private isAvailabilityRequest(text: string): boolean {
    const keywords = ['空き時間', '空いてる', 'あいてる', '予定', 'スケジュール', 'available', 'free'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  /**
   * ユーザートークンを取得（必要に応じてリフレッシュ）
   */
  private async getUserAccessToken(openId: string): Promise<string | null> {
    const storedToken = tokenStorage.getToken(openId);
    if (!storedToken) {
      return null;
    }

    // トークンが期限切れ間近の場合はリフレッシュ
    if (storedToken.expiresAt < Date.now() + 10 * 60 * 1000) {
      try {
        console.log(`🔄 Refreshing token for ${openId}`);
        const newTokens = await this.oauthService.refreshAccessToken(storedToken.refreshToken);
        tokenStorage.updateToken(openId, newTokens.access_token, newTokens.refresh_token, newTokens.expires_in);
        return newTokens.access_token;
      } catch (error) {
        console.error(`Failed to refresh token for ${openId}:`, error);
        return null;
      }
    }

    return storedToken.accessToken;
  }

  /**
   * 空き時間リクエストを処理
   */
  private async handleAvailabilityRequest(
    chatId: string,
    senderOpenId: string,
    mentions: Array<{ key: string; id: { open_id: string; user_id?: string }; name: string }>
  ): Promise<void> {
    try {
      // メンションされたユーザーを抽出（Bot自身を除く）
      const mentionedUsers: MentionedUser[] = mentions
        .filter(m => !m.key.includes('_all') && m.id.open_id !== process.env.LARK_BOT_OPEN_ID)
        .map(m => ({
          openId: m.id.open_id,
          userId: m.id.user_id,
          name: m.name,
        }));

      // 検索対象ユーザー一覧（送信者 + メンションされたユーザー）
      const targetUserIds = [senderOpenId, ...mentionedUsers.map(u => u.openId)];
      const isMultiUser = mentionedUsers.length > 0;

      console.log(`🔍 Finding availability for ${targetUserIds.length} users: ${targetUserIds.join(', ')}`);

      // 送信者のトークンを取得
      const userToken = await this.getUserAccessToken(senderOpenId);

      if (!userToken) {
        // トークンがない場合は認証を促す
        console.log(`⚠️ No token found for user ${senderOpenId}`);
        await this.sendMessageToChat(chatId, {
          msg_type: 'text',
          content: JSON.stringify({
            text: '🔐 カレンダーにアクセスするには、まず認証が必要です。\n\n以下のURLにアクセスしてログインしてください：\n' +
                  `${process.env.NGROK_URL || 'http://localhost:3000'}/auth/login`,
          }),
        });
        return;
      }

      // UserCalendarServiceでカレンダーイベントを取得
      const calendarService = new UserCalendarService(userToken);

      const config = getLarkConfig();
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);

      console.log(`📅 Fetching calendar events from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // 全ユーザーのbusy時間を取得
      let allBusyEvents: CalendarEvent[] = [];

      // 送信者のイベントを取得
      const senderEvents = await calendarService.getEvents(startDate, endDate);
      console.log(`📅 Sender (${senderOpenId}): ${senderEvents.length} events`);
      allBusyEvents.push(...senderEvents);

      // メンションされたユーザーのFreeBusy情報を取得
      if (isMultiUser) {
        console.log(`👥 Fetching FreeBusy for ${mentionedUsers.length} mentioned users...`);

        for (const user of mentionedUsers) {
          try {
            // FreeBusy APIで他ユーザーのbusy時間を取得
            const userBusyEvents = await this.getFreeBusyForUser(
              userToken,
              user.openId,
              startDate,
              endDate
            );
            console.log(`   📅 ${user.name} (${user.openId}): ${userBusyEvents.length} busy slots`);
            allBusyEvents.push(...userBusyEvents);
          } catch (error) {
            console.error(`   ❌ Failed to get FreeBusy for ${user.name}:`, error);
          }
        }
      }

      console.log(`📅 Total busy events: ${allBusyEvents.length}`);

      if (allBusyEvents.length > 0) {
        allBusyEvents.slice(0, 5).forEach((event, i) => {
          console.log(`   ${i + 1}. ${event.summary} (${event.startTime.toLocaleString('ja-JP')} - ${event.endTime.toLocaleString('ja-JP')})`);
        });
      }

      // 空き時間スロットを計算
      const availableSlots = this.findAvailableSlots(
        allBusyEvents,
        startDate,
        endDate,
        config.workingHours.start,
        config.workingHours.end
      );

      // おすすめスロットを抽出
      const suggestedSlots = this.suggestMeetingSlots(
        availableSlots,
        5,
        config.meetingDurationMinutes
      );

      const suggestion: MeetingSuggestion = {
        availableSlots,
        suggestedSlots,
        searchPeriod: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        isDemo: false,
      };

      // 結果を送信
      const responseMessage = this.buildAvailabilityResponse(
        suggestion,
        mentionedUsers
      );

      await this.sendMessageToChat(chatId, responseMessage as { msg_type: string; card?: object; content?: string });

    } catch (error) {
      console.error('❌ Error handling availability request:', error);
      await this.sendMessageToChat(chatId, {
        msg_type: 'text',
        content: JSON.stringify({
          text: '申し訳ありません、空き時間の取得中にエラーが発生しました。',
        }),
      });
    }
  }

  /**
   * 特定ユーザーのFreeBusy情報を取得
   */
  private async getFreeBusyForUser(
    accessToken: string,
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<CalendarEvent[]> {
    // Lark FreeBusy API requires ISO 8601 datetime format with timezone
    const formatToISO8601 = (date: Date): string => {
      const offset = -date.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
      const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
      return date.toISOString().replace('Z', '') + sign + hours + ':' + minutes;
    };

    const requestBody = {
      time_min: formatToISO8601(startTime),
      time_max: formatToISO8601(endTime),
      user_id: userId,
    };

    console.log(`   Querying FreeBusy for user: ${userId}`);

    try {
      // LarkUserClientを使用してFreeBusy APIを呼び出す
      const { LarkUserClient } = await import('./larkUserClient.js');
      const userClient = new LarkUserClient(accessToken);

      interface FreeBusySlot {
        start_time: string;
        end_time: string;
      }

      interface FreeBusyResponse {
        freebusy_list?: FreeBusySlot[];
      }

      const response = await userClient.post<FreeBusyResponse>(
        '/calendar/v4/freebusy/list',
        requestBody
      );

      const events: CalendarEvent[] = [];
      let eventCounter = 0;

      if (response.freebusy_list && Array.isArray(response.freebusy_list)) {
        for (const slot of response.freebusy_list) {
          if (slot.start_time && slot.end_time) {
            eventCounter++;
            events.push({
              id: `freebusy-${userId}-${eventCounter}`,
              summary: `予定あり（他ユーザー）`,
              startTime: new Date(slot.start_time),
              endTime: new Date(slot.end_time),
              status: 'confirmed',
            });
          }
        }
      }

      return events;
    } catch (error) {
      console.error(`   FreeBusy API error for ${userId}:`, error);
      return [];
    }
  }

  /**
   * 空き時間スロットを計算
   */
  private findAvailableSlots(
    busyEvents: CalendarEvent[],
    startTime: Date,
    endTime: Date,
    workingHoursStart: string = '09:00',
    workingHoursEnd: string = '18:00'
  ): AvailableSlot[] {
    const availableSlots: AvailableSlot[] = [];
    const currentDate = new Date(startTime);
    currentDate.setHours(0, 0, 0, 0);

    const [workStartHour, workStartMin] = workingHoursStart.split(':').map(Number);
    const [workEndHour, workEndMin] = workingHoursEnd.split(':').map(Number);

    while (currentDate <= endTime) {
      // 週末をスキップ
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(workStartHour, workStartMin, 0, 0);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(workEndHour, workEndMin, 0, 0);

        // この日のビジーイベントをフィルタ
        // イベントが dayStart〜dayEnd の範囲と重なるものを全て取得
        const dayEvents = busyEvents.filter(event => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          // イベントが勤務時間と重なるかどうかをチェック
          // (イベント開始 < 勤務終了) AND (イベント終了 > 勤務開始)
          return eventStart < dayEnd && eventEnd > dayStart;
        }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        // デバッグ: この日のイベントを出力
        if (dayEvents.length > 0) {
          console.log(`  📅 ${currentDate.toLocaleDateString('ja-JP')}: ${dayEvents.length}件のイベント`);
          dayEvents.forEach(e => {
            const start = new Date(e.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            const end = new Date(e.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            console.log(`     - ${start}〜${end}: ${e.summary}`);
          });
        }

        const timeSlots: TimeSlot[] = [];
        let slotStart = new Date(dayStart);

        for (const event of dayEvents) {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);

          // イベント前の空き時間
          if (eventStart > slotStart) {
            const duration = Math.floor((eventStart.getTime() - slotStart.getTime()) / (1000 * 60));
            if (duration >= 30) {
              timeSlots.push({
                start: new Date(slotStart),
                end: new Date(eventStart),
                duration,
              });
            }
          }

          // 次のスロット開始はイベント終了後
          if (eventEnd > slotStart) {
            slotStart = new Date(eventEnd);
          }
        }

        // 最後のイベント後の空き時間
        if (slotStart < dayEnd) {
          const duration = Math.floor((dayEnd.getTime() - slotStart.getTime()) / (1000 * 60));
          if (duration >= 30) {
            timeSlots.push({
              start: new Date(slotStart),
              end: new Date(dayEnd),
              duration,
            });
          }
        }

        if (timeSlots.length > 0) {
          availableSlots.push({
            date: currentDate.toLocaleDateString('ja-JP', {
              month: 'numeric',
              day: 'numeric',
              weekday: 'short',
            }),
            timeSlots,
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableSlots;
  }

  /**
   * おすすめの時間帯を抽出
   */
  private suggestMeetingSlots(
    availableSlots: AvailableSlot[],
    maxSuggestions: number = 5,
    minDuration: number = 60
  ): TimeSlot[] {
    const allSlots: TimeSlot[] = [];

    for (const daySlot of availableSlots) {
      for (const slot of daySlot.timeSlots) {
        if (slot.duration >= minDuration) {
          allSlots.push(slot);
        }
      }
    }

    // 時間順にソートして上位を返す
    return allSlots
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, maxSuggestions);
  }

  /**
   * 空き時間の返答メッセージを構築
   */
  private buildAvailabilityResponse(
    suggestion: MeetingSuggestion,
    mentionedUsers: MentionedUser[]
  ): object {
    const elements: any[] = [];

    // デモモード表示
    if (suggestion.isDemo) {
      elements.push({
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: '🎭 デモモード - サンプルデータを表示中',
          },
        ],
      });
    }

    // ヘッダー
    let headerText = '**🗓️ 空き時間候補**\n';
    if (mentionedUsers.length > 0) {
      const names = mentionedUsers.map(u => u.name).join('、');
      headerText += `対象: あなた + ${names}\n`;
    }
    headerText += `検索期間: ${suggestion.searchPeriod.start.split('T')[0]} 〜 ${suggestion.searchPeriod.end.split('T')[0]}`;

    elements.push({
      tag: 'markdown',
      content: headerText,
    });

    elements.push({ tag: 'hr' });

    // おすすめの候補
    if (suggestion.suggestedSlots && suggestion.suggestedSlots.length > 0) {
      elements.push({
        tag: 'markdown',
        content: '**📌 おすすめの候補日時**',
      });

      suggestion.suggestedSlots.forEach((slot, index) => {
        const dateStr = slot.start.toLocaleDateString('ja-JP', {
          month: 'numeric',
          day: 'numeric',
          weekday: 'short',
        });
        const startTime = slot.start.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const endTime = slot.end.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        });

        elements.push({
          tag: 'div',
          text: {
            tag: 'plain_text',
            content: `${index + 1}. ${dateStr} ${startTime}〜${endTime}`,
          },
        });
      });
    } else {
      elements.push({
        tag: 'markdown',
        content: '指定期間内に共通の空き時間が見つかりませんでした。',
      });
    }

    return {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: '🗓️ カレンダー空き時間',
          },
          template: 'blue',
        },
        elements,
      },
    };
  }

  /**
   * チャットにメッセージを送信
   */
  private async sendMessageToChat(chatId: string, message: { msg_type: string; card?: object; content?: string }): Promise<void> {
    try {
      // Lark APIでは content は文字列でなければならない
      const payload: Record<string, unknown> = {
        receive_id: chatId,
        msg_type: message.msg_type,
      };

      if (message.msg_type === 'interactive' && message.card) {
        // カードメッセージの場合は content にJSON文字列を設定
        payload.content = JSON.stringify(message.card);
      } else if (message.content) {
        payload.content = message.content;
      }

      await this.client.post<{ message_id: string }>(
        `/im/v1/messages?receive_id_type=chat_id`,
        payload
      );
      console.log(`✅ Message sent to chat: ${chatId}`);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }
}
