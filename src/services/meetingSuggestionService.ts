import { CalendarService } from './calendarService.js';
import { TimeSlotFinder } from '../utils/timeSlotFinder.js';
import { getLarkConfig } from '../config/lark.js';
import { AvailableSlot, TimeSlot } from '../types/calendar.js';

export interface MeetingSuggestionOptions {
  daysAhead?: number;
  maxSuggestions?: number;
}

export interface MeetingSuggestion {
  availableSlots: AvailableSlot[];
  suggestedSlots: TimeSlot[];
  searchPeriod: {
    start: string;
    end: string;
  };
}

export class MeetingSuggestionService {
  private calendarService: CalendarService;
  private timeSlotFinder: TimeSlotFinder;
  private config = getLarkConfig();

  constructor() {
    this.calendarService = new CalendarService();
    this.timeSlotFinder = new TimeSlotFinder(
      this.config.workingHours,
      this.config.meetingDurationMinutes
    );
  }

  async suggestMeetingTimes(options: MeetingSuggestionOptions = {}): Promise<MeetingSuggestion> {
    const daysAhead = options.daysAhead || 7;
    const maxSuggestions = options.maxSuggestions || 5;

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);

    const events = await this.calendarService.getEvents(startDate, endDate);

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
    };
  }

  formatSuggestions(suggestion: MeetingSuggestion): string {
    let output = `空き時間候補 (${suggestion.searchPeriod.start.split('T')[0]} 〜 ${suggestion.searchPeriod.end.split('T')[0]})\n\n`;

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
