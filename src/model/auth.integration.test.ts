import { randomUUID } from 'node:crypto';

import { getOwnProfile, signUp, type SignUpInput } from './index';
import { supabase } from './supabase';
import { createUs2Fixtures } from './test-support/us2-fixtures';

jest.mock('./supabase', () => {
  const { createLocalSupabaseMock } = jest.requireActual<
    typeof import('./test-support/local-supabase')
  >('./test-support/local-supabase');

  return createLocalSupabaseMock();
});

let fixtures: ReturnType<typeof createUs2Fixtures>;
let attemptedEmails: Set<string>;

function registrationInput(): SignUpInput {
  const id = randomUUID();
  const email = `signup-${id}@example.com`;
  attemptedEmails.add(email);
  return { username: `Player-${id}`, email, password: randomUUID() };
}

async function listAccounts() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await fixtures.fixtureAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      throw error;
    }
    users.push(...data.users);
    if (data.users.length < 1000) {
      return users;
    }
  }
}

async function readRegistrationState() {
  const users = await listAccounts();
  const { data: profiles } = await fixtures.fixtureAdmin
    .from('profiles')
    .select('*')
    .order('id')
    .throwOnError();
  return { userIds: users.map((user) => user.id).sort(), profiles };
}

describe('Registration with local Supabase', () => {
  beforeEach(() => {
    fixtures = createUs2Fixtures();
    attemptedEmails = new Set();
  });

  afterEach(async () => {
    await supabase.auth.signOut();
    // Also clean up unexpected partial accounts when a rollback assertion fails.
    for (const user of await listAccounts()) {
      if (user.email && attemptedEmails.has(user.email)) {
        const { error } = await fixtures.fixtureAdmin.auth.admin.deleteUser(user.id);
        if (error) {
          throw error;
        }
      }
    }
    await fixtures.cleanup();
  });

  it('registers with metadata and an automatically created, trimmed profile', async () => {
    const input = registrationInput();
    const result = await signUp({ ...input, username: ` \t${input.username}\n ` });

    expect(result).toEqual({
      user: { id: expect.any(String), email: input.email },
      // The existing local Auth configuration has email confirmations disabled.
      requiresEmailConfirmation: false,
    });
    await expect(getOwnProfile()).resolves.toEqual({
      id: result.user.id,
      username: input.username,
    });
    const { data, error } = await fixtures.fixtureAdmin.auth.admin.getUserById(result.user.id);
    expect(error).toBeNull();
    expect(data.user?.user_metadata.username).toBe(` \t${input.username}\n `);
  });

  it.each(['', '   ', '\t\n\r'])(
    'rejects blank username %j without partial data',
    async (username) => {
      const input = registrationInput();
      const before = await readRegistrationState();

      await expect(signUp({ ...input, username })).rejects.toMatchObject({
        name: 'AuthRetryableFetchError',
        status: 500,
        message: 'Database error saving new user',
      });

      expect(await readRegistrationState()).toEqual(before);
    },
  );

  it.each([{}, { username: null }])(
    'rejects missing username metadata %j even when bypassing the Model',
    async (metadata) => {
      const input = registrationInput();
      const before = await readRegistrationState();
      const { data, error } = await fixtures.anonymousClient.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: metadata },
      });

      expect(error).toMatchObject({
        name: 'AuthRetryableFetchError',
        status: 500,
        message: 'Database error saving new user',
      });
      expect(data.user).toBeNull();
      expect(await readRegistrationState()).toEqual(before);
    },
  );

  it('rejects a case-insensitive duplicate atomically and allows retrying the same email', async () => {
    const firstInput = registrationInput();
    const first = await signUp(firstInput);
    await supabase.auth.signOut();
    const secondInput = registrationInput();
    const before = await readRegistrationState();

    await expect(
      signUp({ ...secondInput, username: ` \t${firstInput.username.toUpperCase()}\n ` }),
    ).rejects.toMatchObject({
      name: 'AuthRetryableFetchError',
      status: 500,
      message: 'Database error saving new user',
    });
    expect(await readRegistrationState()).toEqual(before);

    const second = await signUp(secondInput);
    expect(second.user.id).not.toBe(first.user.id);
    await expect(getOwnProfile()).resolves.toEqual({
      id: second.user.id,
      username: secondInput.username,
    });
  });
});
