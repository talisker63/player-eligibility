import { signOut } from 'firebase/auth'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, functions, httpsCallable } from '../lib/firebase'
import { downloadCsvFromStorage, uploadCsvToStorage } from '../lib/storage'
import { parseCsv } from '../lib/csvParser'
import { getEligiblePlayers, getGamesBias, type RuleSelection } from '../lib/eligibility'
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
  }

  function handleTeamChange(value: string) {
    setTeam(value)
    setEligible(null)
  }

  function handleRuleChange(value: RuleSelection) {
    setRuleSelection(value)
    setEligible(null)
  }

  function handleCheck() {
    if (!data || !club || !team) return
    setEligible(getEligiblePlayers(data, club, team, ruleSelection))
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

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Player Eligibility</h1>
          <p className="text-sm text-slate-400">Last three games or finals.</p>
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
            Download the file &quot;Rounds played per member, per competition * (download CSV file)&quot; from the{' '}
            <a
              href="https://results.bowlslink.com.au/event/888793b6-ee24-48f8-9eac-3895cea9f7f8"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              Bowls Victoria results portal
            </a>
            . In the grey title box, click &quot;Event Info&quot; to find the CSV download.
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
                          <span className="font-medium">{p.name} {p.surname}</span>
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
          <div className="bg-slate-800/80 border border-slate-600 rounded-xl p-4 sticky top-4">
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
        <div>
          <h3 className="font-semibold text-white mb-2">Obtaining the CSV file</h3>
          <p className="mb-3">
            Go to the{' '}
            <a href="https://results.bowlslink.com.au/event/888793b6-ee24-48f8-9eac-3895cea9f7f8" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">
              Bowls Victoria results portal
            </a>
            . In the grey title box, click <strong>Event Info</strong>. Download the file &quot;Rounds played per member, per competition * (download CSV file)&quot;.
          </p>
          <h3 className="font-semibold text-white mb-2">Uploading the CSV</h3>
          <p className="mb-3">
            Use the file input in the Rounds CSV section to upload the downloaded CSV. The file is stored and used for all eligibility checks until you upload a new file.
          </p>
          <h3 className="font-semibold text-white mb-2">Checking eligibility</h3>
          <p className="mb-3">
            Choose a <strong>Nominated club</strong>, a <strong>Team</strong>, and which <strong>Rules</strong> to apply, then click <strong>Check eligibility</strong>. The list of eligible players appears with their total club games. Game counts are colour-coded: <span className="text-red-400">red</span> means more games in higher sides, <span className="text-emerald-400">green</span> means more games in lower sides, and grey means an equal split.
          </p>
          <h3 className="font-semibold text-white mb-2">Eligibility rules</h3>
          <p className="mb-3">
            You can select which rule(s) to apply. <strong>Rule 1 (Four week rule)</strong>: the player must have at least 4 games in the selected team or lower-grade sides for that club. <strong>Rule 2 (51% rule)</strong>: fewer than 51% of their club games were in teams higher than the selected team. Choose &quot;Both rules&quot; to require both.
          </p>
          <p className="text-amber-300">
            This tool is an indicator only. Any results that look suspicious should be checked manually using the Bowls Victoria Spreadsheet.
          </p>
        </div>
      </HelpModal>
    </div>
  )
}
