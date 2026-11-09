-- Participation is implicit; only personal opt-outs are persisted.
alter table public.sessions
  add constraint sessions_group_id_id_unique unique (group_id, id);

create table public.session_opt_outs (
  session_id uuid not null,
  membership_id uuid not null,
  group_id uuid not null,
  primary key (session_id, membership_id),
  constraint session_opt_outs_session_same_group_fk
    foreign key (group_id, session_id)
    references public.sessions (group_id, id) on delete cascade,
  constraint session_opt_outs_membership_same_group_fk
    foreign key (group_id, membership_id)
    references public.memberships (group_id, id)
);

create index session_opt_outs_group_membership_idx
on public.session_opt_outs (group_id, membership_id);

-- Clients may only access opt-outs through the protected operations below.
alter table public.session_opt_outs enable row level security;
revoke all on table public.session_opt_outs from public, anon, authenticated;
grant all on table public.session_opt_outs to service_role;

create function private.opt_out_of_session(target_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_group_id uuid;
  current_status public.session_status;
  own_membership_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select session.group_id into target_group_id
  from public.sessions as session
  where session.id = target_session_id;

  if not found or not private.is_active_group_member(target_group_id) then
    raise exception 'Session unavailable or access denied' using errcode = '42501';
  end if;

  -- Serialize with session mutations, admissions and departures: group first.
  perform 1 from public.groups
  where id = target_group_id
  for update;

  select session.status into current_status
  from public.sessions as session
  where session.id = target_session_id
    and session.group_id = target_group_id
  for update;

  if not found then
    raise exception 'Session unavailable or access denied' using errcode = '42501';
  end if;

  select membership.id into own_membership_id
  from public.memberships as membership
  where membership.group_id = target_group_id
    and membership.user_id = current_user_id
    and membership.is_active = true
  for update;

  if not found then
    raise exception 'Active group membership required' using errcode = '42501';
  end if;

  if current_status <> 'scheduled' then
    raise exception 'Only scheduled sessions allow personal opt-outs' using errcode = '22023';
  end if;

  insert into public.session_opt_outs (session_id, membership_id, group_id)
  values (target_session_id, own_membership_id, target_group_id)
  on conflict (session_id, membership_id) do nothing;
end;
$$;

revoke all on function private.opt_out_of_session(uuid) from public, anon, authenticated;
grant execute on function private.opt_out_of_session(uuid) to authenticated;

create function public.opt_out_of_session(target_session_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.opt_out_of_session(target_session_id);
$$;

revoke all on function public.opt_out_of_session(uuid) from public, anon, authenticated;
grant execute on function public.opt_out_of_session(uuid) to authenticated;

create function private.get_session_participants(target_session_id uuid)
returns setof public.memberships
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select session.group_id into target_group_id
  from public.sessions as session
  where session.id = target_session_id;

  if not found or not private.is_active_group_member(target_group_id) then
    raise exception 'Session unavailable or access denied' using errcode = '42501';
  end if;

  return query
  select membership.*
  from public.memberships as membership
  where membership.group_id = target_group_id
    and membership.is_active = true
    and not exists (
      select 1 from public.session_opt_outs as opt_out
      where opt_out.session_id = target_session_id
        and opt_out.membership_id = membership.id
    )
  order by membership.host_position asc nulls last, membership.id;
end;
$$;

revoke all on function private.get_session_participants(uuid) from public, anon, authenticated;
grant execute on function private.get_session_participants(uuid) to authenticated;

create function public.get_session_participants(target_session_id uuid)
returns setof public.memberships
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_session_participants(target_session_id);
$$;

revoke all on function public.get_session_participants(uuid) from public, anon, authenticated;
grant execute on function public.get_session_participants(uuid) to authenticated;
