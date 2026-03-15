# Architecture

## Overview

Player Eligibility is a React SPA that parses Bowls Victoria rounds CSV data and computes which players are eligible for a selected team based on club-level rules (Four week rule or 51% rule).

## Data Flow

1. User signs in (Firebase Auth)
2. App loads CSV from Firebase Storage (`matches-data/matches-played-count-per-member.csv`)
3. CSV is parsed with PapaParse; rows are aggregated by player, club, team; finals rounds marked (f) are excluded from totals; division labels (Premier, Premier Reserve, Div 1, etc.) are extracted from competition column headers and mapped to teams
4. User selects Nominated Club and Team
5. `getEligiblePlayers()` filters by rule: min 4 club games; Four week rule (4+ games in selected team or lower) or 51% rule (< 51% games in higher teams)
6. Results are rendered with division labels; user can click a player to see games per team (including division) and, for multi-club players, games per team at other clubs (sorted highest to lowest)
7. If the club has players who appear for multiple clubs in the CSV, a warning banner and "Other club(s)" badges are shown

## Eligibility Rules

- **Minimum club games**: 4
- **Rule 1 (Four week rule)**: 4+ games in selected team or lower-grade sides
- **Rule 2 (51% rule)**: < 51% of club games in higher teams

Grade is derived from team name suffix (e.g. `Premier 1` → 1). Lower grade number = higher team. Division (external ranking) is read from CSV headers.

## Modules

### `lib/firebase.ts`

Firebase SDK init. Uses env vars for config.

### `lib/storage.ts`

- `uploadCsvToStorage(csvText)` – uploads raw CSV to Storage
- `downloadCsvFromStorage()` – fetches CSV URL and returns text

### `lib/csvParser.ts`

- `parseCsv(csvText)` – parses CSV, validates required columns, aggregates rows by player/club/team, and excludes finals rounds marked "(f)" from totals
- Extracts division labels (Premier, Premier Reserve, Div N) from competition column headers (excluding Finals columns) and maps them to teams via actual player data in each column
- Detects players who appear with more than one Nominated Club and exposes them in `playerKeysInMultipleClubs`
- Required columns: Surname, Name, Nominated Club, Team, Total Rounds Played (competition columns are optional)
- Returns `ParsedData`: clubs, teamsByClub (with optional division per team), playersByClub, playerKeysInMultipleClubs

### `lib/eligibility.ts`

- `getEligiblePlayers(data, nominatedClub, selectedTeam)` – filters players by eligibility rules
- Uses `extractGrade(team)` to get numeric grade from team name

### `types/eligibility.ts`

Type definitions for CsvRow, TeamGrade, PlayerAtClub, EligiblePlayer, ParsedData. ParsedData includes `playerKeysInMultipleClubs` (player keys who have rows for more than one Nominated Club).

## Routing

| Path            | Component    | Protection   |
|-----------------|-------------|--------------|
| `/`             | Home        | None         |
| `/forgot-password` | ForgotPassword | None     |
| `/eligibility`  | Eligibility | ProtectedRoute |

## Authentication

- Email/password with Firebase Auth
- Google OAuth
- Password reset via email
- ProtectedRoute redirects unauthenticated users to `/`
