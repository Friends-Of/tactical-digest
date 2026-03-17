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

## Google Calendar setup

Morning Radar now reads today's Google Calendar events server-side and synthesizes:
- pressure blocks
- open blocks
- a normalized calendar signal
- relevance-aware strategic moves

Set these environment variables before running:

```bash
GOOGLE_CALENDAR_ID=your_calendar_id
GOOGLE_CALENDAR_TIME_ZONE=America/Los_Angeles

# Option 1: short-lived bearer token
GOOGLE_CALENDAR_ACCESS_TOKEN=your_access_token

# Option 2: service account credentials
GOOGLE_CALENDAR_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional workday window used for open-block analysis
RADAR_WORKDAY_START_HOUR=8
RADAR_WORKDAY_END_HOUR=18
```

If no events are returned for the day, the calendar signal marks the day as open and keeps the briefing functional.
