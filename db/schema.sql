-- Morning Radar persistence model (graph-ready, local-first)

create extension if not exists pgcrypto;

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  source text not null,
  category text not null,
  timestamp timestamptz not null,
  lat numeric(9, 6),
  lng numeric(9, 6),
  distance_from_focus numeric(8, 3),
  novelty_score numeric(5, 4) not null check (novelty_score between 0 and 1),
  hype_score numeric(5, 4) not null check (hype_score between 0 and 1),
  actionability_score numeric(5, 4) not null check (actionability_score between 0 and 1),
  created_at timestamptz not null default now()
);

create table if not exists signal_links (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references signals(id) on delete cascade,
  linked_entity_type text not null,
  linked_entity_id text not null,
  relationship_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists themes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  strength_score numeric(5, 4) not null default 0.5,
  created_at timestamptz not null default now()
);

create table if not exists signal_theme_map (
  signal_id uuid not null references signals(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  confidence numeric(5, 4) not null check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  primary key (signal_id, theme_id)
);

create table if not exists annotations (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references signals(id) on delete cascade,
  note text not null,
  tag text,
  created_at timestamptz not null default now()
);

create table if not exists daily_briefs (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  radar_text text not null,
  moves jsonb not null default '[]'::jsonb,
  ignore_notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_signals_timestamp on signals (timestamp desc);
create index if not exists idx_signals_category on signals (category);
create index if not exists idx_signal_links_signal on signal_links (signal_id);
create index if not exists idx_annotations_signal on annotations (signal_id, created_at desc);
