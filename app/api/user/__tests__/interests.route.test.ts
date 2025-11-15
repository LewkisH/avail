import { PUT } from '../interests/route';
import { requireAuth } from '@/lib/auth';
import { UserService } from '@/lib/services/user.service';
import { NextResponse } from 'next/server';

// Mock the modules
jest.mock('@/lib/auth');
jest.mock('@/lib/services/user.service');

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockUpdateUserInterests = UserService.updateUserInterests as jest.MockedFunction<
  typeof UserService.updateUserInterests
>;

describe('PUT /api/user/interests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update user interests successfully', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      interests: [
        { id: 'int_1', userId: 'user_123', interest: 'hiking', createdAt: new Date() },
        { id: 'int_2', userId: 'user_123', interest: 'cycling', createdAt: new Date() },
      ],
      budget: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockUpdateUserInterests.mockResolvedValue(mockUser as any);

    const request = new Request('http://localhost/api/user/interests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: ['hiking', 'cycling'] }),
    });

    const response = await PUT(request);
    const data = await response!.json();

    expect(response!.status).toBe(200);
    expect(data.interests).toEqual(['hiking', 'cycling']);
    expect(mockUpdateUserInterests).toHaveBeenCalledWith('user_123', ['hiking', 'cycling']);
  });

  it('should handle empty interests array', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      interests: [],
      budget: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockUpdateUserInterests.mockResolvedValue(mockUser as any);

    const request = new Request('http://localhost/api/user/interests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: [] }),
    });

    const response = await PUT(request);
    const data = await response!.json();

    expect(response!.status).toBe(200);
    expect(data.interests).toEqual([]);
  });

  it('should return 400 for invalid input - interests not an array', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      interests: [],
      budget: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    const request = new Request('http://localhost/api/user/interests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: 'not-an-array' }),
    });

    const response = await PUT(request);
    const data = await response!.json();

    expect(response!.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for too many interests', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      interests: [],
      budget: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    const tooManyInterests = Array.from({ length: 51 }, (_, i) => `interest${i}`);

    const request = new Request('http://localhost/api/user/interests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: tooManyInterests }),
    });

    const response = await PUT(request);
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

    const request = new Request('http://localhost/api/user/interests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: ['hiking'] }),
    });

    const response = await PUT(request);
    const data = await response!.json();

    expect(response!.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 500 if service throws error', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      interests: [],
      budget: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockUpdateUserInterests.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost/api/user/interests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: ['hiking'] }),
    });

    const response = await PUT(request);
    const data = await response!.json();

    expect(response!.status).toBe(500);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});
