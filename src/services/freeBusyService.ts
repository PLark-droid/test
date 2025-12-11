/**
 * Lark FreeBusy Service
 * 複数ユーザーの空き/ビジー情報を取得するサービス
 */

import { LarkClient } from './larkClient.js';
import { CalendarEvent, AvailableSlot, TimeSlot } from '../types/calendar.js';
import { getLarkConfig } from '../config/lark.js';

interface FreeBusyResponse {
  freebusy_list?: Array<{
    start_time: string;
    end_time: string;
  }>;
}

export class FreeBusyService {
  private client: LarkClient;
  private config: ReturnType<typeof getLarkConfig>;

  constructor() {
    this.client = new LarkClient();
    this.config = getLarkConfig();
  }

  /**
   * 複数ユーザーの空き時間を取得
   * 正しいエンドポイント: /open-apis/calendar/v4/freebusy/list
   */
  async getFreeBusy(
    startTime: Date,
    endTime: Date,
    userIds: string[]
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // 各ユーザーのFreeBusy情報を取得（APIは1ユーザーずつ）
    for (const userId of userIds) {
      try {
        // クエリパラメータでtime_min, time_maxを指定
        const timeMin = encodeURIComponent(startTime.toISOString());
        const timeMax = encodeURIComponent(endTime.toISOString());

        const response = await this.client.post<FreeBusyResponse>(
          `/calendar/v4/freebusy/list?user_id_type=open_id&time_min=${timeMin}&time_max=${timeMax}`,
          {
            user_id: userId,
          }
        );

        console.log(`FreeBusy API response for ${userId}:`, JSON.stringify(response, null, 2));

        // ビジー時間をCalendarEvent形式に変換
        if (response.freebusy_list) {
          for (const slot of response.freebusy_list) {
            events.push({
              id: `busy-${userId}-${slot.start_time}`,
              summary: 'Busy',
              startTime: new Date(slot.start_time),
              endTime: new Date(slot.end_time),
              status: 'confirmed',
            });
          }
        }
      } catch (error: any) {
        console.error(`FreeBusy API error for ${userId}:`, error.response?.data || error.message);
        // 個別のユーザーでエラーが出ても続行
      }
    }

    return events;
  }

  /**
   * 空き時間スロットを計算
   */
  findAvailableSlots(
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
        const dayEvents = busyEvents.filter(event => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          return (
            eventStart < dayEnd &&
            eventEnd > dayStart &&
            eventStart.toDateString() === currentDate.toDateString()
          );
        }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        const timeSlots: TimeSlot[] = [];
        let slotStart = new Date(dayStart);

        for (const event of dayEvents) {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);

          // イベント前の空き時間
          if (eventStart > slotStart) {
            const duration = Math.floor((eventStart.getTime() - slotStart.getTime()) / (1000 * 60));
            if (duration >= 30) {  // 30分以上の空きのみ
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
  suggestMeetingSlots(
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
}
