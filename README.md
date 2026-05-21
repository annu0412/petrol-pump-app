# Rupali HP Sales - Petrol Pump Management System

Rupali HP is a multi-tenant Petrol Pump Management System designed for tracking daily operations, fuel rates, machine meter readings, sales, expenses, and credit. It is built as a Progressive Web App (PWA) to streamline daily data entry and provide clear reporting.

## Features

- **Multi-Tenant Architecture**: Robust organization management allowing separate organizations to manage their own data securely.
- **Daily Operations Tracking**: Daily meter entry forms for machines that automatically load the opening reading from the previous day's closing reading.
- **Expense & Credit Management**: Track daily expenses, credit sales, and customer payments easily.
- **History & Reporting**: View up to 60-day summaries of operations and sales.
- **Settings & Configuration**: Easily manage organization details, machines, employees, and customers.
- **Secure Authentication**: Utilizing Supabase Auth with an intuitive multi-step registration flow.
- **PWA Support**: Installable as a Progressive Web App for quick access on mobile devices.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with RLS, Supabase Auth)
- **Testing**: Built-in Node.js test runner (`node --test`)

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- A Supabase Project

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables. Create a `.env.local` file in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Set up the Database:
   - Go to your Supabase SQL Editor.
   - Run the migration files located in `supabase/migrations/` (or refer to `supabase/SUPABASE_SQL_README.md`) in order:
     - `001_schema.sql`
     - `002_rls.sql`
     - `003` (Registration RLS)
     - `004` (register_org RPC)
     - `005` (Tightened RLS)
   - Ensure "Confirm email" is turned OFF in Supabase Auth > Providers > Email.

4. Start the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development Notes

- **Next.js 16**: This project uses Next.js 16 which may contain breaking changes from earlier versions. Refer to Next.js documentation as needed.
- **Tailwind CSS v4**: This project uses Tailwind v4 which does not use a `tailwind.config` file. It utilizes `@import "tailwindcss"` directly.
- **Testing**: Run unit tests with zero dependencies using `node --experimental-strip-types --test`.

## License

Private / Proprietary
