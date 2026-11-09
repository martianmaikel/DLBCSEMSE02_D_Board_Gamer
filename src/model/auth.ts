import { supabase } from './supabase';

export type AuthUser = {
  id: string;
  email: string | undefined;
};

export type SignUpInput = {
  username: string;
  email: string;
  password: string;
};

export type SignUpResult = {
  user: AuthUser;
  requiresEmailConfirmation: boolean;
};

export async function signUp({ username, email, password }: SignUpInput): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Sign-up returned no user');
  }

  return {
    user: { id: data.user.id, email: data.user.email },
    requiresEmailConfirmation: data.session === null,
  };
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Sign-in returned no user');
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
}
