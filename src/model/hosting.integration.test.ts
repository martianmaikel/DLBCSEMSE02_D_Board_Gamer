/// <reference types="jest" />
/// <reference types="node" />

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import {
  admitGroupMember,
  createGroup,
  getActiveMembersForGroup,
  getGroupsForUser,
  getMembersForGroupIncludingInactive,
  saveHostPositions,
  setHostingWillingness,
  signIn,
} from './index';

jest.mock('./supabase', () => {
  const { createClient } =
    jest.requireActual<typeof import('@supabase/supabase-js')>('@supabase/supabase-js');

  const url = process.env.SUPABASE_TEST_URL;
  const key = process.env.SUPABASE_TEST_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing local integration test configuration');
  }

  const target = new URL(url);
  const localHosts = ['127.0.0.1', 'localhost', '[::1]'];

  if (target.protocol !== 'http:' || !localHosts.includes(target.hostname)) {
    throw new Error('Integration tests require a local HTTP Supabase URL');
  }

  return {
    supabase: createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }),
  };
});

const url = process.env.SUPABASE_TEST_URL;
const publicKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

if (!url || !publicKey || !serviceKey) {
  throw new Error('Missing local integration fixture configuration');
}

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

const fixtureAdmin = createClient<Database>(url, serviceKey, clientOptions);
const anonymousClient = createClient<Database>(url, publicKey, clientOptions);

const runId = randomUUID();
const groupPrefix = `us2-${runId}-`;
const createdUserIds: string[] = [];

type TestAccount = {
  id: string;
  email: string;
  password: string;
};

let owner: TestAccount;
let member: TestAccount;
let otherMember: TestAccount;
let outsider: TestAccount;

async function createAccount(label: string): Promise<TestAccount> {
  const email = `us2-${label}-${runId}@example.com`;
  const password = randomUUID();

  const { data, error } = await fixtureAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Test account creation returned no user');
  }

  createdUserIds.push(data.user.id);

  return { id: data.user.id, email, password };
}

async function createOwnedGroup() {
  await signIn(owner.email, owner.password);

  const group = await createGroup(`${groupPrefix}${randomUUID()}`);
  const members = await getActiveMembersForGroup(group.id);
  const creator = members.find((membership) => membership.user_id === owner.id);

  if (!creator) {
    throw new Error('Created group has no creator membership');
  }

  return { group, creator, members };
}

describe('US2 Model integration with local Supabase', () => {
  beforeAll(async () => {
    owner = await createAccount('owner');
    member = await createAccount('member');
    otherMember = await createAccount('other');
    outsider = await createAccount('outsider');
  });

  afterAll(async () => {
    const errors: string[] = [];

    const recordError = (label: string, error: { message: string } | null): void => {
      if (error) {
        errors.push(`${label}: ${error.message}`);
      }
    };

    // Recover this run's group IDs even if a test failed during setup.
    const groupResult = await fixtureAdmin
      .from('groups')
      .select('id')
      .like('name', `${groupPrefix}%`);

    recordError('find test groups', groupResult.error);

    const groupIds = (groupResult.data ?? []).map((group) => group.id);

    if (groupIds.length > 0) {
      const sessionResult = await fixtureAdmin.from('sessions').delete().in('group_id', groupIds);

      recordError('sessions', sessionResult.error);

      // Break the group/administrator reference before removing memberships.
      const adminResult = await fixtureAdmin
        .from('groups')
        .update({ admin_membership_id: null })
        .in('id', groupIds);

      recordError('administrator references', adminResult.error);

      for (const table of ['memberships', 'locations'] as const) {
        const result = await fixtureAdmin.from(table).delete().in('group_id', groupIds);

        recordError(table, result.error);
      }

      const deleteGroupsResult = await fixtureAdmin.from('groups').delete().in('id', groupIds);

      recordError('groups', deleteGroupsResult.error);
    }

    for (const userId of createdUserIds) {
      const result = await fixtureAdmin.auth.admin.deleteUser(userId);
      recordError('test account', result.error);
    }

    if (errors.length > 0) {
      throw new Error(`Fixture cleanup failed:\n${errors.join('\n')}`);
    }
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
