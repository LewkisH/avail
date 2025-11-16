import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { requireAuth } from '@/lib/auth';

// In-memory cache with 5-minute TTL
interface CacheEntry {
  data: ClerkUserData[];
  timestamp: number;
}

interface ClerkUserData {
  id: string;
  name: string;
  imageUrl: string | null;
  email: string;
}

const userCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const REQUEST_TIMEOUT = 5000; // 5 seconds

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Get cache key from user IDs array
 */
function getCacheKey(userIds: string[]): string {
  return userIds.sort().join(',');
}

/**
 * Fetch users from Clerk with timeout
 */
async function fetchUsersWithTimeout(userIds: string[]): Promise<ClerkUserData[]> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT);
  });

  const fetchPromise = (async () => {
    const client = await clerkClient();
    const response = await client.users.getUserList({
      userId: userIds,
    });
    
    return response.data.map((user) => ({
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
      imageUrl: user.imageUrl || null,
      email: user.emailAddresses[0]?.emailAddress || '',
    }));
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
}

/**
 * GET /api/users/clerk-batch
 * Fetch multiple Clerk users in a single request
 * Query params: userIds (comma-separated list of Clerk user IDs)
 */
export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth();
  if (authResult.error) {
    return authResult.response;
  }

  // Parse userIds from query parameters
  const { searchParams } = new URL(request.url);
  const userIdsParam = searchParams.get('userIds');

  if (!userIdsParam) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAMS', message: 'userIds parameter is required' } },
      { status: 400 }
    );
  }

  const userIds = userIdsParam.split(',').filter((id) => id.trim().length > 0);

  if (userIds.length === 0) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: 'At least one user ID is required' } },
      { status: 400 }
    );
  }

  // Check cache first
  const cacheKey = getCacheKey(userIds);
  const cachedEntry = userCache.get(cacheKey);

  if (cachedEntry && isCacheValid(cachedEntry)) {
    console.log(`[clerk-batch] Cache hit for ${userIds.length} users`);
    return NextResponse.json({ users: cachedEntry.data });
  }

  // Fetch from Clerk API
  try {
    console.log(`[clerk-batch] Fetching ${userIds.length} users from Clerk API`);
    const users = await fetchUsersWithTimeout(userIds);

    // Store in cache
    userCache.set(cacheKey, {
      data: users,
      timestamp: Date.now(),
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[clerk-batch] Error fetching users from Clerk:', error);

    // Try to fetch users individually and return partial results
    const partialUsers: ClerkUserData[] = [];
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        const singleUserData = await fetchUsersWithTimeout([userId]);
        if (singleUserData.length > 0) {
          partialUsers.push(singleUserData[0]);
        }
      } catch (err) {
        console.error(`[clerk-batch] Failed to fetch user ${userId}:`, err);
        errors.push(userId);
      }
    }

    // If we got at least some users, return partial results
    if (partialUsers.length > 0) {
      console.log(`[clerk-batch] Returning partial results: ${partialUsers.length}/${userIds.length} users`);
      
      // Cache partial results
      userCache.set(cacheKey, {
        data: partialUsers,
        timestamp: Date.now(),
      });

      return NextResponse.json({
        users: partialUsers,
        partial: true,
        errors: errors.length > 0 ? `Failed to fetch ${errors.length} users` : undefined,
      });
    }

    // If all requests failed, return error
    return NextResponse.json(
      {
        error: {
          code: 'CLERK_API_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch users from Clerk',
        },
      },
      { status: 500 }
    );
  }
}
