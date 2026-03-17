import { Signal } from './types';

type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  current?: {
    time: string;
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  hourly?: {
    time: string[];
    precipitation_probability: number[];
  };
};

const FOCUS_LAT = 45.5231;
const FOCUS_LNG = -122.6765;

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toWeatherTitle(code: number): string {
  if ([0, 1].includes(code)) {
    return 'Clear weather window for outdoor sensing';
  }

  if ([2, 3, 45, 48].includes(code)) {
    return 'Mixed sky conditions around focus area';
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return 'Rain risk rising through the day';
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return 'Snow and ice conditions likely';
  }

  if ([95, 96, 99].includes(code)) {
    return 'Storm conditions demand indoor posture';
  }

  return 'Weather conditions shifting across the day';
}

function deriveWeatherSummary(tempC: number, precipProb: number, windKmh: number): string {
  return `${Math.round(tempC)}°C now, ${Math.round(precipProb)}% precipitation risk, and ${Math.round(windKmh)} km/h wind in the focus zone.`;
}

function deriveWeatherScores(tempC: number, precipProb: number, windKmh: number) {
  const normalizedPrecip = clamp(precipProb / 100);
  const normalizedWind = clamp(windKmh / 45);
  const comfort = clamp(1 - Math.abs(tempC - 18) / 20);

  const operationalImpact = clamp(0.45 + normalizedPrecip * 0.35 + normalizedWind * 0.2);
  const actionability = clamp(0.95 - normalizedPrecip * 0.35 - normalizedWind * 0.15);
  const timing = clamp(0.65 + normalizedPrecip * 0.2 + comfort * 0.15);

  return {
    noveltyScore: 0.42,
    hypeScore: 0.03,
    actionabilityScore: actionability,
    credibilityScore: 0.96,
    emotionalIntensityScore: clamp(normalizedPrecip * 0.25 + normalizedWind * 0.2),
    strategicAlignmentScore: clamp(0.68 + operationalImpact * 0.18),
    operationalImpactScore: operationalImpact,
    timingScore: timing
  };
}

function buildWeatherFallbackSignal(reason: 'loading' | 'error', timestamp: string): Signal {
  const isLoading = reason === 'loading';

  return {
    id: 'sig_weather_01',
    title: isLoading ? 'Live weather feed is warming up' : 'Live weather unavailable right now',
    summary: isLoading
      ? 'Using a neutral weather posture while current conditions load.'
      : 'Weather API request failed; continue with an indoor-first backup plan for now.',
    details: isLoading
      ? 'Current weather payload has not returned complete fields yet. Keeping weather signal visible with neutral scores.'
      : 'The weather service could not be reached or returned invalid data. The radar can still operate with reduced confidence until the next refresh.',
    source: `weather/open-meteo (${reason})`,
    category: 'weather',
    timestamp,
    lat: FOCUS_LAT,
    lng: FOCUS_LNG,
    distanceFromFocusKm: 0,
    noveltyScore: 0.2,
    hypeScore: 0,
    actionabilityScore: 0.55,
    credibilityScore: 0.4,
    emotionalIntensityScore: 0.08,
    strategicAlignmentScore: 0.6,
    operationalImpactScore: 0.45,
    timingScore: 0.52,
    column: 'left',
    horizon: 'daily',
    tags: ['weather', reason]
  };
}

async function fetchWeatherSignal(now: number): Promise<Signal> {
  const endpoint =
    `https://api.open-meteo.com/v1/forecast?latitude=${FOCUS_LAT}&longitude=${FOCUS_LNG}` +
    '&current=temperature_2m,weather_code,wind_speed_10m&hourly=precipitation_probability&timezone=auto&forecast_days=1';

  try {
    const response = await fetch(endpoint, {
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      return buildWeatherFallbackSignal('error', new Date(now - 1000 * 60 * 20).toISOString());
    }

    const payload = (await response.json()) as OpenMeteoResponse;

    if (!payload.current || !payload.hourly?.precipitation_probability?.length) {
      return buildWeatherFallbackSignal('loading', new Date(now - 1000 * 60 * 20).toISOString());
    }

    const precipProb = payload.hourly.precipitation_probability[0] ?? 0;
    const { temperature_2m: tempC, weather_code: weatherCode, wind_speed_10m: windKmh } =
      payload.current;
    const calculated = deriveWeatherScores(tempC, precipProb, windKmh);

    return {
      id: 'sig_weather_01',
      title: toWeatherTitle(weatherCode),
      summary: deriveWeatherSummary(tempC, precipProb, windKmh),
      details:
        'Live weather conditions are now feeding this signal directly. Use this to decide whether to prioritize outdoor sensing loops or preserve indoor focus blocks.',
      source: 'weather/open-meteo (live)',
      category: 'weather',
      timestamp: payload.current.time || new Date(now - 1000 * 60 * 20).toISOString(),
      lat: payload.latitude ?? FOCUS_LAT,
      lng: payload.longitude ?? FOCUS_LNG,
      distanceFromFocusKm: 0,
      column: 'left',
      horizon: 'daily',
      tags: ['weather', 'live-data', 'fieldwork'],
      ...calculated
    };
  } catch {
    return buildWeatherFallbackSignal('error', new Date(now - 1000 * 60 * 20).toISOString());
  }
}

export async function ingestMockSignals(): Promise<Signal[]> {
  const now = Date.now();
  const weatherSignal = await fetchWeatherSignal(now);

  return [
    weatherSignal,
    {
      id: 'sig_calendar_01',
      title: 'Two protected strategy blocks are still open',
      summary: '09:30–11:00 and 15:00–16:30 remain unscheduled for synthesis work.',
      details:
        'Shift low-value administrative tasks to after 17:00. Preserve these blocks for narrative mapping and signal annotation.',
      source: 'calendar/local',
      category: 'calendar',
      timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
      lat: null,
      lng: null,
      distanceFromFocusKm: null,
      noveltyScore: 0.4,
      hypeScore: 0,
      actionabilityScore: 0.91,
      credibilityScore: 1,
      emotionalIntensityScore: 0.08,
      strategicAlignmentScore: 0.9,
      operationalImpactScore: 0.93,
      timingScore: 0.98,
      column: 'left',
      horizon: 'daily',
      tags: ['calendar', 'deep-work']
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
      tags: ['city', 'retail-intuition']
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
      tags: ['creative-ai', 'positioning']
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
      tags: ['career', 'macro']
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
      tags: ['noise', 'suppressed']
    }
  ];
}
