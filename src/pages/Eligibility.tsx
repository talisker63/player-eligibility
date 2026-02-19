import { signOut } from 'firebase/auth'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { downloadCsvFromStorage, uploadCsvToStorage } from '../lib/storage'
import { parseCsv } from '../lib/csvParser'
import { getEligiblePlayers } from '../lib/eligibility'
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

  function handleCheck() {
    if (!data || !club || !team) return
    setEligible(getEligiblePlayers(data, club, team))
  }

  async function handleSignOut() {
    await signOut(auth)
    navigate('/')
  }

  const teams: TeamGrade[] = (data && club ? data.teamsByClub[club] ?? [] : [])
  const canCheck = data && club && team

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Player Eligibility</h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {loadLoading && (
          <p className="text-slate-400 text-sm">Loading saved CSV...</p>
        )}
        {loadError && !data && (
          <p className="text-amber-400 text-sm">{loadError}</p>
        )}

        <section className="bg-slate-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Matches CSV</h2>
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
                <h2 className="text-lg font-semibold mb-3">
                  Eligible players for {team}
                </h2>
                {eligible.length === 0 ? (
                  <p className="text-slate-400">No eligible players match the rules (min 4 games, no 51%+ in a higher team).</p>
                ) : (
                  <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {eligible.map((p) => (
                      <li
                        key={`${p.surname}-${p.name}`}
                        className="flex justify-between items-baseline py-2 border-b border-slate-700 last:border-0"
                      >
                        <span className="font-medium">{p.surname}, {p.name}</span>
                        <span className="text-slate-400 text-sm">{p.totalClubMatches} games</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
