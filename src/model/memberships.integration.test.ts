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

    const departed = await leaveGroup({
      groupId: group.id,
      expectedJoinedAt: departingMember.joined_at,
      expectedAdminMembershipId: group.admin_membership_id,
      successorMembershipId: null,
    });

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
      location: {
        kind: 'new',
        address: 'US2 rejoining history location',
      },
    });

    await signIn(member.email, member.password);
    const completedSession = await confirmSession(session);

    const departed = await leaveGroup({
      groupId: group.id,
      expectedJoinedAt: originalMembership.joined_at,
      expectedAdminMembershipId: group.admin_membership_id,
      successorMembershipId: null,
    });

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

    const departed = await leaveGroup({
      groupId: group.id,
      expectedJoinedAt: departingAdmin.joined_at,
      expectedAdminMembershipId: ownerMembershipId,
      successorMembershipId: memberMembershipId,
    });

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
  it('clears administration when the last member leaves and retains historical rows', async () => {
    const { group, creator } = await createOwnedGroup();

    const departed = await leaveGroup({
      groupId: group.id,
      expectedJoinedAt: creator.joined_at,
      expectedAdminMembershipId: creator.id,
      successorMembershipId: null,
    });

    expect(departed).toEqual({
      ...creator,
      is_active: false,
      host_position: null,
    });

    // Inspect retained rows independently of the former member's access.
    const storedGroup = await fixtureAdmin.from('groups').select('*').eq('id', group.id).single();

    expect(storedGroup.error).toBeNull();
    expect(storedGroup.data).toEqual({
      ...group,
      admin_membership_id: null,
    });

    const storedMembership = await fixtureAdmin
      .from('memberships')
      .select('*')
      .eq('group_id', group.id)
      .single();

    expect(storedMembership.error).toBeNull();
    expect(storedMembership.data).toEqual(departed);

    const visibleGroups = await getGroupsForUser(owner.id);

    expect(visibleGroups.map((visibleGroup) => visibleGroup.id)).not.toContain(group.id);

    const directRead = await supabase.from('groups').select('*').eq('id', group.id);

    expect(directRead.error).toBeNull();
    expect(directRead.data).toEqual([]);

    await expect(
      admitGroupMember({
        groupId: group.id,
        userId: owner.id,
        expectedMembership: departed,
      }),
    ).rejects.toMatchObject({ code: '42501' });
  });
});
