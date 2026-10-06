-- VIT Recover — campus lost & found schema
-- Per-user columns are TEXT to match Better Auth ids (and the preview 'dev-user').

create table if not exists profiles (
  user_id text primary key,
  display_name text not null,
  registration_number text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists items (
  id text primary key,
  reporter_id text not null,
  kind text not null check (kind in ('lost', 'found')),
  category text not null,
  venue text not null,
  title text not null,
  description text not null,
  verification_challenge text not null,
  status text not null default 'active' check (status in ('active', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

create table if not exists claims (
  id text primary key,
  item_id text not null,
  claimant_id text not null,
  answer text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  meetup_checkpoint text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (item_id, claimant_id)
);

create table if not exists messages (
  id text primary key,
  claim_id text not null,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists items_kind_status_idx on items (kind, status, created_at desc);
create index if not exists items_reporter_idx on items (reporter_id);
create index if not exists claims_item_idx on claims (item_id);
create index if not exists claims_claimant_idx on claims (claimant_id);
create index if not exists messages_claim_idx on messages (claim_id, created_at);
