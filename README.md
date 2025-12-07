# Spinning Tenant Backend

This is the tenant-specific backend application that integrates with the main backend (`spinning-be`) to serve organization-specific data to the frontend.

## Architecture

- **Main Backend** (`spinning-be`): Manages all organizations, admin panel, and all data
- **Tenant Backend** (`spinning-tenant-be`): Organization-specific API that proxies requests to the main backend, ensuring data isolation

## Features

- Organization-specific API endpoints
- Authentication via Supabase JWT tokens
- Automatic organization filtering
- Proxy to main backend for all data operations

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   ```bash
   cp env.template .env
   ```

   Update `.env` with:

   - `MAIN_BACKEND_URL`: URL of the main backend (e.g., `http://localhost:3000`)
   - `TENANT_ORGANIZATION_ID`: The organization ID this tenant serves
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

3. **Run the development server:**
   ```bash
   npm run dev
   ```

## API Endpoints

All endpoints require authentication via Bearer token in the Authorization header.

### Organization

- `GET /api/organization` - Get tenant organization details

### Classes

- `GET /api/classes` - Get all classes for the organization

### Sessions

- `GET /api/sessions` - Get all sessions for the organization
- `GET /api/sessions/[id]` - Get a specific session

### Bookings

- `GET /api/bookings` - Get all bookings for the organization
- `POST /api/bookings` - Create a new booking
- `GET /api/bookings/[id]` - Get a specific booking
- `PATCH /api/bookings/[id]` - Update a booking
- `DELETE /api/bookings/[id]` - Delete a booking

## Frontend Routes

- `/admin` - Admin dashboard for managing organization data (classes, sessions, bookings, members, instructors)
- `/login` - Login page for tenant users

## How It Works

1. Frontend authenticates with Supabase and gets a JWT token
2. Frontend makes requests to tenant backend with the JWT token
3. Tenant backend validates the token and verifies user belongs to the tenant organization
4. Tenant backend proxies the request to the main backend with `organizationId` parameter
5. Main backend returns organization-specific data
6. Tenant backend returns the data to the frontend

## Security

- All requests require valid Supabase JWT tokens
- Organization ID is automatically included in all requests to main backend
- Users can only access data for the tenant's organization
- Cross-organization access is prevented
