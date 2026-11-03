/// <reference types="jest" />

import { getSessionsForGroup } from './sessions';

const mockOrder = jest.fn();
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('./supabase', () => ({
  supabase: {
    from: () => mockFrom(),
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
