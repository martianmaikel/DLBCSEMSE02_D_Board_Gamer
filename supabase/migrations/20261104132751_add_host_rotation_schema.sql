-- Session lifecycle; a past date alone does not mean completion.
create type public.session_status as enum (
  'scheduled',
  'completed',
  'cancelled'
);

-- Membership state and hosting order.
alter table public.memberships
  add column is_active boolean not null default true,
  add column willing_to_host boolean not null default false,
  add column host_position integer,
  add column joined_at timestamptz;

-- Apply the default to future inserts without inventing old joining dates.
alter table public.memberships
  alter column joined_at set default now();

alter table public.memberships
  add constraint memberships_group_id_id_unique
    unique (group_id, id),

  add constraint memberships_host_position_positive
    check (host_position is null or host_position > 0),

  add constraint memberships_host_position_eligible
    check (
      host_position is null
      or (is_active and willing_to_host)
    ),

  add constraint memberships_group_host_position_unique
    unique (group_id, host_position)
    deferrable initially immediate,

  add constraint memberships_joined_at_required
    check (joined_at is not null)
    not valid;

-- Keep the administrator reference within the same group.
alter table public.groups
  add column admin_membership_id uuid,

  add constraint groups_admin_same_group_fk
    foreign key (id, admin_membership_id)
    references public.memberships (group_id, id)
    deferrable initially deferred;

-- Preserve planned and actual hosts separately.
alter table public.sessions
  add column planned_host_membership_id uuid,
  add column actual_host_membership_id uuid,
  add column status public.session_status
    not null default 'scheduled',

  add constraint sessions_planned_host_same_group_fk
    foreign key (group_id, planned_host_membership_id)
    references public.memberships (group_id, id),

  add constraint sessions_actual_host_same_group_fk
    foreign key (group_id, actual_host_membership_id)
    references public.memberships (group_id, id),

  add constraint sessions_completed_has_actual_host
    check (
      status <> 'completed'
      or actual_host_membership_id is not null
    ),

  add constraint sessions_planned_host_required
    check (planned_host_membership_id is not null)
    not valid;

comment on column public.memberships.is_active is
  'Current membership requires is_active = true; retained rows may represent former members.';

comment on column public.memberships.joined_at is
  'Start of the current uninterrupted membership period. Reset on rejoining; NULL only for legacy test data awaiting replacement.';

comment on column public.memberships.host_position is
  'Positive hosting-order position within the group. NULL means unassigned; gaps are allowed.';

comment on column public.groups.admin_membership_id is
  'Administrator membership in this group. Protected group creation must initialize this reference atomically with the creator membership.';

comment on column public.sessions.planned_host_membership_id is
  'Originally planned host. Preserved separately from the actual host; required for new or updated sessions.';

comment on column public.sessions.actual_host_membership_id is
  'Actual host, optionally designated before confirmation and required for completed sessions.';
