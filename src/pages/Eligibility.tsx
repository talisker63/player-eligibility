import { signOut } from 'firebase/auth'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, functions, httpsCallable } from '../lib/firebase'
import { downloadCsvFromStorage, uploadCsvToStorage } from '../lib/storage'
import { parseCsv } from '../lib/csvParser'
import { extractGrade, getEligiblePlayers, getGamesBias, type RuleSelection } from '../lib/eligibility'
import FeedbackModal from '../components/FeedbackModal'
import HelpModal from '../components/HelpModal'
import type { EligiblePlayer, ParsedData, TeamGrade } from '../types/eligibility'

const selectClass =
  'w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60'

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
  const [ruleSelection, setRuleSelection] = useState<RuleSelection>('both')
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'games-asc' | 'games-desc'>('name-asc')
  const [helpOpen, setHelpOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

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
    setEligible(getEligiblePlayers(data, club, team, ruleSelection))
    setSelectedPlayer(null)
  }

  async function handleSignOut() {
    await signOut(auth)
    navigate('/')
  }

  const teams: TeamGrade[] = (data && club ? data.teamsByClub[club] ?? [] : [])
  const canCheck = data && club && team

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

  const selectedPlayerByTeam = selectedPlayer
    ? Object.entries(selectedPlayer.matchesByTeam)
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
          <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1">Data rules</p>
            <p className="text-sm text-slate-400">
              Eligibility totals use competition columns (6th-18th) when present, excluding 6-A-Side and 7-A-Side columns. Finals marked <strong>(f)</strong> are excluded. <strong>Total Rounds Played</strong> is used only when a row has no competition-column data.
            </p>
          </div>
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
            <p className="text-slate-400 text-sm mt-2">
              Loaded: {data.clubs.length} clubs. Upload a new file to replace.
            </p>
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
                    <option key={t.team} value={t.team}>{t.team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rules" className="block text-sm font-medium text-slate-300 mb-2">
                  Rules
                </label>
                <select
                  id="rules"
                  value={ruleSelection}
                  onChange={(e) => handleRuleChange(e.target.value as RuleSelection)}
                  className={selectClass}
                >
                  <option value="rule1">Four week rule only (4+ games in selected team or lower sides)</option>
                  <option value="rule2">51% rule only</option>
                  <option value="both">Both rules</option>
                </select>
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
                    Eligible players for {team} ({eligible.length})
                  </h2>
                  {eligible.length > 0 && (
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className={`${selectClass} w-auto min-w-40`}
                    >
                      <option value="name-asc">Name A–Z</option>
                      <option value="name-desc">Name Z–A</option>
                      <option value="games-asc">Games Low–High</option>
                      <option value="games-desc">Games High–Low</option>
                    </select>
                  )}
                </div>
                {eligible.length === 0 ? (
                  <p className="text-slate-400">
                    {ruleSelection === 'rule1' && 'No eligible players (4+ games in selected team or lower sides required).'}
                    {ruleSelection === 'rule2' && 'No eligible players (fewer than 51% of games in higher teams required).'}
                    {ruleSelection === 'both' && 'No eligible players (both rules: 4+ games in selected team or lower sides, and fewer than 51% in higher teams).'}
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
                        onClick={() => setSelectedPlayer(null)}
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
                        {selectedPlayerByTeam.map((row) => (
                          <li key={row.teamName} className="flex justify-between gap-3 px-3 py-2">
                            <span className="text-slate-200">{row.teamName}</span>
                            <span className="text-slate-300 tabular-nums">{row.games}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
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
                          className="flex justify-between items-baseline py-2 border-b border-slate-700 last:border-0"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedPlayer(p)}
                            className="font-medium text-left hover:underline decoration-slate-500 underline-offset-4"
                          >
                            {p.name} {p.surname}
                          </button>
                          <span className={`text-sm ${gamesColorClass}`}>{p.totalClubMatches} games</span>
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

      <footer className="fixed bottom-0 left-0 right-0 border-t border-slate-700 px-4 py-3 text-center text-slate-400 text-sm bg-slate-900 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>© This tool is copyright to Andrew Sleight 2026</span>
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
          <section>
            <h3 className="font-semibold text-white mb-2">How the data is analysed</h3>
            <p className="mb-2 text-slate-300 text-sm">
              The CSV must have columns: <strong>Surname</strong>, <strong>Name</strong>, <strong>Nominated Club</strong>, <strong>Team</strong>, and <strong>Total Rounds Played</strong>. The app aggregates rows by player (surname + name), club, and team, so multiple rows for the same player at the same club and team are summed.
            </p>
            <p className="mb-2 text-slate-300 text-sm">
              If the spreadsheet has competition columns (6th–18th columns), totals are calculated from those columns and <strong>6-A-Side</strong> and <strong>7-A-Side</strong> columns are excluded. <strong>Total Rounds Played</strong> is only used when no competition column data is present for that row.
            </p>
            <p className="mb-2 text-slate-300 text-sm">
              Any cell containing <strong>(f)</strong> in included competition columns is treated as a finals round. For every occurrence of <strong>(f)</strong>, 1 is subtracted from that row’s contribution to the total. Finals rounds are not used when calculating eligibility.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-white mb-2">Obtaining the CSV file</h3>
            <p className="mb-2 text-slate-300 text-sm">
              Go to:
            </p>
            <div className="flex flex-col gap-3 mb-2">
              <a href="https://results.bowlslink.com.au/event/888793b6-ee24-48f8-9eac-3895cea9f7f8" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline py-3 px-2 -mx-2 rounded-lg hover:bg-slate-700/50 active:bg-slate-700 min-h-[44px] flex items-center w-fit">
                Bowls Victoria Weekend results portal
              </a>
              <a href="https://results.bowlslink.com.au/event/acf7179a-2367-4254-86fc-8e87e2888534" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline py-3 px-2 -mx-2 rounded-lg hover:bg-slate-700/50 active:bg-slate-700 min-h-[44px] flex items-center w-fit">
                Bowls Victoria Midweek results portal
              </a>
            </div>
            <p className="mb-2 text-slate-300 text-sm">
              In the grey title box, click <strong>Event Info</strong>. Download the file &quot;Rounds played per member, per competition * (download CSV file)&quot;.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-white mb-2">Uploading the CSV</h3>
            <p className="mb-2 text-slate-300 text-sm">
              In the <strong>Rounds CSV</strong> section, click <strong>Choose File</strong> and select the downloaded CSV. The file is stored and used for all eligibility checks until you upload a new one.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-white mb-2">Running a check</h3>
            <p className="mb-2 text-slate-300 text-sm">
              Select <strong>Nominated club</strong>, then <strong>Team</strong>, then which <strong>Rules</strong> to apply. Click <strong>Check eligibility</strong>. The list of eligible players appears with each player’s total club games. The total is colour-coded: <span className="text-red-400">red</span> = some games in higher sides (brought down), <span className="text-emerald-400">green</span> = some games in lower sides (brought up), grey = equal split.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-white mb-2">Sorting the list</h3>
            <p className="mb-2 text-slate-300 text-sm">
              Use the dropdown above the list to sort by <strong>Name A–Z</strong>, <strong>Name Z–A</strong>, <strong>Games Low–High</strong>, or <strong>Games High–Low</strong>.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-white mb-2">Viewing games per division</h3>
            <p className="mb-2 text-slate-300 text-sm">
              Click a player’s <strong>name</strong> in the eligible list to see how many games that player has played in each division/grade (team) for the nominated club. Click the <strong>X</strong> button to close the detail view and return to the list.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-white mb-2">Eligibility rules</h3>
            <p className="mb-2 text-slate-300 text-sm">
              <strong>Rule 1 (Four week rule)</strong>: The player must have at least 4 games in the selected team or lower-grade sides for that club (e.g. for Premier 2, count Premier 2, Premier 3, etc.).
            </p>
            <p className="mb-2 text-slate-300 text-sm">
              <strong>Rule 2 (51% rule)</strong>: Fewer than 51% of the player’s club games must have been in teams higher than the selected team (e.g. Premier 1 is higher than Premier 2). You can apply Rule 1 only, Rule 2 only, or <strong>Both rules</strong>.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-white mb-2">Feedback</h3>
            <p className="mb-2 text-slate-300 text-sm">
              Use the <strong>Feedback</strong> link in the footer to send a message to the tool owner.
            </p>
          </section>
          <p className="text-amber-300 text-sm pt-2 border-t border-slate-600">
            This tool is an indicator only. Any results that look suspicious should be checked manually using the Bowls Victoria Spreadsheet.
          </p>
        </div>
      </HelpModal>
    </div>
  )
}
