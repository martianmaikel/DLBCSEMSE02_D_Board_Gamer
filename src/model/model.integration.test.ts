/// <reference types="jest" />
/// <reference types="node" />

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { getGroupsForUser } from './groups';
import { getSessionsForGroup } from './sessions';

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

if (!url || !adminKey) {
  throw new Error('Missing local integration fixture configuration');
}

const admin = createClient<Database>(url, adminKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

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
      email: `integration-${randomUUID()}@example.com`,
      password: randomUUID(),
      email_confirm: true,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Test user creation returned no user');
    }

    userId = data.user.id;

    const { data: otherData, error: otherError } = await admin.auth.admin.createUser({
      email: `integration-other-${randomUUID()}@example.com`,
      password: randomUUID(),
      email_confirm: true,
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
        { group_id: groupA, user_id: userId },
        { group_id: groupB, user_id: userId },
        { group_id: otherGroup, user_id: otherUserId },
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
        },
        {
          id: earlySession,
          group_id: groupA,
          location_id: locationA,
          starts_at: '2030-06-10T18:00:00Z',
        },
        {
          id: otherSession,
          group_id: otherGroup,
          location_id: otherLocation,
          starts_at: '2030-06-01T18:00:00Z',
        },
      ])
      .throwOnError();
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
        { id: groupA, name: 'Integration A' },
        { id: groupB, name: 'Integration B' },
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
});
