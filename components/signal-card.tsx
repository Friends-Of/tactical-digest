'use client';

import { useState } from 'react';
import type { RelevanceScore, Signal } from '@/lib/types';

type SignalCardProps = {
  signal: Signal;
  scoring?: RelevanceScore;
};

export function SignalCard({ signal, scoring }: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="signal-card">
      <header>
        <p className="meta">{signal.source}</p>
        <h3>{signal.title}</h3>
      </header>

      <p>{signal.summary}</p>

      <div className="signal-footer">
        <span className="pill">{signal.category}</span>
        <span className="pill">Score {scoring?.finalScore ?? 'n/a'}</span>
        {scoring?.suppressed ? <span className="pill warning">Suppressed</span> : null}
      </div>

      {expanded ? (
        <div className="details-wrap">
          <p className="details">{signal.details}</p>
          {scoring ? <p className="rationale">{scoring.rationale}</p> : null}
        </div>
      ) : null}

      <button type="button" onClick={() => setExpanded((curr) => !curr)}>
        {expanded ? 'Collapse' : 'Expand'}
      </button>
    </article>
  );
}
