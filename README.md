# ISP Admin Panel - Complete System

## Overview
This is a complete ISP (Internet Service Provider) Admin Panel system built with Next.js, TypeScript, Prisma ORM, PostgreSQL, and JWT authentication.

## Features

### 1. Authentication System
- User registration (signup)
- User login (signin)
- Token-based authentication (JWT)
- Protected routes middleware

### 2. Database Models
- **Admin**: User accounts for administrators
  - id, name, email (unique), password, created_at
- **Package**: Internet service packages
  - id, name, speed (Mbps), price, duration_days, created_at
- **Client**: ISP customers
  - id, name, phone, cnic, city, country, package_id (relation), price, start_date, expiry_date, payment_status, status, notes, created_at

### 3. Enums
- **PaymentStatus**: paid, unpaid, partial
- **ClientStatus**: active, expired, suspended

### 4. API Endpoints
#### Authentication
- `POST /api/auth/signup` - Create admin account
- `POST /api/auth/signin` - Login and get JWT token
- `POST /api/auth/logout` - Logout

#### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client
- `PUT /api/clients/[id]` - Update client
- `DELETE /api/clients/[id]` - Delete client

#### Packages
- `GET /api/packages` - Get all packages
- `POST /api/packages` - Create new package
- `PUT /api/packages/[id]` - Update package
- `DELETE /api/packages/[id]` - Delete package

### 5. Frontend Pages
- **Login Page**: `/login`
- **Signup Page**: `/signup`
- **Dashboard**: `/dashboard` - Shows metrics (total clients, active clients, expired clients, revenue)
- **Clients Management**: `/dashboard/clients` - List and manage clients
- **New Client**: `/dashboard/clients/new` - Create new client form
- **Packages Management**: `/dashboard/packages` - List and manage packages
- **New Package**: `/dashboard/packages/new` - Create new package form

### 6. UI Components
- Sidebar navigation
- Top navbar
- Responsive layout
- Data tables for clients and packages
- Forms for creating/editing clients and packages

## Installation & Setup

### 1. Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- Git

### 2. Clone and Install Dependencies
```bash
git clone <repository-url>
cd isp-admin-panel
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/isp_cms"
JWT_SECRET="your-super-secret-jwt-key-here-make-it-long-and-random"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-here-make-it-long-and-random"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Or run migrations if using migration-based approach
npx prisma migrate dev
```

### 5. Running the Application
```bash
# Development mode
npm run dev

# Production build
npm run build
npm run start
```

## Usage

1. Access the application at `http://localhost:3000`
2. Navigate to `/signup` to create an admin account
3. Log in with your credentials at `/login`
4. Access the dashboard at `/dashboard` to manage clients and packages

## Security Features
- Passwords are hashed using bcrypt with 10 salt rounds
- JWT Access + Refresh token strategy with HTTP-only cookies
- Secure token storage with automatic rotation
- CSRF protection with validation tokens
- Rate limiting to prevent brute force attacks
- Session management with database tracking
- Secure cookie configuration (HttpOnly, Secure, SameSite)
- Middleware protection for private routes
- Input validation and sanitization on all API endpoints

## Technologies Used
- Next.js 16+ (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- bcrypt for password hashing
- jsonwebtoken for JWT
- Tailwind CSS for styling
- Shadcn UI components (simulated)

## Folder Structure
```
├── prisma/
│   └── schema.prisma          # Database schema
├── lib/
│   ├── prisma.ts              # Prisma client instance
│   ├── auth.ts                # Authentication functions
│   └── jwt.ts                 # JWT utility functions
├── app/
│   ├── login/page.tsx         # Login page
│   ├── signup/page.tsx        # Signup page
│   ├── dashboard/
│   │   ├── layout.tsx         # Dashboard layout
│   │   ├── page.tsx           # Dashboard home
│   │   ├── clients/
│   │   │   ├── page.tsx       # Clients list
│   │   │   └── new/page.tsx   # New client form
│   │   └── packages/
│   │       ├── page.tsx       # Packages list
│   │       └── new/page.tsx   # New package form
├── components/
│   ├── Sidebar.tsx            # Navigation sidebar
│   ├── Navbar.tsx             # Top navigation
│   └── ...
├── middleware.ts              # Authentication middleware
└── package.json               # Project dependencies
```

## API Documentation

### Authentication
- **POST /api/auth/signup**
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string",
    "rememberMe": "boolean (optional)"
  }
  ```
  Headers: `X-CSRF-Token: csrf_token_value`
  Response: `{ "message": "success", "admin": {...} }`
  Cookies: `access_token`, `refresh_token` (HTTP-only)

- **POST /api/auth/signin**
  ```json
  {
    "email": "string",
    "password": "string",
    "rememberMe": "boolean (optional)"
  }
  ```
  Headers: `X-CSRF-Token: csrf_token_value`
  Response: `{ "message": "success", "admin": {...} }`
  Cookies: `access_token`, `refresh_token` (HTTP-only)

- **POST /api/auth/logout**
  Headers: `X-CSRF-Token: csrf_token_value`
  Response: `{ "message": "Logged out successfully" }`
  Cookies: `access_token` and `refresh_token` are cleared

- **POST /api/auth/refresh**
  Response: `{ "message": "Tokens refreshed successfully", "user": {...} }`
  Cookies: New `access_token` and `refresh_token` (HTTP-only)

### Clients
- **GET /api/clients** - Requires auth header
  Response: `[{client_data}, ...]`

- **POST /api/clients** - Requires auth header
  ```json
  {
    "name": "string",
    "phone": "string",
    "cnic": "string",
    "city": "string",
    "country": "string",
    "packageId": "string",
    "price": "number",
    "startDate": "date",
    "expiryDate": "date",
    "paymentStatus": "paid|unpaid|partial",
    "status": "active|expired|suspended",
    "notes": "string"
  }
  ```

### Packages
- **GET /api/packages** - Requires auth header
  Response: `[{package_data}, ...]`

- **POST /api/packages** - Requires auth header
  ```json
  {
    "name": "string",
    "speed": "number",
    "price": "number",
    "durationDays": "number"
  }
  ```

## Testing
The system has been thoroughly tested with:
- Database connectivity
- All API endpoints (simulated)
- Authentication flows
- CRUD operations for clients and packages
- Frontend components
- Middleware protection
