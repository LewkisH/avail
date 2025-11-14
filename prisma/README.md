# Database Setup

## Local Development

### Option 1: Docker Compose (Recommended)

Start the PostgreSQL database:

```bash
npm run docker:up
```

The database will be available at:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/group_activity_planner"
```

Update your `.env.local` with this connection string (uses port 5434 to avoid conflicts with local PostgreSQL).

**Useful Docker commands:**
- `npm run docker:up` - Start the database
- `npm run docker:down` - Stop the database
- `npm run docker:logs` - View database logs

### Option 2: Local PostgreSQL Installation

1. Install PostgreSQL on your system
2. Create a database: `createdb group_activity_planner`
3. Update `.env.local` with your connection string

## Running Migrations

After setting up your database, run:

```bash
npm run db:migrate
```

This will:
- Create migration files
- Apply migrations to your database
- Generate Prisma Client

## Production Setup

### Vercel Postgres

1. Create a Vercel Postgres database in your Vercel project
2. Copy the `DATABASE_URL` from Vercel dashboard
3. Add it to your Vercel environment variables

### Neon

1. Create a Neon project at https://neon.tech
2. Copy the connection string
3. Add it to your Vercel environment variables as `DATABASE_URL`

## Useful Commands

- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Create and apply migrations (dev)
- `npm run db:migrate:deploy` - Apply migrations (production)
- `npm run db:push` - Push schema changes without migrations
- `npm run db:studio` - Open Prisma Studio GUI

## Schema Changes

After modifying `prisma/schema.prisma`:

1. Run `npm run db:migrate` to create a migration
2. Give the migration a descriptive name
3. Commit both the schema and migration files
