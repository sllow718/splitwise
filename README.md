# SplitEase - Group Expense Tracker

A Splitwise clone built with Next.js, Supabase, and modern web technologies. Track shared expenses with friends, roommates, and travel groups.

## Features

- 🔐 **Google Authentication** - Secure login with Google OAuth
- 👥 **Group Management** - Create and manage expense groups
- 💰 **Expense Tracking** - Add expenses with multiple split options
- 📎 **Attachments** - Upload receipts and invoices
- 📊 **Balance Calculation** - Real-time balance tracking
- 🎨 **Modern UI** - Beautiful dark theme with glassmorphism effects

## Tech Stack

- **Frontend**: Next.js 14+ (App Router)
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google Provider
- **Storage**: Supabase Storage for attachments
- **Styling**: Modern CSS with custom design system
- **Testing**: Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- Google OAuth credentials (configured in Supabase)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/splitwise-mvp.git
cd splitwise-mvp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Set up the database:
   - Go to your Supabase project's SQL Editor
   - Run the SQL from `supabase/schema.sql`

5. Configure Google Auth in Supabase:
   - Go to Authentication > Providers > Google
   - Add your Google OAuth client ID and secret
   - Add your site URL to the redirect URLs

6. Create storage bucket:
   - Go to Storage > New bucket
   - Name it `expense-attachments`
   - Set it to public

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building for Production

```bash
npm run build
npm start
```

## Deployment to Vercel

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## Project Structure

```
splitwise-mvp/
├── app/                    # Next.js App Router
│   ├── globals.css         # Global styles & design system
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # React components
│   ├── AuthPage.tsx        # Login page
│   ├── Dashboard.tsx       # Main dashboard
│   ├── GroupCard.tsx       # Group card component
│   ├── GroupDetail.tsx     # Group detail view
│   ├── CreateGroupModal.tsx
│   └── AddExpenseModal.tsx
├── lib/                    # Utilities and helpers
│   ├── supabase.ts         # Supabase client
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Utility functions
├── __tests__/              # Test files
├── supabase/               # Database schema
│   └── schema.sql
└── package.json
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
