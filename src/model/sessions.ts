import type { Database, Json } from './database.types';
import { type HostPositionChange, toHostPositionChangesJson } from './memberships';
import { supabase } from './supabase';

export type Session = Database['public']['Tables']['sessions']['Row'];
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
      planned_host_membership_id,
      actual_host_membership_id,
      status,
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

export type SessionLocationInput =
  { kind: 'existing'; locationId: string } | { kind: 'new'; address: string };

export type CreateSessionInput = {
  groupId: string;
  plannedHostMembershipId: string;
  startsAt: string;
  location: SessionLocationInput;
  positionChanges?: readonly HostPositionChange[];
};

export type UpdateSessionInput = {
  expectedSession: Session;
  plannedHostMembershipId: string;
  startsAt: string;
  location: SessionLocationInput;
  positionChanges?: readonly HostPositionChange[];
};

function toSessionLocationArgs(
  location: SessionLocationInput,
): { session_location_id: string } | { new_location_address: string } {
  if (location.kind === 'existing') {
    return { session_location_id: location.locationId };
  }

  return { new_location_address: location.address };
}

function toSessionStateJson(session: Session): Json {
  return {
    starts_at: session.starts_at,
    location_id: session.location_id,
    planned_host_membership_id: session.planned_host_membership_id,
    actual_host_membership_id: session.actual_host_membership_id,
    status: session.status,
  };
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const { data, error } = await supabase.rpc('create_session', {
    target_group_id: input.groupId,
    planned_host_id: input.plannedHostMembershipId,
    session_starts_at: input.startsAt,
    ...toSessionLocationArgs(input.location),
    position_changes: toHostPositionChangesJson(input.positionChanges ?? []),
  });

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error('Session creation returned no data');
  }

  return data;
}

export async function updateSession(input: UpdateSessionInput): Promise<Session> {
  const { data, error } = await supabase.rpc('update_session', {
    target_session_id: input.expectedSession.id,
    expected_session: toSessionStateJson(input.expectedSession),
    planned_host_id: input.plannedHostMembershipId,
    session_starts_at: input.startsAt,
    ...toSessionLocationArgs(input.location),
    position_changes: toHostPositionChangesJson(input.positionChanges ?? []),
  });

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error('Session update returned no data');
  }

  return data;
}

export async function cancelSession(
  expectedSession: Session,
  positionChanges: readonly HostPositionChange[] = [],
): Promise<Session> {
  const { data, error } = await supabase.rpc('cancel_session', {
    target_session_id: expectedSession.id,
    expected_session: toSessionStateJson(expectedSession),
    position_changes: toHostPositionChangesJson(positionChanges),
  });

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error('Session cancellation returned no data');
  }

  return data;
}

export async function designateActualHost(
  expectedSession: Session,
  actualHostMembershipId: string,
): Promise<Session> {
  const { data, error } = await supabase.rpc('designate_actual_host', {
    target_session_id: expectedSession.id,
    expected_session: toSessionStateJson(expectedSession),
    actual_host_id: actualHostMembershipId,
  });

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error('Actual host designation returned no data');
  }

  return data;
}

export async function confirmSession(expectedSession: Session): Promise<Session> {
  const { data, error } = await supabase.rpc('confirm_session', {
    target_session_id: expectedSession.id,
    expected_session: toSessionStateJson(expectedSession),
  });

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error('Session confirmation returned no data');
  }

  return data;
}
