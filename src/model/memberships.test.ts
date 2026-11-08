/// <reference types="jest" />

import { leaveGroup, type LeaveGroupInput, type Membership } from './memberships';

const mockSingle = jest.fn();
const mockRpc = jest.fn();

jest.mock('./supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

describe('leaveGroup', () => {
  const input: LeaveGroupInput = {
    groupId: 'group-1',
    expectedJoinedAt: '2026-11-01T18:00:00Z',
    expectedAdminMembershipId: 'membership-1',
    successorMembershipId: null,
  };
  const membership: Membership = {
    id: 'membership-1',
    group_id: input.groupId,
    user_id: 'user-1',
    joined_at: input.expectedJoinedAt,
    is_active: false,
    willing_to_host: true,
    host_position: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockReturnValue({ single: mockSingle });
    mockSingle.mockReset();
  });

  it('returns the retained membership and passes the administrator successor', async () => {
    mockSingle.mockResolvedValue({
      data: { group_deleted: false, membership },
      error: null,
    });

    await expect(leaveGroup({ ...input, successorMembershipId: 'membership-2' })).resolves.toEqual({
      groupDeleted: false,
      membership,
    });
    expect(mockRpc).toHaveBeenCalledWith('leave_group', {
      target_group_id: input.groupId,
      expected_joined_at: input.expectedJoinedAt,
      expected_admin_id: input.expectedAdminMembershipId,
      successor_membership_id: 'membership-2',
    });
  });

  it('returns group deletion without a retained membership', async () => {
    mockSingle.mockResolvedValue({
      data: { group_deleted: true, membership: null },
      error: null,
    });

    await expect(leaveGroup(input)).resolves.toEqual({ groupDeleted: true, membership: null });
    expect(mockRpc).toHaveBeenCalledWith('leave_group', {
      target_group_id: input.groupId,
      expected_joined_at: input.expectedJoinedAt,
      expected_admin_id: input.expectedAdminMembershipId,
    });
  });

  it.each(['expectedJoinedAt', 'expectedAdminMembershipId'] as const)(
    'rejects an unknown %s before calling the database',
    async (field) => {
      await expect(leaveGroup({ ...input, [field]: null })).rejects.toThrow(
        'Membership joining time and group administrator must be known before leaving',
      );
      expect(mockRpc).not.toHaveBeenCalled();
    },
  );

  it('preserves database conflict errors', async () => {
    const error = { code: 'PT409', message: 'Membership or administrator changed' };
    mockSingle.mockResolvedValue({ data: null, error });

    await expect(leaveGroup(input)).rejects.toBe(error);
  });

  it.each([
    { data: null, message: 'Group departure returned no data' },
    {
      data: { group_deleted: false, membership: null },
      message: 'Group departure returned no membership',
    },
  ])('rejects an incomplete result: $message', async ({ data, message }) => {
    mockSingle.mockResolvedValue({ data, error: null });

    await expect(leaveGroup(input)).rejects.toThrow(message);
  });
});
