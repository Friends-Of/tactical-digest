import { createSign } from 'crypto';
import { CalendarNormalizedSignal, CalendarTimeBlock } from './types';

type GoogleCalendarDateTime = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  location?: string;
  start?: GoogleCalendarDateTime;
  end?: GoogleCalendarDateTime;
};

type GoogleCalendarResponse = {
  items?: GoogleCalendarEvent[];
  timeZone?: string;
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars';

function getRequiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function getWorkdayHours() {
  const startHour = Number(process.env.RADAR_WORKDAY_START_HOUR ?? '8');
  const endHour = Number(process.env.RADAR_WORKDAY_END_HOUR ?? '18');

  return {
    startHour: Number.isFinite(startHour) ? startHour : 8,
    endHour: Number.isFinite(endHour) ? endHour : 18
  };
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second')
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getTimeZoneParts(date, timeZone);
  const utcEquivalent = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return utcEquivalent - date.getTime();
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  let utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

  for (let index = 0; index < 2; index += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
    utcGuess = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
  }

  return new Date(utcGuess);
}

function getDayBounds(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const start = zonedDateTimeToUtc(parts.year, parts.month, parts.day, 0, 0, 0, timeZone);
  const end = zonedDateTimeToUtc(parts.year, parts.month, parts.day + 1, 0, 0, 0, timeZone);

  return {
    date: formatDateInTimeZone(date, timeZone),
    start,
    end
  };
}

function getWorkdayBounds(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const { startHour, endHour } = getWorkdayHours();

  return {
    start: zonedDateTimeToUtc(parts.year, parts.month, parts.day, startHour, 0, 0, timeZone),
    end: zonedDateTimeToUtc(parts.year, parts.month, parts.day, endHour, 0, 0, timeZone)
  };
}

function formatTimeRange(startIso: string, endIso: string, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit'
  });

  return `${formatter.format(new Date(startIso))}-${formatter.format(new Date(endIso))}`;
}

function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function mergeIntervals(intervals: Array<{ start: Date; end: Date }>) {
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Array<{ start: Date; end: Date }> = [];

  for (const interval of sorted) {
    const last = merged.at(-1);

    if (!last || interval.start.getTime() > last.end.getTime()) {
      merged.push({ ...interval });
      continue;
    }

    if (interval.end.getTime() > last.end.getTime()) {
      last.end = interval.end;
    }
  }

  return merged;
}

function buildOpenBlocks(
  mergedBusyIntervals: Array<{ start: Date; end: Date }>,
  workdayStart: Date,
  workdayEnd: Date,
  timeZone: string
): CalendarTimeBlock[] {
  const openBlocks: CalendarTimeBlock[] = [];
  let cursor = workdayStart;

  for (const interval of mergedBusyIntervals) {
    if (interval.start.getTime() > cursor.getTime()) {
      const durationMinutes = minutesBetween(cursor, interval.start);
      openBlocks.push({
        start: cursor.toISOString(),
        end: interval.start.toISOString(),
        durationMinutes,
        label: `Open ${formatTimeRange(cursor.toISOString(), interval.start.toISOString(), timeZone)}`
      });
    }

    if (interval.end.getTime() > cursor.getTime()) {
      cursor = interval.end;
    }
  }

  if (cursor.getTime() < workdayEnd.getTime()) {
    openBlocks.push({
      start: cursor.toISOString(),
      end: workdayEnd.toISOString(),
      durationMinutes: minutesBetween(cursor, workdayEnd),
      label: `Open ${formatTimeRange(cursor.toISOString(), workdayEnd.toISOString(), timeZone)}`
    });
  }

  return openBlocks.filter((block) => block.durationMinutes > 0);
}

