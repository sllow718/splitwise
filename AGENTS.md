1→# Agent Development Guide
2→
3→## Setup & Commands
4→
5→**Initial Setup:**
6→```bash
7→npm install
8→```
9→
10→**Development Server:** `npm run dev` (http://localhost:3000)  
11→**Build:** `npm run build`  
12→**Lint:** `npm run lint`  
13→**Tests:** `npm test` (watch: `npm run test:watch`, coverage: `npm run test:coverage`)
14→
15→## Tech Stack
16→
17→- **Framework:** Next.js 16+ (App Router, React 19, TypeScript)
18→- **Backend:** Supabase (PostgreSQL, Auth with Google OAuth, Storage)
19→- **Testing:** Jest + React Testing Library
20→- **Styling:** CSS Modules with custom design system
21→
22→## Architecture
23→
24→- `app/` - Next.js App Router pages and layouts
25→- `components/` - React components with CSS Modules (e.g., `Component.tsx` + `Component.module.css`)
26→- `lib/` - Utilities, Supabase client, TypeScript types
27→- `__tests__/` - Jest test files
28→- `supabase/` - Database schema SQL
29→
30→## Code Conventions
31→
32→- TypeScript strict mode enabled
33→- Use `'use client'` directive for client components
34→- Import aliases: `@/` maps to repo root
35→- CSS Modules for component styles
36→- Functional components with hooks
37→