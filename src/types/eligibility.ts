export interface CsvRow {
  surname: string
  name: string
  nominatedClub: string
  team: string
  totalMatchesPlayed: number
}

export interface TeamGrade {
  team: string
  grade: number
}

export interface PlayerAtClub {
  surname: string
  name: string
  totalClubMatches: number
  matchesByTeam: Record<string, number>
  gradesByTeam: Record<string, number>
}

export interface EligiblePlayer {
  surname: string
  name: string
  totalClubMatches: number
  matchesByTeam: Record<string, number>
}

export interface ParsedData {
  clubs: string[]
  teamsByClub: Record<string, TeamGrade[]>
  playersByClub: Record<string, PlayerAtClub[]>
}
