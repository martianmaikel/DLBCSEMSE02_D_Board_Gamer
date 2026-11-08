import type { Database } from './database.types';
import { supabase } from './supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export async function getOwnProfile(): Promise<Profile | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveOwnProfile(username: string): Promise<Profile> {
  const { data, error } = await supabase.rpc('save_own_profile', {
    profile_username: username,
  });

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error('Profile save returned no data');
  }

  return data;
}

export async function getActiveMemberProfilesForGroup(groupId: string): Promise<Profile[]> {
  const { data, error } = await supabase.rpc('get_active_member_profiles', {
    target_group_id: groupId,
  });

  if (error) {
    throw error;
  }

  return data;
}
