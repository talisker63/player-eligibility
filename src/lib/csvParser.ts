import Papa from 'papaparse'
import type { CsvRow, ParsedData, PlayerAtClub, TeamGrade } from '../types/eligibility'

const REQUIRED_COLUMNS = ['Surname', 'Name', 'Nominated Club', 'Team', 'Total Rounds Played']

function extractGrade(team: string): number {
  const match = team.trim().match(/(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

function isIncludedCompetitionColumn(header: string): boolean {
  return !/[67]-A-Side/i.test(header)
}

function countFinalsInColumns(raw: Record<string, string>, headers: string[]): number {
  let count = 0
  for (const col of headers) {
    const val = raw[col]?.trim() ?? ''
    const matches = val.match(/\(f\)/g)
    if (matches) count += matches.length
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

function normaliseRow(raw: Record<string, string>, headers: string[]): CsvRow | null {
  const total = raw['Total Rounds Played']?.trim()
  const num = total ? parseInt(total, 10) : NaN
  const competitionColumns = headers.slice(5, 18)
  const includedCompetitionColumns = competitionColumns.filter(isIncludedCompetitionColumn)
  const hasCompetitionColumns = competitionColumns.length > 0
  const hasCompetitionDataInRow = hasAnyCompetitionData(raw, competitionColumns)
  const roundsFromIncludedColumns = countRoundsFromColumns(raw, includedCompetitionColumns)
  const baseTotal = hasCompetitionColumns && hasCompetitionDataInRow
    ? roundsFromIncludedColumns
    : num
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
    return { data: { clubs: [], teamsByClub: {}, playersByClub: {} }, error: first?.message ?? 'Parse error' }
  }

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      return { data: { clubs: [], teamsByClub: {}, playersByClub: {} }, error: `Missing column: ${col}` }
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

  for (const [key, total] of aggregated) {
    const [surname, name, nominatedClub, team] = key.split('|')
    clubsSet.add(nominatedClub)
    if (!teamsByClub.has(nominatedClub)) teamsByClub.set(nominatedClub, new Map())
    const teamGrades = teamsByClub.get(nominatedClub)!
    const grade = extractGrade(team)
    if (!teamGrades.has(team)) teamGrades.set(team, grade)

    const playerKey = `${surname}|${name}`
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
    },
  }
}
