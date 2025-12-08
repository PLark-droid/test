import { LarkClient } from './larkClient.js';
import { getLarkConfig } from '../config/lark.js';
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
}

interface LarkEventListResponse {
  items: LarkCalendarEvent[];
  page_token?: string;
  has_more: boolean;
}

export class CalendarService {
  private client: LarkClient;
  private config = getLarkConfig();

  constructor() {
    this.client = new LarkClient();
  }

  async getEvents(startTime: Date, endTime: Date): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    let pageToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const queryParams = new URLSearchParams({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        ...(pageToken && { page_token: pageToken }),
      });

      const response = await this.client.get<LarkEventListResponse>(
        `/calendar/v4/calendars/${this.config.calendarId}/events?${queryParams}`
      );

      const mappedEvents = response.items.map(this.mapLarkEventToCalendarEvent);
      events.push(...mappedEvents);

      hasMore = response.has_more;
      pageToken = response.page_token;
    }

    return events;
  }

  private mapLarkEventToCalendarEvent(larkEvent: LarkCalendarEvent): CalendarEvent {
    return {
      id: larkEvent.event_id,
      summary: larkEvent.summary,
      startTime: new Date(larkEvent.start_time.timestamp),
      endTime: new Date(larkEvent.end_time.timestamp),
      status: larkEvent.status,
    };
  }
}
