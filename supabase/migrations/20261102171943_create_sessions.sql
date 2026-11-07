alter table public.locations
  add constraint locations_group_id_id_unique
  unique(group_id, id);

create table public.sessions(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id),
  location_id uuid not null,
  starts_at timestamptz not null,

  constraint sessions_location_same_group_fk
    foreign key (group_id, location_id)
    references public.locations(group_id, id)
);
