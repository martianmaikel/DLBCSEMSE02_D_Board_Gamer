import {
  admitGroupMember,
  createGroup,
  getActiveMemberProfilesForGroup,
  getActiveMembersForGroup,
  getGroupsForUser,
  getOwnProfile,
  leaveGroup,
  saveOwnProfile,
  signIn,
} from './index';
import { supabase } from './supabase';
import { createUs2Fixtures } from './test-support/us2-fixtures';

jest.mock('./supabase', () => {
  const { createLocalSupabaseMock } = jest.requireActual<
    typeof import('./test-support/local-supabase')
  >('./test-support/local-supabase');

  return createLocalSupabaseMock();
});

let fixtures: ReturnType<typeof createUs2Fixtures>;
let accounts: Awaited<ReturnType<typeof fixtures.setup>>;

describe('Profiles and legacy accounts with local Supabase', () => {
  beforeEach(async () => {
    fixtures = createUs2Fixtures();
    accounts = await fixtures.setup({ withoutProfiles: true });
  });
  afterEach(async () => {
    await fixtures.cleanup();
  });

  it('keeps existing accounts without profiles usable for sign-in, groups and memberships', async () => {
    await expect(signIn(accounts.owner.email, accounts.owner.password)).resolves.toEqual({
      id: accounts.owner.id,
      email: accounts.owner.email,
    });
    const { group } = await fixtures.createOwnedGroup();
    const membership = await admitGroupMember({
      groupId: group.id,
      userId: accounts.member.id,
      expectedMembership: null,
    });

    await expect(getOwnProfile()).resolves.toBeNull();
    await expect(getGroupsForUser(accounts.owner.id)).resolves.toContainEqual(group);
    expect(await getActiveMembersForGroup(group.id)).toContainEqual(membership);
    await expect(getActiveMemberProfilesForGroup(group.id)).resolves.toEqual([]);
    const profiles = await fixtures.fixtureAdmin
      .from('profiles')
      .select('id')
      .in('id', [accounts.owner.id, accounts.member.id]);
    expect(profiles.error).toBeNull();
    expect(profiles.data).toEqual([]);
  });

  it('explicitly creates, reads and updates only the signed-in user profile', async () => {
    await signIn(accounts.owner.email, accounts.owner.password);
    const profile = await saveOwnProfile(` \tPlayer-${accounts.owner.id}\n `);
    expect(profile).toEqual({ id: accounts.owner.id, username: `Player-${accounts.owner.id}` });
    await expect(getOwnProfile()).resolves.toEqual(profile);

    const renamed = await saveOwnProfile(`Renamed-${accounts.owner.id}`);
    expect(renamed.id).toBe(profile.id);
    await expect(getOwnProfile()).resolves.toEqual(renamed);
    const rows = await supabase.from('profiles').select('*');
    expect(rows.error).toBeNull();
    expect(rows.data).toEqual([renamed]);
  });

  it('enforces case-insensitive uniqueness on creation and rename without changing stored data', async () => {
    await signIn(accounts.owner.email, accounts.owner.password);
    const username = `Player-${accounts.owner.id}`;
    const ownerProfile = await saveOwnProfile(username);
    await signIn(accounts.member.email, accounts.member.password);

    await expect(saveOwnProfile(username.toUpperCase())).rejects.toMatchObject({ code: '23505' });
    await expect(getOwnProfile()).resolves.toBeNull();
    const memberProfile = await saveOwnProfile(`Member-${accounts.member.id}`);
    await expect(saveOwnProfile(username.toLowerCase())).rejects.toMatchObject({ code: '23505' });
    await expect(getOwnProfile()).resolves.toEqual(memberProfile);

    await signIn(accounts.owner.email, accounts.owner.password);
    await expect(getOwnProfile()).resolves.toEqual(ownerProfile);
    await expect(saveOwnProfile(username.toUpperCase())).resolves.toEqual({
      ...ownerProfile,
      username: username.toUpperCase(),
    });
  });

  it.each(['', '   ', '\t\n\r'])(
    'rejects blank username %j at RPC and table boundaries',
    async (username) => {
      await signIn(accounts.owner.email, accounts.owner.password);
      await expect(saveOwnProfile(username)).rejects.toMatchObject({ code: '22023' });
      const invalid = await fixtures.fixtureAdmin
        .from('profiles')
        .insert({ id: accounts.owner.id, username });
      expect(invalid.error?.code).toBe('23514');
      await expect(getOwnProfile()).resolves.toBeNull();
    },
  );

  it('rejects NULL names and profile IDs without an Auth account', async () => {
    await signIn(accounts.owner.email, accounts.owner.password);
    const missingName = await supabase.rpc('save_own_profile', {
      // @ts-expect-error Deliberately test the SQL boundary with a NULL username.
      profile_username: null,
    });
    expect(missingName.error?.code).toBe('22023');
    const nullColumn = await fixtures.fixtureAdmin.from('profiles').insert({
      id: accounts.owner.id,
      // @ts-expect-error Deliberately bypass the required database column type.
      username: null,
    });
    expect(nullColumn.error?.code).toBe('23502');
    const unknownAccount = await fixtures.fixtureAdmin.from('profiles').insert({
      id: '00000000-0000-0000-0000-000000000000',
      username: `Unknown-${accounts.owner.id}`,
    });
    expect(unknownAccount.error?.code).toBe('23503');
  });

  it('reads active peers but never expands access to a peer-only foreign group', async () => {
    const { group } = await fixtures.createOwnedGroup();
    const ownerProfile = await saveOwnProfile(`Owner-${accounts.owner.id}`);
    for (const account of [accounts.member, accounts.otherMember]) {
      await admitGroupMember({ groupId: group.id, userId: account.id, expectedMembership: null });
    }
    await signIn(accounts.member.email, accounts.member.password);
    const memberProfile = await saveOwnProfile(`Member-${accounts.member.id}`);
    await expect(getActiveMemberProfilesForGroup(group.id)).resolves.toEqual(
      [ownerProfile, memberProfile].sort((a, b) => a.id.localeCompare(b.id)),
    );
    const peer = await supabase.from('profiles').select('*').eq('id', accounts.owner.id);
    expect(peer.error).toBeNull();
    expect(peer.data).toEqual([ownerProfile]);

    await signIn(accounts.outsider.email, accounts.outsider.password);
    await saveOwnProfile(`Outsider-${accounts.outsider.id}`);
    const foreignGroup = await createGroup(`${fixtures.groupPrefix}foreign-profiles`);
    await admitGroupMember({
      groupId: foreignGroup.id,
      userId: accounts.member.id,
      expectedMembership: null,
    });
    const hidden = await supabase.from('profiles').select('*').eq('id', accounts.owner.id);
    expect(hidden.error).toBeNull();
    expect(hidden.data).toEqual([]);
    await expect(getActiveMemberProfilesForGroup(group.id)).resolves.toEqual([]);

    await signIn(accounts.owner.email, accounts.owner.password);
    await expect(getActiveMemberProfilesForGroup(foreignGroup.id)).resolves.toEqual([]);
    const stranger = await supabase.from('profiles').select('*').eq('id', accounts.outsider.id);
    expect(stranger.error).toBeNull();
    expect(stranger.data).toEqual([]);
  });

  it('revokes peer access for either inactive membership and restores it on rejoining', async () => {
    const { group, creator } = await fixtures.createOwnedGroup();
    const ownerProfile = await saveOwnProfile(`Owner-${accounts.owner.id}`);
    const member = await admitGroupMember({
      groupId: group.id,
      userId: accounts.member.id,
      expectedMembership: null,
    });
    await signIn(accounts.member.email, accounts.member.password);
    const memberProfile = await saveOwnProfile(`Member-${accounts.member.id}`);
    const inactive = await leaveGroup({
      groupId: group.id,
      expectedJoinedAt: member.joined_at,
      expectedAdminMembershipId: creator.id,
      successorMembershipId: null,
    });
    await expect(getOwnProfile()).resolves.toEqual(memberProfile);
    await expect(getActiveMemberProfilesForGroup(group.id)).resolves.toEqual([]);
    const hiddenOwner = await supabase.from('profiles').select('*').eq('id', accounts.owner.id);
    expect(hiddenOwner.error).toBeNull();
    expect(hiddenOwner.data).toEqual([]);

    await signIn(accounts.owner.email, accounts.owner.password);
    await expect(getActiveMemberProfilesForGroup(group.id)).resolves.toEqual([ownerProfile]);
    const hiddenMember = await supabase.from('profiles').select('*').eq('id', accounts.member.id);
    expect(hiddenMember.error).toBeNull();
    expect(hiddenMember.data).toEqual([]);
    await admitGroupMember({
      groupId: group.id,
      userId: accounts.member.id,
      expectedMembership: inactive,
    });
    expect(await getActiveMemberProfilesForGroup(group.id)).toHaveLength(2);
    await leaveGroup({
      groupId: group.id,
      expectedJoinedAt: creator.joined_at,
      expectedAdminMembershipId: creator.id,
      successorMembershipId: member.id,
    });
    await expect(getOwnProfile()).resolves.toEqual(ownerProfile);
    await expect(getActiveMemberProfilesForGroup(group.id)).resolves.toEqual([]);
    await signIn(accounts.member.email, accounts.member.password);
    await expect(getActiveMemberProfilesForGroup(group.id)).resolves.toEqual([memberProfile]);
  });

  it('blocks direct own and foreign writes, including writes by a group administrator', async () => {
    const { group } = await fixtures.createOwnedGroup();
    const ownerProfile = await saveOwnProfile(`Owner-${accounts.owner.id}`);
    await admitGroupMember({
      groupId: group.id,
      userId: accounts.member.id,
      expectedMembership: null,
    });
    await signIn(accounts.member.email, accounts.member.password);
    const memberProfile = await saveOwnProfile(`Member-${accounts.member.id}`);
    await signIn(accounts.owner.email, accounts.owner.password);

    const insert = await supabase.from('profiles').insert({
      id: accounts.outsider.id,
      username: `Forbidden-${accounts.outsider.id}`,
    });
    expect(insert.error?.code).toBe('42501');
    for (const profile of [ownerProfile, memberProfile]) {
      const update = await supabase
        .from('profiles')
        .update({ username: 'Forbidden' })
        .eq('id', profile.id);
      expect(update.error?.code).toBe('42501');
      const deletion = await supabase.from('profiles').delete().eq('id', profile.id);
      expect(deletion.error?.code).toBe('42501');
    }
    await expect(getOwnProfile()).resolves.toEqual(ownerProfile);
    const unchanged = await fixtures.fixtureAdmin
      .from('profiles')
      .select('*')
      .eq('id', accounts.member.id)
      .single();
    expect(unchanged.error).toBeNull();
    expect(unchanged.data).toEqual(memberProfile);
  });

  it('blocks anonymous table and RPC access', async () => {
    const { group } = await fixtures.createOwnedGroup();
    await saveOwnProfile(`Owner-${accounts.owner.id}`);
    const results = await Promise.all([
      fixtures.anonymousClient.from('profiles').select('*'),
      fixtures.anonymousClient
        .from('profiles')
        .insert({ id: accounts.owner.id, username: 'Anonymous' }),
      fixtures.anonymousClient
        .from('profiles')
        .update({ username: 'Anonymous' })
        .eq('id', accounts.owner.id),
      fixtures.anonymousClient.from('profiles').delete().eq('id', accounts.owner.id),
      fixtures.anonymousClient.rpc('save_own_profile', { profile_username: 'Anonymous' }),
      fixtures.anonymousClient.rpc('get_active_member_profiles', { target_group_id: group.id }),
    ]);
    for (const result of results) {
      expect(result.error?.code).toBe('42501');
    }
    await supabase.auth.signOut();
    await expect(getOwnProfile()).rejects.toBeDefined();
    await expect(saveOwnProfile('Anonymous')).rejects.toMatchObject({ code: '42501' });
    await expect(getActiveMemberProfilesForGroup(group.id)).rejects.toMatchObject({
      code: '42501',
    });
  });
});
