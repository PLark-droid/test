import { describe, it, expect } from 'vitest';
import { TimeSlotFinder } from '../src/utils/timeSlotFinder.js';
import { CalendarEvent } from '../src/types/calendar.js';

describe('TimeSlotFinder', () => {
  const workingHours = { start: '09:00', end: '18:00' };
  const meetingDuration = 60;

  describe('findAvailableSlots', () => {
    it('should find available slots when there are no events', () => {
      const finder = new TimeSlotFinder(workingHours, meetingDuration);
      const events: CalendarEvent[] = [];
      const startDate = new Date('2025-01-15T00:00:00Z');
      const endDate = new Date('2025-01-15T23:59:59Z');

      const result = finder.findAvailableSlots(events, startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].timeSlots).toHaveLength(1);
      expect(result[0].timeSlots[0].duration).toBe(540);
    });

    it('should find slots between events', () => {
      const finder = new TimeSlotFinder(workingHours, meetingDuration);
      const events: CalendarEvent[] = [
        {
          id: '1',
          summary: 'Meeting 1',
          startTime: new Date('2025-01-15T10:00:00'),
          endTime: new Date('2025-01-15T11:00:00'),
        },
        {
          id: '2',
          summary: 'Meeting 2',
          startTime: new Date('2025-01-15T14:00:00'),
          endTime: new Date('2025-01-15T15:00:00'),
        },
      ];
      const startDate = new Date('2025-01-15T00:00:00');
      const endDate = new Date('2025-01-15T23:59:59');

      const result = finder.findAvailableSlots(events, startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].timeSlots.length).toBeGreaterThan(2);
    });

    it('should filter out slots shorter than meeting duration', () => {
      const finder = new TimeSlotFinder(workingHours, 120);
      const events: CalendarEvent[] = [
        {
          id: '1',
          summary: 'Meeting',
          startTime: new Date('2025-01-15T09:00:00'),
          endTime: new Date('2025-01-15T16:00:00'),
        },
      ];
      const startDate = new Date('2025-01-15T00:00:00');
      const endDate = new Date('2025-01-15T23:59:59');

      const result = finder.findAvailableSlots(events, startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].timeSlots).toHaveLength(1);
      expect(result[0].timeSlots[0].duration).toBe(120);
    });
  });

  describe('suggestMeetingSlots', () => {
    it('should return requested number of suggestions', () => {
      const finder = new TimeSlotFinder(workingHours, meetingDuration);
      const availableSlots = [
        {
          date: '2025-01-15',
          timeSlots: [
            {
              start: new Date('2025-01-15T09:00:00'),
              end: new Date('2025-01-15T12:00:00'),
              duration: 180,
            },
            {
              start: new Date('2025-01-15T13:00:00'),
              end: new Date('2025-01-15T18:00:00'),
              duration: 300,
            },
          ],
        },
        {
          date: '2025-01-16',
          timeSlots: [
            {
              start: new Date('2025-01-16T09:00:00'),
              end: new Date('2025-01-16T18:00:00'),
              duration: 540,
            },
          ],
        },
      ];

      const result = finder.suggestMeetingSlots(availableSlots, 3);

      expect(result).toHaveLength(3);
      expect(result[0].start.getTime()).toBeLessThanOrEqual(result[1].start.getTime());
    });
  });
});
