-- APP 5 — Support Tickets: schema
-- Paste into the Supabase SQL editor and run once per project.

create extension if not exists "pgcrypto";

create table if not exists public.support_tickets (
  id            uuid        primary key default gen_random_uuid(),
  instance_name text        not null,
  ticket_number text        not null,
  title         text        not null,
  description   text        not null default '',
  category      text        not null default 'GENERAL',
  severity      text        not null default 'MEDIUM',
  status        text        not null default 'OPEN',
  assigned_to   text        not null default 'Unassigned',
  reported_by   text        not null,
  resolution    text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  unique (instance_name, ticket_number)
);

create index if not exists tickets_instance_idx
  on public.support_tickets (instance_name);

create index if not exists tickets_status_idx
  on public.support_tickets (instance_name, status);

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.support_tickets;
create trigger set_updated_at
  before update on public.support_tickets
  for each row execute function update_updated_at_column();

alter table public.support_tickets disable row level security;
