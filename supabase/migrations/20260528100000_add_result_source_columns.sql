alter table public.classification_results
  add column if not exists interview_content text,
  add column if not exists notes text,
  add column if not exists source_snapshot jsonb;
