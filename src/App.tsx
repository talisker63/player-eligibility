import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import RotateOverlay from './components/RotateOverlay'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import Eligibility from './pages/Eligibility'
import TermsAndPrivacy from './pages/TermsAndPrivacy'
import { logPageView } from './lib/analytics'

function AppRoutes() {
  const location = useLocation()
  useEffect(() => {
    logPageView(location.pathname)
  }, [location.pathname])
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/terms" element={<TermsAndPrivacy />} />
      <Route path="/eligibility" element={<ProtectedRoute><Eligibility /></ProtectedRoute>} />
    </Routes>
  )
}

function App() {
  return (
    <>
      <RotateOverlay />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  )
}

export default App
