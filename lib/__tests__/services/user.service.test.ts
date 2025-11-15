import { UserService } from '../../services/user.service';
import { prismaMock } from '../setup/prisma-mock';
import { Prisma } from '@prisma/client';

describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user', async () => {
      const mockUser = {
        id: 'clerk_123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await UserService.createUser(
        'clerk_123',
        'test@example.com',
        'Test User'
      );

      expect(result).toEqual(mockUser);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          id: 'clerk_123',
          email: 'test@example.com',
          name: 'Test User',
        },
      });
    });
  });

  describe('getUserById', () => {
    it('should return user with interests and budget', async () => {
      const mockUser = {
        id: 'clerk_123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
        interests: [
          {
            id: 'int_1',
            userId: 'clerk_123',
            interest: 'hiking',
            createdAt: new Date(),
          },
        ],
        budget: {
          id: 'budget_1',
          userId: 'clerk_123',
          minBudget: new Prisma.Decimal(10),
          maxBudget: new Prisma.Decimal(50),
          currency: 'EUR',
          updatedAt: new Date(),
        },
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserService.getUserById('clerk_123');

      expect(result).toEqual(mockUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'clerk_123' },
        include: {
          interests: true,
          budget: true,
        },
      });
    });

    it('should return null if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await UserService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateUserInterests', () => {
    it('should replace user interests', async () => {
      const mockUser = {
        id: 'clerk_123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
        interests: [
          {
            id: 'int_1',
            userId: 'clerk_123',
            interest: 'hiking',
            createdAt: new Date(),
          },
          {
            id: 'int_2',
            userId: 'clerk_123',
            interest: 'cycling',
            createdAt: new Date(),
          },
        ],
        budget: null,
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });

      prismaMock.userInterest.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.userInterest.createMany.mockResolvedValue({ count: 2 });
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserService.updateUserInterests('clerk_123', [
        'hiking',
        'cycling',
      ]);

      expect(result).toEqual(mockUser);
      expect(prismaMock.userInterest.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'clerk_123' },
      });
      expect(prismaMock.userInterest.createMany).toHaveBeenCalled();
    });
  });

  describe('updateUserBudget', () => {
    it('should create or update user budget', async () => {
      const mockUser = {
        id: 'clerk_123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
        interests: [],
        budget: {
          id: 'budget_1',
          userId: 'clerk_123',
          minBudget: new Prisma.Decimal(20),
          maxBudget: new Prisma.Decimal(100),
          currency: 'USD',
          updatedAt: new Date(),
        },
      };

      prismaMock.userBudget.upsert.mockResolvedValue(mockUser.budget);
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserService.updateUserBudget(
        'clerk_123',
        20,
        100,
        'USD'
      );

      expect(result).toEqual(mockUser);
      expect(prismaMock.userBudget.upsert).toHaveBeenCalled();
    });
  });
});
