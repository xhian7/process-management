# Process Management System

A full-stack process management application built with Bun, React, TailwindCSS, shadcn/ui, and Prisma.

## Prerequisites

- [Bun](https://bun.sh) v1.3.9 or higher
- PostgreSQL database

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit the `.env` file and update the `DATABASE_URL` with your PostgreSQL connection string:

```env
DATABASE_URL="postgres://username:password@localhost:5432/database_name"
```

### 3. Generate Prisma Client

Generate the Prisma client from your schema:

```bash
bunx prisma generate
```

This will create the client in the `generated/prisma` directory.

### 4. Sync database schema

For development, push your schema to the database:

```bash
bunx prisma db push
```

For production deployments, use migrations:

```bash
bunx prisma migrate deploy
```

## Development

To start a development server with hot reload:

```bash
bun dev
```

## Production

To run for production:

```bash
bun start
```

## Additional Prisma Commands

- View your database in Prisma Studio:
  ```bash
  bunx prisma studio
  ```

- Reset your database (⚠️ Warning: This will delete all data):
  ```bash
  bunx prisma migrate reset
  ```

---

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
