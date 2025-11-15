import { POST } from '../[token]/accept/route';
import { requireAuth } from '@/lib/auth';
import { GroupService } from '@/lib/services/group.service';
import { NextResponse } from 'next/server';

jest.mock('@/lib/auth');
jest.mock('@/lib/services/group.service');

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockAcceptInvitation = GroupService.acceptInvitation as jest.MockedFunction<
  typeof GroupService.acceptInvitation
>;

describe('POST /api/invitations/[token]/accept', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should accept invitation successfully', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    };

    const mockMembership = {
      id: 'member_1',
      groupId: 'group_123',
      userId: 'user_123',
      joinedAt: new Date(),
      group: {
        id: 'group_123',
        name: 'Test Group',
        ownerId: 'user_456',
      },
      user: mockUser,
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockAcceptInvitation.mockResolvedValue(mockMembership as any);

    const request = new Request('http://localhost/api/invitations/token_123/accept', {
      method: 'POST',
    });

    const params = Promise.resolve({ token: 'token_123' });
    const response = await POST(request, { params });
    const data = await response!.json();

    expect(response!.status).toBe(200);
    expect(data.groupId).toBe('group_123');
    expect(mockAcceptInvitation).toHaveBeenCalledWith('token_123', 'user_123');
  });

  it('should return 404 if invitation not found', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockAcceptInvitation.mockRejectedValue(new Error('Invitation not found'));

    const request = new Request('http://localhost/api/invitations/invalid_token/accept', {
      method: 'POST',
    });

    const params = Promise.resolve({ token: 'invalid_token' });
    const response = await POST(request, { params });
    const data = await response!.json();

    expect(response!.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('should return 400 if invitation expired', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockAcceptInvitation.mockRejectedValue(new Error('Invitation has expired'));

    const request = new Request('http://localhost/api/invitations/token_123/accept', {
      method: 'POST',
    });

    const params = Promise.resolve({ token: 'token_123' });
    const response = await POST(request, { params });
    const data = await response!.json();

    expect(response!.status).toBe(400);
    expect(data.error.code).toBe('INVALID_INVITATION');
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

    const request = new Request('http://localhost/api/invitations/token_123/accept', {
      method: 'POST',
    });

    const params = Promise.resolve({ token: 'token_123' });
    const response = await POST(request, { params });
    const data = await response!.json();

    expect(response!.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});
