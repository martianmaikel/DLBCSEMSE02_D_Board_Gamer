-- Only the active group administrator may designate the actual host.
create function private.designate_actual_host(
  target_session_id uuid,
  expected_session jsonb,
  actual_host_id uuid
)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_session public.sessions%rowtype;
  updated_session public.sessions%rowtype;
begin
  current_session := private.lock_session_for_member(
    target_session_id,
    expected_session
  );

  perform private.lock_group_for_admin(current_session.group_id);

  if current_session.status <> 'scheduled' then
    raise exception 'Actual host can only be designated for a scheduled session'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.memberships as membership
    where membership.id = actual_host_id
      and membership.group_id = current_session.group_id
      and membership.is_active = true
  ) then
    raise exception 'Actual host must be an active group member'
      using errcode = '22023';
  end if;

  update public.sessions
  set actual_host_membership_id = actual_host_id
  where id = target_session_id
  returning * into updated_session;

  return updated_session;
end;
$$;

revoke all
on function private.designate_actual_host(uuid, jsonb, uuid)
from public, anon, authenticated;

grant execute
on function private.designate_actual_host(uuid, jsonb, uuid)
to authenticated;

create function public.designate_actual_host(
  target_session_id uuid,
  expected_session jsonb,
  actual_host_id uuid
)
returns public.sessions
language sql
security invoker
set search_path = ''
as $$
  select private.designate_actual_host(
    target_session_id,
    expected_session,
    actual_host_id
  );
$$;

revoke all
on function public.designate_actual_host(uuid, jsonb, uuid)
from public, anon, authenticated;

grant execute
on function public.designate_actual_host(uuid, jsonb, uuid)
to authenticated;

comment on function public.designate_actual_host(uuid, jsonb, uuid) is
  'Administrator-only actual-host designation for a scheduled session. Preserves the planned host and does not confirm completion.';
