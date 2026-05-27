create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_name text,
  total_rows integer not null default 0,
  excluded_rows integer not null default 0,
  status text not null default 'pending',
  selected_result_values text[] not null default '{}'::text[],
  insight_summary text,
  analyzed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.classification_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  row_index integer not null,
  primary_cause text,
  secondary_action text,
  detail_tags text,
  competing_course text,
  reasoning text,
  needs_review boolean not null default false,
  review_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint classification_results_session_row_unique unique (session_id, row_index)
);

create table if not exists public.new_categories (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  category_name text not null,
  occurrence_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint new_categories_session_category_unique unique (session_id, category_name)
);

create index if not exists classification_results_session_id_idx
  on public.classification_results (session_id);

create index if not exists new_categories_session_id_idx
  on public.new_categories (session_id);

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row execute procedure public.set_updated_at();

drop trigger if exists classification_results_set_updated_at on public.classification_results;
create trigger classification_results_set_updated_at
before update on public.classification_results
for each row execute procedure public.set_updated_at();
