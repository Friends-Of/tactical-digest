export type RadarColumn = 'left' | 'center' | 'right';

export type StrategicHorizon = 'daily' | 'weekly' | 'monthly' | 'long_term';

export type SignalCategory =
  | 'weather'
  | 'calendar'
  | 'local_pulse'
  | 'creative_tech'
  | 'macro_force'
  | 'economic_climate'
  | 'narrative_atmosphere'
  | 'noise';

export type CalendarEventSignal = {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  location: string | null;
  isAllDay: boolean;
  durationMinutes: number;
};

export type CalendarTimeBlock = {
  start: string;
  end: string;
  durationMinutes: number;
  label: string;
};

export type CalendarDayStatus = 'ready' | 'empty' | 'unavailable';

export type CalendarNormalizedSignal = {
  kind: 'calendar';
  status: CalendarDayStatus;
  date: string;
  timeZone: string;
  eventCount: number;
  busyMinutes: number;
  pressureBlocks: CalendarTimeBlock[];
  openBlocks: CalendarTimeBlock[];
  events: CalendarEventSignal[];
  summary: string;
};

export type NormalizedSignal = CalendarNormalizedSignal;

export type Signal = {
  id: string;
  title: string;
  summary: string;
  details: string;
  source: string;
  category: SignalCategory;
  timestamp: string;
  lat: number | null;
  lng: number | null;
  distanceFromFocusKm: number | null;
  noveltyScore: number;
  hypeScore: number;
  actionabilityScore: number;
  credibilityScore: number;
  emotionalIntensityScore: number;
  strategicAlignmentScore: number;
  operationalImpactScore: number;
  timingScore: number;
  column: RadarColumn;
  horizon: StrategicHorizon;
  tags: string[];
  normalized: NormalizedSignal | null;
};

export type RelevanceScore = {
  signalId: string;
  relevance: number;
  suppression: number;
  finalScore: number;
  suppressed: boolean;
  rationale: string;
};

export type StrategicMove = {
  id: string;
  text: string;
  why: string;
};

export type DailyBrief = {
  date: string;
  radarText: string;
  moves: StrategicMove[];
  ignoreNotes: string[];
};
