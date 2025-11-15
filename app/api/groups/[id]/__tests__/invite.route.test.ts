import { POST } from '../invite/route';
import { requireAuth, isGroupMember } from '@/lib/auth';
import { GroupService } from '@/lib/services/group.service';
import { NextResponse } from 'next/server';

jest.mock('@/lib/auth');
jest.mock('@/lib/services/group.service');

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockIsGroupMember = isGroupMember as jest.MockedFunction<typeof isGroupMember>;
const mockInviteToGroup = GroupService.inviteToGroup as jest.MockedFunction<
  typeof GroupService.inviteToGroup
>;

describe('POST /api/groups/[id]/invite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send invitation successfully', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    };

    const mockInvitation = {
      id: 'invite_1',
      token: 'token_123',
      groupId: 'group_123',
      invitedEmail: 'friend@example.com',
      invitedBy: 'user_123',
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      group: {
        id: 'group_123',
        name: 'Test Group',
        ownerId: 'user_123',
      },
      inviter: mockUser,
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockIsGroupMember.mockResolvedValue(true);
    mockInviteToGroup.mockResolvedValue(mockInvitation as any);

    const request = new Request('http://localhost/api/groups/group_123/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'friend@example.com' }),
    });

    const params = Promise.resolve({ id: 'group_123' });
    const response = await POST(request, { params });
    const data = await response!.json();

    expect(response!.status).toBe(201);
    expect(data.invitedEmail).toBe('friend@example.com');
    expect(mockInviteToGroup).toHaveBeenCalledWith('group_123', 'friend@example.com', 'user_123');
  });

  it('should return 403 if user is not a group member', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockIsGroupMember.mockResolvedValue(false);

    const request = new Request('http://localhost/api/groups/group_123/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'friend@example.com' }),
    });

    const params = Promise.resolve({ id: 'group_123' });
    const response = await POST(request, { params });
    const data = await response!.json();

    expect(response!.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('should return 400 for invalid email', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockIsGroupMember.mockResolvedValue(true);

    const request = new Request('http://localhost/api/groups/group_123/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email' }),
    });

    const params = Promise.resolve({ id: 'group_123' });
    const response = await POST(request, { params });
    const data = await response!.json();

    expect(response!.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});
