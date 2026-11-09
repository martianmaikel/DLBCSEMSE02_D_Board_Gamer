/// <reference types="jest" />
/// <reference types="node" />

import {
  admitGroupMember,
  getActiveMembersForGroup,
  getGroupsForUser,
  getMembersForGroupIncludingInactive,
  saveHostPositions,
  setHostingWillingness,
  signIn,
  leaveGroup,
  confirmSession,
  createSession,
  getSessionsForGroup,
  cancelSession,
  saveOwnProfile,
  type LeaveGroupResult,
  type Membership,
} from './index';
import { supabase } from './supabase';
import { createUs2Fixtures, type TestAccount } from './test-support/us2-fixtures';

jest.mock('./supabase', () => {
  const { createLocalSupabaseMock } = jest.requireActual<
    typeof import('./test-support/local-supabase')
  >('./test-support/local-supabase');

  return createLocalSupabaseMock();
});

const {
  fixtureAdmin,
  anonymousClient,
  groupPrefix,
  setup,
  cleanup,
  createOwnedGroup,
  createHostingGroup,
} = createUs2Fixtures();

let owner: TestAccount;
let member: TestAccount;
let otherMember: TestAccount;
let outsider: TestAccount;

function expectRetainedMembership(result: LeaveGroupResult): Membership {
  expect(result.groupDeleted).toBe(false);
  if (result.groupDeleted) {
    throw new Error('Expected an ordinary departure, not group deletion');
  }
  return result.membership;
}

