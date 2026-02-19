import { sendPasswordResetEmail } from 'firebase/auth'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../lib/firebase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setMessage('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setStatus('success')
      setMessage('Check your email for the password reset link.')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Failed to send reset email.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          Reset Password
        </h1>
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 rounded-xl p-6 shadow-xl"
        >
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={status === 'loading'}
            className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60"
          />
          {message && (
            <p
              className={`mt-3 text-sm ${
                status === 'success' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-4 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
          </button>
          <Link
            to="/"
            className="mt-4 block text-center text-sm text-slate-400 hover:text-white transition-colors"
          >
            Back to home
          </Link>
        </form>
      </div>
    </div>
  )
}
