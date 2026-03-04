import Papa from 'papaparse'
import type { CsvRow, ParsedData, PlayerAtClub, TeamGrade } from '../types/eligibility'

const REQUIRED_COLUMNS = ['Surname', 'Name', 'Nominated Club', 'Team', 'Total Rounds Played']
const MAX_HOME_AND_AWAY_ROUNDS = 14

function extractGrade(team: string): number {
  const match = team.trim().match(/(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

function isIncludedCompetitionColumn(header: string): boolean {
  return !/[67]-A-Side/i.test(header) && !/finals/i.test(header)
}

function countFinalsInColumns(raw: Record<string, string>, headers: string[]): number {
  let count = 0
  for (const col of headers) {
    const val = raw[col]?.trim() ?? ''
    const roundsText = val.split(/\s-\s/)[0] ?? ''
    const rounds = roundsText.split(',').map((round) => round.trim()).filter(Boolean)
    for (const round of rounds) {
      if (/\(\s*[a-z0-9]*f[a-z0-9]*\s*\)/i.test(round)) {
        count += 1
        continue
      }
      const numericRound = round.match(/^(\d+)$/)
      if (numericRound && parseInt(numericRound[1], 10) > MAX_HOME_AND_AWAY_ROUNDS) count += 1
    }
  }
  return count
}

function countRoundsFromColumns(raw: Record<string, string>, headers: string[]): number {
  let total = 0
  for (const col of headers) {
    const val = raw[col]?.trim() ?? ''
    if (!val) continue
    const trailingTotal = val.match(/\((\d+)\)\s*$/)
    if (trailingTotal) total += parseInt(trailingTotal[1], 10)
  }
  return total
}

function hasAnyCompetitionData(raw: Record<string, string>, headers: string[]): boolean {
  return headers.some((col) => (raw[col]?.trim() ?? '') !== '')
}

function getCompetitionColumns(headers: string[]): string[] {
  return headers.filter((header) => !REQUIRED_COLUMNS.includes(header))
}

function normaliseRow(raw: Record<string, string>, headers: string[]): CsvRow | null {
  const total = raw['Total Rounds Played']?.trim()
  const num = total ? parseInt(total, 10) : NaN
  const competitionColumns = getCompetitionColumns(headers)
  const includedCompetitionColumns = competitionColumns.filter(isIncludedCompetitionColumn)
  const hasAnyCompetitionDataInRow = hasAnyCompetitionData(raw, competitionColumns)
  const roundsFromIncludedColumns = countRoundsFromColumns(raw, includedCompetitionColumns)
  const baseTotal = hasAnyCompetitionDataInRow ? roundsFromIncludedColumns : num
  if (Number.isNaN(baseTotal) || baseTotal < 0) return null
  const finalsCount = countFinalsInColumns(raw, includedCompetitionColumns)
  const effectiveTotal = Math.max(0, baseTotal - finalsCount)
  return {
    surname: (raw['Surname'] ?? '').trim(),
    name: (raw['Name'] ?? '').trim(),
    nominatedClub: (raw['Nominated Club'] ?? '').trim(),
    team: (raw['Team'] ?? '').trim(),
    totalMatchesPlayed: effectiveTotal,
  }
}

export function parseCsv(csvText: string): { data: ParsedData; error?: string } {
  const parseOptions = { header: true, skipEmptyLines: true } as const
  let parsed = Papa.parse<Record<string, string>>(csvText, parseOptions)
  let headers = parsed.meta.fields ?? []

  const hasRequiredColumns = (candidateHeaders: string[]) => REQUIRED_COLUMNS.every((col) => candidateHeaders.includes(col))

  if (!hasRequiredColumns(headers)) {
    const firstLineEnd = csvText.indexOf('\n')
    const textWithoutRow1 = firstLineEnd === -1 ? '' : csvText.slice(firstLineEnd + 1)
    const fallbackParsed = Papa.parse<Record<string, string>>(textWithoutRow1, parseOptions)
    const fallbackHeaders = fallbackParsed.meta.fields ?? []
    if (hasRequiredColumns(fallbackHeaders)) {
      parsed = fallbackParsed
      headers = fallbackHeaders
    }
  }

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0]
    return { data: { clubs: [], teamsByClub: {}, playersByClub: {}, playerKeysInMultipleClubs: [] }, error: first?.message ?? 'Parse error' }
  }

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      return { data: { clubs: [], teamsByClub: {}, playersByClub: {}, playerKeysInMultipleClubs: [] }, error: `Missing column: ${col}` }
    }
  }

  const aggregated = new Map<string, number>()
  for (const raw of parsed.data) {
    const row = normaliseRow(raw, headers)
    if (!row || !row.nominatedClub || !row.team) continue
    const key = `${row.surname}|${row.name}|${row.nominatedClub}|${row.team}`
    aggregated.set(key, (aggregated.get(key) ?? 0) + row.totalMatchesPlayed)
  }

  const clubsSet = new Set<string>()
  const teamsByClub = new Map<string, Map<string, number>>()
  const playersByClub = new Map<string, Map<string, PlayerAtClub>>()
  const clubsByPlayerKey = new Map<string, Set<string>>()

  for (const [key, total] of aggregated) {
    const [surname, name, nominatedClub, team] = key.split('|')
    clubsSet.add(nominatedClub)
    const playerKey = `${surname}|${name}`
    if (!clubsByPlayerKey.has(playerKey)) clubsByPlayerKey.set(playerKey, new Set())
    clubsByPlayerKey.get(playerKey)!.add(nominatedClub)
    if (!teamsByClub.has(nominatedClub)) teamsByClub.set(nominatedClub, new Map())
    const teamGrades = teamsByClub.get(nominatedClub)!
    const grade = extractGrade(team)
    if (!teamGrades.has(team)) teamGrades.set(team, grade)

    if (!playersByClub.has(nominatedClub)) playersByClub.set(nominatedClub, new Map())
    const clubPlayers = playersByClub.get(nominatedClub)!
    let player = clubPlayers.get(playerKey)
    if (!player) {
      player = {
        surname,
        name,
        totalClubMatches: 0,
        matchesByTeam: {},
        gradesByTeam: {},
      }
      clubPlayers.set(playerKey, player)
    }
    player.totalClubMatches += total
    player.matchesByTeam[team] = (player.matchesByTeam[team] ?? 0) + total
    player.gradesByTeam[team] = grade
  }

  const clubs = Array.from(clubsSet).sort()
  const resultTeamsByClub: Record<string, TeamGrade[]> = {}
  const resultPlayersByClub: Record<string, PlayerAtClub[]> = {}
  const playerKeysInMultipleClubs = Array.from(clubsByPlayerKey.entries())
    .filter(([, clubs]) => clubs.size > 1)
    .map(([k]) => k)

  for (const club of clubs) {
    const teamMap = teamsByClub.get(club)
    resultTeamsByClub[club] = teamMap
      ? Array.from(teamMap.entries()).map(([team, grade]) => ({ team, grade })).sort((a, b) => a.grade - b.grade)
      : []
    const playerMap = playersByClub.get(club)
    resultPlayersByClub[club] = playerMap ? Array.from(playerMap.values()) : []
  }

  return {
    data: {
      clubs,
      teamsByClub: resultTeamsByClub,
      playersByClub: resultPlayersByClub,
      playerKeysInMultipleClubs,
    },
  }
}