function normalizeCalendar(
  events: GoogleCalendarEvent[],
  date: Date,
  timeZone: string
): CalendarNormalizedSignal {
  const dayBounds = getDayBounds(date, timeZone);
  const workdayBounds = getWorkdayBounds(date, timeZone);

  const normalizedEvents = events
    .map((event) => {
      const startRaw = event.start?.dateTime ?? event.start?.date;
      const endRaw = event.end?.dateTime ?? event.end?.date;

      if (!startRaw || !endRaw) {
        return null;
      }

      const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
      const start = new Date(startRaw);
      const end = new Date(endRaw);

      return {
        id: event.id ?? `${start.toISOString()}_${event.summary ?? 'untitled'}`,
        title: event.summary?.trim() || 'Untitled event',
        start,
        end,
        status: event.status ?? 'confirmed',
        location: event.location?.trim() || null,
        isAllDay,
        durationMinutes: minutesBetween(start, end)
      };
    })
    .filter(
      (event): event is NonNullable<typeof event> =>
        Boolean(event) && event.end.getTime() > event.start.getTime()
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const busyIntervals = mergeIntervals(
    normalizedEvents
      .map((event) => ({
        start: new Date(Math.max(event.start.getTime(), workdayBounds.start.getTime())),
        end: new Date(Math.min(event.end.getTime(), workdayBounds.end.getTime()))
      }))
      .filter((interval) => interval.end.getTime() > interval.start.getTime())
  );

  const pressureBlocks = busyIntervals.map((interval) => {
    const start = interval.start.toISOString();
    const end = interval.end.toISOString();
    const durationMinutes = minutesBetween(interval.start, interval.end);

    return {
      start,
      end,
      durationMinutes,
      label: `Busy ${formatTimeRange(start, end, timeZone)}`
    };
  });

  const openBlocks =
    busyIntervals.length > 0
      ? buildOpenBlocks(busyIntervals, workdayBounds.start, workdayBounds.end, timeZone)
      : [
          {
            start: workdayBounds.start.toISOString(),
            end: workdayBounds.end.toISOString(),
            durationMinutes: minutesBetween(workdayBounds.start, workdayBounds.end),
            label: `Open ${formatTimeRange(
              workdayBounds.start.toISOString(),
              workdayBounds.end.toISOString(),
              timeZone
            )}`
          }
        ];

  const busyMinutes = pressureBlocks.reduce((total, block) => total + block.durationMinutes, 0);
  const longestOpenBlock = [...openBlocks].sort((a, b) => b.durationMinutes - a.durationMinutes)[0];

  let summary = 'No events today. The workday is fully open for deliberate deep work.';
  let status: CalendarNormalizedSignal['status'] = 'empty';

  if (normalizedEvents.length > 0) {
    status = 'ready';
    summary = `${normalizedEvents.length} events create ${pressureBlocks.length} pressure blocks. `;
    summary += longestOpenBlock
      ? `Best open block: ${formatTimeRange(longestOpenBlock.start, longestOpenBlock.end, timeZone)} (${formatDuration(longestOpenBlock.durationMinutes)}).`
      : 'No meaningful open blocks remain in the configured workday.';
  }

  return {
    kind: 'calendar',
    status,
    date: dayBounds.date,
    timeZone,
    eventCount: normalizedEvents.length,
    busyMinutes,
    pressureBlocks,
    openBlocks,
    events: normalizedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      status: event.status,
      location: event.location,
      isAllDay: event.isAllDay,
      durationMinutes: event.durationMinutes
    })),
    summary
  };
}

async function fetchAccessToken(): Promise<string | null> {
  const directToken = getRequiredEnv('GOOGLE_CALENDAR_ACCESS_TOKEN');
  if (directToken) {
    return directToken;
  }

  const clientEmail = getRequiredEnv('GOOGLE_CALENDAR_CLIENT_EMAIL');
  const privateKey = getRequiredEnv('GOOGLE_CALENDAR_PRIVATE_KEY');

  if (!clientEmail || !privateKey) {
    return null;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const claims = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    aud: GOOGLE_TOKEN_URL,
    exp: nowInSeconds + 3600,
    iat: nowInSeconds
  };

  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value))
      .toString('base64url');

  const unsignedToken = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();

  const signature = signer
    .sign(privateKey.replace(/\\n/g, '\n'))
    .toString('base64url');

  const assertion = `${unsignedToken}.${signature}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Google token request failed with ${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function ingestGoogleCalendarSignal(): Promise<CalendarNormalizedSignal> {
  const calendarId = getRequiredEnv('GOOGLE_CALENDAR_ID');
  const configuredTimeZone =
    getRequiredEnv('GOOGLE_CALENDAR_TIME_ZONE') ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    'UTC';

  const unavailable = (summary: string): CalendarNormalizedSignal => ({
    kind: 'calendar',
    status: 'unavailable',
    date: formatDateInTimeZone(new Date(), configuredTimeZone),
    timeZone: configuredTimeZone,
    eventCount: 0,
    busyMinutes: 0,
    pressureBlocks: [],
    openBlocks: [],
    events: [],
    summary
  });

  if (!calendarId) {
    return unavailable('Google Calendar is not configured yet, so schedule pressure could not be ingested.');
  }

  try {
    const accessToken = await fetchAccessToken();

    if (!accessToken) {
      return unavailable(
        'Google Calendar credentials are missing, so today\'s events could not be read.'
      );
    }

    const now = new Date();
    const dayBounds = getDayBounds(now, configuredTimeZone);
    const query = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      timeMin: dayBounds.start.toISOString(),
      timeMax: dayBounds.end.toISOString()
    });

    const response = await fetch(
      `${GOOGLE_EVENTS_URL}/${encodeURIComponent(calendarId)}/events?${query.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar events request failed with ${response.status}`);
    }

    const data = (await response.json()) as GoogleCalendarResponse;
    const calendarTimeZone = data.timeZone || configuredTimeZone;
    return normalizeCalendar(data.items ?? [], now, calendarTimeZone);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown calendar ingestion error';
    return unavailable(`Google Calendar ingestion failed gracefully: ${message}.`);
  }
}
