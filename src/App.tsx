import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import Eligibility from './pages/Eligibility'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/eligibility" element={<ProtectedRoute><Eligibility /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
