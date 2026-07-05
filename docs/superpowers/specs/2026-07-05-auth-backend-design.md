# User Authentication Backend — Design Spec

## Overview

Add a real backend authentication system to Autoforge Hub using Nuxt Nitro server routes, SQLite database, and JWT tokens. Replace the current localStorage-based mock auth with real API calls.

## Tech Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| Backend | Nuxt Nitro (built-in) | No extra framework needed |
| Database | SQLite via better-sqlite3 | Zero config, file-based |
| ORM | Drizzle ORM + drizzle-kit | Type-safe, lightweight |
| Auth | JWT (jsonwebtoken + bcryptjs) | Stateless, simple |
| File Storage | Alibaba Cloud OSS | Phase 2 |

## Database Schema (Phase 1)

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  team_count INTEGER NOT NULL DEFAULT 0,
  joined_team_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Get JWT token |
| GET | /api/auth/me | Yes | Get current user |

## Data Flow

Register: Frontend -> POST /api/auth/register {email, password}
         -> Nitro hashes password -> INSERT users -> return {user, token}

Login:    Frontend -> POST /api/auth/login {email, password}
         -> Nitro verifies password -> return {user, token}

Auth:     Frontend -> GET /api/auth/me (Authorization: Bearer <token>)
         -> Nitro middleware verifies JWT -> return {user}

## File Structure

server/
  db/
    schema.ts       - Drizzle schema definitions
    index.ts        - DB client singleton
  middleware/
    auth.ts         - JWT verification middleware
  utils/
    jwt.ts          - JWT sign/verify helpers
  api/
    auth/
      register.post.ts
      login.post.ts
      me.get.ts

## JWT Configuration

- Secret: JWT_SECRET env variable (fallback for dev)
- Expiry: 7 days
- No refresh token
- Token stored in frontend localStorage

## Frontend Changes

- useAuth composable: replace localStorage with API calls
- Login page: remove seedMockData(), use real API
- useScripts / useTeams: replace with API calls (Phase 2)
- Add ofetch interceptor for Authorization header

## Env Variables

JWT_SECRET=autoforge-hub-dev-secret-key
DATABASE_URL=server/db/autoforge.db
