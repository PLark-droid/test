export interface CalendarEvent {
  id: string;
  summary: string;
  startTime: Date;
  endTime: Date;
  status?: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number;
}

export interface AvailableSlot {
  date: string;
  timeSlots: TimeSlot[];
}
