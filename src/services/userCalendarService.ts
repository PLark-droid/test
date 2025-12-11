/**
 * User Calendar Service
 * ユーザー認証を使用してカレンダーにアクセスするサービス
 */

import { LarkUserClient } from './larkUserClient.js';
import { CalendarEvent } from '../types/calendar.js';

interface LarkCalendarEvent {
  event_id: string;
  summary: string;
  start_time: {
    timestamp: string;
  };
  end_time: {
    timestamp: string;
  };
  status?: string;
  recurrence?: string;  // RRULE文字列
  recurring_event_id?: string;  // 親イベントID（繰り返しインスタンスの場合）
}

/**
 * RRULEを解析して指定期間内のインスタンスを生成
 */
function expandRecurringEvent(
  event: LarkCalendarEvent,
  startTime: Date,
  endTime: Date
): LarkCalendarEvent[] {
  if (!event.recurrence) {
    return [];
  }

  const instances: LarkCalendarEvent[] = [];
  const eventStart = new Date(parseInt(event.start_time.timestamp) * 1000);
  const eventEnd = new Date(parseInt(event.end_time.timestamp) * 1000);
  const duration = eventEnd.getTime() - eventStart.getTime();

  // RRULEを解析（簡易版：FREQ=WEEKLYのみ対応）
  const rrule = event.recurrence;
  const freqMatch = rrule.match(/FREQ=(\w+)/);
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
  const bydayMatch = rrule.match(/BYDAY=([A-Z,]+)/);

  if (!freqMatch) {
    return [];
  }

  const freq = freqMatch[1];
  const interval = intervalMatch ? parseInt(intervalMatch[1]) : 1;

  // 曜日マッピング
  const dayMap: { [key: string]: number } = {
    'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
  };

  if (freq === 'WEEKLY') {
    // 週次繰り返し
    const targetDays = bydayMatch
      ? bydayMatch[1].split(',').map(d => dayMap[d])
      : [eventStart.getDay()];

    // 検索開始日から終了日までループ
    const current = new Date(startTime);
    current.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);

    // 最初の週の開始に戻す
    const dayOfWeek = current.getDay();
    current.setDate(current.getDate() - dayOfWeek);

    while (current <= endTime) {
      for (const targetDay of targetDays) {
        const instanceDate = new Date(current);
        instanceDate.setDate(current.getDate() + targetDay);
        instanceDate.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);

        // 期間内かチェック
        if (instanceDate >= startTime && instanceDate <= endTime) {
          // 元のイベント開始日以降かチェック
          if (instanceDate >= eventStart || instanceDate.toDateString() === eventStart.toDateString()) {
            const instanceEnd = new Date(instanceDate.getTime() + duration);
            instances.push({
              ...event,
              event_id: `${event.event_id}_${instanceDate.getTime()}`,
              start_time: { timestamp: Math.floor(instanceDate.getTime() / 1000).toString() },
              end_time: { timestamp: Math.floor(instanceEnd.getTime() / 1000).toString() },
            });
          }
        }
      }
      // 次の週へ（intervalを考慮）
      current.setDate(current.getDate() + 7 * interval);
    }
  } else if (freq === 'DAILY') {
    // 日次繰り返し
    const current = new Date(Math.max(startTime.getTime(), eventStart.getTime()));
    current.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);

    while (current <= endTime) {
      const instanceEnd = new Date(current.getTime() + duration);
      instances.push({
        ...event,
        event_id: `${event.event_id}_${current.getTime()}`,
        start_time: { timestamp: Math.floor(current.getTime() / 1000).toString() },
        end_time: { timestamp: Math.floor(instanceEnd.getTime() / 1000).toString() },
      });
      current.setDate(current.getDate() + interval);
    }
  }

  return instances;
}

interface LarkCalendar {
  calendar_id: string;
  summary: string;
  type: string;
  role: string;
  is_third_party?: boolean;
}

