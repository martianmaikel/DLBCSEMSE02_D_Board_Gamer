/// <reference types="node" />

import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../database.types';

import {
  admitGroupMember,
  createGroup,
  getActiveMembersForGroup,
  saveHostPositions,
  setHostingWillingness,
  signIn,
} from '../index';

export type TestAccount = {
  id: string;
  email: string;
  password: string;
};

export function createUs2Fixtures() {
  const url = process.env.SUPABASE_TEST_URL;
  const publicKey = process.env.SUPABASE_TEST_ANON_KEY;
  const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

  if (!url || !publicKey || !serviceKey) {
    throw new Error('Missing local integration fixture configuration');
  }

  const target = new URL(url);
  const localHosts = ['127.0.0.1', 'localhost', '[::1]'];

  if (target.protocol !== 'http:' || !localHosts.includes(target.hostname)) {
    throw new Error('Integration fixtures require a local HTTP Supabase URL');
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

  async function setup() {
    owner = await createAccount('owner');
    member = await createAccount('member');
    otherMember = await createAccount('other');
    outsider = await createAccount('outsider');

    return { owner, member, otherMember, outsider };
  }

  async function cleanup(): Promise<void> {
    await cleanupUs2Fixtures(fixtureAdmin, groupPrefix, createdUserIds);
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

  async function createHostingGroup() {
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

    await setHostingWillingness({
      groupId: group.id,
      newWillingness: true,
      expectedWillingness: false,
    });

    await signIn(member.email, member.password);
    await setHostingWillingness({
      groupId: group.id,
      newWillingness: true,
      expectedWillingness: false,
    });

    await signIn(otherMember.email, otherMember.password);
    await setHostingWillingness({
      groupId: group.id,
      newWillingness: true,
      expectedWillingness: false,
    });

    await signIn(owner.email, owner.password);

    await saveHostPositions(group.id, [
      {
        membershipId: creator.id,
        expectedPosition: null,
        newPosition: 1,
      },
      {
        membershipId: admittedMember.id,
        expectedPosition: null,
        newPosition: 2,
      },
      {
        membershipId: admittedOther.id,
        expectedPosition: null,
        newPosition: 3,
      },
    ]);

    return {
      group,
      ownerMembershipId: creator.id,
      memberMembershipId: admittedMember.id,
      otherMembershipId: admittedOther.id,
    };
  }
  return {
    fixtureAdmin,
    anonymousClient,
    groupPrefix,
    setup,
    cleanup,
    createOwnedGroup,
    createHostingGroup,
  };
}

export async function cleanupUs2Fixtures(
  fixtureAdmin: SupabaseClient<Database>,
  groupPrefix: string,
  createdUserIds: readonly string[],
): Promise<void> {
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
}