describe('US2 memberships and access with local Supabase', () => {
  beforeAll(async () => {
    const accounts = await setup();

    owner = accounts.owner;
    member = accounts.member;
    otherMember = accounts.otherMember;
    outsider = accounts.outsider;
  });

  afterAll(async () => {
    await cleanup();
  });

  it('initializes the creator membership and administrator together', async () => {
    const { group, creator, members } = await createOwnedGroup();

    expect(members).toHaveLength(1);
    expect(group.admin_membership_id).toBe(creator.id);

    expect(creator).toMatchObject({
      group_id: group.id,
      user_id: owner.id,
      is_active: true,
      willing_to_host: false,
      host_position: null,
    });

    expect(creator.joined_at).not.toBeNull();
    expect(Number.isNaN(Date.parse(creator.joined_at ?? ''))).toBe(false);

    await expect(getGroupsForUser(owner.id)).resolves.toEqual(expect.arrayContaining([group]));
  });

  it('allows ordinary members to read group memberships and blocks outsiders', async () => {
    const { group, creator } = await createOwnedGroup();

    const admittedMember = await admitGroupMember({
      groupId: group.id,
      userId: member.id,
      expectedMembership: null,
    });

    const admittedOther = await admitGroupMember({
      groupId: group.id,
      userId: otherMember.id,
      expectedMembership: null,
    });

    await signIn(member.email, member.password);

    const visibleMembers = await getActiveMembersForGroup(group.id);

    expect(visibleMembers).toHaveLength(3);
    expect(visibleMembers.map((membership) => membership.id)).toEqual(
      expect.arrayContaining([creator.id, admittedMember.id, admittedOther.id]),
    );

    await expect(getGroupsForUser(member.id)).resolves.toEqual(expect.arrayContaining([group]));

    await signIn(outsider.email, outsider.password);

    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual([]);
    await expect(getMembersForGroupIncludingInactive(group.id)).resolves.toEqual([]);
    await expect(getGroupsForUser(owner.id)).resolves.toEqual([]);

    const anonymousResult = await anonymousClient.rpc('create_group', {
      group_name: `${groupPrefix}anonymous`,
    });

    expect(anonymousResult.error).toMatchObject({ code: '42501' });
  });

  it('limits willingness changes to the caller and rejects stale values', async () => {
    const { group, creator } = await createOwnedGroup();

    const admittedMember = await admitGroupMember({
      groupId: group.id,
      userId: member.id,
      expectedMembership: null,
    });

    const admittedOther = await admitGroupMember({
      groupId: group.id,
      userId: otherMember.id,
      expectedMembership: null,
    });

    await signIn(member.email, member.password);

    const updated = await setHostingWillingness({
      groupId: group.id,
      newWillingness: true,
      expectedWillingness: false,
    });

    expect(updated.id).toBe(admittedMember.id);
    expect(updated.willing_to_host).toBe(true);
    expect(updated.host_position).toBeNull();

    await expect(
      setHostingWillingness({
        groupId: group.id,
        newWillingness: false,
        expectedWillingness: false,
      }),
    ).rejects.toMatchObject({ code: 'PT409' });

    await expect(
      saveHostPositions(group.id, [
        {
          membershipId: admittedMember.id,
          expectedPosition: null,
          newPosition: 1,
        },
      ]),
    ).rejects.toMatchObject({ code: '42501' });

    const visibleMembers = await getActiveMembersForGroup(group.id);

    expect(visibleMembers.find((membership) => membership.id === admittedMember.id)).toMatchObject({
      willing_to_host: true,
      host_position: null,
    });

    for (const membershipId of [creator.id, admittedOther.id]) {
      expect(visibleMembers.find((membership) => membership.id === membershipId)).toMatchObject({
        willing_to_host: false,
        host_position: null,
      });
    }
  });
  it('retains a departed membership and revokes group access', async () => {
    const { group, memberMembershipId } = await createHostingGroup();
    const membersBefore = await getActiveMembersForGroup(group.id);
    const departingMember = membersBefore.find(
      (membership) => membership.id === memberMembershipId,
    );

    if (!departingMember) {
      throw new Error('Departure fixture has no member membership');
    }

    await signIn(member.email, member.password);

    const departed = expectRetainedMembership(
      await leaveGroup({
        groupId: group.id,
        expectedJoinedAt: departingMember.joined_at,
        expectedAdminMembershipId: group.admin_membership_id,
        successorMembershipId: null,
      }),
    );

    expect(departed).toEqual({
      ...departingMember,
      is_active: false,
      host_position: null,
    });

    const visibleGroups = await getGroupsForUser(member.id);

    expect(visibleGroups.map((visibleGroup) => visibleGroup.id)).not.toContain(group.id);

    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual([]);
    await expect(getMembersForGroupIncludingInactive(group.id)).resolves.toEqual([]);

    // Check RLS directly, without the Model's active-membership filter.
    const directRead = await supabase.from('memberships').select('*').eq('group_id', group.id);

    expect(directRead.error).toBeNull();
    expect(directRead.data).toEqual([]);

    await expect(
      setHostingWillingness({
        groupId: group.id,
        newWillingness: false,
        expectedWillingness: true,
      }),
    ).rejects.toMatchObject({ code: '42501' });

    await signIn(owner.email, owner.password);

    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(
      membersBefore.filter((membership) => membership.id !== memberMembershipId),
    );

    const history = await getMembersForGroupIncludingInactive(group.id);

    expect(history.find((membership) => membership.id === memberMembershipId)).toEqual(departed);
  });
  it('reactivates the same membership with a new joining period and preserved session history', async () => {
    const { group, memberMembershipId } = await createHostingGroup();

    // Give this fixture an old joining date so resetting it is observable.
    const { data: originalMembership, error } = await fixtureAdmin
      .from('memberships')
      .update({ joined_at: '2020-01-01T00:00:00Z' })
      .eq('group_id', group.id)
      .eq('id', memberMembershipId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    if (!originalMembership) {
      throw new Error('Rejoining fixture has no member membership');
    }

    const session = await createSession({
      groupId: group.id,
      plannedHostMembershipId: memberMembershipId,
      startsAt: '2020-02-01T18:00:00Z',
      durationMinutes: 120,
      location: {
        kind: 'new',
        address: 'US2 rejoining history location',
      },
    });

    await signIn(member.email, member.password);
    const completedSession = await confirmSession(session);

    const departed = expectRetainedMembership(
      await leaveGroup({
        groupId: group.id,
        expectedJoinedAt: originalMembership.joined_at,
        expectedAdminMembershipId: group.admin_membership_id,
        successorMembershipId: null,
      }),
    );

    await signIn(owner.email, owner.password);

    const rejoined = await admitGroupMember({
      groupId: group.id,
      userId: member.id,
      expectedMembership: departed,
    });

    expect(rejoined).toMatchObject({
      id: originalMembership.id,
      group_id: group.id,
      user_id: member.id,
      is_active: true,
      willing_to_host: true,
      host_position: null,
    });

    expect(Date.parse(rejoined.joined_at ?? '')).toBeGreaterThan(
      Date.parse(originalMembership.joined_at ?? ''),
    );

    const history = await getMembersForGroupIncludingInactive(group.id);

    expect(history.filter((membership) => membership.user_id === member.id)).toEqual([rejoined]);

    await signIn(member.email, member.password);

    const visibleGroups = await getGroupsForUser(member.id);
    expect(visibleGroups.map((visibleGroup) => visibleGroup.id)).toContain(group.id);

    await expect(getSessionsForGroup(group.id)).resolves.toContainEqual(
      expect.objectContaining({
        id: completedSession.id,
        status: 'completed',
        planned_host_membership_id: originalMembership.id,
        actual_host_membership_id: originalMembership.id,
      }),
    );

    // A request from the previous membership period must not end the new one.
    await expect(
      leaveGroup({
        groupId: group.id,
        expectedJoinedAt: departed.joined_at,
        expectedAdminMembershipId: group.admin_membership_id,
        successorMembershipId: null,
      }),
    ).rejects.toMatchObject({ code: 'PT409' });

    await expect(getActiveMembersForGroup(group.id)).resolves.toContainEqual(rejoined);
  });
  it('persists administrator succession on departure without restoring it on rejoining', async () => {
    const { group, ownerMembershipId, memberMembershipId } = await createHostingGroup();
    const membersBefore = await getActiveMembersForGroup(group.id);
    const departingAdmin = membersBefore.find((membership) => membership.id === ownerMembershipId);

    if (!departingAdmin) {
      throw new Error('Succession fixture has no administrator membership');
    }

    const departed = expectRetainedMembership(
      await leaveGroup({
        groupId: group.id,
        expectedJoinedAt: departingAdmin.joined_at,
        expectedAdminMembershipId: ownerMembershipId,
        successorMembershipId: memberMembershipId,
      }),
    );

    expect(departed).toEqual({
      ...departingAdmin,
      is_active: false,
      host_position: null,
    });

    const formerAdminGroups = await getGroupsForUser(owner.id);

    expect(formerAdminGroups.map((visibleGroup) => visibleGroup.id)).not.toContain(group.id);

    await signIn(member.email, member.password);

    await expect(getGroupsForUser(member.id)).resolves.toContainEqual(
      expect.objectContaining({
        id: group.id,
        admin_membership_id: memberMembershipId,
      }),
    );

    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(
      membersBefore.filter((membership) => membership.id !== ownerMembershipId),
    );

    // The successor now has permission to readmit the former administrator.
    const rejoined = await admitGroupMember({
      groupId: group.id,
      userId: owner.id,
      expectedMembership: departed,
    });

    expect(rejoined).toMatchObject({
      id: ownerMembershipId,
      is_active: true,
      host_position: null,
    });

    await signIn(owner.email, owner.password);

    await expect(getGroupsForUser(owner.id)).resolves.toContainEqual(
      expect.objectContaining({
        id: group.id,
        admin_membership_id: memberMembershipId,
      }),
    );

    // Rejoining restores membership, but not administrator permissions.
    await expect(
      saveHostPositions(group.id, [
        {
          membershipId: memberMembershipId,
          expectedPosition: 2,
          newPosition: 4,
        },
      ]),
    ).rejects.toMatchObject({ code: '42501' });
  });
  it('rejects invalid administrator successors without changing group state', async () => {
    const { group, ownerMembershipId, otherMembershipId } = await createHostingGroup();
    const members = await getActiveMembersForGroup(group.id);

    const administrator = members.find((membership) => membership.id === ownerMembershipId);
    const leavingMember = members.find((membership) => membership.id === otherMembershipId);

    if (!administrator || !leavingMember) {
      throw new Error('Invalid-successor fixture has missing memberships');
    }

    // Keep this membership as an inactive successor candidate.
    await signIn(otherMember.email, otherMember.password);

    await leaveGroup({
      groupId: group.id,
      expectedJoinedAt: leavingMember.joined_at,
      expectedAdminMembershipId: ownerMembershipId,
      successorMembershipId: null,
    });

    // This also signs the owner back in.
    const { creator: foreignMembership } = await createOwnedGroup();

    const membershipsBefore = await getMembersForGroupIncludingInactive(group.id);

    const invalidSuccessors = [null, ownerMembershipId, otherMembershipId, foreignMembership.id];

    for (const successorMembershipId of invalidSuccessors) {
      await expect(
        leaveGroup({
          groupId: group.id,
          expectedJoinedAt: administrator.joined_at,
          expectedAdminMembershipId: ownerMembershipId,
          successorMembershipId,
        }),
      ).rejects.toMatchObject({ code: '22023' });

      await expect(getGroupsForUser(owner.id)).resolves.toContainEqual(group);

      await expect(getMembersForGroupIncludingInactive(group.id)).resolves.toEqual(
        membershipsBefore,
      );
    }
  });
  it('deletes the last active member group and its history but preserves accounts, profiles and other groups', async () => {
    const profiles = [];
    for (const account of [owner, member, otherMember, outsider]) {
      await signIn(account.email, account.password);
      profiles.push(await saveOwnProfile(`Departure-${account.id}`));
    }

    const foreign = await createHostingGroup();
    await createSession({
      groupId: foreign.group.id,
      plannedHostMembershipId: foreign.ownerMembershipId,
      startsAt: '2020-02-01T18:00:00Z',
      durationMinutes: 120,
      location: { kind: 'new', address: 'Preserved other group location' },
    });
    const foreignMembers = await getMembersForGroupIncludingInactive(foreign.group.id);
    const foreignSessions = await getSessionsForGroup(foreign.group.id);
    const foreignLocations = await fixtureAdmin
      .from('locations')
      .select('*')
      .eq('group_id', foreign.group.id);
    expect(foreignLocations.error).toBeNull();

    const { group, ownerMembershipId, memberMembershipId, otherMembershipId } =
      await createHostingGroup();
    const memberships = await getActiveMembersForGroup(group.id);
    const administrator = memberships.find((membership) => membership.id === ownerMembershipId);
    if (!administrator) {
      throw new Error('Deletion fixture has no administrator membership');
    }

    const completed = await createSession({
      groupId: group.id,
      plannedHostMembershipId: ownerMembershipId,
      startsAt: '2020-02-01T18:00:00Z',
      durationMinutes: 120,
      location: { kind: 'new', address: 'Deleted completed session location' },
    });
    await confirmSession(completed);
    const cancelled = await createSession({
      groupId: group.id,
      plannedHostMembershipId: memberMembershipId,
      startsAt: '2099-02-01T18:00:00Z',
      durationMinutes: 120,
      location: { kind: 'new', address: 'Deleted cancelled session location' },
    });
    await cancelSession(cancelled);
    await createSession({
      groupId: group.id,
      plannedHostMembershipId: otherMembershipId,
      startsAt: '2099-03-01T18:00:00Z',
      durationMinutes: 120,
      location: { kind: 'new', address: 'Deleted scheduled session location' },
    });
    const unusedLocation = await fixtureAdmin.from('locations').insert({
      group_id: group.id,
      address: 'Deleted location without a session',
    });
    expect(unusedLocation.error).toBeNull();

    for (const account of [member, otherMember]) {
      const membership = memberships.find((row) => row.user_id === account.id);
      if (!membership) {
        throw new Error('Deletion fixture has no departing membership');
      }
      await signIn(account.email, account.password);
      expectRetainedMembership(
        await leaveGroup({
          groupId: group.id,
          expectedJoinedAt: membership.joined_at,
          expectedAdminMembershipId: ownerMembershipId,
          successorMembershipId: null,
        }),
      );
    }

    await signIn(owner.email, owner.password);
    expect(await getMembersForGroupIncludingInactive(group.id)).toHaveLength(3);
    expect(await getActiveMembersForGroup(group.id)).toEqual([administrator]);
    expect(await getSessionsForGroup(group.id)).toHaveLength(3);

    const input = {
      groupId: group.id,
      expectedJoinedAt: administrator.joined_at,
      expectedAdminMembershipId: ownerMembershipId,
      successorMembershipId: null,
    };
    await expect(leaveGroup(input)).resolves.toEqual({ groupDeleted: true, membership: null });

    // Service-role reads distinguish actual deletion from revoked RLS visibility.
    const deletedGroup = await fixtureAdmin.from('groups').select('*').eq('id', group.id);
    expect(deletedGroup.error).toBeNull();
    expect(deletedGroup.data).toEqual([]);
    for (const table of ['sessions', 'locations', 'memberships'] as const) {
      const result = await fixtureAdmin.from(table).select('*').eq('group_id', group.id);
      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    }

    for (const account of [owner, member, otherMember, outsider]) {
      const result = await fixtureAdmin.auth.admin.getUserById(account.id);
      expect(result.error).toBeNull();
      expect(result.data.user?.id).toBe(account.id);
    }
    const preservedProfiles = await fixtureAdmin
      .from('profiles')
      .select('*')
      .in(
        'id',
        profiles.map((profile) => profile.id),
      );
    expect(preservedProfiles.error).toBeNull();
    expect(preservedProfiles.data).toHaveLength(profiles.length);
    expect(preservedProfiles.data).toEqual(expect.arrayContaining(profiles));
    await expect(getGroupsForUser(owner.id)).resolves.toContainEqual(foreign.group);
    await expect(getGroupsForUser(owner.id)).resolves.not.toContainEqual(group);
    await expect(getMembersForGroupIncludingInactive(foreign.group.id)).resolves.toEqual(
      foreignMembers,
    );
    await expect(getSessionsForGroup(foreign.group.id)).resolves.toEqual(foreignSessions);
    const preservedLocations = await fixtureAdmin
      .from('locations')
      .select('*')
      .eq('group_id', foreign.group.id);
    expect(preservedLocations.error).toBeNull();
    expect(preservedLocations.data).toEqual(foreignLocations.data);
    await expect(leaveGroup(input)).rejects.toMatchObject({ code: '42501' });
  });

  it('rejects stale last-departure snapshots before deleting any group data', async () => {
    const { group, creator } = await createOwnedGroup();
    await setHostingWillingness({
      groupId: group.id,
      expectedWillingness: false,
      newWillingness: true,
    });
    await createSession({
      groupId: group.id,
      plannedHostMembershipId: creator.id,
      startsAt: '2099-02-01T18:00:00Z',
      durationMinutes: 120,
      location: { kind: 'new', address: 'Preserved after stale last departure' },
    });
    const membersBefore = await getActiveMembersForGroup(group.id);
    const sessionsBefore = await getSessionsForGroup(group.id);
    const locationsBefore = await fixtureAdmin
      .from('locations')
      .select('*')
      .eq('group_id', group.id);
    expect(locationsBefore.error).toBeNull();
    for (const snapshot of [
      { expectedJoinedAt: '2000-01-01T00:00:00Z', expectedAdminMembershipId: creator.id },
      { expectedJoinedAt: creator.joined_at, expectedAdminMembershipId: outsider.id },
    ]) {
      await expect(
        leaveGroup({ groupId: group.id, successorMembershipId: null, ...snapshot }),
      ).rejects.toMatchObject({ code: 'PT409' });
      await expect(getGroupsForUser(owner.id)).resolves.toContainEqual(group);
      await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(membersBefore);
      await expect(getSessionsForGroup(group.id)).resolves.toEqual(sessionsBefore);
      const locations = await fixtureAdmin.from('locations').select('*').eq('group_id', group.id);
      expect(locations.error).toBeNull();
      expect(locations.data).toEqual(locationsBefore.data);
    }

    await signIn(outsider.email, outsider.password);
    await expect(
      leaveGroup({
        groupId: group.id,
        expectedJoinedAt: creator.joined_at,
        expectedAdminMembershipId: creator.id,
        successorMembershipId: null,
      }),
    ).rejects.toMatchObject({ code: '42501' });
    const anonymous = await anonymousClient.rpc('leave_group', {
      target_group_id: group.id,
      expected_joined_at: creator.joined_at ?? '',
      expected_admin_id: creator.id,
    });
    expect(anonymous.error?.code).toBe('42501');
    await signIn(owner.email, owner.password);
    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(membersBefore);
    await expect(getSessionsForGroup(group.id)).resolves.toEqual(sessionsBefore);
  });
  it('rejects a stale administrator snapshot when the successor is now the last active member', async () => {
    const { group, creator } = await createOwnedGroup();
    const successor = await admitGroupMember({
      groupId: group.id,
      userId: member.id,
      expectedMembership: null,
    });
    const departed = expectRetainedMembership(
      await leaveGroup({
        groupId: group.id,
        expectedJoinedAt: creator.joined_at,
        expectedAdminMembershipId: creator.id,
        successorMembershipId: successor.id,
      }),
    );
    await signIn(member.email, member.password);
    const input = {
      groupId: group.id,
      expectedJoinedAt: successor.joined_at,
      expectedAdminMembershipId: creator.id,
      successorMembershipId: null,
    };
    await expect(leaveGroup(input)).rejects.toMatchObject({ code: 'PT409' });
    await expect(getGroupsForUser(member.id)).resolves.toContainEqual({
      ...group,
      admin_membership_id: successor.id,
    });
    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual([successor]);
    await expect(getMembersForGroupIncludingInactive(group.id)).resolves.toEqual(
      expect.arrayContaining([departed, successor]),
    );
    await expect(
      leaveGroup({ ...input, expectedAdminMembershipId: successor.id }),
    ).resolves.toEqual({
      groupDeleted: true,
      membership: null,
    });
  });

  it('serializes competing last-departure calls and deletes the group only once', async () => {
    const { group, creator } = await createOwnedGroup();
    const input = {
      groupId: group.id,
      expectedJoinedAt: creator.joined_at,
      expectedAdminMembershipId: creator.id,
      successorMembershipId: null,
    };
    const results = await Promise.allSettled([leaveGroup(input), leaveGroup(input)]);
    const successes = results.filter((result) => result.status === 'fulfilled');
    const failures = results.filter((result) => result.status === 'rejected');
    expect(successes).toEqual([
      { status: 'fulfilled', value: { groupDeleted: true, membership: null } },
    ]);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toMatchObject({ code: '42501' });
    const storedGroup = await fixtureAdmin.from('groups').select('*').eq('id', group.id);
    expect(storedGroup.error).toBeNull();
    expect(storedGroup.data).toEqual([]);
    const storedMemberships = await fixtureAdmin
      .from('memberships')
      .select('*')
      .eq('group_id', group.id);
    expect(storedMemberships.error).toBeNull();
    expect(storedMemberships.data).toEqual([]);
  });

  it('limits admission and reactivation to the group administrator', async () => {
    const { group, otherMembershipId } = await createHostingGroup();
    const members = await getActiveMembersForGroup(group.id);
    const leavingMember = members.find((membership) => membership.id === otherMembershipId);

    if (!leavingMember) {
      throw new Error('Admission fixture has no departing membership');
    }

    await signIn(otherMember.email, otherMember.password);

    const departed = expectRetainedMembership(
      await leaveGroup({
        groupId: group.id,
        expectedJoinedAt: leavingMember.joined_at,
        expectedAdminMembershipId: group.admin_membership_id,
        successorMembershipId: null,
      }),
    );

    await signIn(member.email, member.password);
    const membershipsBefore = await getMembersForGroupIncludingInactive(group.id);

    // An ordinary member cannot admit someone or reactivate a former member.
    await expect(
      admitGroupMember({
        groupId: group.id,
        userId: outsider.id,
        expectedMembership: null,
      }),
    ).rejects.toMatchObject({ code: '42501' });

    await expect(
      admitGroupMember({
        groupId: group.id,
        userId: otherMember.id,
        expectedMembership: departed,
      }),
    ).rejects.toMatchObject({ code: '42501' });

    // Neither a new applicant nor a former member can admit themselves.
    await signIn(outsider.email, outsider.password);

    await expect(
      admitGroupMember({
        groupId: group.id,
        userId: outsider.id,
        expectedMembership: null,
      }),
    ).rejects.toMatchObject({ code: '42501' });

    await signIn(otherMember.email, otherMember.password);

    await expect(
      admitGroupMember({
        groupId: group.id,
        userId: otherMember.id,
        expectedMembership: departed,
      }),
    ).rejects.toMatchObject({ code: '42501' });

    await signIn(owner.email, owner.password);

    await expect(getMembersForGroupIncludingInactive(group.id)).resolves.toEqual(membershipsBefore);

    const admitted = await admitGroupMember({
      groupId: group.id,
      userId: outsider.id,
      expectedMembership: null,
    });

    expect(admitted).toMatchObject({
      group_id: group.id,
      user_id: outsider.id,
      is_active: true,
      willing_to_host: false,
      host_position: null,
    });

    const reactivated = await admitGroupMember({
      groupId: group.id,
      userId: otherMember.id,
      expectedMembership: departed,
    });

    expect(reactivated).toMatchObject({
      id: otherMembershipId,
      user_id: otherMember.id,
      is_active: true,
      willing_to_host: true,
      host_position: null,
    });

    await expect(getActiveMembersForGroup(group.id)).resolves.toHaveLength(4);
  });
  it('preserves active memberships on repeated admission and rejects stale snapshots', async () => {
    const { group, ownerMembershipId, memberMembershipId } = await createHostingGroup();
    const membersBefore = await getActiveMembersForGroup(group.id);
    const activeMembership = membersBefore.find(
      (membership) => membership.id === memberMembershipId,
    );

    if (!activeMembership) {
      throw new Error('Repeated-admission fixture has no active membership');
    }

    const repeated = await admitGroupMember({
      groupId: group.id,
      userId: member.id,
      expectedMembership: activeMembership,
    });

    expect(repeated).toEqual(activeMembership);

    const staleSnapshots = [
      null,
      {
        id: ownerMembershipId,
        is_active: activeMembership.is_active,
        joined_at: activeMembership.joined_at,
      },
      {
        id: activeMembership.id,
        is_active: false,
        joined_at: activeMembership.joined_at,
      },
      {
        id: activeMembership.id,
        is_active: activeMembership.is_active,
        joined_at: '2000-01-01T00:00:00Z',
      },
    ];

    for (const expectedMembership of staleSnapshots) {
      await expect(
        admitGroupMember({
          groupId: group.id,
          userId: member.id,
          expectedMembership,
        }),
      ).rejects.toMatchObject({ code: 'PT409' });
    }

    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(membersBefore);

    const history = await getMembersForGroupIncludingInactive(group.id);

    expect(history.filter((membership) => membership.user_id === member.id)).toEqual([
      activeMembership,
    ]);
  });
});
