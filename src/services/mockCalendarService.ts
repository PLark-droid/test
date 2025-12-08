import { CalendarEvent } from '../types/calendar.js';

/**
 * モックカレンダーサービス - デモ用
 * Lark API認証情報なしで動作します
 */
export class MockCalendarService {
  async getEvents(startTime: Date, endTime: Date): Promise<CalendarEvent[]> {
    // デモ用のサンプルイベントを生成
    const events: CalendarEvent[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 今日のイベント
    events.push({
      id: 'mock-1',
      summary: 'チームミーティング',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
      status: 'confirmed',
    });

    events.push({
      id: 'mock-2',
      summary: 'ランチ',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0),
      status: 'confirmed',
    });

    events.push({
      id: 'mock-3',
      summary: 'プロジェクトレビュー',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 30),
      status: 'confirmed',
    });

    // 明日のイベント
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    events.push({
      id: 'mock-4',
      summary: '週次報告',
      startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0),
      endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0),
      status: 'confirmed',
    });

    events.push({
      id: 'mock-5',
      summary: 'クライアント打ち合わせ',
      startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 14, 0),
      endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 15, 30),
      status: 'confirmed',
    });

    // 指定期間内のイベントのみフィルタリング
    return events.filter(event =>
      event.startTime >= startTime && event.endTime <= endTime
    );
  }
}
