-- Create a group and its initial administrator membership atomically.
create function private.create_group(
  group_name text
)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_group_id uuid := pg_catalog.gen_random_uuid();
  new_membership_id uuid := pg_catalog.gen_random_uuid();
  normalized_name text := pg_catalog.btrim(group_name);
  created_group public.groups%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if normalized_name is null or normalized_name = '' then
    raise exception 'Group name must not be empty'
      using errcode = '22023';
  end if;

  insert into public.groups (
    id,
    name,
    admin_membership_id
  )
  values (
    new_group_id,
    normalized_name,
    new_membership_id
  )
  returning * into created_group;

  insert into public.memberships (
    id,
    group_id,
    user_id,
    is_active,
    willing_to_host,
    host_position,
    joined_at
  )
  values (
    new_membership_id,
    new_group_id,
    current_user_id,
    true,
    false,
    null,
    pg_catalog.now()
  );

  return created_group;
end;
$$;

revoke all
on function private.create_group(text)
from public, anon, authenticated;

grant execute
on function private.create_group(text)
to authenticated;

-- Public API entry point; privileged work stays in the private schema.
create function public.create_group(
  group_name text
)
returns public.groups
language sql
security invoker
set search_path = ''
as $$
  select private.create_group(group_name);
$$;

revoke all
on function public.create_group(text)
from public, anon, authenticated;

grant execute
on function public.create_group(text)
to authenticated;

comment on function public.create_group(text) is
  'Creates a group, an active creator membership and its administrator reference in one atomic operation.';
