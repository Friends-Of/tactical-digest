import { DailyBrief, RelevanceScore, Signal } from './types';

function formatTimeRange(startIso: string, endIso: string, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit'
  });

  return `${formatter.format(new Date(startIso))}-${formatter.format(new Date(endIso))}`;
}

function buildCalendarMoves(calendarSignal: Signal) {
  if (calendarSignal.normalized?.kind !== 'calendar') {
    return [];
  }

  const { normalized } = calendarSignal;
  const longestOpenBlock = [...normalized.openBlocks].sort(
    (a, b) => b.durationMinutes - a.durationMinutes
  )[0];
  const firstPressureBlock = [...normalized.pressureBlocks].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )[0];

  if (normalized.status === 'unavailable') {
    return [
      {
        id: 'move_calendar_unavailable',
        text: 'Treat the calendar as unverified until ingestion is restored.',
        why: 'The Google Calendar signal could not be read, so avoid overfitting the day around missing schedule data.'
      }
    ];
  }

  if (normalized.status === 'empty') {
    return [
      {
        id: 'move_calendar_empty',
        text: 'Use the empty calendar as a deliberate build day.',
        why: 'No events were found today, which creates a rare chance to protect a long self-directed execution block.'
      }
    ];
  }

  const moves = [];

  if (longestOpenBlock && longestOpenBlock.durationMinutes >= 60) {
    moves.push({
      id: 'move_calendar_open',
      text: `Protect ${formatTimeRange(longestOpenBlock.start, longestOpenBlock.end, normalized.timeZone)} for the highest-leverage work.`,
      why: `It is the largest open block on the calendar at ${longestOpenBlock.durationMinutes} minutes, making it the cleanest synthesis window.`
    });
  }

  if (firstPressureBlock) {
    moves.push({
      id: 'move_calendar_pressure',
      text: `Front-load preparation before ${formatTimeRange(firstPressureBlock.start, firstPressureBlock.end, normalized.timeZone)}.`,
      why: 'The first pressure block will compress the day if preparation and setup spill into it.'
    });
  }

  return moves;
}

export function synthesizeDailyBrief(signals: Signal[], scores: RelevanceScore[]): DailyBrief {
  const scored = signals
    .map((signal) => ({ signal, score: scores.find((score) => score.signalId === signal.id) }))
    .filter((entry): entry is { signal: Signal; score: RelevanceScore } => Boolean(entry.score));

  const calendarEntry = scored.find((entry) => entry.signal.category === 'calendar');
  const calendarMoves = calendarEntry ? buildCalendarMoves(calendarEntry.signal) : [];

  const topMoves = scored
    .filter((entry) => !entry.score.suppressed)
    .filter((entry) => entry.signal.category !== 'calendar')
    .sort((a, b) => b.score.finalScore - a.score.finalScore)
    .slice(0, Math.max(0, 3 - calendarMoves.length))
    .map((entry, index) => ({
      id: `move_signal_${index + 1}`,
      text: entry.signal.title,
      why: `Based on ${entry.signal.category} signal with score ${entry.score.finalScore}.`
    }));

  const ignoreNotes = scored
    .filter((entry) => entry.score.suppressed)
    .map((entry) => `${entry.signal.title} - suppressed due to hype/emotional intensity.`);

  const radarText =
    calendarEntry?.signal.normalized?.kind === 'calendar'
      ? `Calendar posture: ${calendarEntry.signal.normalized.summary} Pair that with the strongest non-noise signals and commit the day deliberately.`
      : 'Calm strategic posture: preserve deep work windows, validate local pulse in person, and convert creative-tech drift into positioned action.';

  return {
    date: new Date().toISOString().slice(0, 10),
    radarText,
    moves: [...calendarMoves, ...topMoves].slice(0, 3),
    ignoreNotes
  };
}
