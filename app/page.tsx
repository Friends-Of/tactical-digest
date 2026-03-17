import { SignalCard } from '@/components/signal-card';
import { ingestMockSignals } from '@/lib/mock-ingestion';
import { scoreSignals } from '@/lib/mock-scoring';
import { synthesizeDailyBrief } from '@/lib/mock-synthesis';

export default async function HomePage() {
  const signals = await ingestMockSignals();
  const scores = scoreSignals(signals);
  const brief = synthesizeDailyBrief(signals, scores);

  const leftSignals = signals.filter((signal) => signal.column === 'left');
  const centerSignals = signals.filter((signal) => signal.column === 'center');
  const rightSignals = signals.filter((signal) => signal.column === 'right');

  return (
    <main className="page">
      <section className="hero">
        <h1>Morning Radar</h1>
        <p>
          Personal strategic intelligence environment. Calm briefing surface with editorial density,
          no infinite scroll, and expandable memory-grade signals.
        </p>
      </section>

      <section className="brief-panel" aria-label="Daily strategic brief">
        <h2>Daily Brief · {brief.date}</h2>
        <p>{brief.radarText}</p>
      </section>

      <section className="radar-grid" aria-label="Three-column radar layout">
        <div className="column">
          <header>
            <h2>Left · Operational Reality</h2>
            <p>Weather, calendar interpretation, and three strategic moves.</p>
          </header>

          <div className="stack">
            {leftSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                scoring={scores.find((score) => score.signalId === signal.id)}
              />
            ))}
          </div>

          <div className="moves">
            <h3>Three Strategic Moves</h3>
            <ol>
              {brief.moves.map((move) => (
                <li key={move.id}>
                  <strong>{move.text}</strong>
                  <span>{move.why}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="column">
          <header>
            <h2>Center · Signal Field</h2>
            <p>Local pulse, creative-tech undercurrents, and macro directional forces.</p>
          </header>

          <div className="stack">
            {centerSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                scoring={scores.find((score) => score.signalId === signal.id)}
              />
            ))}
          </div>
        </div>

        <div className="column">
          <header>
            <h2>Right · Noise Control</h2>
            <p>What to ignore, watchlist posture, and source tuning.</p>
          </header>

          <div className="stack">
            {rightSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                scoring={scores.find((score) => score.signalId === signal.id)}
              />
            ))}
          </div>

          <div className="ignore-box">
            <h3>Ignore Notes</h3>
            <ul>
              {brief.ignoreNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="future-surface" aria-label="Future graph and thread views">
        <h2>Future Cognitive Surfaces</h2>
        <p>
          Graph view (nodes, links, clusters) and strategic threads will build long-term memory from
          today&apos;s radar signals.
        </p>
      </section>
    </main>
  );
}
