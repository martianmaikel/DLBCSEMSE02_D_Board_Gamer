-- Internal authorization helpers.
create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Check the signed-in user's own active membership.
-- SECURITY DEFINER avoids recursion through memberships RLS.
create function private.is_active_group_member(
  target_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships as membership
    where membership.group_id = target_group_id
      and membership.user_id = (select auth.uid())
      and membership.is_active = true
  );
$$;

revoke all
on function private.is_active_group_member(uuid)
from public, anon, authenticated;

grant execute
on function private.is_active_group_member(uuid)
to authenticated;

-- Replace the US1 read policies.
drop policy memberships_select_own
on public.memberships;

drop policy groups_select_member
on public.groups;

drop policy locations_select_member
on public.locations;

drop policy sessions_select_member
on public.sessions;

create policy memberships_select_active_group_member
on public.memberships
for select
to authenticated
using (
  private.is_active_group_member(group_id)
);

create policy groups_select_active_member
on public.groups
for select
to authenticated
using (
  private.is_active_group_member(id)
);

create policy locations_select_active_member
on public.locations
for select
to authenticated
using (
  private.is_active_group_member(group_id)
);

create policy sessions_select_active_member
on public.sessions
for select
to authenticated
using (
  private.is_active_group_member(group_id)
);
