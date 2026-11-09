-- New Auth accounts receive a profile; existing accounts remain valid without one.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  constraint profiles_username_not_blank check (username ~ '[^[:space:]]')
);

create unique index profiles_username_lower_unique
on public.profiles (lower(username));

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

-- A profile failure aborts the Auth insert in the same transaction.
create function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_username text := pg_catalog.regexp_replace(
    new.raw_user_meta_data ->> 'username', '^[[:space:]]+|[[:space:]]+$', '', 'g'
  );
begin
  if normalized_username is null or normalized_username = '' then
    raise exception 'Username must not be empty' using errcode = '22023';
  end if;

  insert into public.profiles (id, username)
  values (new.id, normalized_username);

  return new;
end;
$$;

revoke all on function private.create_profile_for_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.create_profile_for_new_user();

-- Both users must currently belong to at least one common group.
create function private.shares_active_group(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships as own_membership
    join public.memberships as other_membership
      on other_membership.group_id = own_membership.group_id
    where own_membership.user_id = (select auth.uid())
      and own_membership.is_active = true
      and other_membership.user_id = target_user_id
      and other_membership.is_active = true
  );
$$;

revoke all on function private.shares_active_group(uuid) from public, anon, authenticated;
grant execute on function private.shares_active_group(uuid) to authenticated;

create policy profiles_select_own_or_active_peer
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or private.shares_active_group(id)
);

-- The caller cannot supply another user's ID. Direct table writes stay disabled.
create function private.save_own_profile(profile_username text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_username text := pg_catalog.regexp_replace(
    profile_username, '^[[:space:]]+|[[:space:]]+$', '', 'g'
  );
  saved_profile public.profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if normalized_username is null or normalized_username = '' then
    raise exception 'Username must not be empty' using errcode = '22023';
  end if;

  insert into public.profiles (id, username)
  values (current_user_id, normalized_username)
  on conflict (id) do update set username = excluded.username
  returning * into saved_profile;

  return saved_profile;
end;
$$;

revoke all on function private.save_own_profile(text) from public, anon, authenticated;
grant execute on function private.save_own_profile(text) to authenticated;

create function public.save_own_profile(profile_username text)
returns public.profiles
language sql
security invoker
set search_path = ''
as $$
  select private.save_own_profile(profile_username);
$$;

revoke all on function public.save_own_profile(text) from public, anon, authenticated;
grant execute on function public.save_own_profile(text) to authenticated;

-- RLS still applies to both tables; a profile visible through a different group
-- does not grant access to this group's membership list.
create function public.get_active_member_profiles(target_group_id uuid)
returns setof public.profiles
language sql
stable
security invoker
set search_path = ''
as $$
  select profile.*
  from public.memberships as membership
  join public.profiles as profile on profile.id = membership.user_id
  where membership.group_id = target_group_id
    and membership.is_active = true
    and private.is_active_group_member(target_group_id)
  order by profile.id;
$$;

revoke all on function public.get_active_member_profiles(uuid) from public, anon, authenticated;
grant execute on function public.get_active_member_profiles(uuid) to authenticated;
