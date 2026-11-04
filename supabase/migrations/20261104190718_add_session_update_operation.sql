-- Update a scheduled session and related order changes atomically.
create function private.update_session(
  target_session_id uuid,
  expected_session jsonb,
  planned_host_id uuid,
  session_starts_at timestamptz,
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
  current_session public.sessions%rowtype;
  updated_session public.sessions%rowtype;
  selected_location_id uuid := session_location_id;
  normalized_address text := pg_catalog.btrim(new_location_address);
begin
  current_session := private.lock_session_for_member(
    target_session_id,
    expected_session
  );

  perform private.lock_group_for_admin(current_session.group_id);

  if current_session.status <> 'scheduled' then
    raise exception 'Only scheduled sessions can be edited'
      using errcode = '22023';
  end if;

  if session_starts_at is null then
    raise exception 'Session start time is required'
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
      and membership.group_id = current_session.group_id
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
        and location.group_id = current_session.group_id
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
      current_session.group_id,
      normalized_address
    )
    returning id into selected_location_id;
  end if;

  update public.sessions
  set
    starts_at = session_starts_at,
    location_id = selected_location_id,
    planned_host_membership_id = planned_host_id
  where id = target_session_id
  returning * into updated_session;

  if pg_catalog.jsonb_array_length(position_changes) > 0 then
    perform 1
    from private.save_host_positions(
      current_session.group_id,
      position_changes
    );
  end if;

  return updated_session;
end;
$$;

revoke all
on function private.update_session(
  uuid, jsonb, uuid, timestamptz, uuid, text, jsonb
)
from public, anon, authenticated;

grant execute
on function private.update_session(
  uuid, jsonb, uuid, timestamptz, uuid, text, jsonb
)
to authenticated;

create function public.update_session(
  target_session_id uuid,
  expected_session jsonb,
  planned_host_id uuid,
  session_starts_at timestamptz,
  session_location_id uuid default null,
  new_location_address text default null,
  position_changes jsonb default '[]'::jsonb
)
returns public.sessions
language sql
security invoker
set search_path = ''
as $$
  select private.update_session(
    target_session_id,
    expected_session,
    planned_host_id,
    session_starts_at,
    session_location_id,
    new_location_address,
    position_changes
  );
$$;

revoke all
on function public.update_session(
  uuid, jsonb, uuid, timestamptz, uuid, text, jsonb
)
from public, anon, authenticated;

grant execute
on function public.update_session(
  uuid, jsonb, uuid, timestamptz, uuid, text, jsonb
)
to authenticated;

comment on function public.update_session(
  uuid, jsonb, uuid, timestamptz, uuid, text, jsonb
) is
  'Administrator-only editing of a scheduled session with optimistic state checks and optional atomic position changes. Actual host and completion status are unchanged.';
