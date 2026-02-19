import type { ParsedData, EligiblePlayer } from '../types/eligibility'

const MIN_CLUB_GAMES = 4
const HIGHER_GRADE_THRESHOLD = 0.51

function extractGrade(team: string): number {
  const match = team.trim().match(/(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

export function getEligiblePlayers(
  data: ParsedData,
  nominatedClub: string,
  selectedTeam: string
): EligiblePlayer[] {
  const players = data.playersByClub[nominatedClub]
  if (!players) return []
  const targetGrade = extractGrade(selectedTeam)

  return players.filter((p) => {
    if (p.totalClubMatches < MIN_CLUB_GAMES) return false
    let matchesInHigherTeams = 0
    for (const [team, matches] of Object.entries(p.matchesByTeam)) {
      const grade = p.gradesByTeam[team] ?? extractGrade(team)
      if (grade < targetGrade) matchesInHigherTeams += matches
    }
    const shareInHigher = matchesInHigherTeams / p.totalClubMatches
    if (shareInHigher >= HIGHER_GRADE_THRESHOLD) return false
    return true
  }).map((p) => ({
    surname: p.surname,
    name: p.name,
    totalClubMatches: p.totalClubMatches,
    matchesByTeam: { ...p.matchesByTeam },
  }))
}
