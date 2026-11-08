/// <reference types="jest" />

import {
  cancelSession,
  confirmSession,
  createSession,
  designateActualHost,
  getSessionsForGroup,
  type Session,
  updateSession,
} from './sessions';

const mockOrder = jest.fn();
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockRpc = jest.fn();

jest.mock('./supabase', () => ({
  supabase: {
    from: () => mockFrom(),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

describe('getSessionsForGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrder.mockReset();
  });

  it('returns sessions with their locations for the requested group', async () => {
    const sessions = [
      {
        id: 'session-1',
        group_id: 'group-1',
        location_id: 'location-1',
        starts_at: '2026-11-10T18:00:00+00:00',
        duration_minutes: 120,
        location: {
          id: 'location-1',
          group_id: 'group-1',
          address: 'Teststraße 10, Berlin',
        },
      },
    ];

    mockOrder.mockResolvedValue({
      data: sessions,
      error: null,
    });

    const result = await getSessionsForGroup('group-1');

    expect(result).toEqual(sessions);
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('duration_minutes'));
    expect(mockEq).toHaveBeenCalledWith('group_id', 'group-1');
    expect(mockOrder).toHaveBeenCalledWith('starts_at', {
      ascending: true,
    });
  });

  it('returns an empty list when the group has no sessions', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
    });

    await expect(getSessionsForGroup('group-1')).resolves.toEqual([]);
  });

  it('throws the database error when the request fails', async () => {
    const error = new Error('Database unavailable');

    mockOrder.mockResolvedValue({
      data: null,
      error,
    });

    await expect(getSessionsForGroup('group-1')).rejects.toBe(error);
  });
});

describe('session storage arguments', () => {
  const session: Session = {
    id: 'session-1',
    group_id: 'group-1',
    location_id: 'location-1',
    starts_at: '2026-11-10T18:00:00+00:00',
    duration_minutes: 120,
    planned_host_membership_id: 'member-1',
    actual_host_membership_id: null,
    status: 'scheduled',
  };

  beforeEach(() => {
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: session, error: null });
  });

  it('passes the required duration to session creation', async () => {
    await expect(
      createSession({
        groupId: session.group_id,
        plannedHostMembershipId: 'member-1',
        startsAt: session.starts_at,
        durationMinutes: 180,
        location: { kind: 'new', address: 'Test address' },
      }),
    ).resolves.toEqual(session);

    expect(mockRpc).toHaveBeenCalledWith('create_session', {
      target_group_id: session.group_id,
      planned_host_id: 'member-1',
      session_starts_at: session.starts_at,
      session_duration_minutes: 180,
      new_location_address: 'Test address',
      position_changes: [],
    });
  });

  it.each([120, null])('includes duration %s in every session snapshot', async (duration) => {
    const expectedSession = { ...session, duration_minutes: duration };
    const expectedState = {
      starts_at: session.starts_at,
      duration_minutes: duration,
      location_id: session.location_id,
      planned_host_membership_id: session.planned_host_membership_id,
      actual_host_membership_id: session.actual_host_membership_id,
      status: session.status,
    };

    await updateSession({
      expectedSession,
      plannedHostMembershipId: 'member-1',
      startsAt: session.starts_at,
      durationMinutes: 240,
      location: { kind: 'existing', locationId: session.location_id },
    });

    expect(mockRpc).toHaveBeenLastCalledWith('update_session', {
      target_session_id: session.id,
      expected_session: expectedState,
      planned_host_id: 'member-1',
      session_starts_at: session.starts_at,
      session_duration_minutes: 240,
      session_location_id: session.location_id,
      position_changes: [],
    });

    await cancelSession(expectedSession);
    expect(mockRpc).toHaveBeenLastCalledWith('cancel_session', {
      target_session_id: session.id,
      expected_session: expectedState,
      position_changes: [],
    });

    await designateActualHost(expectedSession, 'member-2');
    expect(mockRpc).toHaveBeenLastCalledWith('designate_actual_host', {
      target_session_id: session.id,
      expected_session: expectedState,
      actual_host_id: 'member-2',
    });

    await confirmSession(expectedSession);
    expect(mockRpc).toHaveBeenLastCalledWith('confirm_session', {
      target_session_id: session.id,
      expected_session: expectedState,
    });
  });
});
