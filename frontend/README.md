# LEC Ithute - Problem Reporting System

A modern ticketing system for the Lesotho Electricity Company (LEC) to manage IT problem reports and support requests.

## Features

### For Staff Members
- Report technical problems with detailed descriptions
- Track ticket status in real-time
- Search for tickets by ticket number
- View all personal tickets in one place
- Automatic AI classification of problems (Hardware, Software, Network)
- Automatic severity assessment (LOW, MEDIUM, HIGH, CRITICAL)

### For Technicians
- View all tickets across all branches
- Filter tickets by status (Pending, In Progress, Solved)
- Update ticket status and add technical notes
- Dashboard with real-time statistics
- Assign tickets and track resolution

## Tech Stack

- **Frontend**: React 19 with Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Routing**: React Router v6

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## User Roles

- **Staff**: Can create and track their own tickets
- **Technician**: Can view and manage all tickets system-wide

## Database Schema

- `user_profiles`: Stores user information and roles
- `tickets`: Stores all problem reports with status tracking

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only view their own tickets (unless they're technicians)
- Technicians can view and update all tickets
- Secure authentication with Supabase Auth
