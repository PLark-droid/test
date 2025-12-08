export interface LarkConfig {
  appId: string;
  appSecret: string;
  tenantAccessToken?: string;
  calendarId: string;
  workingHours: {
    start: string;
    end: string;
  };
  meetingDurationMinutes: number;
}

export function getLarkConfig(): LarkConfig {
  const appId = process.env.LARK_APP_ID;
  const appSecret = process.env.LARK_APP_SECRET;
  const calendarId = process.env.LARK_CALENDAR_ID || 'primary';

  if (!appId || !appSecret) {
    throw new Error('LARK_APP_ID and LARK_APP_SECRET must be set in environment variables');
  }

  return {
    appId,
    appSecret,
    tenantAccessToken: process.env.LARK_TENANT_ACCESS_TOKEN,
    calendarId,
    workingHours: {
      start: process.env.WORKING_HOURS_START || '09:00',
      end: process.env.WORKING_HOURS_END || '18:00',
    },
    meetingDurationMinutes: parseInt(process.env.MEETING_DURATION_MINUTES || '60', 10),
  };
}
