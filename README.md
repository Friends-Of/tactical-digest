# Morning Radar

Morning Radar is a **local-first personal strategic intelligence environment**.

It is designed as a thinking instrument: calm interface, editorial curation, and long-term memory formation.

## Current scaffold (Build Spec V2 aligned)

### Product surfaces
- **Morning Radar (Home)**: three-column strategist desk layout (`Left`, `Center`, `Right`) with no infinite scroll.
- **Future Signal Graph**: placeholder for node-link cognition and thematic clustering.
- **Future Strategic Threads**: placeholder for persistent theme narratives.

### Core architecture layers
- **Layer A – Signal Ingestion**: `lib/mock-ingestion.ts`
- **Layer B – Normalization**: unified `Signal` shape in `lib/types.ts`
- **Layer C – Graph-ready persistence**: `db/schema.sql`
- **Layer D – Relevance + Suppression engine**: `lib/mock-scoring.ts`
- **Layer E – Intelligence synthesis**: `lib/mock-synthesis.ts`
- **Layer F – Interface layer**: `app/page.tsx`, `components/signal-card.tsx`

### Radar layout
- **Left**: weather, calendar interpretation, and three strategic moves.
- **Center**: local pulse, creative-tech undercurrents, macro directional forces.
- **Right**: what to ignore, suppression notes, source tuning posture.

### Database model (MVP graph-ready)
- `signals`
- `signal_links`
- `themes`
- `signal_theme_map`
- `annotations`
- `daily_briefs`

## Local run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.
