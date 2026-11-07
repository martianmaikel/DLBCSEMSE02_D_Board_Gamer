create table public.groups(
  id uuid primary key default gen_random_uuid(),
  name text not null
);
