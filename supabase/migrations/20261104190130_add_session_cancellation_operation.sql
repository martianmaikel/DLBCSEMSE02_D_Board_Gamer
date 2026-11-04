-- Lock a session and reject changes based on an outdated read.
-- Accessible only through protected storage functions.
create function private.lock_session_for_member(
  target_session_id uuid,
  expected_session jsonb
)
returns public.sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_group_id uuid;
  current_session public.sessions%rowtype;
  expected_state record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select session.group_id
  into target_group_id
  from public.sessions as session
  where session.id = target_session_id;

  if not found then
    raise exception 'Session unavailable or access denied'
      using errcode = '42501';
  end if;

  if not private.is_active_group_member(target_group_id) then
    raise exception 'Session unavailable or access denied'
      using errcode = '42501';
  end if;

  if pg_catalog.jsonb_typeof(expected_session)
      is distinct from 'object' then
    raise exception 'Expected session state must be an object'
      using errcode = '22023';
  end if;

  if not (
    expected_session ?& array[
      'starts_at',
      'location_id',
      'planned_host_membership_id',
      'actual_host_membership_id',
      'status'
    ]
  ) then
    raise exception 'Expected session state is incomplete'
      using errcode = '22023';
  end if;

  select *
  into expected_state
  from pg_catalog.jsonb_to_record(expected_session) as state(
    starts_at timestamptz,
    location_id uuid,
    planned_host_membership_id uuid,
    actual_host_membership_id uuid,
    status public.session_status
  );

  -- All group mutations lock the group before its related rows.
  perform 1
  from public.groups
  where id = target_group_id
  for update;

  if not private.is_active_group_member(target_group_id) then
    raise exception 'Active group membership required'
      using errcode = '42501';
  end if;

  select session.*
  into current_session
  from public.sessions as session
  where session.id = target_session_id
    and session.group_id = target_group_id
  for update;

  if not found then
    raise exception 'Session changed; reload and retry'
      using errcode = '40001';
  end if;

  if current_session.starts_at
      is distinct from expected_state.starts_at
    or current_session.location_id
      is distinct from expected_state.location_id
    or current_session.planned_host_membership_id
      is distinct from expected_state.planned_host_membership_id
    or current_session.actual_host_membership_id
      is distinct from expected_state.actual_host_membership_id
    or current_session.status
      is distinct from expected_state.status then
    raise exception 'Session changed; reload and retry'
      using errcode = '40001';
  end if;

  return current_session;
end;
$$;

revoke all
on function private.lock_session_for_member(uuid, jsonb)
from public, anon, authenticated;

-- Cancel the session and persist related order changes atomically.
create function private.cancel_session(
  target_session_id uuid,
  expected_session jsonb,
  position_changes jsonb default '[]'::jsonb
)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_session public.sessions%rowtype;
  cancelled_session public.sessions%rowtype;
begin
  current_session := private.lock_session_for_member(
    target_session_id,
    expected_session
  );

  perform private.lock_group_for_admin(current_session.group_id);

  if current_session.status <> 'scheduled' then
    raise exception 'Only scheduled sessions can be cancelled'
      using errcode = '22023';
  end if;

  if pg_catalog.jsonb_typeof(position_changes)
      is distinct from 'array' then
    raise exception 'Position changes must be an array'
      using errcode = '22023';
  end if;

  update public.sessions
  set status = 'cancelled'
  where id = target_session_id
  returning * into cancelled_session;

  if pg_catalog.jsonb_array_length(position_changes) > 0 then
    perform 1
    from private.save_host_positions(
      current_session.group_id,
      position_changes
    );
  end if;

  return cancelled_session;
end;
$$;

revoke all
on function private.cancel_session(uuid, jsonb, jsonb)
from public, anon, authenticated;

grant execute
on function private.cancel_session(uuid, jsonb, jsonb)
to authenticated;

create function public.cancel_session(
  target_session_id uuid,
  expected_session jsonb,
  position_changes jsonb default '[]'::jsonb
)
returns public.sessions
language sql
security invoker
set search_path = ''
as $$
  select private.cancel_session(
    target_session_id,
    expected_session,
    position_changes
  );
$$;

revoke all
on function public.cancel_session(uuid, jsonb, jsonb)
from public, anon, authenticated;

grant execute
on function public.cancel_session(uuid, jsonb, jsonb)
to authenticated;

comment on function public.cancel_session(uuid, jsonb, jsonb) is
  'Administrator-only cancellation of a scheduled session. Checks the previously read session state and saves optional Controller-computed position changes atomically.';
