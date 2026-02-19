import { onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { auth } from '../lib/firebase'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(auth.currentUser)
  const [checking, setChecking] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setChecking(false)
    })
    return () => unsub()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }
  return <>{children}</>
}
