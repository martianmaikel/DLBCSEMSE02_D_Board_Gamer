-- Internal guard shared by administrator-only storage operations.
create function private.lock_group_for_admin(
  target_group_id uuid
)
returns void
language plpgsql
security invoker
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
end;
$$;

-- Only privileged storage functions may call this guard directly.
revoke all
on function private.lock_group_for_admin(uuid)
from public, anon, authenticated;

-- Create a session and any related location/order changes together.
create function private.create_session(
  target_group_id uuid,
  planned_host_id uuid,
  session_starts_at timestamptz,
  session_duration_minutes integer,
  session_location_id uuid default null,
  new_location_address text default null,
  position_changes jsonb default '[]'::jsonb
)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_location_id uuid := session_location_id;
  normalized_address text := pg_catalog.btrim(new_location_address);
  created_session public.sessions%rowtype;
begin
  perform private.lock_group_for_admin(target_group_id);

  if session_starts_at is null then
    raise exception 'Session start time is required'
      using errcode = '22023';
  end if;

  if session_duration_minutes is null
      or session_duration_minutes not between 30 and 1440 then
    raise exception 'Session duration must be between 30 and 1440 minutes'
      using errcode = '22023';
  end if;

  if (session_location_id is null) = (new_location_address is null) then
    raise exception 'Provide either an existing location or a new address'
      using errcode = '22023';
  end if;

  if pg_catalog.jsonb_typeof(position_changes)
      is distinct from 'array' then
    raise exception 'Position changes must be an array'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.memberships as membership
    where membership.id = planned_host_id
      and membership.group_id = target_group_id
      and membership.is_active = true
      and membership.willing_to_host = true
  ) then
    raise exception 'Planned host must be an active willing group member'
      using errcode = '22023';
  end if;

  if selected_location_id is not null then
    if not exists (
      select 1
      from public.locations as location
      where location.id = selected_location_id
        and location.group_id = target_group_id
    ) then
      raise exception 'Location must belong to this group'
        using errcode = '22023';
    end if;
  else
    if normalized_address is null or normalized_address = '' then
      raise exception 'Location address must not be empty'
        using errcode = '22023';
    end if;

    insert into public.locations (
      group_id,
      address
    )
    values (
      target_group_id,
      normalized_address
    )
    returning id into selected_location_id;
  end if;

  insert into public.sessions (
    group_id,
    location_id,
    starts_at,
    duration_minutes,
    planned_host_membership_id,
    actual_host_membership_id,
    status
  )
  values (
    target_group_id,
    selected_location_id,
    session_starts_at,
    session_duration_minutes,
    planned_host_id,
    null,
    'scheduled'
  )
  returning * into created_session;

  if pg_catalog.jsonb_array_length(position_changes) > 0 then
    perform 1
    from private.save_host_positions(
      target_group_id,
      position_changes
    );
  end if;

  return created_session;
end;
$$;

revoke all
on function private.create_session(
  uuid, uuid, timestamptz, integer, uuid, text, jsonb
)
from public, anon, authenticated;

grant execute
on function private.create_session(
  uuid, uuid, timestamptz, integer, uuid, text, jsonb
)
to authenticated;

create function public.create_session(
  target_group_id uuid,
  planned_host_id uuid,
  session_starts_at timestamptz,
  session_duration_minutes integer,
  session_location_id uuid default null,
  new_location_address text default null,
  position_changes jsonb default '[]'::jsonb
)
returns public.sessions
language sql
security invoker
set search_path = ''
as $$
  select private.create_session(
    target_group_id,
    planned_host_id,
    session_starts_at,
    session_duration_minutes,
    session_location_id,
    new_location_address,
    position_changes
  );
$$;

revoke all
on function public.create_session(
  uuid, uuid, timestamptz, integer, uuid, text, jsonb
)
from public, anon, authenticated;

grant execute
on function public.create_session(
  uuid, uuid, timestamptz, integer, uuid, text, jsonb
)
to authenticated;

comment on function public.create_session(
  uuid, uuid, timestamptz, integer, uuid, text, jsonb
) is
  'Administrator-only session creation with a required duration of 30 to 1440 minutes and an existing location or a new address. Optional Controller-computed position changes are saved in the same transaction.';
