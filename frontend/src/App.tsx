import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './components/HomePage'
import KioskPage from './pages/kiosk/KioskPage'
import QRCodePage from './pages/QRCodePage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="/get-qrcode" element={<QRCodePage />} />
      </Routes>
    </Router>
  )
}

export default App
