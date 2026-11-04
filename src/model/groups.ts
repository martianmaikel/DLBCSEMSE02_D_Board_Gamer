import type { Database } from './database.types';
import { supabase } from './supabase';

export type Group = Database['public']['Tables']['groups']['Row'];

export async function getGroupsForUser(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select(
      `
      group:groups!memberships_group_id_fkey!inner(
        id,
        name,
        admin_membership_id
      )
    `,
    )
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  return data.map((membership) => membership.group);
}

export async function createGroup(name: string): Promise<Group> {
  const { data, error } = await supabase.rpc('create_group', {
    group_name: name,
  });

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error('Group creation returned no data');
  }

  return data;
}
