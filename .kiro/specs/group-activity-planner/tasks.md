# Implementation Plan

- [x] 1. Initialize Next.js project and configure core dependencies
  - Create Next.js 14+ project with TypeScript and App Router
  - Install and configure Tailwind CSS
  - Set up shadcn/ui components
  - Configure ESLint and Prettier
  - _Requirements: 7, 8_

- [x] 2. Set up PostgreSQL database and ORM
  - [x] 2.1 Configure database connection for dev and prod environments
    - Set up local PostgreSQL database for development (Docker or local install)
    - Set up Vercel Postgres or Neon database for production
    - Create DATABASE_URL environment variable in .env.local for dev
    - Configure DATABASE_URL in Vercel environment variables for prod
    - Install Prisma ORM
    - Initialize Prisma with PostgreSQL provider
    - Add .env.local to .gitignore
    - _Requirements: 8_
  
  - [x] 2.2 Define Prisma schema for core models
    - Create User model with Clerk ID as primary key
    - Create UserInterest model with user relationship
    - Create UserBudget model with EUR default currency
    - Create Group model with owner relationship
    - Create GroupMember model with composite unique constraint
    - Create GroupInvitation model with status enum
    - _Requirements: 1, 2, 3, 8_
  
  - [x] 2.3 Define Prisma schema for calendar and event models
    - Create CalendarEvent model with unified event interface fields
    - Create GoogleCalendarToken model for OAuth token storage
    - Create ExternalEvent model with EUR default currency
    - Create ActivitySuggestion model
    - Add appropriate indexes for query optimization
    - _Requirements: 4, 5, 6, 7, 8_
  
  - [x] 2.4 Run initial database migration
    - Generate Prisma migration files
    - Apply migration to local dev database
    - Test migration on production database (or staging)
    - Generate Prisma Client
    - Verify database schema creation in both environments
    - Add migration scripts to package.json
    - _Requirements: 8_

- [x] 3. Integrate Clerk authentication
  - [x] 3.1 Set up Clerk in Next.js
    - Install @clerk/nextjs package
    - Add Clerk environment variables (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY)
    - Configure ClerkProvider in root layout
    - Create middleware.ts for route protection
    - _Requirements: 1_
  
  - [x] 3.2 Implement Clerk webhook handler
    - Create API route at /api/webhooks/clerk
    - Verify webhook signature using CLERK_WEBHOOK_SECRET
    - Handle user.created event to create User record in database
    - Handle user.updated event to sync user data
    - Handle user.deleted event to clean up user data
    - _Requirements: 1_
  
  - [x] 3.3 Create authentication utilities
    - Create lib/auth.ts with helper functions
    - Implement getCurrentUser() to fetch authenticated user
    - Implement requireAuth() middleware for API routes
    - Create user sync utility functions
    - _Requirements: 1_
  
  - [x] 3.4 Build authentication UI components
    - Create sign-in page using Clerk components
    - Create sign-up page using Clerk components
    - Add user profile button with sign-out functionality
    - Implement protected route layouts
    - _Requirements: 1_

- [x] 4. Create database service layer
  - [x] 4.1 Implement UserService
    - Create lib/services/user.service.ts
    - Implement createUser(clerkId, email, name)
    - Implement getUserById(userId)
    - Implement updateUserInterests(userId, interests)
    - Implement updateUserBudget(userId, minBudget, maxBudget, currency)
    - _Requirements: 1, 3_
  
  - [x] 4.2 Implement GroupService
    - Create lib/services/group.service.ts
    - Implement createGroup(ownerId, name)
    - Implement inviteToGroup(groupId, email, invitedBy)
    - Implement acceptInvitation(token, userId)
    - Implement getGroupMembers(groupId)
    - Implement leaveGroup(groupId, userId)
    - Implement getUserGroups(userId)
    - _Requirements: 2_

- [x] 5. Build user profile management API and UI
  - [x] 5.1 Create user profile API routes
    - Create GET /api/user/profile to fetch current user data
    - Create PUT /api/user/interests to update interests
    - Create PUT /api/user/budget to update budget range
    - Add input validation using Zod schemas
    - _Requirements: 3_
  
  - [x] 5.2 Build user profile UI
    - Create profile page with shadcn/ui components
    - Build interests management form with multi-select
    - Build budget range input with currency selector (default EUR)
    - Add form validation and error handling
    - Display success/error toast notifications
    - _Requirements: 3_

- [x] 6. Implement group management features
  - [x] 6.1 Create group management API routes
    - Create POST /api/groups to create new group
    - Create GET /api/groups to list user's groups
    - Create POST /api/groups/[id]/invite to send invitation
    - Create POST /api/invitations/[token]/accept to accept invitation
    - Create DELETE /api/groups/[id]/leave to leave group
    - Create GET /api/groups/[id]/members to get members
    - _Requirements: 2_
  
  - [x] 6.2 Build group management UI
    - Create groups list page with shadcn/ui Card components
    - Build create group dialog with Form components
    - Create invite members dialog with email input
    - Build group detail page showing members
    - Add leave group confirmation dialog
    - Display invitation acceptance flow
    - _Requirements: 2_

- [x] 7. Set up project documentation
  - Create README.md with project overview and setup instructions
  - Document environment variables needed for dev and prod
  - Add local development setup guide (database, Clerk dev keys)
  - Add production deployment guide (Vercel, environment variables)
  - Add database schema diagram
  - Include development workflow guide
  - _Requirements: All_
