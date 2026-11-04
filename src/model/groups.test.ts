/// <reference types="jest" />

import { getGroupsForUser, type Group } from './groups';

const mockEq = jest.fn();
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('./supabase', () => ({
  supabase: {
    from: () => mockFrom(),
  },
}));

describe('getGroupsForUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockReset();

    // The first filter returns a query that accepts the second filter.
    mockEq.mockReturnValueOnce({ eq: mockEq });
  });

  it('returns groups through active memberships for the requested user', async () => {
    const expectedGroups: Group[] = [
      {
        id: 'group-a',
        name: 'Gruppe A',
        admin_membership_id: 'membership-a',
      },
      {
        id: 'group-b',
        name: 'Gruppe B',
        admin_membership_id: 'membership-b',
      },
    ];

    mockEq.mockResolvedValueOnce({
      data: expectedGroups.map((group) => ({ group })),
      error: null,
    });

    await expect(getGroupsForUser('user-1')).resolves.toEqual(expectedGroups);

    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockEq).toHaveBeenCalledWith('is_active', true);
  });

  it('returns an empty list when the user has no visible active memberships', async () => {
    mockEq.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await expect(getGroupsForUser('user-1')).resolves.toEqual([]);
  });

  it('throws the database error when the request fails', async () => {
    const error = new Error('Database unavailable');

    mockEq.mockResolvedValueOnce({
      data: null,
      error,
    });

    await expect(getGroupsForUser('user-1')).rejects.toBe(error);
  });
});
