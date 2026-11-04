-- Update only the signed-in member's hosting willingness.
create function private.set_hosting_willingness(
  target_group_id uuid,
  new_willingness boolean,
  expected_willingness boolean
)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_membership public.memberships%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if new_willingness is null or expected_willingness is null then
    raise exception 'Willingness values must not be null'
      using errcode = '22023';
  end if;

  if not private.is_active_group_member(target_group_id) then
    raise exception 'Active group membership required'
      using errcode = '42501';
  end if;

  -- Group mutations acquire the group lock before membership locks.
  perform 1
  from public.groups
  where id = target_group_id
  for update;

  -- Recheck membership after acquiring the group lock.
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

  if current_membership.willing_to_host
      is distinct from expected_willingness then
    raise exception 'Hosting willingness changed; reload and retry'
      using errcode = '40001';
  end if;

  update public.memberships as membership
  set
    willing_to_host = new_willingness,
    host_position = case
      when new_willingness then membership.host_position
      else null
    end
  where membership.id = current_membership.id
  returning membership.* into current_membership;

  return current_membership;
end;
$$;

revoke all
on function private.set_hosting_willingness(uuid, boolean, boolean)
from public, anon, authenticated;

grant execute
on function private.set_hosting_willingness(uuid, boolean, boolean)
to authenticated;

create function public.set_hosting_willingness(
  target_group_id uuid,
  new_willingness boolean,
  expected_willingness boolean
)
returns public.memberships
language sql
security invoker
set search_path = ''
as $$
  select private.set_hosting_willingness(
    target_group_id,
    new_willingness,
    expected_willingness
  );
$$;

revoke all
on function public.set_hosting_willingness(uuid, boolean, boolean)
from public, anon, authenticated;

grant execute
on function public.set_hosting_willingness(uuid, boolean, boolean)
to authenticated;

comment on function public.set_hosting_willingness(uuid, boolean, boolean) is
  'Updates the caller''s own active membership willingness. Opting out clears its position atomically; opting in does not assign a position. Requires the previously read willingness value.';
