-- Admit an existing account or reactivate its historical membership.
create function private.admit_group_member(
  target_group_id uuid,
  target_user_id uuid,
  expected_membership jsonb default null
)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_membership public.memberships%rowtype;
  saved_membership public.memberships%rowtype;
  expected_state record;
  has_expected_membership boolean :=
    expected_membership is not null
    and expected_membership <> 'null'::jsonb;
begin
  perform private.lock_group_for_admin(target_group_id);

  if target_user_id is null then
    raise exception 'Target user ID is required'
      using errcode = '22023';
  end if;

  if has_expected_membership then
    if pg_catalog.jsonb_typeof(expected_membership)
        is distinct from 'object' then
      raise exception 'Expected membership must be an object or null'
        using errcode = '22023';
    end if;

    if not (
      expected_membership ?& array[
        'id',
        'is_active',
        'joined_at'
      ]
    ) then
      raise exception 'Expected membership state is incomplete'
        using errcode = '22023';
    end if;

    select *
    into expected_state
    from pg_catalog.jsonb_to_record(expected_membership) as state(
      id uuid,
      is_active boolean,
      joined_at timestamptz
    );
  end if;

  select membership.*
  into existing_membership
  from public.memberships as membership
  where membership.group_id = target_group_id
    and membership.user_id = target_user_id
  for update;

  if found then
    if not has_expected_membership then
      raise exception 'Membership changed; reload and retry'
        using errcode = '40001';
    end if;

    if existing_membership.id
        is distinct from expected_state.id
      or existing_membership.is_active
        is distinct from expected_state.is_active
      or existing_membership.joined_at
        is distinct from expected_state.joined_at then
      raise exception 'Membership changed; reload and retry'
        using errcode = '40001';
    end if;

    -- An already active membership keeps its joining time and position.
    if existing_membership.is_active then
      return existing_membership;
    end if;

    -- Reuse the same membership ID to preserve historical references.
    update public.memberships
    set
      is_active = true,
      joined_at = pg_catalog.now(),
      host_position = null
    where id = existing_membership.id
    returning * into saved_membership;
  else
    if has_expected_membership then
      raise exception 'Membership changed; reload and retry'
        using errcode = '40001';
    end if;

    -- The existing foreign key requires a real Supabase Auth account.
    insert into public.memberships (
      group_id,
      user_id,
      is_active,
      willing_to_host,
      host_position,
      joined_at
    )
    values (
      target_group_id,
      target_user_id,
      true,
      false,
      null,
      pg_catalog.now()
    )
    returning * into saved_membership;
  end if;

  return saved_membership;
end;
$$;

revoke all
on function private.admit_group_member(uuid, uuid, jsonb)
from public, anon, authenticated;

grant execute
on function private.admit_group_member(uuid, uuid, jsonb)
to authenticated;

create function public.admit_group_member(
  target_group_id uuid,
  target_user_id uuid,
  expected_membership jsonb default null
)
returns public.memberships
language sql
security invoker
set search_path = ''
as $$
  select private.admit_group_member(
    target_group_id,
    target_user_id,
    expected_membership
  );
$$;

revoke all
on function public.admit_group_member(uuid, uuid, jsonb)
from public, anon, authenticated;

grant execute
on function public.admit_group_member(uuid, uuid, jsonb)
to authenticated;

comment on function public.admit_group_member(uuid, uuid, jsonb) is
  'Administrator-only admission of an existing account. Reactivation preserves membership identity, resets the current joining time and leaves hosting position unassigned. Existing active memberships remain unchanged.';
