import { ingestGoogleCalendarSignal } from './google-calendar';
import { Signal } from './types';

function buildCalendarSignalScores(signal: ReturnType<typeof createCalendarSignalBase>['normalized']) {
  if (!signal || signal.kind !== 'calendar') {
    return {
      noveltyScore: 0.4,
      hypeScore: 0,
      actionabilityScore: 0.7,
      credibilityScore: 0.9,
      emotionalIntensityScore: 0.08,
      strategicAlignmentScore: 0.78,
      operationalImpactScore: 0.75,
      timingScore: 0.98
    };
  }

  if (signal.status === 'unavailable') {
    return {
      noveltyScore: 0.2,
      hypeScore: 0,
      actionabilityScore: 0.25,
      credibilityScore: 0.35,
      emotionalIntensityScore: 0.05,
      strategicAlignmentScore: 0.45,
      operationalImpactScore: 0.3,
      timingScore: 0.98
    };
  }

  const longestOpenBlock = Math.max(...signal.openBlocks.map((block) => block.durationMinutes), 0);
  const busyRatio = Math.min(signal.busyMinutes / 600, 1);
  const openRatio = Math.min(longestOpenBlock / 180, 1);

  return {
    noveltyScore: signal.status === 'empty' ? 0.32 : 0.44,
    hypeScore: 0,
    actionabilityScore: Number((0.5 + openRatio * 0.45).toFixed(3)),
    credibilityScore: signal.status === 'ready' ? 0.98 : 1,
    emotionalIntensityScore: 0.06,
    strategicAlignmentScore: Number((0.7 + openRatio * 0.25).toFixed(3)),
    operationalImpactScore: Number((0.55 + busyRatio * 0.35 + openRatio * 0.1).toFixed(3)),
    timingScore: 1
  };
}

function createCalendarSignalBase(normalized: Awaited<ReturnType<typeof ingestGoogleCalendarSignal>>) {
  const longestOpenBlock = [...normalized.openBlocks].sort(
    (a, b) => b.durationMinutes - a.durationMinutes
  )[0];

  const title =
    normalized.status === 'unavailable'
      ? 'Calendar signal unavailable'
      : normalized.status === 'empty'
        ? 'No calendar events today'
        : normalized.pressureBlocks.length > 0
          ? `${normalized.pressureBlocks.length} pressure blocks shape the day`
          : 'Calendar favors open execution time';

  const summary =
    normalized.status === 'ready'
      ? normalized.summary
      : normalized.status === 'empty'
        ? 'The schedule is clear. Treat the day as intentionally open rather than accidentally unplanned.'
        : normalized.summary;

  const details =
    normalized.status === 'ready'
      ? [
          normalized.summary,
          normalized.pressureBlocks.length > 0
            ? `Pressure: ${normalized.pressureBlocks.map((block) => block.label).join(', ')}.`
            : 'Pressure: none.',
          longestOpenBlock
            ? `Open: ${longestOpenBlock.label} is the best protected focus window.`
            : 'Open: no meaningful open block remains inside the configured workday.'
        ].join(' ')
      : normalized.status === 'empty'
        ? 'No events were returned for today. Preserve the largest self-directed block for the most leverage-heavy work.'
        : 'Calendar ingestion did not complete, so this signal is informational and should not drive hard commitments yet.';

  return {
    id: `sig_calendar_${normalized.date}`,
    title,
    summary,
    details,
    source: 'calendar/google',
    category: 'calendar' as const,
    timestamp: new Date().toISOString(),
    lat: null,
    lng: null,
    distanceFromFocusKm: null,
    column: 'left' as const,
    horizon: 'daily' as const,
    tags: [
      'calendar',
      normalized.status,
      normalized.pressureBlocks.length > 0 ? 'pressure-blocks' : 'open-day'
    ],
    normalized
  };
}

