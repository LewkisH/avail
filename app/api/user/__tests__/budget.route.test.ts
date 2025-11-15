import { PUT } from '../budget/route';
import { requireAuth } from '@/lib/auth';
import { UserService } from '@/lib/services/user.service';
import { NextResponse } from 'next/server';

// Mock the modules
jest.mock('@/lib/auth');
jest.mock('@/lib/services/user.service');

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockUpdateUserBudget = UserService.updateUserBudget as jest.MockedFunction<
  typeof UserService.updateUserBudget
>;

describe('PUT /api/user/budget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update user budget successfully', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      interests: [],
      budget: {
        id: 'budget_1',
        userId: 'user_123',
        minBudget: 20,
        maxBudget: 100,
        currency: 'USD',
        updatedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockUpdateUserBudget.mockResolvedValue(mockUser as any);

    const request = new Request('http://localhost/api/user/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minBudget: 20,
        maxBudget: 100,
        currency: 'USD',
      }),
    });

    const response = await PUT(request);
    const data = await response!.json();

    expect(response!.status).toBe(200);
    expect(data.budget).toEqual({
      min: 20,
      max: 100,
      currency: 'USD',
    });
    expect(mockUpdateUserBudget).toHaveBeenCalledWith('user_123', 20, 100, 'USD');
  });

  it('should use default currency EUR if not provided', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      interests: [],
      budget: {
        id: 'budget_1',
        userId: 'user_123',
        minBudget: 10,
        maxBudget: 50,
        currency: 'EUR',
        updatedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRequireAuth.mockResolvedValue({
      error: false,
      user: mockUser as any,
    });

    mockUpdateUserBudget.mockResolvedValue(mockUser as any);

    const request = new Request('http://localhost/api/user/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minBudget: 10,
        maxBudget: 50,
      }),
    });

    const response = await PUT(request);
    const data = await response!.json();

    expect(response!.status).toBe(200);
    expect(data.budget.currency).toBe('EUR');
    expect(mockUpdateUserBudget).toHaveBeenCalledWith('user_123', 10, 50, 'EUR');
  });

  it('should return 400 if maxBudget is less than minBudget', async () => {
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

    const request = new Request('http://localhost/api/user/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minBudget: 100,
        maxBudget: 50,
        currency: 'EUR',
      }),
    });

    const response = await PUT(request);
    const data = await response!.json();

    expect(response!.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for negative budget values', async () => {
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

    const request = new Request('http://localhost/api/user/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minBudget: -10,
        maxBudget: 50,
        currency: 'EUR',
      }),
    });

    const response = await PUT(request);
    const data = await response!.json();

    expect(response!.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid currency code', async () => {
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

    const request = new Request('http://localhost/api/user/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minBudget: 10,
        maxBudget: 50,
        currency: 'INVALID',
      }),
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

    const request = new Request('http://localhost/api/user/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minBudget: 10,
        maxBudget: 50,
        currency: 'EUR',
      }),
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

    mockUpdateUserBudget.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost/api/user/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minBudget: 10,
        maxBudget: 50,
        currency: 'EUR',
      }),
    });

    const response = await PUT(request);
    const data = await response!.json();

    expect(response!.status).toBe(500);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});
