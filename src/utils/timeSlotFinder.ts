import { CalendarEvent, TimeSlot, AvailableSlot } from '../types/calendar.js';

interface WorkingHours {
  start: string;
  end: string;
}

export class TimeSlotFinder {
  constructor(
    private workingHours: WorkingHours,
    private meetingDurationMinutes: number
  ) {}

  findAvailableSlots(
    events: CalendarEvent[],
    startDate: Date,
    endDate: Date
  ): AvailableSlot[] {
    const availableSlots: AvailableSlot[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dailySlots = this.findDailyAvailableSlots(events, currentDate);
      if (dailySlots.length > 0) {
        availableSlots.push({
          date: currentDate.toISOString().split('T')[0],
          timeSlots: dailySlots,
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableSlots;
  }

  private findDailyAvailableSlots(events: CalendarEvent[], date: Date): TimeSlot[] {
    const dailyEvents = this.getDailyEvents(events, date);
    const workingStart = this.parseTime(date, this.workingHours.start);
    const workingEnd = this.parseTime(date, this.workingHours.end);

    const busySlots = dailyEvents
      .map(event => ({
        start: event.startTime,
        end: event.endTime,
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const availableSlots: TimeSlot[] = [];
    let currentTime = workingStart;

    for (const busySlot of busySlots) {
      if (currentTime < busySlot.start) {
        const slotDuration = (busySlot.start.getTime() - currentTime.getTime()) / (1000 * 60);
        if (slotDuration >= this.meetingDurationMinutes) {
          availableSlots.push({
            start: new Date(currentTime),
            end: new Date(busySlot.start),
            duration: slotDuration,
          });
        }
      }
      currentTime = new Date(Math.max(currentTime.getTime(), busySlot.end.getTime()));
    }

    if (currentTime < workingEnd) {
      const slotDuration = (workingEnd.getTime() - currentTime.getTime()) / (1000 * 60);
      if (slotDuration >= this.meetingDurationMinutes) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(workingEnd),
          duration: slotDuration,
        });
      }
    }

    return availableSlots;
  }

  private getDailyEvents(events: CalendarEvent[], date: Date): CalendarEvent[] {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return events.filter(event => {
      return event.startTime < dayEnd && event.endTime > dayStart;
    });
  }

  private parseTime(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  suggestMeetingSlots(availableSlots: AvailableSlot[], count: number = 5): TimeSlot[] {
    const allSlots: TimeSlot[] = [];

    for (const daySlots of availableSlots) {
      allSlots.push(...daySlots.timeSlots);
    }

    return allSlots
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, count);
  }
}
