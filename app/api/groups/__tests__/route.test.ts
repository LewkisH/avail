import { POST, GET } from '../route';
import { requireAuth } from '@/lib/auth';
import { GroupService } from '@/lib/services/group.service';
import { NextResponse } from 'next/server';

jest.mock('@/lib/auth');
jest.mock('@/lib/services/group.service');

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockCreateGroup = GroupService.createGroup as jest.MockedFunction<
  typeof GroupService.createGroup
>;
const mockGetUserGroups = GroupService.getUserGroups as jest.MockedFunction<
  typeof GroupService.getUserGroups
>;

describe('POST /api/groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a group successfully', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    };

    const mockGroup = {
      id: 'group_123',
      name: 'Test Group',
      ownerId: 'user_123',
      createdAt: new Date(),
      owner: mockUser,
      members: [
        {
          id: 'member_1',
          groupId: 'group_123',
          userId: 'user_123',
          joinedAt: new Date(),
          user: mockUser,
        },
      ],
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockCreateGroup.mockResolvedValue(mockGroup as any);

    const request = new Request('http://localhost/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Group' }),
    });

    const response = await POST(request);
    const data = await response!.json();

    expect(response!.status).toBe(201);
    expect(data.name).toBe('Test Group');
    expect(mockCreateGroup).toHaveBeenCalledWith('user_123', 'Test Group');
  });

  it('should return 400 if name is missing', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    const request = new Request('http://localhost/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    const response = await POST(request);
    const data = await response!.json();

    expect(response!.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 if user is not authenticated', async () => {
    const errorResponse = NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );

    mockRequireAuth.mockResolvedValue({
      error: true,
      response: errorResponse,
    });

    const request = new Request('http://localhost/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Group' }),
    });

    const response = await POST(request);
    const data = await response!.json();

    expect(response!.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user groups successfully', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    };

    const mockGroups = [
      {
        id: 'group_1',
        name: 'Group 1',
        ownerId: 'user_123',
        createdAt: new Date(),
        owner: mockUser,
        members: [],
      },
      {
        id: 'group_2',
        name: 'Group 2',
        ownerId: 'user_456',
        createdAt: new Date(),
        owner: { id: 'user_456', name: 'Other User', email: 'other@example.com' },
        members: [],
      },
    ];

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockGetUserGroups.mockResolvedValue(mockGroups as any);

    const response = await GET();
    const data = await response!.json();

    expect(response!.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(mockGetUserGroups).toHaveBeenCalledWith('user_123');
  });

  it('should return 401 if user is not authenticated', async () => {
    const errorResponse = NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );

    mockRequireAuth.mockResolvedValue({
      error: true,
      response: errorResponse,
    });

    const response = await GET();
    const data = await response!.json();

    expect(response!.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});
