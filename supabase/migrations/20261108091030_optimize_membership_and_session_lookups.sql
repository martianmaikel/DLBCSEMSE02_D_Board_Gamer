-- Existing group-first unique indexes do not cover lookups by user alone.
create index memberships_user_id_idx
on public.memberships (user_id);

-- Match group filtering and chronological session reads.
create index sessions_group_id_starts_at_idx
on public.sessions (group_id, starts_at);

-- Active RLS already uses (select auth.uid()) in the membership helpers
-- and the profiles policy. Superseded policies stay in the migration history.
