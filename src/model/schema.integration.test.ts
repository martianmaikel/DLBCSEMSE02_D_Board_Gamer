/// <reference types="jest" />
/// <reference types="node" />

import { confirmSession, createSession, getActiveMembersForGroup } from './index';

import { createUs2Fixtures } from './test-support/us2-fixtures';

jest.mock('./supabase', () => {
  const { createLocalSupabaseMock } = jest.requireActual<
    typeof import('./test-support/local-supabase')
  >('./test-support/local-supabase');

  return createLocalSupabaseMock();
});

const { fixtureAdmin, setup, cleanup, createHostingGroup } = createUs2Fixtures();

describe('US2 database constraints with local Supabase', () => {
  beforeAll(async () => {
    await setup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it('enforces membership constraints independently of application validation', async () => {
    const { group, ownerMembershipId } = await createHostingGroup();
    const membersBefore = await getActiveMembersForGroup(group.id);

    const invalidChanges = [
      { host_position: 0 },
      { is_active: false },
      { willing_to_host: false },
      { joined_at: null },
    ];

    for (const change of invalidChanges) {
      const result = await fixtureAdmin
        .from('memberships')
        .update(change)
        .eq('group_id', group.id)
        .eq('id', ownerMembershipId);

      expect(result.error?.code).toBe('23514');
    }

    // Position 2 already belongs to another member in this group.
    const duplicatePosition = await fixtureAdmin
      .from('memberships')
      .update({ host_position: 2 })
      .eq('group_id', group.id)
      .eq('id', ownerMembershipId);

    expect(duplicatePosition.error?.code).toBe('23505');

    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(membersBefore);
  });
  it('rejects administrator, host and location references from another group', async () => {
    const first = await createHostingGroup();
    const second = await createHostingGroup();

    const firstSession = await createSession({
      groupId: first.group.id,
      plannedHostMembershipId: first.ownerMembershipId,
      startsAt: '2030-06-10T18:00:00Z',
      durationMinutes: 120,
      location: {
        kind: 'new',
        address: 'US2 first group location',
      },
    });

    const secondSession = await createSession({
      groupId: second.group.id,
      plannedHostMembershipId: second.ownerMembershipId,
      startsAt: '2030-06-11T18:00:00Z',
      durationMinutes: 120,
      location: {
        kind: 'new',
        address: 'US2 second group location',
      },
    });

    const invalidAdministrator = await fixtureAdmin
      .from('groups')
      .update({ admin_membership_id: second.ownerMembershipId })
      .eq('id', first.group.id);

    expect(invalidAdministrator.error?.code).toBe('23503');

    const invalidSessionChanges = [
      { planned_host_membership_id: second.ownerMembershipId },
      { actual_host_membership_id: second.ownerMembershipId },
      { location_id: secondSession.location_id },
    ];

    for (const change of invalidSessionChanges) {
      const result = await fixtureAdmin
        .from('sessions')
        .update(change)
        .eq('group_id', first.group.id)
        .eq('id', firstSession.id);

      expect(result.error?.code).toBe('23503');
    }

    const storedGroup = await fixtureAdmin
      .from('groups')
      .select('*')
      .eq('id', first.group.id)
      .single();

    expect(storedGroup.error).toBeNull();
    expect(storedGroup.data).toEqual(first.group);

    const storedSession = await fixtureAdmin
      .from('sessions')
      .select('*')
      .eq('group_id', first.group.id)
      .eq('id', firstSession.id)
      .single();

    expect(storedSession.error).toBeNull();
    expect(storedSession.data).toEqual(firstSession);
  });
  it('requires a planned host and an actual host for completed sessions', async () => {
    const { group, ownerMembershipId } = await createHostingGroup();

    const session = await createSession({
      groupId: group.id,
      plannedHostMembershipId: ownerMembershipId,
      startsAt: '2020-06-10T18:00:00Z',
      durationMinutes: 120,
      location: {
        kind: 'new',
        address: 'US2 session constraints location',
      },
    });

    expect(session).toMatchObject({
      status: 'scheduled',
      actual_host_membership_id: null,
    });

    const missingPlannedHost = await fixtureAdmin
      .from('sessions')
      .update({ planned_host_membership_id: null })
      .eq('group_id', group.id)
      .eq('id', session.id);

    expect(missingPlannedHost.error?.code).toBe('23514');

    const missingActualHost = await fixtureAdmin
      .from('sessions')
      .update({ status: 'completed' })
      .eq('group_id', group.id)
      .eq('id', session.id);

    expect(missingActualHost.error?.code).toBe('23514');

    const storedSession = await fixtureAdmin
      .from('sessions')
      .select('*')
      .eq('group_id', group.id)
      .eq('id', session.id)
      .single();

    expect(storedSession.error).toBeNull();
    expect(storedSession.data).toEqual(session);

    const completed = await confirmSession(session);

    expect(completed).toEqual({
      ...session,
      actual_host_membership_id: ownerMembershipId,
      status: 'completed',
    });
  });

  it('enforces the duration range independently of protected RPC validation', async () => {
    const { group, ownerMembershipId } = await createHostingGroup();
    const session = await createSession({
      groupId: group.id,
      plannedHostMembershipId: ownerMembershipId,
      startsAt: '2020-06-10T18:00:00Z',
      durationMinutes: 120,
      location: { kind: 'new', address: 'Duration constraint' },
    });

    for (const durationMinutes of [29, 1441]) {
      const result = await fixtureAdmin
        .from('sessions')
        .update({ duration_minutes: durationMinutes })
        .eq('id', session.id);
      expect(result.error?.code).toBe('23514');
    }

    const stored = await fixtureAdmin.from('sessions').select().eq('id', session.id).single();
    expect(stored.error).toBeNull();
    expect(stored.data).toEqual(session);
  });
});
