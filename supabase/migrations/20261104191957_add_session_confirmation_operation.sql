-- Confirm completion as the planned or administrator-designated actual host.
create function private.confirm_session(
  target_session_id uuid,
  expected_session jsonb
)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_session public.sessions%rowtype;
  confirmed_session public.sessions%rowtype;
  caller_membership_id uuid;
begin
  current_session := private.lock_session_for_member(
    target_session_id,
    expected_session
  );

  if current_session.status <> 'scheduled' then
    raise exception 'Only scheduled sessions can be confirmed'
      using errcode = '22023';
  end if;

  select membership.id
  into caller_membership_id
  from public.memberships as membership
  where membership.group_id = current_session.group_id
    and membership.user_id = auth.uid()
    and membership.is_active = true
  for update;

  if not found then
    raise exception 'Active group membership required'
      using errcode = '42501';
  end if;

  -- An existing designation takes precedence over the planned host.
  if caller_membership_id is distinct from coalesce(
    current_session.actual_host_membership_id,
    current_session.planned_host_membership_id
  ) then
    raise exception 'Only the authorized host may confirm this session'
      using errcode = '42501';
  end if;

  update public.sessions
  set
    actual_host_membership_id = caller_membership_id,
    status = 'completed'
  where id = target_session_id
  returning * into confirmed_session;

  return confirmed_session;
end;
$$;

revoke all
on function private.confirm_session(uuid, jsonb)
from public, anon, authenticated;

grant execute
on function private.confirm_session(uuid, jsonb)
to authenticated;

create function public.confirm_session(
  target_session_id uuid,
  expected_session jsonb
)
returns public.sessions
language sql
security invoker
set search_path = ''
as $$
  select private.confirm_session(
    target_session_id,
    expected_session
  );
$$;

revoke all
on function public.confirm_session(uuid, jsonb)
from public, anon, authenticated;

grant execute
on function public.confirm_session(uuid, jsonb)
to authenticated;

comment on function public.confirm_session(uuid, jsonb) is
  'Confirms a scheduled session as its designated actual host, or its planned host when no actual host is designated. Saves actual host and completion together without changing planned host or hosting order.';
