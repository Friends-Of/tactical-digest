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
