# Player Eligibility

A web application for checking Bowls Victoria player eligibility based on rounds data. Users upload a CSV export from the Bowls Victoria results portal, then query eligible players for a given club and team using defined rules (minimum 4 club games, no 51%+ of games in a higher team).

## Features

- Firebase Authentication (email/password and Google OAuth)
- CSV upload and storage via Firebase Storage
- Parse Bowls Victoria rounds data format
- Filter eligible players by club, team, and eligibility rules
- View games per division for any eligible player (click name, then X to return)
- Exclude finals rounds (cells marked "(f)" in columns F–R) from eligibility totals
- Password reset and show/hide password on login
- Help modal accessible via header icon
- Feedback form sending emails via Resend (andrew@asleight.com → asleighty@gmail.com)

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- Firebase (Auth, Storage)
- PapaParse (CSV parsing)
- React Router 7

## Prerequisites

- Node.js 18+
- Firebase project with Auth, Storage, and Functions enabled

## Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Configure Firebase: create `.env` in the project root with:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

3. Run the dev server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

5. Deploy functions and set the Resend API key (for feedback emails):

```bash
cd functions
npm run deploy
firebase functions:secrets:set RESEND_API_KEY
```

Ensure the sender domain (andrew@asleight.com) is verified in the [Resend dashboard](https://resend.com/domains).

## Scripts

| Command   | Description              |
| --------- | ------------------------ |
| `npm run dev`    | Start Vite dev server     |
| `npm run build`  | Build for production      |
| `npm run preview`| Preview production build  |
| `npm run lint`   | Run ESLint                |

## Project Structure

```
src/
├── components/     # ProtectedRoute, HelpModal
├── lib/            # firebase, storage, csvParser, eligibility
├── pages/          # Home, Eligibility, ForgotPassword
├── types/          # TypeScript types
└── App.tsx
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) – Technical design and data flow
- [User Guide](docs/USER_GUIDE.md) – How to use the application

## CSV Format

The app expects a CSV with these columns (from Bowls Victoria results portal):

- Surname, Name, Nominated Club, Team, Total Rounds Played

If the file includes columns F–R (e.g. round-by-round data), any cell containing **(f)** is treated as a finals round and excluded from the player’s total for eligibility.

## Deployment

The app is configured for Firebase Hosting. Deploy with:

```bash
firebase deploy
```

## Copyright

© This tool is copyright to Andrew Sleight 2026
