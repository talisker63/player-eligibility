import { signOut } from 'firebase/auth'
import { jsPDF } from 'jspdf'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth, functions, httpsCallable } from '../lib/firebase'
import { logEvent } from '../lib/analytics'
import { downloadCsvFromStorage, uploadCsvToStorage } from '../lib/storage'
import { parseCsv } from '../lib/csvParser'
import { extractGrade, getEligiblePlayers, getGamesBias, type RuleSelection } from '../lib/eligibility'
import BuyMeACoffee from '../components/BuyMeACoffee'
import FeedbackModal from '../components/FeedbackModal'
import HelpModal from '../components/HelpModal'
import type { EligiblePlayer, ParsedData, TeamGrade } from '../types/eligibility'

const selectClass =
  'w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60'
const compactSelectClass =
  'px-2.5 py-1.5 rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-xs leading-5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60'

export default function Eligibility() {
  const navigate = useNavigate()
  const [data, setData] = useState<ParsedData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadLoading, setLoadLoading] = useState(true)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [club, setClub] = useState('')
  const [team, setTeam] = useState('')
  const [eligible, setEligible] = useState<EligiblePlayer[] | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<EligiblePlayer | null>(null)
  const [ruleSelection, setRuleSelection] = useState<RuleSelection>('rule1')
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'games-asc' | 'games-desc'>('name-asc')
  const [helpOpen, setHelpOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const justClosedPlayerRef = useRef<EligiblePlayer | null>(null)

  const loadFromStorage = useCallback(async () => {
    setLoadLoading(true)
    setLoadError(null)
    const csvText = await downloadCsvFromStorage()
    setLoadLoading(false)
    if (!csvText) {
      setLoadError('No CSV file in storage. Upload a file below.')
      return
    }
    const { data: parsed, error } = parseCsv(csvText)
    if (error) {
      setLoadError(error)
      setData(null)
      return
    }
    setData(parsed)
    setLoadError(null)
  }, [])

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError(null)
    setUploadLoading(true)
    try {
      const csvText = await file.text()
      const { data: parsed, error } = parseCsv(csvText)
      if (error) {
        setUploadError(error)
        setUploadLoading(false)
        return
      }
      await uploadCsvToStorage(csvText)
      logEvent('csv_uploaded')
      setData(parsed)
      setLoadError(null)
      setClub('')
      setTeam('')
      setEligible(null)
      setSelectedPlayer(null)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }

  function handleClubChange(value: string) {
    setClub(value)
    setTeam('')
    setEligible(null)
    setSelectedPlayer(null)
  }

  function handleTeamChange(value: string) {
    setTeam(value)
    setEligible(null)
    setSelectedPlayer(null)
  }

  function handleRuleChange(value: RuleSelection) {
    setRuleSelection(value)
    setEligible(null)
    setSelectedPlayer(null)
  }

  function handleCheck() {
    if (!data || !club || !team) return
    logEvent('eligibility_check', { rule: ruleSelection })
    setEligible(getEligiblePlayers(data, club, team, ruleSelection))
    setSelectedPlayer(null)
  }

  function handleDownloadEligiblePlayers(format: 'txt' | 'pdf' | 'csv') {
    if (!club || !team || sortedEligible.length === 0) return
    const title = `Club: ${club} | Team: ${team} | Total players: ${sortedEligible.length}`
    const safeClub = club.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
    const escapeCsvField = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
    const safeTeam = team.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
    const stamp = new Date().toISOString().slice(0, 10)
    const filePrefix = `eligible-players-${safeClub || 'club'}-${safeTeam || 'team'}-${stamp}`
    const createDownload = (blob: Blob, filename: string) => {
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      link.click()
      URL.revokeObjectURL(downloadUrl)
    }

    if (format === 'csv') {
      const rows = sortedEligible.map((player) =>
        [
          player.surname,
          player.name,
          player.totalClubMatches,
          player.matchesByTeam[team] ?? 0,
        ]
          .map(escapeCsvField)
          .join(',')
      )
      const csvContent = [
        escapeCsvField(title),
        'Surname,Name,Total Club Games,Games In Selected Team',
        ...rows,
      ].join('\n')
      createDownload(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `${filePrefix}.csv`)
    } else if (format === 'txt') {
      const lines = sortedEligible.map(
        (player, index) =>
          `${index + 1}. ${player.name} ${player.surname} | Total Club Games: ${player.totalClubMatches} | Games In ${team}: ${player.matchesByTeam[team] ?? 0}`
      )
      const txtContent = [title, '', ...lines].join('\n')
      createDownload(new Blob([txtContent], { type: 'text/plain;charset=utf-8;' }), `${filePrefix}.txt`)
    } else {
      const doc = new jsPDF()
      const pageHeight = doc.internal.pageSize.getHeight()
      let y = 16
      doc.setFontSize(12)
      const titleLines = doc.splitTextToSize(title, 180)
      for (const line of titleLines) {
        if (y > pageHeight - 10) {
          doc.addPage()
          y = 16
        }
        doc.text(line, 14, y)
        y += 6
      }
      y += 2
      doc.setFontSize(10)
      for (let i = 0; i < sortedEligible.length; i += 1) {
        const player = sortedEligible[i]
        const line = `${i + 1}. ${player.name} ${player.surname} | Total: ${player.totalClubMatches} | In ${team}: ${player.matchesByTeam[team] ?? 0}`
        const wrapped = doc.splitTextToSize(line, 180)
        for (const part of wrapped) {
          if (y > pageHeight - 10) {
            doc.addPage()
            y = 16
          }
          doc.text(part, 14, y)
          y += 5
        }
      }
      doc.save(`${filePrefix}.pdf`)
    }
    logEvent('eligible_players_downloaded', { team, club, format })
  }

  async function handleSignOut() {
    await signOut(auth)
    navigate('/')
  }

  const teams: TeamGrade[] = (data && club ? data.teamsByClub[club] ?? [] : [])
  const canCheck = data && club && team
  const selectedTeamDivision = teams.find((t) => t.team === team)?.division

  const multiClubInThisClub =
    data && club && eligible !== null
      ? (data.playersByClub[club] ?? []).filter((p) =>
          (data.playerKeysInMultipleClubs ?? []).includes(`${p.surname}|${p.name}`)
        )
      : []
  const showMultiClubWarnings = multiClubInThisClub.length > 0
  const multiClubKeySet = showMultiClubWarnings
    ? new Set(multiClubInThisClub.map((p) => `${p.surname}|${p.name}`))
    : new Set<string>()

  const sortedEligible = eligible === null ? [] : (() => {
    const list = [...eligible]
    if (sortBy === 'name-asc') {
      list.sort((a, b) => `${a.name} ${a.surname}`.toLowerCase().localeCompare(`${b.name} ${b.surname}`.toLowerCase()))
    } else if (sortBy === 'name-desc') {
      list.sort((a, b) => `${b.name} ${b.surname}`.toLowerCase().localeCompare(`${a.name} ${a.surname}`.toLowerCase()))
    } else if (sortBy === 'games-asc') {
      list.sort((a, b) => a.totalClubMatches - b.totalClubMatches)
    } else {
      list.sort((a, b) => b.totalClubMatches - a.totalClubMatches)
    }
    return list
  })()

  useEffect(() => {
    if (selectedPlayer === null && justClosedPlayerRef.current && sortedEligible.length > 0) {
      const p = justClosedPlayerRef.current
      const key = `${p.surname}|${p.name}`
      justClosedPlayerRef.current = null
      requestAnimationFrame(() => {
        document.querySelector(`[data-player-key="${CSS.escape(key)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    }
  }, [selectedPlayer, sortedEligible.length])

  const selectedPlayerByTeam = selectedPlayer
    ? Object.entries(selectedPlayer.matchesByTeam)
      .filter(([, games]) => games > 0)
      .map(([teamName, games]) => ({
        teamName,
        grade: extractGrade(teamName),
        games,
      }))
      .sort((a, b) => {
        const aGrade = a.grade > 0 ? a.grade : Number.POSITIVE_INFINITY
        const bGrade = b.grade > 0 ? b.grade : Number.POSITIVE_INFINITY
        if (aGrade !== bGrade) return aGrade - bGrade
        return a.teamName.localeCompare(b.teamName)
      })
    : []

  const selectedPlayerOtherClubs =
    selectedPlayer && data && club && (data.playerKeysInMultipleClubs ?? []).includes(`${selectedPlayer.surname}|${selectedPlayer.name}`)
      ? data.clubs
          .filter((c) => c !== club)
          .flatMap((c) => {
            const p = (data!.playersByClub[c] ?? []).find(
              (x) => x.surname === selectedPlayer!.surname && x.name === selectedPlayer!.name
            )
            if (!p) return []
            const teamsAtClub = data!.teamsByClub[c] ?? []
            const teams = Object.entries(p.matchesByTeam)
              .filter(([, games]) => games > 0)
              .map(([teamName, games]) => {
                const tg = teamsAtClub.find((t) => t.team === teamName)
                return {
                  teamName,
                  division: tg?.division,
                  games,
                  grade: p.gradesByTeam[teamName] ?? extractGrade(teamName),
                }
              })
              .sort((a, b) => {
                const aGrade = a.grade > 0 ? a.grade : Number.POSITIVE_INFINITY
                const bGrade = b.grade > 0 ? b.grade : Number.POSITIVE_INFINITY
                if (aGrade !== bGrade) return aGrade - bGrade
                return a.teamName.localeCompare(b.teamName)
              })
            if (teams.length === 0) return []
            return [{ club: c, totalClubMatches: p.totalClubMatches, teams }]
          })
      : []

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Player Eligibility</h1>
          <p className="text-sm text-slate-400">Check who is qualified to play in the last three games or the finals.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
            aria-label="Open help"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex gap-6 max-w-5xl mx-auto p-4 pb-16">
        <div className="flex-1 min-w-0 space-y-6">
        {loadLoading && (
          <p className="text-slate-400 text-sm">Loading saved CSV...</p>
        )}
        {loadError && !data && (
          <p className="text-amber-400 text-sm">{loadError}</p>
        )}

        <section className="bg-slate-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Rounds CSV</h2>
          <p className="text-slate-400 text-sm mb-3">
            Download the file &quot;Rounds played per member, per competition * (download CSV file)&quot; from:
          </p>
          <div className="flex flex-col gap-3 mb-3">
            <a
              href="https://results.bowlslink.com.au/event/888793b6-ee24-48f8-9eac-3895cea9f7f8"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline py-3 px-2 -mx-2 rounded-lg hover:bg-slate-700/50 active:bg-slate-700 min-h-[44px] flex items-center"
            >
              Bowls Victoria Weekend results portal
            </a>
            <a
              href="https://results.bowlslink.com.au/event/acf7179a-2367-4254-86fc-8e87e2888534"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline py-3 px-2 -mx-2 rounded-lg hover:bg-slate-700/50 active:bg-slate-700 min-h-[44px] flex items-center"
            >
              Bowls Victoria Midweek results portal
            </a>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            In the grey title box, click &quot;Event Info&quot; to find the CSV download.
          </p>
          <label className="block">
            <span className="sr-only">Upload CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploadLoading}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-700 file:text-white file:font-medium hover:file:bg-slate-600 disabled:opacity-60"
            />
          </label>
          {uploadLoading && <p className="text-slate-400 text-sm mt-2">Uploading...</p>}
          {uploadError && <p className="text-red-400 text-sm mt-2">{uploadError}</p>}
          {data && (
            <div className="flex items-end justify-between gap-2 mt-2">
              <p className="text-slate-400 text-sm">
                Loaded: {data.clubs.length} clubs. Upload a new file to replace.
              </p>
              {data.generatedAt && (
                <p className="text-slate-500 text-xs text-right shrink-0">{data.generatedAt}</p>
              )}
            </div>
          )}
        </section>

        {data && (
          <>
            <section className="bg-slate-800 rounded-xl p-4 space-y-4">
              <h2 className="text-lg font-semibold">Query</h2>
              <div>
                <label htmlFor="club" className="block text-sm font-medium text-slate-300 mb-2">
                  Nominated club
                </label>
                <select
                  id="club"
                  value={club}
                  onChange={(e) => handleClubChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select club</option>
                  {data.clubs.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="team" className="block text-sm font-medium text-slate-300 mb-2">
                  Team
                </label>
                <select
                  id="team"
                  value={team}
                  onChange={(e) => handleTeamChange(e.target.value)}
                  className={selectClass}
                  disabled={!club}
                >
                  <option value="">Select team</option>
                  {teams.map((t) => (
                    <option key={t.team} value={t.team}>{t.division ? `${t.team} - ${t.division}` : t.team}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-sm font-medium text-slate-300 mb-2">Rules</span>
                <fieldset className="flex flex-col gap-2" role="radiogroup" aria-labelledby="rules-label">
                  <label id="rules-label" className="sr-only">Eligibility rule</label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="rules"
                      value="rule1"
                      checked={ruleSelection === 'rule1'}
                      onChange={() => handleRuleChange('rule1')}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 focus:ring-emerald-500"
                    />
                    Four week rule (4+ games in selected team or lower sides)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="rules"
                      value="rule2"
                      checked={ruleSelection === 'rule2'}
                      onChange={() => handleRuleChange('rule2')}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 focus:ring-emerald-500"
                    />
                    51% rule
                  </label>
                </fieldset>
              </div>
              <button
                type="button"
                onClick={handleCheck}
                disabled={!canCheck}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Check eligibility
              </button>
            </section>

            {eligible !== null && (
              <section className="bg-slate-800 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold">
                    Eligible players for {team}{selectedTeamDivision ? ` - ${selectedTeamDivision}` : ''} ({eligible.length})
                  </h2>
                  {eligible.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-300">Download</span>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const value = e.target.value as '' | 'txt' | 'pdf' | 'csv'
                            if (!value) return
                            handleDownloadEligiblePlayers(value)
                            e.target.value = ''
                          }}
                          className={`${compactSelectClass} w-auto min-w-28`}
                        >
                          <option value="">Choose format</option>
                          <option value="txt">Text</option>
                          <option value="pdf">PDF</option>
                          <option value="csv">CSV</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-300">Sort</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className={`${compactSelectClass} w-auto min-w-28`}
                      >
                        <option value="name-asc">Name A–Z</option>
                        <option value="name-desc">Name Z–A</option>
                        <option value="games-asc">Games Low–High</option>
                        <option value="games-desc">Games High–Low</option>
                      </select>
                      </div>
                    </div>
                  )}
                </div>
                {showMultiClubWarnings && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-200 text-sm">
                    {multiClubInThisClub.length} player{multiClubInThisClub.length !== 1 ? 's' : ''} in this club have also played for other clubs. Check eligibility rules for multi-club players.
                  </div>
                )}
                {eligible.length === 0 ? (
                  <p className="text-slate-400">
                    {ruleSelection === 'rule1' && 'No eligible players (4+ games in selected team or lower sides required).'}
                    {ruleSelection === 'rule2' && 'No eligible players (fewer than 51% of games in higher teams required).'}
                  </p>
                ) : selectedPlayer ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold truncate">
                          {selectedPlayer.name} {selectedPlayer.surname}
                        </h3>
                        <p className="text-slate-400 text-sm">Total: {selectedPlayer.totalClubMatches} games</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          justClosedPlayerRef.current = selectedPlayer
                          setSelectedPlayer(null)
                        }}
                        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                        aria-label="Close player details"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </div>
                    <div className="border border-slate-700 rounded-lg overflow-hidden">
                      <div className="flex justify-between gap-3 px-3 py-2 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-700">
                        <span>Division</span>
                        <span>Games</span>
                      </div>
                      <ul className="divide-y divide-slate-700">
                        {selectedPlayerByTeam.map((row) => {
                          const div = data?.teamsByClub[club]?.find((t) => t.team === row.teamName)?.division
                          return (
                            <li key={row.teamName} className="flex justify-between gap-3 px-3 py-2">
                              <span className="text-slate-200">{row.teamName}{div ? ` - ${div}` : ''}</span>
                              <span className="text-slate-300 tabular-nums">{row.games}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                    {selectedPlayerOtherClubs.length > 0 && (
                      <div className="space-y-3">
                        {selectedPlayerOtherClubs.map(({ club: otherClub, totalClubMatches, teams }) => (
                          <div key={otherClub} className="border border-amber-500/50 rounded-lg overflow-hidden bg-amber-500/10">
                            <div className="px-3 py-2 text-sm font-medium text-amber-100 border-b border-amber-500/50">
                              {otherClub} — {totalClubMatches} games total
                            </div>
                            <ul className="divide-y divide-amber-500/30">
                              {teams.map(({ teamName, division, games }) => (
                                <li key={teamName} className="flex justify-between gap-3 px-3 py-2">
                                  <span className="text-amber-100">{teamName}{division ? ` - ${division}` : ''}</span>
                                  <span className="text-amber-100 tabular-nums">{games}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {sortedEligible.map((p) => {
                      const bias = getGamesBias(p, team)
                      const gamesColorClass =
                        bias === 'higher'
                          ? 'text-red-400'
                          : bias === 'lower'
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                      return (
                        <li
                          key={`${p.surname}-${p.name}`}
                          data-player-key={`${p.surname}|${p.name}`}
                          className="flex justify-between items-baseline py-2 border-b border-slate-700 last:border-0"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPlayer(p)}
                              className="font-medium text-left hover:underline decoration-slate-500 underline-offset-4"
                            >
                              {p.name} {p.surname}
                            </button>
                            {multiClubKeySet.has(`${p.surname}|${p.name}`) && (
                              <span
                                className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/50"
                                title="Also played for other club(s)"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Other club(s)
                              </span>
                            )}
                          </div>
                          <span className={`text-sm shrink-0 ${gamesColorClass}`}>{p.totalClubMatches} games</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
        </div>
        <aside className="w-72 shrink-0 self-start mt-12">
          <div className="bg-slate-800/80 border border-slate-600 rounded-xl p-4">
            <p className="text-sm text-slate-300 leading-relaxed mb-2">
              Try Bowlscore — a single app for training (AI analytics), drills and scoring games.
            </p>
            <a
              href="https://bowlscore.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline font-medium"
            >
              bowlscore.com.au
            </a>
          </div>
          <div className="bg-slate-800/80 border border-slate-600 rounded-xl p-4 mt-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              This tool is an indicator only and any results that look suspicious should be checked manually using the Bowls Victoria Spreadsheet.
            </p>
          </div>
        </aside>
      </main>

      <BuyMeACoffee />
      <footer className="fixed bottom-0 left-0 right-0 border-t border-slate-700 px-4 py-3 text-center text-slate-400 text-sm bg-slate-900 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>© This tool is copyright to Andrew Sleight 2026</span>
        <Link to="/terms" className="text-emerald-400 hover:text-emerald-300 underline">
          Terms &amp; Privacy
        </Link>
        <a
          href="https://buymeacoffee.com/asleighty"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          Buy me a coffee
        </a>
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          Feedback
        </button>
      </footer>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={async (subject, message) => {
          const sendFeedback = httpsCallable<{ subject: string; message: string }, { success: boolean }>(
            functions,
            'sendFeedback'
          )
          await sendFeedback({ subject, message })
        }}
      />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} title="Help">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <p className="text-slate-300 text-sm">
            This tool helps you check which players are eligible to play for a selected team under Bowls Victoria rules. Use it to see who qualifies for the last three games or finals.
          </p>

          <section>
            <h3 className="font-semibold text-white mb-2">1. What rules are being checked?</h3>
            <p className="mb-2 text-slate-300 text-sm">
              You can choose one of two rules. Both require players to have at least 4 club games.
            </p>
            <div className="space-y-3 text-slate-300 text-sm">
              <div>
                <strong className="text-white">Rule 1 (Four week rule):</strong> The player must have at least 4 games in the selected team or lower-grade sides (e.g. for Premier 2, count Premier 2, Premier 3, and lower).
              </div>
              <div>
                <strong className="text-white">Rule 2 (51% rule):</strong> Fewer than 51% of the player’s club games must have been in higher teams (e.g. Division 3 is higher than Division 4).
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">2. How to use the tool</h3>
            <div className="space-y-4 text-slate-300 text-sm">
              <div>
                <strong className="text-white">Step 1 — Get the CSV</strong>
                <p className="mt-1 mb-2">Go to the Bowls Victoria results portal (Weekend or Midweek). In the grey title box, click <strong>Event Info</strong> and download &quot;Rounds played per member, per competition * (download CSV file)&quot;.</p>
                <div className="flex flex-col gap-2">
                  <a href="https://results.bowlslink.com.au/event/888793b6-ee24-48f8-9eac-3895cea9f7f8" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline w-fit">
                    Weekend results portal
                  </a>
                  <a href="https://results.bowlslink.com.au/event/acf7179a-2367-4254-86fc-8e87e2888534" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline w-fit">
                    Midweek results portal
                  </a>
                </div>
              </div>
              <div>
                <strong className="text-white">Step 2 — Upload the CSV</strong>
                <p className="mt-1">In the <strong>Rounds CSV</strong> section, click <strong>Choose File</strong> and select your downloaded file. It is stored for all checks until you upload a new one.</p>
              </div>
              <div>
                <strong className="text-white">Step 3 — Run a check</strong>
                <p className="mt-1">Choose <strong>Nominated club</strong> and <strong>Team</strong>, pick a rule, then click <strong>Check eligibility</strong>. The list of eligible players appears below.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">3. How the results work</h3>
            <div className="space-y-3 text-slate-300 text-sm">
              <p><strong className="text-white">Game count colours</strong> — Each player’s total club games is colour-coded: <span className="text-red-400">red</span> = some games in higher sides (brought down), <span className="text-emerald-400">green</span> = some games in lower sides (brought up), grey = equal split.</p>
              <p><strong className="text-white">Sorting</strong> — Use the dropdown to sort by Name A–Z, Name Z–A, Games Low–High, or Games High–Low.</p>
              <p><strong className="text-white">Player details</strong> — Click a player’s name to see games per team. Each team shows its division (e.g. Div 3) and games played. For players who have also played at other clubs, you’ll see a breakdown by team and games at each other club.</p>
              <p><strong className="text-white">Multi-club players</strong> — If the club has players who appear for more than one Nominated Club, a warning banner and <strong>Other club(s)</strong> badges are shown. Eligibility uses only games at the nominated club; check multi-club rules separately if needed.</p>
              <p><strong className="text-white">Download</strong> — Export the eligible list as Text, PDF, or CSV.</p>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">How the data is analysed</h3>
            <p className="mb-2 text-slate-300 text-sm">
              The app reads <strong>Surname</strong>, <strong>Name</strong>, <strong>Nominated Club</strong>, <strong>Team</strong>, and <strong>Total Rounds Played</strong> from the CSV. It aggregates rows by player, club, and team. Finals rounds are excluded from all eligibility calculations. Division labels (Premier, Premier Reserve, Div 1, Div 2, etc.) are read from the CSV headers.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Feedback</h3>
            <p className="text-slate-300 text-sm">
              Use the <strong>Feedback</strong> link in the footer to contact the tool owner.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Support</h3>
            <p className="text-slate-300 text-sm mb-2">
              If this tool has helped you, you can support it by buying me a coffee. Use the <strong>Buy me a coffee</strong> link in the footer or the floating button on the page.
            </p>
            <a
              href="https://buymeacoffee.com/asleighty"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline font-medium"
            >
              buymeacoffee.com/asleighty
            </a>
          </section>

          <p className="text-amber-300 text-sm pt-2 border-t border-slate-600">
            This tool is for guidance only. Please verify any eligibility decisions using the official Bowls Victoria spreadsheet.
          </p>
        </div>
      </HelpModal>
    </div>
  )
}
