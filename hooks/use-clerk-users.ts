import { useState, useEffect, useRef } from 'react';

interface ClerkUser {
  id: string;
  name: string;
  imageUrl: string | null;
  email: string;
}

interface CacheEntry {
  users: Map<string, ClerkUser>;
  timestamp: number;
}

// Global cache shared across all hook instances
const globalCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const BATCH_DELAY = 100; // 100ms debounce
const MAX_BATCH_SIZE = 50; // Clerk API limit

// Pending requests queue for batching
let pendingUserIds = new Set<string>();
let batchTimeout: NodeJS.Timeout | null = null;
let pendingCallbacks = new Map<string, Array<(user: ClerkUser | null) => void>>();

/**
 * Custom hook to fetch Clerk user data with batching and caching
 * @param userIds Array of Clerk user IDs to fetch
 * @returns Object containing users Map, loading state, and error state
 */
export function useClerkUsers(userIds: string[]) {
  const [users, setUsers] = useState<Map<string, ClerkUser>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setUsers(new Map());
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first
        const cachedUsers = new Map<string, ClerkUser>();
        const uncachedUserIds: string[] = [];
        const now = Date.now();

        for (const userId of userIds) {
          const cached = globalCache.get(userId);
          if (cached && now - cached.timestamp < CACHE_TTL) {
            // Cache hit - use cached data
            const user = cached.users.get(userId);
            if (user) {
              cachedUsers.set(userId, user);
            }
          } else {
            // Cache miss or expired
            uncachedUserIds.push(userId);
          }
        }

        // If all users are cached, return immediately
        if (uncachedUserIds.length === 0) {
          if (mountedRef.current) {
            setUsers(cachedUsers);
            setLoading(false);
          }
          return;
        }

        // Fetch uncached users with batching
        const fetchedUsers = await fetchUsersWithBatching(uncachedUserIds);

        // Update cache with fetched users
        const timestamp = Date.now();
        for (const [userId, user] of fetchedUsers.entries()) {
          globalCache.set(userId, {
            users: new Map([[userId, user]]),
            timestamp,
          });
        }

        // Merge cached and fetched users
        const allUsers = new Map([...cachedUsers, ...fetchedUsers]);

        if (mountedRef.current) {
          setUsers(allUsers);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching Clerk users:', err);
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to fetch users'));
          setLoading(false);
        }
      }
    };

    fetchUsers();
  }, [JSON.stringify(userIds.sort())]); // Stable dependency

  return { users, loading, error };
}

/**
 * Fetches users with batching logic
 * Splits large requests into multiple batches and merges results
 */
async function fetchUsersWithBatching(userIds: string[]): Promise<Map<string, ClerkUser>> {
  const allUsers = new Map<string, ClerkUser>();

  // Split into batches of MAX_BATCH_SIZE
  const batches: string[][] = [];
  for (let i = 0; i < userIds.length; i += MAX_BATCH_SIZE) {
    batches.push(userIds.slice(i, i + MAX_BATCH_SIZE));
  }

  // Fetch all batches in parallel
  const batchPromises = batches.map(batch => fetchBatch(batch));
  const batchResults = await Promise.all(batchPromises);

  // Merge results from all batches
  for (const batchUsers of batchResults) {
    for (const [userId, user] of batchUsers.entries()) {
      allUsers.set(userId, user);
    }
  }

  return allUsers;
}

/**
 * Fetches a single batch of users from the API
 */
async function fetchBatch(userIds: string[]): Promise<Map<string, ClerkUser>> {
  if (userIds.length === 0) {
    return new Map();
  }

  try {
    const response = await fetch(
      `/api/users/clerk-batch?userIds=${userIds.join(',')}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    const data = await response.json();
    const usersMap = new Map<string, ClerkUser>();

    if (data.users && Array.isArray(data.users)) {
      for (const user of data.users) {
        usersMap.set(user.id, user);
      }
    }

    return usersMap;
  } catch (error) {
    console.error('Error fetching batch:', error);
    // Return empty map on error - component will handle gracefully
    return new Map();
  }
}

/**
 * Debounced batch fetching (for future optimization)
 * This function can be used to collect multiple requests and batch them together
 */
export function queueUserFetch(userId: string): Promise<ClerkUser | null> {
  return new Promise((resolve) => {
    // Add to pending queue
    pendingUserIds.add(userId);

    // Add callback to pending callbacks
    if (!pendingCallbacks.has(userId)) {
      pendingCallbacks.set(userId, []);
    }
    pendingCallbacks.get(userId)!.push(resolve);

    // Clear existing timeout
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }

    // Set new timeout to process batch
    batchTimeout = setTimeout(async () => {
      const idsToFetch = Array.from(pendingUserIds);
      const callbacks = new Map(pendingCallbacks);

      // Clear pending state
      pendingUserIds.clear();
      pendingCallbacks.clear();
      batchTimeout = null;

      // Fetch users
      try {
        const users = await fetchUsersWithBatching(idsToFetch);

        // Resolve all callbacks
        for (const [userId, userCallbacks] of callbacks.entries()) {
          const user = users.get(userId) || null;
          for (const callback of userCallbacks) {
            callback(user);
          }
        }
      } catch (error) {
        console.error('Error in batch fetch:', error);
        // Resolve all callbacks with null
        for (const userCallbacks of callbacks.values()) {
          for (const callback of userCallbacks) {
            callback(null);
          }
        }
      }
    }, BATCH_DELAY);
  });
}
