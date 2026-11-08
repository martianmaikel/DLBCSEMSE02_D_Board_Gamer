/// <reference types="jest" />
/// <reference types="node" />

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { getGroupsForUser } from './groups';
import { getSessionsForGroup } from './sessions';
import { supabase } from './supabase';

import { signIn } from './auth';

// Replace native initialization with a real Node-compatible client.
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
const adminKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const publicKey = process.env.SUPABASE_TEST_ANON_KEY;
const membershipA = randomUUID();
const membershipB = randomUUID();
const otherMembership = randomUUID();

if (!url || !adminKey || !publicKey) {
  throw new Error('Missing local integration fixture configuration');
}

const admin = createClient<Database>(url, adminKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const testClientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

const otherClient = createClient<Database>(url, publicKey, testClientOptions);
const anonymousClient = createClient<Database>(url, publicKey, testClientOptions);

const userEmail = `integration-${randomUUID()}@example.com`;
const otherUserEmail = `integration-other-${randomUUID()}@example.com`;
const testPassword = randomUUID();

const groupA = randomUUID();
const groupB = randomUUID();
const otherGroup = randomUUID();
const groupIds = [groupA, groupB, otherGroup];

const locationA = randomUUID();
const otherLocation = randomUUID();

const earlySession = randomUUID();
const lateSession = randomUUID();
const otherSession = randomUUID();

let userId: string | undefined;
let otherUserId: string | undefined;

describe('Model integration with local Supabase', () => {
  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: userEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { username: `integration-${randomUUID()}` },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Test user creation returned no user');
    }

    userId = data.user.id;

    const { data: otherData, error: otherError } = await admin.auth.admin.createUser({
      email: otherUserEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { username: `integration-other-${randomUUID()}` },
    });

    if (otherError) {
      throw otherError;
    }

    if (!otherData.user) {
      throw new Error('Second test user creation returned no user');
    }

    otherUserId = otherData.user.id;

    await admin
      .from('groups')
      .insert([
        { id: groupA, name: 'Integration A' },
        { id: groupB, name: 'Integration B' },
        { id: otherGroup, name: 'Integration other' },
      ])
      .throwOnError();

    await admin
      .from('memberships')
      .insert([
        {
          id: membershipA,
          group_id: groupA,
          user_id: userId,
          willing_to_host: true,
        },
        {
          id: membershipB,
          group_id: groupB,
          user_id: userId,
          willing_to_host: true,
        },
        {
          id: otherMembership,
          group_id: otherGroup,
          user_id: otherUserId,
          willing_to_host: true,
        },
      ])
      .throwOnError();

    await admin
      .from('locations')
      .insert([
        {
          id: locationA,
          group_id: groupA,
          address: 'Integration address A',
        },
        {
          id: otherLocation,
          group_id: otherGroup,
          address: 'Integration other address',
        },
      ])
      .throwOnError();

    // Insert sessions out of chronological order.
    await admin
      .from('sessions')
      .insert([
        {
          id: lateSession,
          group_id: groupA,
          location_id: locationA,
          starts_at: '2030-06-20T18:00:00Z',
          duration_minutes: 180,
          planned_host_membership_id: membershipA,
        },
        {
          id: earlySession,
          group_id: groupA,
          location_id: locationA,
          starts_at: '2030-06-10T18:00:00Z',
          duration_minutes: null,
          planned_host_membership_id: membershipA,
        },
        {
          id: otherSession,
          group_id: otherGroup,
          location_id: otherLocation,
          starts_at: '2030-06-01T18:00:00Z',
          duration_minutes: 120,
          planned_host_membership_id: otherMembership,
        },
      ])
      .throwOnError();
    await signIn(userEmail, testPassword);

    const { error: otherSignInError } = await otherClient.auth.signInWithPassword({
      email: otherUserEmail,
      password: testPassword,
    });

    if (otherSignInError) {
      throw otherSignInError;
    }
  });

  afterAll(async () => {
    if (!userId) {
      return;
    }

    const errors: string[] = [];

    // Delete only this run's data, in dependency order.
    for (const table of ['sessions', 'memberships', 'locations'] as const) {
      const { error } = await admin.from(table).delete().in('group_id', groupIds);

      if (error) {
        errors.push(`${table}: ${error.message}`);
      }
    }

    const { error: groupsError } = await admin.from('groups').delete().in('id', groupIds);

    if (groupsError) {
      errors.push(`groups: ${groupsError.message}`);
    }

    for (const id of [userId, otherUserId]) {
      if (!id) {
        continue;
      }

      const { error: userError } = await admin.auth.admin.deleteUser(id);

      if (userError) {
        errors.push(`auth user ${id}: ${userError.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Fixture cleanup failed:\n${errors.join('\n')}`);
    }
  });

  it('returns only groups linked to the requested user', async () => {
    if (!userId) {
      throw new Error('Test user was not initialized');
    }

    const groups = await getGroupsForUser(userId);

    expect(groups).toHaveLength(2);
    expect(groups).toEqual(
      expect.arrayContaining([
        {
          id: groupA,
          name: 'Integration A',
          admin_membership_id: null,
        },
        {
          id: groupB,
          name: 'Integration B',
          admin_membership_id: null,
        },
      ]),
    );
  });

  it('returns an empty list when no memberships match', async () => {
    const groups = await getGroupsForUser(randomUUID());

    expect(groups).toEqual([]);
  });

  it('returns only the requested group sessions in chronological order', async () => {
    const sessions = await getSessionsForGroup(groupA);

    expect(sessions.map((session) => session.id)).toEqual([earlySession, lateSession]);
    expect(sessions.map((session) => session.duration_minutes)).toEqual([null, 180]);

    for (const session of sessions) {
      expect(session.group_id).toBe(groupA);
      expect(session.location_id).toBe(locationA);
      expect(session.location).toEqual({
        id: locationA,
        group_id: groupA,
        address: 'Integration address A',
      });
    }
  });

  it('returns an empty list for a group without sessions', async () => {
    const sessions = await getSessionsForGroup(groupB);

    expect(sessions).toEqual([]);
  });
  it('hides another user’s group data', async () => {
    if (!otherUserId) {
      throw new Error('Second test user was not initialized');
    }

    const results = await Promise.all([
      supabase.from('groups').select('id').eq('id', otherGroup),
      supabase.from('memberships').select('id').eq('user_id', otherUserId),
      supabase.from('locations').select('id').eq('id', otherLocation),
      supabase.from('sessions').select('id').eq('id', otherSession),
    ]);

    for (const { data, error } of results) {
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }

    await expect(getGroupsForUser(otherUserId)).resolves.toEqual([]);
    await expect(getSessionsForGroup(otherGroup)).resolves.toEqual([]);

    const { data, error } = await otherClient.from('groups').select('id').eq('id', otherGroup);

    expect(error).toBeNull();
    expect(data).toEqual([{ id: otherGroup }]);
  });
  it('denies reads without a signed-in user', async () => {
    const results = await Promise.all([
      anonymousClient.from('groups').select('id').limit(1),
      anonymousClient.from('memberships').select('id').limit(1),
      anonymousClient.from('locations').select('id').limit(1),
      anonymousClient.from('sessions').select('id').limit(1),
    ]);

    for (const { error } of results) {
      expect(error?.code).toBe('42501');
    }
  });
  it('denies application writes', async () => {
    if (!userId) {
      throw new Error('Test user was not initialized');
    }

    for (const client of [supabase, anonymousClient]) {
      const results = await Promise.all([
        client.from('groups').insert({
          id: groupA,
          name: 'Integration A',
        }),
        client.from('groups').update({ name: 'Integration A' }).eq('id', groupA),
        client.from('groups').delete().eq('id', groupA),

        client.from('memberships').insert({
          group_id: groupA,
          user_id: userId,
        }),
        client
          .from('memberships')
          .update({ group_id: groupA })
          .eq('group_id', groupA)
          .eq('user_id', userId),
        client.from('memberships').delete().eq('group_id', groupA).eq('user_id', userId),

        client.from('locations').insert({
          id: locationA,
          group_id: groupA,
          address: 'Integration address A',
        }),
        client.from('locations').update({ address: 'Integration address A' }).eq('id', locationA),
        client.from('locations').delete().eq('id', locationA),

        client.from('sessions').insert({
          id: earlySession,
          group_id: groupA,
          location_id: locationA,
          starts_at: '2030-06-10T18:00:00Z',
        }),
        client
          .from('sessions')
          .update({ starts_at: '2030-06-10T18:00:00Z' })
          .eq('id', earlySession),
        client.from('sessions').delete().eq('id', earlySession),
      ]);

      for (const { error } of results) {
        expect(error?.code).toBe('42501');
      }
    }
  });
});
