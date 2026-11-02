create table public.locations(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id),
  address text not null
);
