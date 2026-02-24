import type { ParsedData, EligiblePlayer } from '../types/eligibility'

export type RuleSelection = 'rule1' | 'rule2' | 'both'

const MIN_GAMES_IN_SIDE_OR_LOWER = 4
const HIGHER_GRADE_THRESHOLD = 0.51

export function extractGrade(team: string): number {
  const match = team.trim().match(/(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

export function getGamesBias(
  player: EligiblePlayer,
  selectedTeam: string
): 'higher' | 'lower' | 'equal' {
  const targetGrade = extractGrade(selectedTeam)
  let matchesInHigher = 0
  let matchesInLower = 0
  for (const [team, matches] of Object.entries(player.matchesByTeam)) {
    const grade = extractGrade(team)
    if (grade < targetGrade) matchesInHigher += matches
    else if (grade > targetGrade) matchesInLower += matches
  }
  if (matchesInHigher > matchesInLower) return 'higher'
  if (matchesInLower > matchesInHigher) return 'lower'
  return 'equal'
}

function matchesInSelectedOrLower(
  p: { matchesByTeam: Record<string, number>; gradesByTeam: Record<string, number> },
  targetGrade: number,
  extract: (t: string) => number
): number {
  let count = 0
  for (const [team, matches] of Object.entries(p.matchesByTeam)) {
    const grade = p.gradesByTeam[team] ?? extract(team)
    if (grade >= targetGrade) count += matches
  }
  return count
}

export function getEligiblePlayers(
  data: ParsedData,
  nominatedClub: string,
  selectedTeam: string,
  ruleSelection: RuleSelection = 'both'
): EligiblePlayer[] {
  const players = data.playersByClub[nominatedClub]
  if (!players) return []
  const targetGrade = extractGrade(selectedTeam)

  return players.filter((p) => {
    const passesRule1 =
      matchesInSelectedOrLower(p, targetGrade, extractGrade) >= MIN_GAMES_IN_SIDE_OR_LOWER

    let passesRule2 = true
    if (ruleSelection === 'rule2' || ruleSelection === 'both') {
      if (p.totalClubMatches < 1) return false
      let matchesInHigherTeams = 0
      for (const [team, matches] of Object.entries(p.matchesByTeam)) {
        const grade = p.gradesByTeam[team] ?? extractGrade(team)
        if (grade < targetGrade) matchesInHigherTeams += matches
      }
      const shareInHigher = matchesInHigherTeams / p.totalClubMatches
      passesRule2 = shareInHigher < HIGHER_GRADE_THRESHOLD
    }

    if (ruleSelection === 'rule1') return passesRule1
    if (ruleSelection === 'rule2') return passesRule2
    return passesRule1 && passesRule2
  }).map((p) => ({
    surname: p.surname,
    name: p.name,
    totalClubMatches: p.totalClubMatches,
    matchesByTeam: { ...p.matchesByTeam },
  }))
}
