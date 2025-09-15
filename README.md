# Multi-Tenant SaaS Notes Application

A secure multi-tenant notes application built with Next.js, featuring role-based access control and subscription-based feature gating.

## Architecture Overview

### Multi-Tenancy Approach

This application uses a **shared schema with tenant ID column** approach for multi-tenancy:

- **Database Structure**: Single PostgreSQL database with tenant isolation enforced at the application level
- **Isolation Method**: Every table includes a `tenantId` field, and all queries are filtered by tenant
- **Benefits**:
  - Cost-effective (single database)
  - Easier maintenance and backups
  - Efficient resource utilization
- **Security**: Strict tenant isolation enforced in every API endpoint

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Vercel Postgres)
- **ORM**: Prisma
- **Authentication**: JWT with HTTP-only cookies
- **Styling**: TailwindCSS
- **Deployment**: Vercel

## Features

### ✅ Multi-Tenancy

- Support for multiple tenants (Acme, Globex)
- Strict data isolation between tenants
- Shared schema with tenant ID column approach

### ✅ Authentication & Authorization

- JWT-based authentication
- Role-based access control:
  - **Admin**: Can invite users and upgrade subscriptions
  - **Member**: Can only manage notes (CRUD operations)

### ✅ Subscription Feature Gating

- **Free Plan**: Maximum 3 notes per tenant
- **Pro Plan**: Unlimited notes
- Admin-only upgrade endpoint: `POST /api/tenants/:slug/upgrade`

### ✅ Notes API (CRUD)

- `POST /api/notes` - Create a note
- `GET /api/notes` - List all notes for current tenant
- `GET /api/notes/:id` - Retrieve specific note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### ✅ Additional Features

- Health endpoint: `GET /api/health`
- User invitation: `POST /api/users/invite` (Admin only)
- CORS enabled for automated testing
- Responsive frontend with login/logout and notes management
- Simple invitation flow (admin generates link, invitee sets password)

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Notes

- `GET /api/notes` - List tenant notes
- `POST /api/notes` - Create note
- `GET /api/notes/[id]` - Get specific note
- `PUT /api/notes/[id]` - Update note
- `DELETE /api/notes/[id]` - Delete note

### Admin Only

- `POST /api/tenants/[slug]/upgrade` - Upgrade tenant subscription
- `POST /api/auth/invite` - Generate invitation link (Admin)
- `GET /api/auth/accept-invite?token=...` - Validate invitation token
- `POST /api/auth/accept-invite` - Accept invitation (set password)

### System

- `GET /api/health` - Health check

## Test Accounts

All test accounts use the password: `password`

| Email             | Role   | Tenant |
| ----------------- | ------ | ------ |
| admin@acme.test   | Admin  | Acme   |
| user@acme.test    | Member | Acme   |
| admin@globex.test | Admin  | Globex |
| user@globex.test  | Member | Globex |

## Security Features

### Tenant Isolation

- All database queries include tenant filter
- JWT tokens contain tenant ID
- API endpoints verify tenant ownership
- No cross-tenant data access possible

### Role-Based Access

- Middleware enforces authentication
- Role validation in protected endpoints
- Admin-only operations properly restricted

### Data Protection

- Password hashing with bcrypt
- HTTP-only cookies for JWT storage
- CORS configuration for API access

## Database Schema

```prisma
model Tenant {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  plan        Plan     @default(FREE)
  users       User[]
  notes       Note[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  notes     Note[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Note {
  id        String   @id @default(cuid())
  title     String
  content   String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  ADMIN
  MEMBER
}

enum Plan {
  FREE
  PRO
}
```

## Development Setup

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd multi-tenant-notes
   npm install
   ```

2. **Environment Variables**
   Create `.env.local`:

   ```
   DATABASE_URL="postgresql://..."
   JWT_SECRET="your-secret-key"
    NEXT_PUBLIC_APP_URL="http://localhost:3000 or to your domain"
   ```

3. **Database Setup**

   ```bash
   npx prisma migrate dev
   npx tsx prisma/seed.ts   
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Deployment

### Vercel Deployment

1. **Database Setup**: Create Vercel Postgres database
2. **Environment Variables**: Set `DATABASE_URL` and `JWT_SECRET` in Vercel
3. **Deploy**: Connect GitHub repository to Vercel
4. **Migrate**: Run `npx prisma migrate deploy` in Vercel
5. **Seed**: Run `npx prisma db seed` in Vercel

### Production URL

- Frontend: `https://your-app.vercel.app`
- API: `https://your-app.vercel.app/api`
- Health: `https://your-app.vercel.app/api/health`

## Testing

### Manual Testing

1. Visit the deployed application
2. Login with test accounts
3. Create, read, update, delete notes
4. Test subscription limits (free plan = 3 notes max)
5. Test admin upgrade functionality
6. Verify tenant isolation

### Automated Testing

The application includes CORS headers and proper error handling for automated test scripts.

## Invitation Flow (Concise)

1. Admin enters email + selects role (Member/Admin) on dashboard.
2. App returns an invitation link (JWT token embedded) shown on the page.
3. Share the link. Opening it loads the Accept Invite page.
4. Invitee sets a password and submits.
5. Account is created in the inviter's tenant and they are logged in.

Notes:

- Token expires in 7 days.
- If the email already exists, invitation is rejected.
- Environment (optional): set `NEXT_PUBLIC_APP_URL` for correct link domain.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   └── logout/route.ts
│   │   ├── notes/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── tenants/
│   │   │   └── [slug]/upgrade/route.ts
│   │   ├── users/
│   │   │   └── invite/route.ts
│   │   └── health/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── auth.ts
│   └── prisma.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts
└── package.json
```

## Key Implementation Decisions

1. **Shared Schema**: Chosen for simplicity and cost-effectiveness
2. **JWT with Cookies**: Secure token storage and transmission
3. **Prisma ORM**: Type-safe database operations with easy migrations
4. **Next.js API Routes**: Single codebase for frontend and backend
5. **Middleware CORS**: Global CORS handling for all API routes

## Compliance

This implementation meets all assignment requirements:

- ✅ Multi-tenant architecture with strict isolation
- ✅ JWT-based authentication with required test accounts
- ✅ Role-based access control (Admin/Member)
- ✅ Subscription feature gating (Free/Pro plans)
- ✅ Complete CRUD API for notes
- ✅ Health endpoint for monitoring
- ✅ CORS enabled for automated testing
- ✅ Minimal frontend with all required features
- ✅ Vercel deployment ready
- ✅ Documentation and setup instructions
