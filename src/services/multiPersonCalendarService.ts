import { CalendarService } from './calendarService.js';
import { MockCalendarService } from './mockCalendarService.js';
import { CalendarEvent } from '../types/calendar.js';

export interface MultiPersonCalendarOptions {
  userIds: string[];
  calendarIds?: string[];
}

/**
 * 複数人のカレンダーを統合するサービス
 */
export class MultiPersonCalendarService {
  private calendarService: CalendarService | MockCalendarService;
  private isDemo: boolean;

  constructor(isDemo: boolean = false) {
    this.isDemo = isDemo;
    if (isDemo) {
      this.calendarService = new MockCalendarService();
    } else {
      this.calendarService = new CalendarService();
    }
  }

  /**
   * 複数人のカレンダーイベントを取得して統合
   */
  async getMultiPersonEvents(
    startTime: Date,
    endTime: Date,
    options: MultiPersonCalendarOptions
  ): Promise<CalendarEvent[]> {
    if (this.isDemo) {
      // デモモードでは、サンプルデータに追加のイベントを混ぜる
      const baseEvents = await this.calendarService.getEvents(startTime, endTime);

      // 他のメンバーのイベントをシミュレート
      const additionalEvents = this.generateMockMultiPersonEvents(startTime, endTime, options.userIds.length);

      return [...baseEvents, ...additionalEvents];
    }

    // 実運用では、各ユーザーのカレンダーを取得
    // 注意: Lark APIでは他人のカレンダーを取得するには適切な権限が必要
    const allEvents: CalendarEvent[] = [];

    // 現状は1つのカレンダーのみ対応
    // TODO: 複数カレンダー対応（権限が必要）
    const events = await this.calendarService.getEvents(startTime, endTime);
    allEvents.push(...events);

    return allEvents;
  }

  /**
   * デモ用の追加イベント生成
   */
  private generateMockMultiPersonEvents(startTime: Date, endTime: Date, userCount: number): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 他のメンバーのイベントを追加
    for (let i = 0; i < userCount - 1; i++) {
      // 各メンバーにいくつかのイベントを追加
      events.push({
        id: `mock-multi-${i}-1`,
        summary: `メンバー${i + 1}の会議`,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11 + i, 30),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12 + i, 30),
        status: 'confirmed',
      });

      events.push({
        id: `mock-multi-${i}-2`,
        summary: `メンバー${i + 1}の作業時間`,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14 + i, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15 + i, 0),
        status: 'confirmed',
      });
    }

    return events.filter(event =>
      event.startTime >= startTime && event.endTime <= endTime
    );
  }

  /**
   * メンションからユーザーIDを抽出
   */
  static extractUserIds(message: string): string[] {
    // Larkのメンション形式: <at user_id="ou_xxxxx">@名前</at>
    const mentionRegex = /<at user_id="([^"]+)">/g;
    const userIds: string[] = [];

    let match;
    while ((match = mentionRegex.exec(message)) !== null) {
      userIds.push(match[1]);
    }

    return userIds;
  }
}
