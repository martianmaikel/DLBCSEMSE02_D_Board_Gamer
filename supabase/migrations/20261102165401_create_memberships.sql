create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id),
  user_id uuid not null references auth.users(id),

  constraint memberships_group_user_unique
    unique (group_id, user_id)
);