interface FreeBusyInterval {
  start_time: string;
  end_time: string;
}

// FreeBusy APIのレスポンスは2種類の形式がある:
// 1. user_id指定時: フラット配列 [{start_time, end_time}, ...]
// 2. calendar_id指定時: ネスト形式 [{calendar_id, busy: [{start_time, end_time}, ...]}, ...]
type FreeBusyListItem =
  | FreeBusyInterval  // フラット形式（user_id指定時）
  | { calendar_id: string; busy: FreeBusyInterval[] };  // ネスト形式（calendar_id指定時）

interface FreeBusyResponse {
  freebusy_list: FreeBusyListItem[];
}

interface LarkCalendarListResponse {
  has_more: boolean;
  calendar_list: LarkCalendar[];
  page_token?: string;
}

interface LarkEventListResponse {
  has_more: boolean;
  items: LarkCalendarEvent[];
  page_token?: string;
}

interface UserInfoResponse {
  user_id?: string;
  open_id?: string;
  name?: string;
}

export class UserCalendarService {
  private client: LarkUserClient;
  private primaryCalendarId: string | null = null;
  private userId: string | null = null;

  constructor(userAccessToken: string) {
    this.client = new LarkUserClient(userAccessToken);
  }

  /**
   * 現在のユーザー情報を取得
   */
  async getUserInfo(): Promise<UserInfoResponse | null> {
    try {
      const response = await this.client.get<UserInfoResponse>('/authen/v1/user_info');
      console.log('User info:', response);
      this.userId = response.user_id || response.open_id || null;
      return response;
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  /**
   * 読み取り可能なカレンダーID一覧を取得
   * ownerのカレンダーを使用（サードパーティカレンダーを除く）
   *
   * 注意:
   * - free_busy_reader: イベント詳細取得不可（400エラー）
   * - reader: 他人の共有カレンダー、イベント詳細取得不可の場合がある（400エラー）
   * - owner: 自分のカレンダーのみイベント詳細取得可能
   * - type: google (is_third_party: true): Events APIでは取得不可（403エラー）
   */
  async getReadableCalendarIds(): Promise<string[]> {
    const calendars = await this.getCalendars();
    console.log('Available calendars:', JSON.stringify(calendars, null, 2));

    // ownerのカレンダーを使用（サードパーティカレンダーは除外）
    // サードパーティ（Google同期など）はEvents APIで403エラーになるため除外
    // primary, sharedのみを対象にする
    const myCalendars = calendars.filter((c: LarkCalendar) =>
      c.role === 'owner' && !c.is_third_party
    );

    if (myCalendars.length > 0) {
      console.log(`Found ${myCalendars.length} owned calendars (excluding third-party):`);
      myCalendars.forEach(c => console.log(`  - ${c.summary} (type: ${c.type}, role: ${c.role})`));
      return myCalendars.map(c => c.calendar_id);
    }

    // サードパーティを含めて再試行（エラーは個別に処理）
    const allOwned = calendars.filter((c: LarkCalendar) => c.role === 'owner');
    if (allOwned.length > 0) {
      console.log(`Fallback: Found ${allOwned.length} owned calendars (including third-party):`);
      allOwned.forEach(c => console.log(`  - ${c.summary} (type: ${c.type}, role: ${c.role}, third_party: ${c.is_third_party})`));
      return allOwned.map(c => c.calendar_id);
    }

    throw new Error('No owned calendars found');
  }

  /**
   * 自分がownerのカレンダーID一覧を取得（primary + google両方）
   */
  async getOwnedCalendarIds(): Promise<string[]> {
    const calendars = await this.getCalendars();

    // ownerのカレンダーを全て取得（Lark primary + Google同期）
    const ownedCalendars = calendars.filter((c: LarkCalendar) => c.role === 'owner');

    if (ownedCalendars.length > 0) {
      console.log(`Found ${ownedCalendars.length} owned calendars:`);
      ownedCalendars.forEach(c => console.log(`  - ${c.summary} (${c.type})`));
      return ownedCalendars.map(c => c.calendar_id);
    }

    // ownerがない場合は最初のカレンダーを使用
    if (calendars.length > 0) {
      return [calendars[0].calendar_id];
    }

    throw new Error('No calendars found');
  }

  /**
   * プライマリカレンダーのIDを取得（互換性用）
   */
  async getPrimaryCalendarId(): Promise<string> {
    if (this.primaryCalendarId) {
      return this.primaryCalendarId;
    }

    const calendarIds = await this.getOwnedCalendarIds();
    this.primaryCalendarId = calendarIds[0];
    return this.primaryCalendarId;
  }

  /**
   * カレンダーイベントを取得（全ての読み取り可能なカレンダーから）
   * - Primary/Sharedカレンダー: Events APIで詳細を取得
   * - サードパーティ（Google等）: FreeBusy APIで「予定あり」時間帯を取得
   */
  async getEvents(startTime: Date, endTime: Date, calendarId?: string): Promise<CalendarEvent[]> {
    // calendarIdが指定されている場合はそのカレンダーのみ
    if (calendarId) {
      return this.getEventsFromCalendar(startTime, endTime, calendarId);
    }

    console.log('=== Fetching events from all calendars ===');
    const calendars = await this.getCalendars();

    // カレンダーを分類
    const nativeCalendars = calendars.filter((c: LarkCalendar) =>
      c.role === 'owner' && !c.is_third_party
    );
    const thirdPartyCalendars = calendars.filter((c: LarkCalendar) =>
      c.role === 'owner' && c.is_third_party
    );

    console.log(`Native calendars (Events API): ${nativeCalendars.length}`);
    nativeCalendars.forEach(c => console.log(`  - ${c.summary} (${c.type})`));
    console.log(`Third-party calendars (FreeBusy API): ${thirdPartyCalendars.length}`);
    thirdPartyCalendars.forEach(c => console.log(`  - ${c.summary} (${c.type})`));

    const allEvents: CalendarEvent[] = [];

    // 1. Native calendars: Events APIで詳細を取得
    for (const calendar of nativeCalendars) {
      try {
        const events = await this.getEventsFromCalendar(startTime, endTime, calendar.calendar_id);
        console.log(`  [Events API] ${calendar.summary}: ${events.length} events`);
        allEvents.push(...events);
      } catch (error) {
        console.error(`  [Events API] Error from ${calendar.summary}:`, error);
      }
    }

    // 2. Third-party calendars: FreeBusy APIで予定あり時間帯を取得
    // Lark FreeBusy APIは user_id を使用して全カレンダー（Google含む）のbusy時間を取得可能
    if (thirdPartyCalendars.length > 0) {
      try {
        // ユーザー情報を取得してFreeBusy APIに渡す
        if (!this.userId) {
          await this.getUserInfo();
        }
        if (this.userId) {
          const freeBusyEvents = await this.getFreeBusyEventsForUser(
            startTime,
            endTime,
            this.userId
          );
          console.log(`  [FreeBusy API] User ${this.userId}: ${freeBusyEvents.length} busy slots`);
          allEvents.push(...freeBusyEvents);
        } else {
          console.log('  [FreeBusy API] Could not get user ID, skipping FreeBusy');
        }
      } catch (error) {
        console.error('  [FreeBusy API] Error:', error);
      }
    }

    const uniqueEvents = this.deduplicateEvents(allEvents);
    console.log(`Total unique events: ${uniqueEvents.length}`);

    return uniqueEvents;
  }

  /**
   * 自分自身のFreeBusy情報を取得（user_idベース）
   * Lark APIは /calendar/v4/freebusy/list で user_id を指定して呼び出す
   */
  private async getFreeBusyEventsForUser(
    startTime: Date,
    endTime: Date,
    userId: string
  ): Promise<CalendarEvent[]> {
    console.log(`Querying FreeBusy for user: ${userId}`);
    console.log(`  Time range: ${startTime.toISOString()} ~ ${endTime.toISOString()}`);

    try {
      // Lark FreeBusy API requires ISO 8601 datetime format with timezone
      // Example: "2025-12-10T00:00:00+09:00"
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

      console.log('FreeBusy API request body:', JSON.stringify(requestBody, null, 2));

      const response = await this.client.post<FreeBusyResponse>(
        '/calendar/v4/freebusy/list',
        requestBody
      );

      console.log('FreeBusy API response:', JSON.stringify(response, null, 2));

      const events: CalendarEvent[] = [];
      let eventCounter = 0;

      // 型ガード: フラット形式かどうかを判定
      const isFlatItem = (item: FreeBusyListItem): item is FreeBusyInterval => {
        return 'start_time' in item && 'end_time' in item && !('calendar_id' in item);
      };

      // 型ガード: ネスト形式かどうかを判定
      const isNestedItem = (item: FreeBusyListItem): item is { calendar_id: string; busy: FreeBusyInterval[] } => {
        return 'calendar_id' in item && 'busy' in item;
      };

      // FreeBusy APIのレスポンス形式を処理
      if (response.freebusy_list && Array.isArray(response.freebusy_list)) {
        for (const slot of response.freebusy_list) {
          // フラット形式: 直接 start_time/end_time を持つ形式
          if (isFlatItem(slot)) {
            eventCounter++;
            // ISO 8601形式の文字列をパース（例: "2025-12-10T02:00:00Z"）
            const busyStart = new Date(slot.start_time);
            const busyEnd = new Date(slot.end_time);
            console.log(`  FreeBusy: ${busyStart.toLocaleString()} ~ ${busyEnd.toLocaleString()}`);
            events.push({
              id: `freebusy-${eventCounter}`,
              summary: '予定あり（Google同期）',
              startTime: busyStart,
              endTime: busyEnd,
              status: 'confirmed',
            });
          }
          // ネスト形式: busy配列を持つ場合
          else if (isNestedItem(slot)) {
            for (const busySlot of slot.busy) {
              eventCounter++;
              const busyStart = new Date(busySlot.start_time);
              const busyEnd = new Date(busySlot.end_time);
              console.log(`  FreeBusy: ${busyStart.toLocaleString()} ~ ${busyEnd.toLocaleString()}`);
              events.push({
                id: `freebusy-${eventCounter}`,
                summary: '予定あり（Google同期）',
                startTime: busyStart,
                endTime: busyEnd,
                status: 'confirmed',
              });
            }
          }
        }
      }

      console.log(`  Found ${events.length} busy slots from FreeBusy API`);
      return events;
    } catch (error) {
      console.error('FreeBusy API error:', error);
      return [];
    }
  }

  /**
   * FreeBusy APIで全カレンダーから忙しい時間を取得
   */
  private async getFreeBusyEvents(startTime: Date, endTime: Date): Promise<CalendarEvent[]> {
    try {
      const calendars = await this.getCalendars();

      // 自分のカレンダー（primary/googleのowner/reader）を取得
      const myCalendarIds = calendars
        .filter((c: LarkCalendar) =>
          ['owner', 'reader'].includes(c.role) &&
          (c.type === 'primary' || c.type === 'google')
        )
        .map(c => c.calendar_id);

      console.log(`Querying FreeBusy for ${myCalendarIds.length} calendars`);

      const response = await this.client.post<FreeBusyResponse>(
        '/calendar/v4/freebusy/query',
        {
          time_min: Math.floor(startTime.getTime() / 1000).toString(),
          time_max: Math.floor(endTime.getTime() / 1000).toString(),
          calendar_ids: myCalendarIds,
        }
      );

      console.log('FreeBusy response:', JSON.stringify(response, null, 2));

      const events: CalendarEvent[] = [];
      let eventCounter = 0;

      // 型ガード: ネスト形式かどうかを判定
      const isNestedItem = (item: FreeBusyListItem): item is { calendar_id: string; busy: FreeBusyInterval[] } => {
        return 'calendar_id' in item && 'busy' in item;
      };

      if (response.freebusy_list) {
        for (const calendar of response.freebusy_list) {
          if (isNestedItem(calendar) && calendar.busy) {
            for (const slot of calendar.busy) {
              eventCounter++;
              events.push({
                id: `busy-${eventCounter}`,
                summary: '予定あり',
                startTime: new Date(parseInt(slot.start_time) * 1000),
                endTime: new Date(parseInt(slot.end_time) * 1000),
                status: 'confirmed',
              });
            }
          }
        }
      }

      return events;
    } catch (error) {
      console.error('FreeBusy API error:', error);
      return [];
    }
  }

  /**
   * 特定のカレンダーからイベントを取得
   * Lark APIのinstancesエンドポイントを使用して繰り返し予定を正しく取得
   */
  private async getEventsFromCalendar(startTime: Date, endTime: Date, calendarId: string): Promise<CalendarEvent[]> {
    // calendar_idはURLエンコードする（@などの特殊文字を含む）
    const encodedCalendarId = encodeURIComponent(calendarId);

    // Larkは秒単位のUNIXタイムスタンプを期待
    const params = {
      start_time: Math.floor(startTime.getTime() / 1000).toString(),
      end_time: Math.floor(endTime.getTime() / 1000).toString(),
      // page_size: より多くのイベントを取得
      page_size: 500,
    };

    console.log(`Fetching events from calendar: ${calendarId}`);
    console.log('Time range:', params);

    const response = await this.client.get<LarkEventListResponse>(
      `/calendar/v4/calendars/${encodedCalendarId}/events`,
      params
    );

    const events = response.items || [];
    console.log(`API response items count: ${events.length}`);

    // デバッグ: 取得したイベントの詳細を全て出力
    console.log('--- RAW API EVENTS ---');
    events.forEach(event => {
      const start = new Date(parseInt(event.start_time.timestamp) * 1000);
      const end = new Date(parseInt(event.end_time.timestamp) * 1000);
      const isRecurring = event.recurrence ? ` [RECURRING: ${event.recurrence}]` : '';
      const isInstance = event.recurring_event_id ? ` [INSTANCE of ${event.recurring_event_id}]` : '';
      console.log(`  📅 ${event.summary}`);
      console.log(`     ID: ${event.event_id}`);
      console.log(`     Time: ${start.toLocaleString()} ~ ${end.toLocaleString()}`);
      console.log(`     Date: ${start.toLocaleDateString('ja-JP')} (${['日','月','火','水','木','金','土'][start.getDay()]}曜日)`);
      if (isRecurring) console.log(`     ${isRecurring}`);
      if (isInstance) console.log(`     ${isInstance}`);
    });
    console.log('--- END RAW API EVENTS ---');

    // 日付範囲でクライアント側フィルタリング
    const startTimestamp = Math.floor(startTime.getTime() / 1000);
    const endTimestamp = Math.floor(endTime.getTime() / 1000);

    const allEvents: LarkCalendarEvent[] = [];

    // 繰り返しイベント以外をフィルタリング
    for (const event of events) {
      const eventStart = parseInt(event.start_time.timestamp);
      const eventEnd = parseInt(event.end_time.timestamp);

      // 繰り返しの親イベントの場合
      if (event.recurrence) {
        console.log(`\nProcessing recurring event: ${event.summary}`);
        // まずAPIのinstancesエンドポイントを試す
        const instances = await this.getRecurringEventInstances(calendarId, event.event_id, startTime, endTime);

        if (instances.length > 0) {
          console.log(`  Got ${instances.length} instances from API`);
          instances.forEach(inst => {
            const instStart = new Date(parseInt(inst.start_time.timestamp) * 1000);
            console.log(`    - ${instStart.toLocaleDateString('ja-JP')} (${['日','月','火','水','木','金','土'][instStart.getDay()]})`);
          });
          allEvents.push(...instances);
        } else {
          // APIが失敗した場合はRRULE展開を試みる
          console.log(`  Instances API returned 0, trying RRULE expansion...`);
          const expandedInstances = expandRecurringEvent(event, startTime, endTime);
          console.log(`  RRULE expansion: ${expandedInstances.length} instances`);
          if (expandedInstances.length > 0) {
            allEvents.push(...expandedInstances);
          } else {
            // どちらも失敗した場合、元のイベントを日付範囲内として追加（フォールバック）
            if (eventStart < endTimestamp && eventEnd > startTimestamp) {
              console.log(`  Fallback: Adding original event as single instance`);
              allEvents.push(event);
            }
          }
        }
      }
      // 繰り返しインスタンスまたは単発イベント
      else if (eventStart < endTimestamp && eventEnd > startTimestamp) {
        allEvents.push(event);
      }
    }

    console.log(`\nTotal events after processing: ${allEvents.length}`);
    allEvents.forEach(event => {
      const start = new Date(parseInt(event.start_time.timestamp) * 1000);
      console.log(`  ✓ ${start.toLocaleDateString('ja-JP')} ${start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}: ${event.summary}`);
    });

    return this.convertToCalendarEvents(allEvents);
  }

  /**
   * 繰り返しイベントのインスタンスを取得
   */
  private async getRecurringEventInstances(
    calendarId: string,
    eventId: string,
    startTime: Date,
    endTime: Date
  ): Promise<LarkCalendarEvent[]> {
    const encodedCalendarId = encodeURIComponent(calendarId);
    const encodedEventId = encodeURIComponent(eventId);

    try {
      const response = await this.client.get<LarkEventListResponse>(
        `/calendar/v4/calendars/${encodedCalendarId}/events/${encodedEventId}/instances`,
        {
          start_time: Math.floor(startTime.getTime() / 1000).toString(),
          end_time: Math.floor(endTime.getTime() / 1000).toString(),
        }
      );

      return response.items || [];
    } catch (error) {
      // instancesエンドポイントがサポートされていない場合は空配列を返す
      console.log(`  Instances API not available for event ${eventId}`);
      return [];
    }
  }

  /**
   * 重複イベントを排除（IDと時間帯の両方でチェック）
   */
  private deduplicateEvents(events: CalendarEvent[]): CalendarEvent[] {
    const seen = new Set<string>();
    const result: CalendarEvent[] = [];

    for (const event of events) {
      // event_idで重複チェック
      if (seen.has(event.id)) {
        continue;
      }

      // 同じ時間帯のイベントも重複とみなす（異なるカレンダーからの同期イベント対策）
      const timeKey = `${event.startTime.getTime()}-${event.endTime.getTime()}`;
      if (seen.has(timeKey)) {
        continue;
      }

      seen.add(event.id);
      seen.add(timeKey);
      result.push(event);
    }

    return result;
  }

  /**
   * カレンダー一覧を取得
   */
  async getCalendars(): Promise<LarkCalendar[]> {
    const response = await this.client.get<LarkCalendarListResponse>('/calendar/v4/calendars', {
      page_size: 50,
    });

    return response.calendar_list || [];
  }

  /**
   * Larkのイベント形式を共通形式に変換
   */
  private convertToCalendarEvents(larkEvents: LarkCalendarEvent[]): CalendarEvent[] {
    return larkEvents.map(event => ({
      id: event.event_id,
      summary: event.summary || 'Untitled Event',
      // タイムスタンプは秒単位なのでミリ秒に変換
      startTime: new Date(parseInt(event.start_time.timestamp) * 1000),
      endTime: new Date(parseInt(event.end_time.timestamp) * 1000),
      status: event.status === 'confirmed' ? 'confirmed' : 'tentative',
    }));
  }
}
