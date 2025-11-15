# Group Activity Planner

A Next.js web application that enables users to form groups with friends, share their interests and budgets, sync their calendars, and receive AI-powered suggestions for activities and events that fit the group's collective preferences and availability.

## Features

- 🔐 **Secure Authentication** - Powered by Clerk for seamless user management
- 👥 **Group Management** - Create groups, invite friends, and manage memberships
- 🎯 **Interest & Budget Tracking** - Set your preferences for personalized recommendations
- 📅 **Calendar Integration** - Sync with Google Calendar or import ICS files
- 🤖 **AI-Powered Suggestions** - Get intelligent activity recommendations based on group preferences
- 🎉 **Event Aggregation** - Discover events from multiple external APIs
- 💰 **Budget-Aware Planning** - Filter activities by your group's budget range

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Authentication**: Clerk
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel
- **Testing**: Jest, React Testing Library

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18.x or higher
- npm or yarn
- PostgreSQL 14+ (or Docker for local development)
- A Clerk account (free tier available)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd group-activity-planner
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL Database

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL container
npm run docker:up

# View logs
npm run docker:logs

# Stop container when done
npm run docker:down
```

The Docker setup creates a PostgreSQL database on port 5434 with:
- Database: `group_activity_planner`
- Username: `postgres`
- Password: `postgres`

#### Option B: Local PostgreSQL Installation

If you have PostgreSQL installed locally:

1. Create a new database:
```bash
createdb group_activity_planner
```

2. Update your `.env.local` with your local connection string

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/group_activity_planner"

# Clerk - Get these from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Google Calendar (Optional for now)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback

# LLM (Optional for now)
OPENAI_API_KEY=your_openai_api_key

# External APIs (Optional for now)
EVENTBRITE_API_KEY=your_eventbrite_api_key
TICKETMASTER_API_KEY=your_ticketmaster_api_key
```

### 5. Set Up Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Copy your API keys to `.env.local`
4. Configure webhook for user sync:
   - Go to Webhooks in Clerk Dashboard
   - Add endpoint: `http://localhost:3000/api/webhooks/clerk`
   - Subscribe to events: `user.created`, `user.updated`, `user.deleted`
   - Copy the webhook secret to `.env.local`

### 6. Run Database Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 7. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses PostgreSQL with the following schema:

```mermaid
erDiagram
    User ||--o{ UserInterest : has
    User ||--o| UserBudget : has
    User ||--o{ Group : owns
    User ||--o{ GroupMember : "member of"
    User ||--o{ GroupInvitation : sends
    User ||--o{ CalendarEvent : has
    User ||--o| GoogleCalendarToken : has
    
    Group ||--o{ GroupMember : contains
    Group ||--o{ GroupInvitation : has
    Group ||--o{ ActivitySuggestion : receives
    
    ExternalEvent ||--o{ ActivitySuggestion : "suggests"
    
    User {
        string id PK "Clerk ID"
        string email
        string name
        datetime createdAt
        datetime updatedAt
    }
    
    UserInterest {
        uuid id PK
        string userId FK
        string interest
        datetime createdAt
    }
    
    UserBudget {
        uuid id PK
        string userId FK
        decimal minBudget
        decimal maxBudget
        string currency
        datetime updatedAt
    }
    
    Group {
        uuid id PK
        string name
        string ownerId FK
        datetime createdAt
        datetime updatedAt
    }
    
    GroupMember {
        uuid id PK
        uuid groupId FK
        string userId FK
        datetime joinedAt
    }
    
    GroupInvitation {
        uuid id PK
        uuid groupId FK
        string invitedEmail
        string invitedBy FK
        enum status
        string token
        datetime createdAt
        datetime expiresAt
    }
    
    CalendarEvent {
        uuid id PK
        string userId FK
        string title
        text description
        datetime startTime
        datetime endTime
        string timezone
        string location
        enum source
        string sourceId
        datetime createdAt
        datetime updatedAt
    }
    
    GoogleCalendarToken {
        uuid id PK
        string userId FK
        text accessToken
        text refreshToken
        datetime expiresAt
        datetime createdAt
        datetime updatedAt
    }
    
    ExternalEvent {
        uuid id PK
        string title
        text description
        datetime startTime
        datetime endTime
        string timezone
        string location
        decimal cost
        string currency
        string category
        string sourceApi
        string sourceId
        string sourceUrl
        datetime createdAt
        datetime updatedAt
    }
    
    ActivitySuggestion {
        uuid id PK
        uuid groupId FK
        uuid externalEventId FK
        string title
        text description
        datetime suggestedTime
        decimal cost
        text reasoning
        datetime createdAt
    }
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Database Management

```bash
# Open Prisma Studio (GUI for database)
npm run db:studio

# Create a new migration
npm run db:migrate

