/// <reference types="jest" />

import { signIn, signUp } from './index';

const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      signUp: (input: unknown) => mockSignUp(input),
      signInWithPassword: (credentials: { email: string; password: string }) =>
        mockSignInWithPassword(credentials),
    },
  },
}));

describe('signUp', () => {
  const input = { username: 'Player', email: 'player@example.com', password: 'test-password' };

  beforeEach(() => {
    mockSignUp.mockReset();
  });

  it.each([
    { session: { access_token: 'test-access-token' }, requiresEmailConfirmation: false },
    { session: null, requiresEmailConfirmation: true },
  ])(
    'returns registration with requiresEmailConfirmation=$requiresEmailConfirmation',
    async (testCase) => {
      mockSignUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: input.email, user_metadata: { username: input.username } },
          session: testCase.session,
        },
        error: null,
      });

      await expect(signUp(input)).resolves.toEqual({
        user: { id: 'user-1', email: input.email },
        requiresEmailConfirmation: testCase.requiresEmailConfirmation,
      });
      expect(mockSignUp).toHaveBeenCalledWith({
        email: input.email,
        password: input.password,
        options: { data: { username: input.username } },
      });
    },
  );

  it('throws the original registration error', async () => {
    const error = new Error('Database error saving new user');
    mockSignUp.mockResolvedValue({ data: { user: null, session: null }, error });

    await expect(signUp(input)).rejects.toBe(error);
  });

  it('rejects a response without a user', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null, session: null }, error: null });

    await expect(signUp(input)).rejects.toThrow('Sign-up returned no user');
  });
});

describe('signIn', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset();
  });

  it('returns the signed-in user without exposing the session', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'player@example.com',
          role: 'authenticated',
        },
        session: {
          access_token: 'test-access-token',
        },
      },
      error: null,
    });

    const user = await signIn('player@example.com', 'test-password');

    expect(user).toEqual({
      id: 'user-1',
      email: 'player@example.com',
    });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'player@example.com',
      password: 'test-password',
    });
  });

  it('throws the authentication error when sign-in fails', async () => {
    const error = new Error('Invalid login credentials');

    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error,
    });

    await expect(signIn('player@example.com', 'wrong-password')).rejects.toBe(error);
  });

  it('rejects a response without a user', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    await expect(signIn('player@example.com', 'test-password')).rejects.toThrow(
      'Sign-in returned no user',
    );
  });
});
