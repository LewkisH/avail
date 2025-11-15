import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class UserService {
  /**
   * Create a new user in the database
   * Used by Clerk webhook when a new user signs up
   * @param clerkId - Clerk user ID
   * @param email - User email
   * @param name - User name
   * @returns Created user
   */
  static async createUser(clerkId: string, email: string, name: string) {
    return await prisma.user.create({
      data: {
        id: clerkId,
        email,
        name,
      },
    });
  }

  /**
   * Get user by ID with all related data
   * @param userId - User ID (Clerk ID)
   * @returns User with interests and budget, or null if not found
   */
  static async getUserById(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: true,
        budget: true,
      },
    });
  }

  /**
   * Update user interests
   * Replaces all existing interests with new ones
   * @param userId - User ID
   * @param interests - Array of interest strings
   * @returns Updated user with interests
   */
  static async updateUserInterests(userId: string, interests: string[]) {
    // Delete existing interests and create new ones in a transaction
    return await prisma.$transaction(async (tx) => {
      // Delete all existing interests
      await tx.userInterest.deleteMany({
        where: { userId },
      });

      // Create new interests
      if (interests.length > 0) {
        await tx.userInterest.createMany({
          data: interests.map((interest) => ({
            userId,
            interest,
          })),
        });
      }

      // Return updated user with interests
      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          interests: true,
          budget: true,
        },
      });
    });
  }

  /**
   * Update user budget range
   * Creates or updates the user's budget preferences
   * @param userId - User ID
   * @param minBudget - Minimum budget
   * @param maxBudget - Maximum budget
   * @param currency - Currency code (default: EUR)
   * @returns Updated user with budget
   */
  static async updateUserBudget(
    userId: string,
    minBudget: number,
    maxBudget: number,
    currency: string = 'EUR'
  ) {
    // Upsert budget (create if doesn't exist, update if exists)
    await prisma.userBudget.upsert({
      where: { userId },
      create: {
        userId,
        minBudget: new Prisma.Decimal(minBudget),
        maxBudget: new Prisma.Decimal(maxBudget),
        currency,
      },
      update: {
        minBudget: new Prisma.Decimal(minBudget),
        maxBudget: new Prisma.Decimal(maxBudget),
        currency,
      },
    });

    // Return updated user with budget
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: true,
        budget: true,
      },
    });
  }
}
