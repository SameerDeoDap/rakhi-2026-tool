-- ─── Rakhi 2026 Project — Supabase schema ───────────────────────────────────
-- Run this entire file once in the Supabase SQL Editor (SQL → New query → paste → Run).
-- It creates one table per collection in src/lib/types.ts, enables Row Level
-- Security with an open anon policy (internal tool — the app-level password gate
-- is the access control), and turns on realtime so every team member sees
-- changes without refreshing.

-- ─── Reference data ─────────────────────────────────────────────────────────

create table if not exists seller_accounts (
  id          text primary key,
  marketplace text not null,
  name        text not null
);

create table if not exists goods_categories (
  id            text primary key,
  name          text not null,
  product_types jsonb not null default '[]'::jsonb
);

create table if not exists service_categories (
  id         text primary key,
  name       text not null,
  definition text not null default '',
  "group"    text not null default 'service'  -- 'service' | 'advertising' | 'hr'
);

-- ─── Transactions (one row per entry — concurrent edits never clobber) ──────

create table if not exists income (
  id                text primary key,
  date              text not null,            -- YYYY-MM-DD
  marketplace       text,
  seller_account_id text,
  income_type       text not null,
  amount            double precision not null default 0,
  orders            integer,
  units             integer,
  reference         text,
  settlement_id     text,
  bank_ref          text,
  description       text,
  status            text not null default 'active',
  source            text not null default 'manual',
  audit             jsonb not null default '[]'::jsonb
);

create table if not exists goods (
  id           text primary key,
  date         text not null,
  category_id  text not null,
  product_type text,
  qty          double precision not null default 0,
  rate         double precision not null default 0,
  amount       double precision not null default 0,
  vendor       text,
  marketplace  text,
  paid         boolean not null default true,
  reference    text,
  description  text,
  status       text not null default 'active',
  source       text not null default 'manual',
  audit        jsonb not null default '[]'::jsonb
);

create table if not exists services (
  id          text primary key,
  date        text not null,
  category_id text not null,
  amount      double precision not null default 0,
  allocation  text not null default 'common',  -- 'common' | 'marketplace'
  marketplace text,
  vendor      text,
  paid        boolean not null default true,
  reference   text,
  description text,
  status      text not null default 'active',
  source      text not null default 'manual',
  audit       jsonb not null default '[]'::jsonb
);

create table if not exists stock (
  id           text primary key,
  kind         text not null,                  -- 'opening' | 'closing'
  date         text not null,
  category_id  text not null,
  product_type text,
  qty          double precision not null default 0,
  rate         double precision not null default 0,
  amount       double precision not null default 0,
  source       text not null default 'manual',
  audit        jsonb not null default '[]'::jsonb
);

create table if not exists duplicates (
  id               text primary key,
  entry_kind       text not null,              -- 'income' | 'goods' | 'service'
  entry_id         text not null,
  matched_entry_id text not null,
  reason           text not null default '',
  status           text not null default 'pending',
  created_at       text not null,              -- ISO timestamp (app-generated)
  resolved_by      text,
  resolved_at      text,
  note             text
);

-- ─── Settings (single key-value row) ────────────────────────────────────────

create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

insert into settings (key, value)
values ('app', '{"allocationMethod":"revenue","manualPercents":{},"version":1,"seeded":false}'::jsonb)
on conflict (key) do nothing;

-- ─── Access: allow anon read/write (internal tool — see README tradeoff) ────

alter table seller_accounts    enable row level security;
alter table goods_categories   enable row level security;
alter table service_categories enable row level security;
alter table income             enable row level security;
alter table goods              enable row level security;
alter table services           enable row level security;
alter table stock              enable row level security;
alter table duplicates         enable row level security;
alter table settings           enable row level security;

create policy "anon full access" on seller_accounts    for all to anon using (true) with check (true);
create policy "anon full access" on goods_categories   for all to anon using (true) with check (true);
create policy "anon full access" on service_categories for all to anon using (true) with check (true);
create policy "anon full access" on income             for all to anon using (true) with check (true);
create policy "anon full access" on goods              for all to anon using (true) with check (true);
create policy "anon full access" on services           for all to anon using (true) with check (true);
create policy "anon full access" on stock              for all to anon using (true) with check (true);
create policy "anon full access" on duplicates         for all to anon using (true) with check (true);
create policy "anon full access" on settings           for all to anon using (true) with check (true);

-- ─── Realtime: broadcast row changes to all connected clients ───────────────

alter publication supabase_realtime add table seller_accounts;
alter publication supabase_realtime add table goods_categories;
alter publication supabase_realtime add table service_categories;
alter publication supabase_realtime add table income;
alter publication supabase_realtime add table goods;
alter publication supabase_realtime add table services;
alter publication supabase_realtime add table stock;
alter publication supabase_realtime add table duplicates;
alter publication supabase_realtime add table settings;
