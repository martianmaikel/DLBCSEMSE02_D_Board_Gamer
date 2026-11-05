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
} from './index';

import { createUs2Fixtures, type TestAccount } from './test-support/us2-fixtures';

jest.mock('./supabase', () => {
  const { createLocalSupabaseMock } = jest.requireActual<
    typeof import('./test-support/local-supabase')
  >('./test-support/local-supabase');

  return createLocalSupabaseMock();
});

const { anonymousClient, groupPrefix, setup, cleanup, createOwnedGroup } = createUs2Fixtures();

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
});
