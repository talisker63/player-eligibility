import { useEffect, useState } from 'react'

const inputClass =
  'w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

export default function FeedbackModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (subject: string, message: string) => Promise<void>
}) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && status !== 'loading' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, status])

  useEffect(() => {
    if (!open) {
      setSubject('')
      setMessage('')
      setStatus('idle')
      setError(null)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError(null)
    try {
      await onSubmit(subject || 'Player Eligibility feedback', message)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to send feedback.')
    }
  }

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={() => status !== 'loading' && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div
        className="bg-slate-800 rounded-xl shadow-xl max-w-lg w-full border border-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 id="feedback-title" className="text-lg font-semibold">
            Feedback
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={status === 'loading'}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-60"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {status === 'success' ? (
            <p className="text-emerald-400">Thanks for your feedback. We&apos;ll get back to you soon.</p>
          ) : (
            <>
              <div>
                <label htmlFor="feedback-subject" className="block text-sm font-medium text-slate-300 mb-2">
                  Subject
                </label>
                <input
                  id="feedback-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Player Eligibility feedback"
                  className={inputClass}
                  disabled={status === 'loading'}
                />
              </div>
              <div>
                <label htmlFor="feedback-message" className="block text-sm font-medium text-slate-300 mb-2">
                  Message
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your feedback..."
                  rows={4}
                  required
                  className={`${inputClass} resize-none`}
                  disabled={status === 'loading'}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={status === 'loading'}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === 'loading' || !message.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
