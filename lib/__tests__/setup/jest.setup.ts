import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Create the mock
export const prismaMock = mockDeep<PrismaClient>();

// Mock the prisma module
jest.mock('../../prisma', () => ({
  __esModule: true,
  prisma: prismaMock,
}));

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});
