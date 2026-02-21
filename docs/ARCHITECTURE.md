# Architecture

## Overview

Player Eligibility is a React SPA that parses Bowls Victoria match CSV data and computes which players are eligible for a selected team based on club-level rules.

## Data Flow

1. User signs in (Firebase Auth)
2. App loads CSV from Firebase Storage (`matches-data/matches-played-count-per-member.csv`)
3. CSV is parsed with PapaParse; aggregated by player, club, team
4. User selects Nominated Club and Team
5. `getEligiblePlayers()` filters by: min 4 club games, < 51% games in higher teams
6. Results are rendered in the UI

## Eligibility Rules

- **Minimum club games**: 4
- **Higher team threshold**: Player is ineligible if 51% or more of their club games were in teams with lower grade numbers (e.g. Premier 1) than the selected team

Grade is derived from team name suffix (e.g. `Premier 1` → 1). Lower grade number = higher team.

## Modules

### `lib/firebase.ts`

Firebase SDK init. Uses env vars for config.

### `lib/storage.ts`

- `uploadCsvToStorage(csvText)` – uploads raw CSV to Storage
- `downloadCsvFromStorage()` – fetches CSV URL and returns text

### `lib/csvParser.ts`

- `parseCsv(csvText)` – parses CSV, validates required columns, aggregates rows by player/club/team
- Required columns: Surname, Name, Nominated Club, Team, Total Matches Played
- Returns `ParsedData`: clubs, teamsByClub, playersByClub

### `lib/eligibility.ts`

- `getEligiblePlayers(data, nominatedClub, selectedTeam)` – filters players by eligibility rules
- Uses `extractGrade(team)` to get numeric grade from team name

### `types/eligibility.ts`

Type definitions for CsvRow, TeamGrade, PlayerAtClub, EligiblePlayer, ParsedData.

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
