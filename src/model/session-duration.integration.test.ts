import {
  cancelSession,
  confirmSession,
  createSession,
  designateActualHost,
  getActiveMembersForGroup,
  getSessionsForGroup,
  type Session,
  updateSession,
} from './index';
import { supabase } from './supabase';
import { createUs2Fixtures } from './test-support/us2-fixtures';

jest.mock('./supabase', () => {
  const { createLocalSupabaseMock } = jest.requireActual<
    typeof import('./test-support/local-supabase')
  >('./test-support/local-supabase');

  return createLocalSupabaseMock();
});

const { fixtureAdmin, setup, cleanup, createHostingGroup } = createUs2Fixtures();

function editInput(session: Session, durationMinutes: number) {
  if (session.planned_host_membership_id === null) {
    throw new Error('Duration fixture requires a planned host');
  }

  return {
    expectedSession: session,
    plannedHostMembershipId: session.planned_host_membership_id,
    startsAt: session.starts_at,
    durationMinutes,
    location: { kind: 'existing' as const, locationId: session.location_id },
  };
}

describe('Session duration with local Supabase', () => {
  beforeAll(setup);
  afterAll(cleanup);

  it('stores, reads and edits both inclusive duration boundaries', async () => {
    const { group, ownerMembershipId } = await createHostingGroup();

    for (const durationMinutes of [30, 1440]) {
      const session = await createSession({
        groupId: group.id,
        plannedHostMembershipId: ownerMembershipId,
        startsAt: '2020-06-10T18:00:00Z',
        durationMinutes,
        location: { kind: 'new', address: 'Duration boundaries' },
      });

      expect(session.duration_minutes).toBe(durationMinutes);
      const updatedDuration = durationMinutes === 30 ? 1440 : 30;
      const updated = await updateSession(editInput(session, updatedDuration));
      expect(updated).toEqual({ ...session, duration_minutes: updatedDuration });

      const stored = await getSessionsForGroup(group.id);
      expect(stored.find((entry) => entry.id === session.id)).toMatchObject(updated);
    }
  });

  it.each([
    [-1, '22023'],
    [0, '22023'],
    [29, '22023'],
    [1441, '22023'],
    [30.5, '22P02'],
  ])('rejects duration %s on creation and editing without side effects', async (duration, code) => {
    const { group, ownerMembershipId } = await createHostingGroup();
    const input = {
      groupId: group.id,
      plannedHostMembershipId: ownerMembershipId,
      startsAt: '2020-06-10T18:00:00Z',
      durationMinutes: duration,
      location: { kind: 'new' as const, address: 'Invalid duration' },
    };

    await expect(createSession(input)).rejects.toMatchObject({ code });
    await expect(getSessionsForGroup(group.id)).resolves.toEqual([]);
    const locations = await supabase.from('locations').select('id').eq('group_id', group.id);
    expect(locations.error).toBeNull();
    expect(locations.data).toEqual([]);

    const session = await createSession({ ...input, durationMinutes: 120 });
    await expect(updateSession(editInput(session, duration))).rejects.toMatchObject({ code });
    const stored = await getSessionsForGroup(group.id);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject(session);
  });

  it('rejects explicit NULL durations at the RPC boundary', async () => {
    const { group, ownerMembershipId } = await createHostingGroup();
    const creation = await supabase.rpc('create_session', {
      target_group_id: group.id,
      planned_host_id: ownerMembershipId,
      session_starts_at: '2020-06-10T18:00:00Z',
      // @ts-expect-error Deliberately bypass the required numeric API input.
      session_duration_minutes: null,
      new_location_address: 'NULL duration',
    });
    expect(creation.error?.code).toBe('22023');
    await expect(getSessionsForGroup(group.id)).resolves.toEqual([]);

    const session = await createSession({
      groupId: group.id,
      plannedHostMembershipId: ownerMembershipId,
      startsAt: '2020-06-10T18:00:00Z',
      durationMinutes: 120,
      location: { kind: 'new', address: 'Required duration' },
    });
    const update = await supabase.rpc('update_session', {
      target_session_id: session.id,
      expected_session: session,
      planned_host_id: ownerMembershipId,
      session_starts_at: session.starts_at,
      // @ts-expect-error Deliberately bypass the required numeric API input.
      session_duration_minutes: null,
      session_location_id: session.location_id,
    });
    expect(update.error?.code).toBe('22023');
    expect((await getSessionsForGroup(group.id))[0]).toMatchObject(session);
  });

  it('exposes no creation or editing overload without the required duration argument', async () => {
    const { group, ownerMembershipId } = await createHostingGroup();
    // @ts-expect-error Deliberately call the removed RPC signature without duration.
    const creation = await supabase.rpc('create_session', {
      target_group_id: group.id,
      planned_host_id: ownerMembershipId,
      session_starts_at: '2020-06-10T18:00:00Z',
      new_location_address: 'Missing duration',
    });
    expect(creation.error?.code).toBe('PGRST202');
    await expect(getSessionsForGroup(group.id)).resolves.toEqual([]);

    const session = await createSession({
      groupId: group.id,
      plannedHostMembershipId: ownerMembershipId,
      startsAt: '2020-06-10T18:00:00Z',
      durationMinutes: 120,
      location: { kind: 'new', address: 'Required duration argument' },
    });
    // @ts-expect-error Deliberately call the removed RPC signature without duration.
    const update = await supabase.rpc('update_session', {
      target_session_id: session.id,
      expected_session: session,
      planned_host_id: ownerMembershipId,
      session_starts_at: session.starts_at,
      session_location_id: session.location_id,
    });
    expect(update.error?.code).toBe('PGRST202');
    expect((await getSessionsForGroup(group.id))[0]).toMatchObject(session);
  });

  it.each(['update', 'cancel', 'designate', 'confirm'] as const)(
    'reads legacy NULL without a default and accepts its snapshot for %s',
    async (operation) => {
      const { group, ownerMembershipId, memberMembershipId } = await createHostingGroup();
      const location = await fixtureAdmin
        .from('locations')
        .insert({ group_id: group.id, address: 'Legacy duration' })
        .select()
        .single()
        .throwOnError();
      if (!location.data) throw new Error('Missing legacy location');

      // Privileged fixture insertion represents an old row with unknown duration.
      const legacy = await fixtureAdmin
        .from('sessions')
        .insert({
          group_id: group.id,
          location_id: location.data.id,
          starts_at: '2020-06-10T18:00:00Z',
          planned_host_membership_id: ownerMembershipId,
        })
        .select()
        .single()
        .throwOnError();
      expect(legacy.data?.duration_minutes).toBeNull();

      const [session] = await getSessionsForGroup(group.id);
      expect(session.duration_minutes).toBeNull();
      let saved: Session;
      switch (operation) {
        case 'update':
          saved = await updateSession(editInput(session, 90));
          await expect(cancelSession(session)).rejects.toMatchObject({ code: 'PT409' });
          break;
        case 'cancel':
          saved = await cancelSession(session);
          break;
        case 'designate':
          saved = await designateActualHost(session, memberMembershipId);
          break;
        case 'confirm':
          saved = await confirmSession(session);
          break;
      }
      expect(saved.duration_minutes).toBe(operation === 'update' ? 90 : null);
      expect((await getSessionsForGroup(group.id))[0]).toMatchObject(saved);
    },
  );

  it('requires the duration key in an expected snapshot', async () => {
    const { group, ownerMembershipId } = await createHostingGroup();
    const session = await createSession({
      groupId: group.id,
      plannedHostMembershipId: ownerMembershipId,
      startsAt: '2020-06-10T18:00:00Z',
      durationMinutes: 120,
      location: { kind: 'new', address: 'Incomplete duration snapshot' },
    });
    const result = await supabase.rpc('cancel_session', {
      target_session_id: session.id,
      expected_session: {
        starts_at: session.starts_at,
        location_id: session.location_id,
        planned_host_membership_id: session.planned_host_membership_id,
        actual_host_membership_id: session.actual_host_membership_id,
        status: session.status,
      },
    });
    expect(result.error?.code).toBe('22023');
    expect((await getSessionsForGroup(group.id))[0]).toMatchObject(session);
  });

  it('returns PT409 for duration-only races and every subsequent stale session operation', async () => {
    const { group, ownerMembershipId, memberMembershipId } = await createHostingGroup();
    const session = await createSession({
      groupId: group.id,
      plannedHostMembershipId: ownerMembershipId,
      startsAt: '2020-06-10T18:00:00Z',
      durationMinutes: 120,
      location: { kind: 'new', address: 'Concurrent duration' },
    });
    const results = await Promise.allSettled([
      updateSession(editInput(session, 180)),
      updateSession(editInput(session, 240)),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const winner = results.find((result) => result.status === 'fulfilled');
    const loser = results.find((result) => result.status === 'rejected');
    expect(loser?.reason).toMatchObject({ code: 'PT409' });
    if (!winner || winner.status !== 'fulfilled') throw new Error('Missing duration race winner');
    expect([180, 240]).toContain(winner.value.duration_minutes);
    expect(winner.value).toEqual({ ...session, duration_minutes: winner.value.duration_minutes });

    await expect(updateSession(editInput(session, 300))).rejects.toMatchObject({ code: 'PT409' });
    await expect(cancelSession(session)).rejects.toMatchObject({ code: 'PT409' });
    await expect(designateActualHost(session, memberMembershipId)).rejects.toMatchObject({
      code: 'PT409',
    });
    await expect(confirmSession(session)).rejects.toMatchObject({ code: 'PT409' });
    expect((await getSessionsForGroup(group.id))[0]).toMatchObject(winner.value);
  });

  it('rolls back duration, new location and positions if a coupled update fails', async () => {
    const { group, ownerMembershipId, memberMembershipId } = await createHostingGroup();
    const session = await createSession({
      groupId: group.id,
      plannedHostMembershipId: ownerMembershipId,
      startsAt: '2020-06-10T18:00:00Z',
      durationMinutes: 120,
      location: { kind: 'new', address: 'Duration rollback' },
    });
    const membersBefore = await getActiveMembersForGroup(group.id);
    await expect(
      updateSession({
        ...editInput(session, 240),
        location: { kind: 'new', address: 'Rolled back duration location' },
        positionChanges: [
          { membershipId: ownerMembershipId, expectedPosition: 1, newPosition: 4 },
          { membershipId: memberMembershipId, expectedPosition: 2, newPosition: 3 },
        ],
      }),
    ).rejects.toMatchObject({ code: '23505' });
    expect((await getSessionsForGroup(group.id))[0]).toMatchObject(session);
    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(membersBefore);
    const locations = await supabase.from('locations').select('id').eq('group_id', group.id);
    expect(locations.error).toBeNull();
    expect(locations.data).toEqual([{ id: session.location_id }]);
  });
});
