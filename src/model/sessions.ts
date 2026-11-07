import type { Database } from './database.types';
import { supabase } from './supabase';

type Session = Database['public']['Tables']['sessions']['Row'];
type Location = Database['public']['Tables']['locations']['Row'];

export type SessionWithLocation = Session & {
  location: Location;
};

export async function getSessionsForGroup(groupId: string): Promise<SessionWithLocation[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(
      `
      id,
      group_id,
      location_id,
      starts_at,
      location:locations!inner(id, group_id, address)
    `,
    )
    .eq('group_id', groupId)
    .order('starts_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}
