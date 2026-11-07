import type { Database } from './database.types';
import { supabase } from './supabase';

export type Group = Database['public']['Tables']['groups']['Row'];

export async function getGroupsForUser(
  userId: string,
): Promise<Group[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('group:groups!inner(id, name)')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return data.map((membership) => membership.group);
}