export async function ingestMockSignals(): Promise<Signal[]> {
  const now = Date.now();
  const normalizedCalendar = await ingestGoogleCalendarSignal();
  const calendarSignalBase = createCalendarSignalBase(normalizedCalendar);
  const calendarScores = buildCalendarSignalScores(normalizedCalendar);

  return [
    {
      id: 'sig_weather_01',
      title: 'Cool rain break from 12:00-16:00',
      summary: 'Dry midday window supports a focused field walk and retail pulse check.',
      details:
        'Morning showers taper by noon, with lower wind and stable visibility downtown. Useful for in-person sensing between deep work blocks.',
      source: 'weather/noaa-local',
      category: 'weather',
      timestamp: new Date(now - 1000 * 60 * 20).toISOString(),
      lat: 45.5231,
      lng: -122.6765,
      distanceFromFocusKm: 1.8,
      noveltyScore: 0.58,
      hypeScore: 0.05,
      actionabilityScore: 0.82,
      credibilityScore: 0.94,
      emotionalIntensityScore: 0.12,
      strategicAlignmentScore: 0.72,
      operationalImpactScore: 0.8,
      timingScore: 0.94,
      column: 'left',
      horizon: 'daily',
      tags: ['weather', 'fieldwork'],
      normalized: null
    },
    {
      ...calendarSignalBase,
      ...calendarScores
    },
    {
      id: 'sig_local_01',
      title: 'Foot traffic shifted one corridor east this week',
      summary: 'Neighborhood pulse indicates a stronger afternoon cluster around transit edge.',
      details:
        'Three local business updates and two event boards show increased dwell time east of the usual route. Validate with a short observational loop.',
      source: 'local-events/curated',
      category: 'local_pulse',
      timestamp: new Date(now - 1000 * 60 * 75).toISOString(),
      lat: 45.5219,
      lng: -122.6674,
      distanceFromFocusKm: 2.6,
      noveltyScore: 0.74,
      hypeScore: 0.21,
      actionabilityScore: 0.86,
      credibilityScore: 0.77,
      emotionalIntensityScore: 0.22,
      strategicAlignmentScore: 0.81,
      operationalImpactScore: 0.84,
      timingScore: 0.73,
      column: 'center',
      horizon: 'weekly',
      tags: ['city', 'retail-intuition'],
      normalized: null
    },
    {
      id: 'sig_creative_01',
      title: 'Studios are shipping local-first creative AI workflows',
      summary: 'Small teams are replacing cloud-only stacks with hybrid private inference.',
      details:
        'This aligns with sovereignty and calmer operator ergonomics. Opportunity: package a lightweight local-first service narrative.',
      source: 'creative-tech/briefing',
      category: 'creative_tech',
      timestamp: new Date(now - 1000 * 60 * 130).toISOString(),
      lat: null,
      lng: null,
      distanceFromFocusKm: null,
      noveltyScore: 0.8,
      hypeScore: 0.34,
      actionabilityScore: 0.78,
      credibilityScore: 0.82,
      emotionalIntensityScore: 0.2,
      strategicAlignmentScore: 0.95,
      operationalImpactScore: 0.71,
      timingScore: 0.67,
      column: 'center',
      horizon: 'monthly',
      tags: ['creative-ai', 'positioning'],
      normalized: null
    },
    {
      id: 'sig_macro_01',
      title: 'Hiring narratives emphasize AI orchestration over pure tooling',
      summary: 'Leadership demand is tilting toward strategic integrators.',
      details:
        'Signals across job language and founder commentary indicate demand for operators who can synthesize product, data, and narrative direction.',
      source: 'macro/hiring-signals',
      category: 'macro_force',
      timestamp: new Date(now - 1000 * 60 * 180).toISOString(),
      lat: null,
      lng: null,
      distanceFromFocusKm: null,
      noveltyScore: 0.61,
      hypeScore: 0.39,
      actionabilityScore: 0.66,
      credibilityScore: 0.75,
      emotionalIntensityScore: 0.27,
      strategicAlignmentScore: 0.89,
      operationalImpactScore: 0.68,
      timingScore: 0.64,
      column: 'center',
      horizon: 'long_term',
      tags: ['career', 'macro'],
      normalized: null
    },
    {
      id: 'sig_noise_01',
      title: 'Viral discourse storm in general tech feed',
      summary: 'High emotional velocity with low operational relevance for current strategy.',
      details:
        'Story is broadly repeated and weakly tied to local execution choices. Keep monitored but suppressed in default brief.',
      source: 'social/noise-monitor',
      category: 'noise',
      timestamp: new Date(now - 1000 * 60 * 40).toISOString(),
      lat: null,
      lng: null,
      distanceFromFocusKm: null,
      noveltyScore: 0.25,
      hypeScore: 0.94,
      actionabilityScore: 0.14,
      credibilityScore: 0.42,
      emotionalIntensityScore: 0.92,
      strategicAlignmentScore: 0.11,
      operationalImpactScore: 0.16,
      timingScore: 0.35,
      column: 'right',
      horizon: 'daily',
      tags: ['noise', 'suppressed'],
      normalized: null
    }
  ];
}