# Push schema changes without migration (dev only)
npm run db:push

# Generate Prisma Client after schema changes
npm run db:generate
```

### Code Quality

```bash
# Run linter
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check
```

### Project Structure

```
group-activity-planner/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── groups/          # Group management endpoints
│   │   ├── invitations/     # Invitation endpoints
│   │   ├── user/            # User profile endpoints
│   │   └── webhooks/        # Webhook handlers
│   ├── dashboard/           # Dashboard page
│   ├── groups/              # Groups page
│   ├── invitations/         # Invitation acceptance page
│   ├── profile/             # User profile page
│   └── sign-in/             # Authentication pages
├── components/              # React components
│   ├── groups/             # Group-related components
│   ├── invitations/        # Invitation components
│   └── ui/                 # shadcn/ui components
├── lib/                    # Utilities and services
│   ├── services/          # Business logic layer
│   ├── __tests__/         # Service tests
│   ├── auth.ts            # Auth utilities
│   ├── prisma.ts          # Prisma client
│   └── utils.ts           # Helper functions
├── prisma/                # Database schema and migrations
│   ├── migrations/        # Migration files
│   └── schema.prisma      # Prisma schema
└── public/                # Static assets
```

## Production Deployment

### Deploy to Vercel

1. **Push your code to GitHub**

2. **Create a Vercel project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Set up PostgreSQL Database**
   
   Choose one of these options:
   
   **Option A: Vercel Postgres**
   ```bash
   # In Vercel Dashboard
   # Go to Storage → Create Database → Postgres
   # Copy the DATABASE_URL to environment variables
   ```
   
   **Option B: Neon (Recommended)**
   - Go to [Neon](https://neon.tech)
   - Create a new project
   - Copy the connection string
   - Add to Vercel environment variables

4. **Configure Environment Variables**
   
   In Vercel Dashboard → Settings → Environment Variables, add:
   
   ```
   DATABASE_URL=postgresql://...
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   CLERK_WEBHOOK_SECRET=whsec_...
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/google/callback
   OPENAI_API_KEY=...
   EVENTBRITE_API_KEY=...
   TICKETMASTER_API_KEY=...
   ```

5. **Update Clerk Production Settings**
   - In Clerk Dashboard, switch to Production
   - Update webhook endpoint to: `https://yourdomain.com/api/webhooks/clerk`
   - Copy production API keys to Vercel

6. **Deploy**
   ```bash
   git push origin main
   ```
   
   Vercel will automatically:
   - Run `prisma migrate deploy` (via `vercel-build` script)
   - Build the Next.js application
   - Deploy to production

### Post-Deployment Checklist

- [ ] Verify database connection
- [ ] Test user authentication flow
- [ ] Verify webhook is receiving events from Clerk
- [ ] Test group creation and invitations
- [ ] Check that all environment variables are set
- [ ] Monitor application logs for errors

## Environment Variables Reference

### Required for Development

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | Local setup or Docker |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | [Clerk Dashboard](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | Clerk secret key | [Clerk Dashboard](https://dashboard.clerk.com) |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret | Clerk Dashboard → Webhooks |

### Optional (for full functionality)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | Set to your domain + `/api/calendar/google/callback` |
| `OPENAI_API_KEY` | OpenAI API key for LLM | [OpenAI Platform](https://platform.openai.com) |
| `EVENTBRITE_API_KEY` | Eventbrite API key | [Eventbrite Developer](https://www.eventbrite.com/platform) |
| `TICKETMASTER_API_KEY` | Ticketmaster API key | [Ticketmaster Developer](https://developer.ticketmaster.com) |

### Production-Only

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_DOMAIN` | Custom Clerk domain (optional) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Custom sign-in URL |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Custom sign-up URL |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Redirect after sign-in |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Redirect after sign-up |

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
npm run docker:logs

# Verify connection string
echo $DATABASE_URL

# Reset database (WARNING: deletes all data)
npm run db:push -- --force-reset
```

### Clerk Webhook Not Working

1. Verify webhook URL is correct in Clerk Dashboard
2. Check webhook secret matches `.env.local`
3. Ensure endpoint is publicly accessible (use ngrok for local testing)
4. Check API logs for webhook errors

### Prisma Client Issues

```bash
# Regenerate Prisma Client
npm run db:generate

# Clear node_modules and reinstall
rm -rf node_modules .next
npm install
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in `/docs`
- Review the [Design Document](.kiro/specs/group-activity-planner/design.md)

## Roadmap

- [ ] Google Calendar integration
- [ ] ICS file import
- [ ] External event aggregation (Eventbrite, Ticketmaster)
- [ ] AI-powered activity suggestions
- [ ] Real-time notifications
- [ ] Mobile app
- [ ] Additional calendar providers (Outlook, Apple Calendar)
