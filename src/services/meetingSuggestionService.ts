import { CalendarService } from './calendarService.js';
import { MockCalendarService } from './mockCalendarService.js';
import { MultiPersonCalendarService } from './multiPersonCalendarService.js';
import { TimeSlotFinder } from '../utils/timeSlotFinder.js';
import { getLarkConfig } from '../config/lark.js';
import { AvailableSlot, TimeSlot } from '../types/calendar.js';

export interface MeetingSuggestionOptions {
  daysAhead?: number;
  maxSuggestions?: number;
  useMockData?: boolean;
  userIds?: string[]; // 複数人の場合のユーザーID
}

export interface MeetingSuggestion {
  availableSlots: AvailableSlot[];
  suggestedSlots: TimeSlot[];
  searchPeriod: {
    start: string;
    end: string;
  };
  isDemo?: boolean;
}

export class MeetingSuggestionService {
  private calendarService: CalendarService | MockCalendarService;
  private timeSlotFinder: TimeSlotFinder;
  private config: ReturnType<typeof getLarkConfig>;
  private isDemo: boolean;

  constructor(useMockData: boolean = false) {
    // Lark認証情報がない場合は自動的にデモモードに
    const hasLarkCredentials = process.env.LARK_APP_ID && process.env.LARK_APP_SECRET;
    this.isDemo = useMockData || !hasLarkCredentials;

    if (this.isDemo) {
      console.log('🎭 デモモードで起動（モックデータを使用）\n');
      this.calendarService = new MockCalendarService();
    } else {
      this.calendarService = new CalendarService();
    }

    // デモモードでも設定を試みるが、エラーは無視
    try {
      this.config = getLarkConfig();
    } catch {
      // 設定が取得できない場合はデフォルト値を使用
      this.config = {
        appId: 'demo',
        appSecret: 'demo',
        calendarId: 'primary',
        workingHours: {
          start: process.env.WORKING_HOURS_START || '09:00',
          end: process.env.WORKING_HOURS_END || '18:00',
        },
        meetingDurationMinutes: parseInt(process.env.MEETING_DURATION_MINUTES || '60', 10),
      };
    }

    this.timeSlotFinder = new TimeSlotFinder(
      this.config.workingHours,
      this.config.meetingDurationMinutes
    );
  }

  async suggestMeetingTimes(options: MeetingSuggestionOptions = {}): Promise<MeetingSuggestion> {
    const daysAhead = options.daysAhead || 7;
    const maxSuggestions = options.maxSuggestions || 5;
    const userIds = options.userIds || [];

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);

    let events;

    // 複数人の場合は統合カレンダーサービスを使用
    if (userIds.length > 0) {
      const multiPersonService = new MultiPersonCalendarService(this.isDemo);
      events = await multiPersonService.getMultiPersonEvents(startDate, endDate, {
        userIds,
      });

      if (userIds.length > 1 && !this.isDemo) {
        console.log(`📅 ${userIds.length}人のカレンダーを確認中...`);
      }
    } else {
      events = await this.calendarService.getEvents(startDate, endDate);
    }

    const availableSlots = this.timeSlotFinder.findAvailableSlots(
      events,
      startDate,
      endDate
    );

    const suggestedSlots = this.timeSlotFinder.suggestMeetingSlots(
      availableSlots,
      maxSuggestions
    );

    return {
      availableSlots,
      suggestedSlots,
      searchPeriod: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      isDemo: this.isDemo,
    };
  }

  formatSuggestions(suggestion: MeetingSuggestion): string {
    let output = '';

    if (suggestion.isDemo) {
      output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      output += '   🎭 デモモード実行中\n';
      output += '   サンプルデータを使用しています\n';
      output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    }

    output += `空き時間候補 (${suggestion.searchPeriod.start.split('T')[0]} 〜 ${suggestion.searchPeriod.end.split('T')[0]})\n\n`;

    if (suggestion.suggestedSlots.length === 0) {
      output += '⚠️  指定期間内に十分な空き時間が見つかりませんでした。\n';
      return output;
    }

    output += '【おすすめの候補日時】\n';
    suggestion.suggestedSlots.forEach((slot, index) => {
      const start = slot.start.toLocaleString('ja-JP');
      const end = slot.end.toLocaleString('ja-JP');
      output += `${index + 1}. ${start} 〜 ${end} (${slot.duration}分)\n`;
    });

    output += '\n【日別の空き時間】\n';
    suggestion.availableSlots.forEach(daySlot => {
      output += `\n${daySlot.date}:\n`;
      daySlot.timeSlots.forEach(slot => {
        const start = slot.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        const end = slot.end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        output += `  - ${start} 〜 ${end} (${slot.duration}分)\n`;
      });
    });

    return output;
  }
}
