import { randomUUID } from 'node:crypto';

import {
  admitGroupMember,
  cancelSession,
  confirmSession,
  createSession,
  designateActualHost,
  getActiveMembersForGroup,
  getSessionParticipants,
  getSessionsForGroup,
  leaveGroup,
  optOutOfSession,
  setHostingWillingness,
  signIn,
  type Session,
} from '@model';

import { supabase } from './supabase';
import { createUs2Fixtures, type TestAccount } from './test-support/us2-fixtures';

jest.mock('./supabase', () => {
  const { createLocalSupabaseMock } = jest.requireActual<
    typeof import('./test-support/local-supabase')
  >('./test-support/local-supabase');

  return createLocalSupabaseMock();
});

const { fixtureAdmin, anonymousClient, setup, cleanup, createHostingGroup } = createUs2Fixtures();

let owner: TestAccount;
let member: TestAccount;
let otherMember: TestAccount;
let outsider: TestAccount;

async function schedule(groupId: string, hostId: string): Promise<Session> {
  return createSession({
    groupId,
    plannedHostMembershipId: hostId,
    // A past start alone does not close a scheduled session to personal opt-outs.
    startsAt: '2020-06-10T18:00:00Z',
    durationMinutes: 120,
    location: { kind: 'new', address: 'Personal participation test location' },
  });
}

async function leaveAs(account: TestAccount, groupId: string, adminId: string) {
  await signIn(account.email, account.password);
  const members = await getActiveMembersForGroup(groupId);
  const ownMembership = members.find((membership) => membership.user_id === account.id);
  if (!ownMembership) {
    throw new Error('Missing membership for test departure');
  }

  return leaveGroup({
    groupId,
    expectedJoinedAt: ownMembership.joined_at,
    expectedAdminMembershipId: adminId,
    successorMembershipId: null,
  });
}

async function storedOptOuts(sessionId: string) {
  const { data } = await fixtureAdmin
    .from('session_opt_outs')
    .select('*')
    .eq('session_id', sessionId)
    .order('membership_id')
    .throwOnError();
  return data;
}

