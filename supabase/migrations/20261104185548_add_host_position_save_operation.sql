-- Persist administrator-supplied position changes atomically.
create function private.save_host_positions(
  target_group_id uuid,
  position_changes jsonb
)
returns setof public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  group_admin_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if pg_catalog.jsonb_typeof(position_changes)
      is distinct from 'array' then
    raise exception 'Position changes must be an array'
      using errcode = '22023';
  end if;

  if pg_catalog.jsonb_array_length(position_changes) = 0 then
    raise exception 'Position changes must not be empty'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(position_changes) as entry(item)
    where pg_catalog.jsonb_typeof(item) is distinct from 'object'
      or not (
        item ?& array[
          'membership_id',
          'expected_position',
          'new_position'
        ]
      )
      or pg_catalog.jsonb_typeof(item -> 'membership_id')
        is distinct from 'string'
      or pg_catalog.jsonb_typeof(item -> 'expected_position')
        not in ('number', 'null')
      or pg_catalog.jsonb_typeof(item -> 'new_position')
        not in ('number', 'null')
  ) then
    raise exception 'Invalid position change structure'
      using errcode = '22023';
  end if;

  -- Parse UUIDs and integers, and reject duplicate membership IDs.
  if (
    select count(distinct assignment.membership_id)
    from pg_catalog.jsonb_to_recordset(position_changes)
      as assignment(
        membership_id uuid,
        expected_position integer,
        new_position integer
      )
  ) <> pg_catalog.jsonb_array_length(position_changes) then
    raise exception 'Membership IDs must be unique and not null'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(position_changes)
      as assignment(
        membership_id uuid,
        expected_position integer,
        new_position integer
      )
    where assignment.expected_position <= 0
      or assignment.new_position <= 0
  ) then
    raise exception 'Positions must be positive or null'
      using errcode = '22023';
  end if;

  -- Serialize group mutations before checking current authority and state.
  select group_row.admin_membership_id
  into group_admin_id
  from public.groups as group_row
  where group_row.id = target_group_id
  for update;

  if not found then
    raise exception 'Active group administrator required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.memberships as membership
    where membership.id = group_admin_id
      and membership.group_id = target_group_id
      and membership.user_id = current_user_id
      and membership.is_active = true
  ) then
    raise exception 'Active group administrator required'
      using errcode = '42501';
  end if;

  -- Positions can be assigned only to active, willing group members.
  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(position_changes)
      as assignment(
        membership_id uuid,
        expected_position integer,
        new_position integer
      )
    left join public.memberships as membership
      on membership.id = assignment.membership_id
      and membership.group_id = target_group_id
    where membership.id is null
      or membership.is_active = false
      or membership.willing_to_host = false
  ) then
    raise exception 'Positions require active willing members of this group'
      using errcode = '42501';
  end if;

  -- Reject changes based on outdated positions.
  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(position_changes)
      as assignment(
        membership_id uuid,
        expected_position integer,
        new_position integer
      )
    join public.memberships as membership
      on membership.id = assignment.membership_id
      and membership.group_id = target_group_id
    where membership.host_position
      is distinct from assignment.expected_position
  ) then
    raise exception 'Hosting positions changed; reload and retry'
      using errcode = '40001';
  end if;

  set constraints public.memberships_group_host_position_unique deferred;

  return query
  update public.memberships as membership
  set host_position = assignment.new_position
  from pg_catalog.jsonb_to_recordset(position_changes)
    as assignment(
      membership_id uuid,
      expected_position integer,
      new_position integer
    )
  where membership.id = assignment.membership_id
    and membership.group_id = target_group_id
  returning membership.*;

  -- Validate the final order before returning successfully.
  set constraints public.memberships_group_host_position_unique immediate;
end;
$$;

revoke all
on function private.save_host_positions(uuid, jsonb)
from public, anon, authenticated;

grant execute
on function private.save_host_positions(uuid, jsonb)
to authenticated;

create function public.save_host_positions(
  target_group_id uuid,
  position_changes jsonb
)
returns setof public.memberships
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.save_host_positions(
    target_group_id,
    position_changes
  );
$$;

revoke all
on function public.save_host_positions(uuid, jsonb)
from public, anon, authenticated;

grant execute
on function public.save_host_positions(uuid, jsonb)
to authenticated;

comment on function public.save_host_positions(uuid, jsonb) is
  'Administrator-only atomic position changes. Each entry contains membership_id, expected_position and new_position. Unlisted memberships remain unchanged.';
