/**
 * カレンダーAPIルート
 */

import { Router } from 'express';
import { UserCalendarService } from '../../services/userCalendarService.js';
import { TimeSlotFinder } from '../../utils/timeSlotFinder.js';
import { getLarkConfig } from '../../config/lark.js';

const router = Router();

/**
 * 認証チェックミドルウェア
 */
function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userAccessToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * カレンダー一覧を取得
 */
router.get('/list', requireAuth, async (req, res) => {
  try {
    const calendarService = new UserCalendarService(req.session.userAccessToken!);
    const calendars = await calendarService.getCalendars();

    res.json({ calendars });
  } catch (error: any) {
    console.error('カレンダー一覧取得エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 空き時間候補を取得
 */
router.get('/available-slots', requireAuth, async (req, res) => {
  try {
    const calendarService = new UserCalendarService(req.session.userAccessToken!);

    // パラメータ取得
    const daysAhead = parseInt(req.query.daysAhead as string) || 7;
    const maxSuggestions = parseInt(req.query.maxSuggestions as string) || 5;
    const calendarId = req.query.calendarId as string | undefined;

    // 期間設定
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);

    // イベント取得（calendarIdが未指定の場合は自動的にプライマリカレンダーを使用）
    const events = await calendarService.getEvents(startDate, endDate, calendarId);

    // 空き時間を検出
    const config = getLarkConfig();
    const timeSlotFinder = new TimeSlotFinder(
      config.workingHours,
      config.meetingDurationMinutes
    );

    const availableSlots = timeSlotFinder.findAvailableSlots(
      events,
      startDate,
      endDate
    );

    const suggestedSlots = timeSlotFinder.suggestMeetingSlots(
      availableSlots,
      maxSuggestions
    );

    res.json({
      availableSlots,
      suggestedSlots,
      searchPeriod: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });

  } catch (error: any) {
    console.error('空き時間取得エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as calendarRouter };
