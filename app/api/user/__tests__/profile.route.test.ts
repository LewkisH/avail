import { GET } from '../profile/route';
import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Mock the auth module
jest.mock('@/lib/auth');

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

describe('GET /api/user/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user profile with interests and budget', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      interests: [
        { id: 'int_1', userId: 'user_123', interest: 'hiking', createdAt: new Date() },
        { id: 'int_2', userId: 'user_123', interest: 'cycling', createdAt: new Date() },
      ],
      budget: {
        id: 'budget_1',
        userId: 'user_123',
        minBudget: 10,
        maxBudget: 50,
        currency: 'EUR',
        updatedAt: new Date(),
      },
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      interests: ['hiking', 'cycling'],
      budget: {
        min: 10,
        max: 50,
        currency: 'EUR',
      },
      createdAt: mockUser.createdAt.toISOString(),
      updatedAt: mockUser.updatedAt.toISOString(),
    });
  });

  it('should return user profile without budget', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      interests: [],
      budget: null,
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.budget).toBeNull();
    expect(data.interests).toEqual([]);
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
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 404 if user is not found', async () => {
    mockRequireAuth.mockResolvedValue({
      error: false,
      user: undefined as any,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('USER_NOT_FOUND');
  });
});
