/// <reference types="jest" />

import { signIn } from './auth';

const mockSignInWithPassword = jest.fn();

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (credentials: { email: string; password: string }) =>
        mockSignInWithPassword(credentials),
    },
  },
}));

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
