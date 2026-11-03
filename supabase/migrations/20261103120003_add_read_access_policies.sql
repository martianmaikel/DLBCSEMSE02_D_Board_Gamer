alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.locations enable row level security;
alter table public.sessions enable row level security;

revoke all privileges
on table public.groups, public.memberships, public.locations, public.sessions
from anon, authenticated;

grant select
on table public.groups, public.memberships, public.locations, public.sessions
to authenticated;


create policy memberships_select_own
on public.memberships
for select
to authenticated
using (user_id = auth.uid());

create policy groups_select_member
on public.groups
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships
    where memberships.group_id = groups.id
      and memberships.user_id = auth.uid()
  )
);

create policy locations_select_member
on public.locations
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships
    where memberships.group_id = locations.group_id
      and memberships.user_id = auth.uid()
  )
);

create policy sessions_select_member
on public.sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships
    where memberships.group_id = sessions.group_id
      and memberships.user_id = auth.uid()
  )
);
