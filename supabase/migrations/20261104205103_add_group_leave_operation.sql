-- Leave the group and, when necessary, store the supplied successor atomically.
create function private.leave_group(
  target_group_id uuid,
  expected_joined_at timestamptz,
  expected_admin_id uuid,
  successor_membership_id uuid default null
)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_admin_id uuid;
  current_membership public.memberships%rowtype;
  departed_membership public.memberships%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if expected_joined_at is null then
    raise exception 'Current membership joining time is required'
      using errcode = '22023';
  end if;

  if not private.is_active_group_member(target_group_id) then
    raise exception 'Active group membership required'
      using errcode = '42501';
  end if;

  select group_row.admin_membership_id
  into current_admin_id
  from public.groups as group_row
  where group_row.id = target_group_id
  for update;

  if not found then
    raise exception 'Group unavailable'
      using errcode = '42501';
  end if;

  select membership.*
  into current_membership
  from public.memberships as membership
  where membership.group_id = target_group_id
    and membership.user_id = current_user_id
    and membership.is_active = true
  for update;

  if not found then
    raise exception 'Active group membership required'
      using errcode = '42501';
  end if;

  if current_membership.joined_at
      is distinct from expected_joined_at
    or current_admin_id
      is distinct from expected_admin_id then
    raise exception 'Membership or administrator changed; reload and retry'
      using errcode = '40001';
  end if;

  if current_membership.id = current_admin_id then
    if successor_membership_id is null then
      if exists (
        select 1
        from public.memberships as membership
        where membership.group_id = target_group_id
          and membership.is_active = true
          and membership.id <> current_membership.id
      ) then
        raise exception 'A successor is required while other members remain'
          using errcode = '22023';
      end if;
    else
      if not exists (
        select 1
        from public.memberships as membership
        where membership.id = successor_membership_id
          and membership.group_id = target_group_id
          and membership.is_active = true
          and membership.id <> current_membership.id
      ) then
        raise exception 'Successor must be another active group member'
          using errcode = '22023';
      end if;
    end if;

    update public.groups
    set admin_membership_id = successor_membership_id
    where id = target_group_id;
  elsif successor_membership_id is not null then
    raise exception 'Only the departing administrator may supply a successor'
      using errcode = '42501';
  end if;

  update public.memberships
  set
    is_active = false,
    host_position = null
  where id = current_membership.id
  returning * into departed_membership;

  return departed_membership;
end;
$$;

revoke all
on function private.leave_group(uuid, timestamptz, uuid, uuid)
from public, anon, authenticated;

grant execute
on function private.leave_group(uuid, timestamptz, uuid, uuid)
to authenticated;

create function public.leave_group(
  target_group_id uuid,
  expected_joined_at timestamptz,
  expected_admin_id uuid,
  successor_membership_id uuid default null
)
returns public.memberships
language sql
security invoker
set search_path = ''
as $$
  select private.leave_group(
    target_group_id,
    expected_joined_at,
    expected_admin_id,
    successor_membership_id
  );
$$;

revoke all
on function public.leave_group(uuid, timestamptz, uuid, uuid)
from public, anon, authenticated;

grant execute
on function public.leave_group(uuid, timestamptz, uuid, uuid)
to authenticated;

comment on function public.leave_group(uuid, timestamptz, uuid, uuid) is
  'Deactivates the caller''s membership and clears its hosting position. A departing administrator must supply a Controller-selected active successor while members remain. Historical references are preserved.';
