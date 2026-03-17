import { DailyBrief, RelevanceScore, Signal } from './types';

export function synthesizeDailyBrief(signals: Signal[], scores: RelevanceScore[]): DailyBrief {
  const scored = signals
    .map((signal) => ({ signal, score: scores.find((score) => score.signalId === signal.id) }))
    .filter((entry): entry is { signal: Signal; score: RelevanceScore } => Boolean(entry.score));

  const topMoves = scored
    .filter((entry) => !entry.score.suppressed)
    .sort((a, b) => b.score.finalScore - a.score.finalScore)
    .slice(0, 3)
    .map((entry, index) => ({
      id: `move_${index + 1}`,
      text: entry.signal.title,
      why: `Based on ${entry.signal.category} signal with score ${entry.score.finalScore}.`
    }));

  const ignoreNotes = scored
    .filter((entry) => entry.score.suppressed)
    .map((entry) => `${entry.signal.title} — suppressed due to hype/emotional intensity.`);

  return {
    date: new Date().toISOString().slice(0, 10),
    radarText:
      'Calm strategic posture: preserve deep work windows, validate local pulse in person, and convert creative-tech drift into positioned action.',
    moves: topMoves,
    ignoreNotes
  };
}
