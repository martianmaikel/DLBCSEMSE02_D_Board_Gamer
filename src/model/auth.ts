import { supabase } from './supabase';

export type AuthUser = {
  id: string;
  email: string | undefined;
};

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
