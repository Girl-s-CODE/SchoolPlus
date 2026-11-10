# School Plus

School Plus is an academic management and peer collaboration platform. This repository is an npm-workspaces monorepo with a Next.js client, an Express API, and a PostgreSQL database managed by Prisma.

## Prerequisites

- Node.js 20 or newer and npm
- PostgreSQL 14 or newer

Create a PostgreSQL database named `school_plus` and ensure your PostgreSQL server is running. The default connection string expects a local database with user/password `postgres`/`postgres`.

## Install and configure

From the repository root:

```bash
npm install
cp .env.example .env
cp .env.example server/.env
```

Edit both `.env` files and set `DATABASE_URL` to your PostgreSQL connection string. Keep secrets private; `.env` files are ignored by git. The API reads the root `.env`, while Prisma CLI reads `server/.env` because its schema and package live in `server/`.

## Database setup

Generate the Prisma client and apply the checked-in migration history to your database:

```bash
npm run db:migrate --workspace server -- --name init
```

Seed baseline records for local development:

```bash
npm run db:seed
```

The seed creates 2 teachers, 5 students, 3 courses, enrollments, one sample project, and one comment. It clears existing data in dependency-safe order first. Seed passwords are placeholders and must not be used for real accounts.

To inspect the database in Prisma Studio:

```bash
npm run db:studio --workspace server
```

## Run the applications

Start the Express API and Next.js client together:

```bash
npm run dev
```

Or launch separately:

```bash
npm run dev:server
npm run dev:client
```

The API listens on `http://localhost:5000` by default and exposes `GET /health`. The client runs on `http://localhost:3000`.

## Production builds

```bash
npm run build
```

Then start the API with `npm run start --workspace server` and the client with `npm run start --workspace client`.

## Project layout

```text
client/                 Next.js App Router application
server/                 Express API and Prisma database layer
server/prisma/schema.prisma
server/prisma/migrations/
```
