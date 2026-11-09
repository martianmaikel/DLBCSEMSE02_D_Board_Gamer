import type { Database, Json } from './database.types';
import { supabase } from './supabase';
export type Membership = Database['public']['Tables']['memberships']['Row'];

// Current members only, including members who are not willing to host.
export async function getActiveMembersForGroup(groupId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('host_position', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

// Includes former members for historical references and admission checks.
// Row existence must never be interpreted as current membership.
export async function getMembersForGroupIncludingInactive(groupId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('group_id', groupId)
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function isActiveGroupMember(groupId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data !== null;
}

export type HostingWillingnessInput = {
  groupId: string;
  newWillingness: boolean;
  expectedWillingness: boolean;
};

export type HostPositionChange = {
  membershipId: string;
  expectedPosition: number | null;
  newPosition: number | null;
};

// Internal serialization helper, also used by session storage operations.
export function toHostPositionChangesJson(changes: readonly HostPositionChange[]): Json {
  return changes.map((change) => ({
    membership_id: change.membershipId,
    expected_position: change.expectedPosition,
    new_position: change.newPosition,
  }));
}

export async function setHostingWillingness(input: HostingWillingnessInput): Promise<Membership> {
  const { data, error } = await supabase.rpc('set_hosting_willingness', {
    target_group_id: input.groupId,
    new_willingness: input.newWillingness,
    expected_willingness: input.expectedWillingness,
  });

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error('Hosting willingness update returned no data');
  }

  return data;
}

export async function saveHostPositions(
  groupId: string,
  changes: readonly HostPositionChange[],
): Promise<Membership[]> {
  const { data, error } = await supabase.rpc('save_host_positions', {
    target_group_id: groupId,
    position_changes: toHostPositionChangesJson(changes),
  });

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error('Hosting position update returned no data');
  }

  return data;
}

export type AdmitGroupMemberInput = {
  groupId: string;
  userId: string;
  expectedMembership: Pick<Membership, 'id' | 'is_active' | 'joined_at'> | null;
};

export type LeaveGroupInput = {
  groupId: string;
  expectedJoinedAt: string | null;
  expectedAdminMembershipId: string | null;
  successorMembershipId: string | null;
};

export type LeaveGroupResult =
  { groupDeleted: false; membership: Membership } | { groupDeleted: true; membership: null };

export async function admitGroupMember(input: AdmitGroupMemberInput): Promise<Membership> {
  const expectedMembership =
    input.expectedMembership === null
      ? null
      : {
          id: input.expectedMembership.id,
          is_active: input.expectedMembership.is_active,
          joined_at: input.expectedMembership.joined_at,
        };

  const { data, error } = await supabase.rpc('admit_group_member', {
    target_group_id: input.groupId,
    target_user_id: input.userId,
    expected_membership: expectedMembership,
  });

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error('Member admission returned no data');
  }

  return data;
}

export async function leaveGroup(input: LeaveGroupInput): Promise<LeaveGroupResult> {
  if (input.expectedJoinedAt === null || input.expectedAdminMembershipId === null) {
    throw new Error('Membership joining time and group administrator must be known before leaving');
  }

  const { data, error } = await supabase
    .rpc('leave_group', {
      target_group_id: input.groupId,
      expected_joined_at: input.expectedJoinedAt,
      expected_admin_id: input.expectedAdminMembershipId,
      ...(input.successorMembershipId === null
        ? {}
        : { successor_membership_id: input.successorMembershipId }),
    })
    .single();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error('Group departure returned no data');
  }

  if (data.group_deleted) {
    return { groupDeleted: true, membership: null };
  }

  if (data.membership === null) {
    throw new Error('Group departure returned no membership');
  }

  return { groupDeleted: false, membership: data.membership };
}
