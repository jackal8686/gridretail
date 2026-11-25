# GridRetail — Internal Website Generation Platform

Welcome to **GridRetail**, an internal multi-tenant website generation platform built for web agencies, IT consultancies, and digital marketing teams to create, customize, preview, and deliver professional demo websites in minutes.

---

## What is GridRetail?

GridRetail allows teams to quickly spin up fully functional, beautifully designed demonstration websites across three main business categories without writing code:

1. **E-commerce Stores:** Complete online retail stores with product catalogs, category filtering, shopping cart, and simulated zero-fraud checkout.
2. **Appointment Scheduling Websites:** Interactive booking sites with calendar slot selection, service provider assignments, and token-based self-service rescheduling/cancellation.
3. **Lead Generation Sites:** Marketing landing pages with customizable dynamic forms, input validation rules, and automated CRM lead capture.

The platform provides a centralized administrative dashboard, an Advanced Visual Editor with real-time multi-device previewing (Desktop, Tablet, Mobile), client presentation decks, and passwordless shareable links.

---

## Technology Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Lucide React icons.
- **Backend:** Next.js Server Components, API Route Handlers.
- **Database:** MongoDB (with an automatic in-memory repository fallback for rapid offline development and automated testing).
- **Authentication:** Auth.js (NextAuth) with JWT sessions and bcrypt password hashing.
- **Testing:** Playwright, Node.js Native Test Runner (517 automated unit and integration tests).

---

## Key Features

- **Centralized Administration:** Manage clients, stores, products, bookings, leads, and activity logs from one unified dashboard.
- **Advanced Visual Editor:** Customize colors, fonts, section order, and content with real-time live preview across Desktop (1440×900), Tablet (768×1024), and Mobile (390×844) viewports.
- **Design System Diversity:** 8 foundational layout templates and 12 coordinated color palettes.
- **Integrated Lead CRM:** View incoming inquiries in Kanban board or tabular format, attach notes, set reminder dates, and export to CSV.
- **Presentation Deck Mode:** Built-in client pitch slides with presenter talking points for seamless sales meetings.
- **Secure Preview Sharing:** Generate time-limited, cryptographically signed share links for client review without requiring user accounts.

---

## Project Structure Overview

```text
D:\grid\
├── src/
│   ├── app/                      # Next.js 15 App Router pages & API route handlers
│   │   ├── api/                  # Backend REST API endpoints (stores, products, leads, etc.)
│   │   ├── dashboard/            # Administrative dashboard
│   │   ├── stores/               # Store directory, creation wizard & visual editor
│   │   └── store/[slug]/         # Consumer-facing public storefront runtime
│   ├── components/               # React UI components (editor, dashboard, storefront)
│   ├── constants/                # Templates, color themes, section definitions
│   ├── lib/
│   │   ├── db/                   # MongoDB client connection & fallback controller
│   │   ├── repositories/         # Multi-tenant data access repositories
│   │   └── security/             # Token hashing, origin verification, input sanitization
│   └── types/                    # TypeScript interfaces and data models
├── public/                       # Static public assets (logos, placeholders)
├── project-documentation/        # Complete documentation package (Reports, Screenshots, Code Snippets)
├── tests/                        # 517 automated test suites
├── package.json                  # Scripts and project dependencies
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## Prerequisites

Before running the application, ensure you have the following installed on your system:

- **Node.js:** v20.x or higher (Node 22 LTS recommended)
- **npm:** v10.x or higher
- **MongoDB:** (Optional for local development; if no MongoDB instance is running, the platform automatically activates its built-in in-memory fallback repository).

---

## Getting Started & Installation

### 1. Clone or Open the Repository
```bash
cd D:\grid
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory (you can copy `.env.example` if available).

```env
# Database Configuration (Optional: Leave empty for local in-memory fallback)
MONGODB_URI=
MONGODB_DB_NAME=gridretail

# NextAuth / Auth.js Security Secret (Required for production, auto-fallback in dev)
NEXTAUTH_SECRET=your_secret_key_at_least_32_characters_long
NEXTAUTH_URL=http://localhost:3000

# Environment Flags
ALLOW_IN_MEMORY_FALLBACK=true
NODE_ENV=development
```

> **Note:** Never commit real database connection strings or secrets to version control.

---

## Running the Application

### Start Development Server
```bash
npm run dev
```
The application will be accessible at: **`http://localhost:3000`**

### Accessing the Administrative Dashboard
1. Navigate to: `http://localhost:3000/login`
2. **Default Admin Credentials:**
   - **Email:** `alex.mercer@gridretail.internal`
   - **Password:** `AdminGrid2026!`

---

## Testing & Quality Verification

Run the verified test suites using the standard npm scripts:

### Run All 517 Automated Tests
```bash
npm test
```

### Type Checking
```bash
npm run type-check
```

### Code Linting
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm run start
```

---

## Important Notes & System Behavior

- **Simulated Checkout:** The e-commerce shopping bag and checkout workflow perform complete price, inventory, and order calculations, but use a **safe demo simulation gateway**. No real financial transactions are executed, eliminating commercial risk during client presentations.
- **Dual-Mode Persistence:** If MongoDB is offline, GridRetail maintains all operations in memory without crashing, making it resilient for offline demonstrations and CI/CD pipelines.

---

## Documentation Package

For in-depth architectural details, database schemas, and screenshots, refer to the files in `project-documentation/`:
- `GridRetail_Project_Report.md`: Full academic and technical project report.
- `GridRetail_Project_Report.docx`: Formatted Word document for presentation and submission.
- `screenshots/`: High-resolution application screenshots.
- `code-snippets/`: Documented source code samples.
- `DOCUMENTATION_CHECKLIST.md`: Verification checklist of deliverables.
