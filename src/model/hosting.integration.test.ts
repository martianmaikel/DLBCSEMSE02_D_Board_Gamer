/// <reference types="jest" />
/// <reference types="node" />

import {
  getActiveMembersForGroup,
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

const { setup, cleanup, createHostingGroup } = createUs2Fixtures();

let owner: TestAccount;
let member: TestAccount;

describe('US2 hosting order with local Supabase', () => {
  beforeAll(async () => {
    const accounts = await setup();

    owner = accounts.owner;
    member = accounts.member;
  });

  afterAll(async () => {
    await cleanup();
  });

  it('swaps hosting positions atomically', async () => {
    const { group, ownerMembershipId, memberMembershipId, otherMembershipId } =
      await createHostingGroup();

    const saved = await saveHostPositions(group.id, [
      {
        membershipId: ownerMembershipId,
        expectedPosition: 1,
        newPosition: 2,
      },
      {
        membershipId: memberMembershipId,
        expectedPosition: 2,
        newPosition: 1,
      },
    ]);

    expect(saved).toHaveLength(2);

    const members = await getActiveMembersForGroup(group.id);

    expect(members.map((membership) => [membership.id, membership.host_position])).toEqual([
      [memberMembershipId, 1],
      [ownerMembershipId, 2],
      [otherMembershipId, 3],
    ]);
  });

  it('rolls back every position change when the final order is invalid', async () => {
    const { group, ownerMembershipId, memberMembershipId } = await createHostingGroup();

    const before = await getActiveMembersForGroup(group.id);

    await expect(
      saveHostPositions(group.id, [
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

    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(before);
  });

  it('rejects one of two concurrent writes based on the same position', async () => {
    const { group, ownerMembershipId, memberMembershipId, otherMembershipId } =
      await createHostingGroup();

    const results = await Promise.allSettled([
      saveHostPositions(group.id, [
        {
          membershipId: ownerMembershipId,
          expectedPosition: 1,
          newPosition: 4,
        },
      ]),
      saveHostPositions(group.id, [
        {
          membershipId: ownerMembershipId,
          expectedPosition: 1,
          newPosition: 5,
        },
      ]),
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
      throw new Error('Expected one successful position update');
    }

    expect(winner.value).toHaveLength(1);

    const winningPosition = winner.value.find(
      (membership) => membership.id === ownerMembershipId,
    )?.host_position;

    expect([4, 5]).toContain(winningPosition);

    const members = await getActiveMembersForGroup(group.id);

    expect(members.map((membership) => [membership.id, membership.host_position])).toEqual([
      [memberMembershipId, 2],
      [otherMembershipId, 3],
      [ownerMembershipId, winningPosition],
    ]);
  });

  it('clears an opting-out member position without renumbering others', async () => {
    const { group, ownerMembershipId, memberMembershipId, otherMembershipId } =
      await createHostingGroup();

    await signIn(member.email, member.password);

    const optedOut = await setHostingWillingness({
      groupId: group.id,
      newWillingness: false,
      expectedWillingness: true,
    });

    expect(optedOut).toMatchObject({
      id: memberMembershipId,
      is_active: true,
      willing_to_host: false,
      host_position: null,
    });

    const members = await getActiveMembersForGroup(group.id);

    expect(members.map((membership) => [membership.id, membership.host_position])).toEqual([
      [ownerMembershipId, 1],
      [otherMembershipId, 3],
      [memberMembershipId, null],
    ]);

    await signIn(owner.email, owner.password);

    await expect(
      saveHostPositions(group.id, [
        {
          membershipId: memberMembershipId,
          expectedPosition: null,
          newPosition: 2,
        },
      ]),
    ).rejects.toMatchObject({ code: '42501' });
  });
});
