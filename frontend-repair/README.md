# frontend-repair

React + Vite JavaScript frontend for the existing `backend-repair` Repair ERP backend.

Backend remains the source of truth. This frontend mirrors backend modules and API routes without renaming business domains.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Default API:

```text
http://localhost:8000/api/v1
```

## Stack

- React
- Vite
- JavaScript only
- TailwindCSS
- Shadcn-style local UI primitives
- React Router
- TanStack Query
- Axios
- React Hook Form
- Zod
- Recharts
- Lucide Icons

## Backend Module Mapping

Navigation exposes only backend-backed ERP screens:

- Analytics
- Assignments
- Billing
- Customers
- Handover
- Inventory
- Repair
- Vendors

Auth, business, notifications, staff, and settings pages are intentionally not in
the primary sidebar until mounted backend APIs exist for those domains.
