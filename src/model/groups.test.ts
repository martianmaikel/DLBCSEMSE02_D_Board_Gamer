/// <reference types="jest" />

import { getGroupsForUser } from './groups';

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
  });

  it('returns the groups for the requested user', async () => {
    mockEq.mockResolvedValue({
      data: [
        { group: { id: 'group-a', name: 'Gruppe A' } },
        { group: { id: 'group-b', name: 'Gruppe B' } },
      ],
      error: null,
    });

    const groups = await getGroupsForUser('user-1');

    expect(groups).toEqual([
      { id: 'group-a', name: 'Gruppe A' },
      { id: 'group-b', name: 'Gruppe B' },
    ]);
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('returns an empty list when the user has no groups', async () => {
    mockEq.mockResolvedValue({
      data: [],
      error: null,
    });

    await expect(getGroupsForUser('user-1')).resolves.toEqual([]);
  });

  it('throws the database error when the request fails', async () => {
    const error = new Error('Database unavailable');

    mockEq.mockResolvedValue({
      data: null,
      error,
    });

    await expect(getGroupsForUser('user-1')).rejects.toBe(error);
  });
});
