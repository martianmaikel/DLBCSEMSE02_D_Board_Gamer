import {
  cancelSession,
  confirmSession,
  createSession,
  designateActualHost,
  getActiveMembersForGroup,
  getSessionsForGroup,
  saveHostPositions,
  setHostingWillingness,
  signIn,
  updateSession,
} from './index';

import { createUs2Fixtures, type TestAccount } from './test-support/us2-fixtures';

import { supabase } from './supabase';

jest.mock('./supabase', () => {
  const { createLocalSupabaseMock } = jest.requireActual<
    typeof import('./test-support/local-supabase')
  >('./test-support/local-supabase');

  return createLocalSupabaseMock();
});

const { setup, cleanup, createHostingGroup } = createUs2Fixtures();

let owner: TestAccount;
let member: TestAccount;
let otherMember: TestAccount;

describe('US2 hosting sessions with local Supabase', () => {
  beforeAll(async () => {
    const accounts = await setup();

    owner = accounts.owner;
    member = accounts.member;
    otherMember = accounts.otherMember;
  });

  afterAll(async () => {
    await cleanup();
  });

  it('supports multiple bookings and limits session management to the administrator', async () => {
    const { group, ownerMembershipId, memberMembershipId, otherMembershipId } =
      await createHostingGroup();

    const first = await createSession({
      groupId: group.id,
      plannedHostMembershipId: memberMembershipId,
      startsAt: '2030-06-10T18:00:00Z',
      location: { kind: 'new', address: 'US2 location A' },
      positionChanges: [
        {
          membershipId: ownerMembershipId,
          expectedPosition: 1,
          newPosition: 4,
        },
      ],
    });

    const second = await createSession({
      groupId: group.id,
      plannedHostMembershipId: otherMembershipId,
      startsAt: '2030-06-20T18:00:00Z',
      location: { kind: 'existing', locationId: first.location_id },
    });

    expect(first).toMatchObject({
      group_id: group.id,
      planned_host_membership_id: memberMembershipId,
      actual_host_membership_id: null,
      status: 'scheduled',
    });

    expect(second.location_id).toBe(first.location_id);

    const members = await getActiveMembersForGroup(group.id);

    expect(members.find((membership) => membership.id === ownerMembershipId))?.toMatchObject({
      host_position: 4,
    });

    await saveHostPositions(group.id, [
      {
        membershipId: memberMembershipId,
        expectedPosition: 2,
        newPosition: 3,
      },
      {
        membershipId: otherMembershipId,
        expectedPosition: 3,
        newPosition: 2,
      },
    ]);

    const bookings = await getSessionsForGroup(group.id);

    expect(bookings.map((session) => session.planned_host_membership_id)).toEqual([
      memberMembershipId,
      otherMembershipId,
    ]);

    const updated = await updateSession({
      expectedSession: first,
      plannedHostMembershipId: ownerMembershipId,
      startsAt: '2030-06-11T18:00:00Z',
      location: { kind: 'existing', locationId: first.location_id },
    });

    expect(updated).toMatchObject({
      planned_host_membership_id: ownerMembershipId,
      actual_host_membership_id: null,
      status: 'scheduled',
    });

    expect(Date.parse(updated.starts_at)).toBe(Date.parse('2030-06-11T18:00:00Z'));

    await expect(cancelSession(first)).rejects.toMatchObject({
      code: 'PT409',
    });

    await signIn(member.email, member.password);

    await expect(
      createSession({
        groupId: group.id,
        plannedHostMembershipId: memberMembershipId,
        startsAt: '2030-07-01T18:00:00Z',
        location: { kind: 'existing', locationId: first.location_id },
      }),
    ).rejects.toMatchObject({ code: '42501' });

    await expect(
      updateSession({
        expectedSession: updated,
        plannedHostMembershipId: memberMembershipId,
        startsAt: updated.starts_at,
        location: { kind: 'existing', locationId: updated.location_id },
      }),
    ).rejects.toMatchObject({ code: '42501' });

    await expect(cancelSession(updated)).rejects.toMatchObject({
      code: '42501',
    });

    await expect(designateActualHost(updated, memberMembershipId)).rejects.toMatchObject({
      code: '42501',
    });

    const stored = await getSessionsForGroup(group.id);

    expect(stored).toHaveLength(2);
    expect(stored.find((session) => session.id === updated.id)).toMatchObject(updated);
    expect(stored.find((session) => session.id === second.id)).toMatchObject(second);
  });

  it('rolls back the session, new location and positions when a coupled save fails', async () => {
    const { group, ownerMembershipId, memberMembershipId } = await createHostingGroup();

    const before = await getActiveMembersForGroup(group.id);

    await expect(
      createSession({
        groupId: group.id,
        plannedHostMembershipId: memberMembershipId,
        startsAt: '2030-08-01T18:00:00Z',
        location: { kind: 'new', address: 'US2 rollback location' },
        positionChanges: [
          {
            membershipId: ownerMembershipId,
            expectedPosition: 1,
            newPosition: 4,
          },
          {
            membershipId: memberMembershipId,
            expectedPosition: 2,
            newPosition: 3,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: '23505' });

    await expect(getSessionsForGroup(group.id)).resolves.toEqual([]);
    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(before);

    const locations = await supabase.from('locations').select('id').eq('group_id', group.id);

    expect(locations.error).toBeNull();
    expect(locations.data).toEqual([]);
  });
  it('cancels one booking atomically without changing other bookings', async () => {
    const { group, ownerMembershipId, memberMembershipId, otherMembershipId } =
      await createHostingGroup();

    const first = await createSession({
      groupId: group.id,
      plannedHostMembershipId: memberMembershipId,
      startsAt: '2030-09-01T18:00:00Z',
      location: { kind: 'new', address: 'US2 cancellation location' },
    });

    const second = await createSession({
      groupId: group.id,
      plannedHostMembershipId: otherMembershipId,
      startsAt: '2030-09-10T18:00:00Z',
      location: { kind: 'existing', locationId: first.location_id },
    });

    const positionsBefore = await getActiveMembersForGroup(group.id);

    await expect(
      cancelSession(first, [
        {
          membershipId: ownerMembershipId,
          expectedPosition: 1,
          newPosition: 4,
        },
        {
          membershipId: memberMembershipId,
          expectedPosition: 2,
          newPosition: 3,
        },
      ]),
    ).rejects.toMatchObject({ code: '23505' });

    const afterFailure = await getSessionsForGroup(group.id);

    expect(afterFailure.find((session) => session.id === first.id)).toMatchObject(first);

    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(positionsBefore);

    const cancelled = await cancelSession(first, [
      {
        membershipId: memberMembershipId,
        expectedPosition: 2,
        newPosition: 4,
      },
    ]);

    expect(cancelled).toMatchObject({
      id: first.id,
      status: 'cancelled',
      planned_host_membership_id: memberMembershipId,
      actual_host_membership_id: null,
    });

    const stored = await getSessionsForGroup(group.id);

    expect(stored).toHaveLength(2);
    expect(stored.find((session) => session.id === first.id)).toMatchObject(cancelled);
    expect(stored.find((session) => session.id === second.id)).toMatchObject(second);

    const members = await getActiveMembersForGroup(group.id);

    expect(members.find((membership) => membership.id === memberMembershipId)).toMatchObject({
      host_position: 4,
    });

    await expect(confirmSession(cancelled)).rejects.toMatchObject({
      code: '22023',
    });

    await expect(
      updateSession({
        expectedSession: cancelled,
        plannedHostMembershipId: memberMembershipId,
        startsAt: cancelled.starts_at,
        location: { kind: 'existing', locationId: cancelled.location_id },
      }),
    ).rejects.toMatchObject({ code: '22023' });
  });

  it('allows only the planned host to confirm when no actual host is designated', async () => {
    const { group, memberMembershipId } = await createHostingGroup();

    const session = await createSession({
      groupId: group.id,
      plannedHostMembershipId: memberMembershipId,
      startsAt: '2020-06-01T18:00:00Z',
      location: { kind: 'new', address: 'US2 confirmation location' },
    });

    // Being the administrator does not grant host confirmation authority.
    await expect(confirmSession(session)).rejects.toMatchObject({
      code: '42501',
    });

    await signIn(otherMember.email, otherMember.password);

    await expect(confirmSession(session)).rejects.toMatchObject({
      code: '42501',
    });

    await signIn(member.email, member.password);

    const positionsBefore = await getActiveMembersForGroup(group.id);
    const completed = await confirmSession(session);

    expect(completed).toMatchObject({
      id: session.id,
      planned_host_membership_id: memberMembershipId,
      actual_host_membership_id: memberMembershipId,
      status: 'completed',
    });

    const stored = await getSessionsForGroup(group.id);

    expect(stored.find((entry) => entry.id === session.id)).toMatchObject(completed);

    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(positionsBefore);

    await expect(confirmSession(completed)).rejects.toMatchObject({
      code: '22023',
    });

    await signIn(owner.email, owner.password);

    await expect(cancelSession(completed)).rejects.toMatchObject({
      code: '22023',
    });

    await expect(
      updateSession({
        expectedSession: completed,
        plannedHostMembershipId: memberMembershipId,
        startsAt: completed.starts_at,
        location: { kind: 'existing', locationId: completed.location_id },
      }),
    ).rejects.toMatchObject({ code: '22023' });
  });

  it('reserves confirmation for the designated actual host and preserves the planned host', async () => {
    const { group, memberMembershipId, otherMembershipId } = await createHostingGroup();

    const session = await createSession({
      groupId: group.id,
      plannedHostMembershipId: memberMembershipId,
      startsAt: '2020-07-01T18:00:00Z',
      location: { kind: 'new', address: 'US2 replacement host location' },
    });

    // Hosting this session does not require permanent rotation willingness.
    await signIn(otherMember.email, otherMember.password);

    await setHostingWillingness({
      groupId: group.id,
      newWillingness: false,
      expectedWillingness: true,
    });

    await signIn(owner.email, owner.password);

    const designated = await designateActualHost(session, otherMembershipId);

    expect(designated).toMatchObject({
      planned_host_membership_id: memberMembershipId,
      actual_host_membership_id: otherMembershipId,
      status: 'scheduled',
    });

    await signIn(member.email, member.password);

    await expect(confirmSession(session)).rejects.toMatchObject({
      code: 'PT409',
    });

    await expect(confirmSession(designated)).rejects.toMatchObject({
      code: '42501',
    });

    await signIn(otherMember.email, otherMember.password);

    const positionsBefore = await getActiveMembersForGroup(group.id);
    const completed = await confirmSession(designated);

    expect(completed).toMatchObject({
      planned_host_membership_id: memberMembershipId,
      actual_host_membership_id: otherMembershipId,
      status: 'completed',
    });

    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(positionsBefore);
  });

  it('rejects one of two concurrent session changes based on the same state', async () => {
    const { group, memberMembershipId, otherMembershipId } = await createHostingGroup();

    const session = await createSession({
      groupId: group.id,
      plannedHostMembershipId: memberMembershipId,
      startsAt: '2030-10-01T18:00:00Z',
      location: { kind: 'new', address: 'US2 concurrent session location' },
    });

    const results = await Promise.allSettled([
      updateSession({
        expectedSession: session,
        plannedHostMembershipId: memberMembershipId,
        startsAt: '2030-10-02T18:00:00Z',
        location: { kind: 'existing', locationId: session.location_id },
      }),
      designateActualHost(session, otherMembershipId),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);

    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);

    for (const result of results) {
      if (result.status === 'rejected') {
        expect(result.reason).toMatchObject({ code: 'PT409' });
      }
    }

    const winner = results.find((result) => result.status === 'fulfilled');

    if (!winner || winner.status !== 'fulfilled') {
      throw new Error('Expected one successful session change');
    }

    const stored = await getSessionsForGroup(group.id);

    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject(winner.value);
  });
});