describe('personal session participation with local Supabase', () => {
  beforeAll(async () => {
    ({ owner, member, otherMember, outsider } = await setup());
  });

  afterAll(async () => {
    await cleanup();
  });

  it('includes all active members by default, regardless of hosting willingness', async () => {
    const { group, ownerMembershipId, otherMembershipId } = await createHostingGroup();
    await signIn(otherMember.email, otherMember.password);
    await setHostingWillingness({
      groupId: group.id,
      newWillingness: false,
      expectedWillingness: true,
    });
    await signIn(owner.email, owner.password);
    const session = await schedule(group.id, ownerMembershipId);

    await expect(getSessionParticipants(session.id)).resolves.toEqual(
      await getActiveMembersForGroup(group.id),
    );
    await expect(storedOptOuts(session.id)).resolves.toEqual([]);

    await leaveAs(otherMember, group.id, ownerMembershipId);
    await signIn(owner.email, owner.password);
    const newcomer = await admitGroupMember({
      groupId: group.id,
      userId: outsider.id,
      expectedMembership: null,
    });
    const participants = await getSessionParticipants(session.id);
    expect(participants).toEqual(await getActiveMembersForGroup(group.id));
    expect(participants.map((membership) => membership.id)).toContain(newcomer.id);
    expect(participants.map((membership) => membership.id)).not.toContain(otherMembershipId);
    await expect(storedOptOuts(session.id)).resolves.toEqual([]);
  });

  it('persists only the caller opt-out idempotently without changing hosts, order or other sessions', async () => {
    const { group, memberMembershipId, otherMembershipId } = await createHostingGroup();
    const first = await schedule(group.id, memberMembershipId);
    const designated = await designateActualHost(first, otherMembershipId);
    const second = await schedule(group.id, memberMembershipId);
    const membersBefore = await getActiveMembersForGroup(group.id);
    const sessionsBefore = await getSessionsForGroup(group.id);

    await signIn(member.email, member.password);
    await expect(optOutOfSession(first.id)).resolves.toBeUndefined();
    await expect(getSessionParticipants(first.id)).resolves.toEqual(
      membersBefore.filter((membership) => membership.id !== memberMembershipId),
    );

    await Promise.all([optOutOfSession(first.id), optOutOfSession(first.id)]);
    await expect(storedOptOuts(first.id)).resolves.toEqual([
      { session_id: first.id, membership_id: memberMembershipId, group_id: group.id },
    ]);
    await expect(getSessionParticipants(second.id)).resolves.toEqual(membersBefore);
    await expect(storedOptOuts(second.id)).resolves.toEqual([]);
    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(membersBefore);
    await expect(getSessionsForGroup(group.id)).resolves.toEqual(sessionsBefore);

    // Even an empty participant list does not cancel the session or replace its hosts.
    await signIn(otherMember.email, otherMember.password);
    await optOutOfSession(first.id);
    await signIn(owner.email, owner.password);
    await optOutOfSession(first.id);
    await expect(getSessionParticipants(first.id)).resolves.toEqual([]);
    const stored = await fixtureAdmin.from('sessions').select('*').eq('id', first.id).single();
    expect(stored.error).toBeNull();
    expect(stored.data).toEqual(designated);
    await expect(getActiveMembersForGroup(group.id)).resolves.toEqual(membersBefore);
    await expect(getSessionParticipants(second.id)).resolves.toEqual(membersBefore);
  });

  it('requires active membership in the session group for reads and opt-outs', async () => {
    const { group, ownerMembershipId, memberMembershipId } = await createHostingGroup();
    const session = await schedule(group.id, ownerMembershipId);

    for (const rpc of ['opt_out_of_session', 'get_session_participants'] as const) {
      const result = await anonymousClient.rpc(rpc, { target_session_id: session.id });
      expect(result.error?.code).toBe('42501');
    }

    // Active membership elsewhere grants no access to this session.
    const otherGroup = await createHostingGroup();
    await admitGroupMember({
      groupId: otherGroup.group.id,
      userId: outsider.id,
      expectedMembership: null,
    });
    await signIn(outsider.email, outsider.password);
    for (const operation of [optOutOfSession, getSessionParticipants]) {
      await expect(operation(session.id)).rejects.toMatchObject({ code: '42501' });
    }

    await signIn(member.email, member.password);
    await optOutOfSession(session.id);
    await leaveAs(member, group.id, ownerMembershipId);
    for (const operation of [optOutOfSession, getSessionParticipants]) {
      await expect(operation(session.id)).rejects.toMatchObject({ code: '42501' });
    }

    await signIn(owner.email, owner.password);
    await expect(optOutOfSession(randomUUID())).rejects.toMatchObject({ code: '42501' });
    await expect(getSessionParticipants(randomUUID())).rejects.toMatchObject({ code: '42501' });
    await expect(storedOptOuts(session.id)).resolves.toEqual([
      { session_id: session.id, membership_id: memberMembershipId, group_id: group.id },
    ]);
  });

  it('blocks direct client reads, forged opt-outs, changes and withdrawal', async () => {
    const { group, ownerMembershipId, memberMembershipId } = await createHostingGroup();
    const session = await schedule(group.id, ownerMembershipId);
    await signIn(member.email, member.password);
    await optOutOfSession(session.id);

    for (const client of [supabase, anonymousClient]) {
      const read = await client.from('session_opt_outs').select('*');
      expect(read.error?.code).toBe('42501');
      const forged = await client.from('session_opt_outs').insert({
        session_id: session.id,
        membership_id: ownerMembershipId,
        group_id: group.id,
      });
      expect(forged.error?.code).toBe('42501');
      const update = await client
        .from('session_opt_outs')
        .update({ membership_id: ownerMembershipId })
        .eq('session_id', session.id);
      expect(update.error?.code).toBe('42501');
      const withdrawal = await client
        .from('session_opt_outs')
        .delete()
        .eq('session_id', session.id);
      expect(withdrawal.error?.code).toBe('42501');
    }
    await expect(storedOptOuts(session.id)).resolves.toEqual([
      { session_id: session.id, membership_id: memberMembershipId, group_id: group.id },
    ]);
  });

  it.each(['cancelled', 'completed'] as const)(
    'rejects new and repeated opt-outs once a session is %s',
    async (status) => {
      const { group, ownerMembershipId } = await createHostingGroup();
      for (const previouslyOptedOut of [false, true]) {
        const session = await schedule(group.id, ownerMembershipId);
        if (previouslyOptedOut) {
          await optOutOfSession(session.id);
        }
        const updated =
          status === 'cancelled' ? await cancelSession(session) : await confirmSession(session);
        await expect(optOutOfSession(session.id)).rejects.toMatchObject({ code: '22023' });
        expect(await storedOptOuts(session.id)).toHaveLength(previouslyOptedOut ? 1 : 0);
        const stored = await fixtureAdmin
          .from('sessions')
          .select('*')
          .eq('id', session.id)
          .single();
        expect(stored.error).toBeNull();
        expect(stored.data).toEqual(updated);
      }
    },
  );

  it('enforces uniqueness and same-group session and membership references in the database', async () => {
    const first = await createHostingGroup();
    const firstSession = await schedule(first.group.id, first.ownerMembershipId);
    const second = await createHostingGroup();
    const secondSession = await schedule(second.group.id, second.ownerMembershipId);

    const valid = {
      session_id: firstSession.id,
      membership_id: first.ownerMembershipId,
      group_id: first.group.id,
    };
    await fixtureAdmin.from('session_opt_outs').insert(valid).throwOnError();
    const duplicate = await fixtureAdmin.from('session_opt_outs').insert(valid);
    expect(duplicate.error?.code).toBe('23505');

    for (const invalid of [
      { ...valid, membership_id: second.ownerMembershipId },
      { ...valid, session_id: secondSession.id },
      { ...valid, membership_id: randomUUID() },
      { ...valid, session_id: randomUUID() },
    ]) {
      const result = await fixtureAdmin.from('session_opt_outs').insert(invalid);
      expect(result.error?.code).toBe('23503');
    }
    await expect(storedOptOuts(firstSession.id)).resolves.toEqual([valid]);
    await expect(storedOptOuts(secondSession.id)).resolves.toEqual([]);
  });

  it('cascades opt-outs through sessions on the last active departure without affecting other groups', async () => {
    const first = await createHostingGroup();
    const firstSession = await schedule(first.group.id, first.ownerMembershipId);
    await optOutOfSession(firstSession.id);
    await signIn(member.email, member.password);
    await optOutOfSession(firstSession.id);

    const second = await createHostingGroup();
    const secondSession = await schedule(second.group.id, second.ownerMembershipId);
    await optOutOfSession(secondSession.id);
    const retainedOptOuts = await storedOptOuts(secondSession.id);
    const retainedMembers = await getActiveMembersForGroup(second.group.id);
    const retainedSessions = await getSessionsForGroup(second.group.id);

    expect(await leaveAs(member, first.group.id, first.ownerMembershipId)).toMatchObject({
      groupDeleted: false,
    });
    await leaveAs(otherMember, first.group.id, first.ownerMembershipId);
    expect(await storedOptOuts(firstSession.id)).toHaveLength(2);
    await expect(leaveAs(owner, first.group.id, first.ownerMembershipId)).resolves.toEqual({
      groupDeleted: true,
      membership: null,
    });

    await expect(storedOptOuts(firstSession.id)).resolves.toEqual([]);
    for (const table of ['sessions', 'memberships', 'locations'] as const) {
      const result = await fixtureAdmin.from(table).select('*').eq('group_id', first.group.id);
      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    }
    const deletedGroup = await fixtureAdmin.from('groups').select('*').eq('id', first.group.id);
    expect(deletedGroup.error).toBeNull();
    expect(deletedGroup.data).toEqual([]);
    await expect(getSessionParticipants(firstSession.id)).rejects.toMatchObject({ code: '42501' });
    await expect(storedOptOuts(secondSession.id)).resolves.toEqual(retainedOptOuts);
    await expect(getActiveMembersForGroup(second.group.id)).resolves.toEqual(retainedMembers);
    await expect(getSessionsForGroup(second.group.id)).resolves.toEqual(retainedSessions);
  });
});
