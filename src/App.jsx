import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import ARWrapper from './pages/ARWrapper.jsx'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ar" element={<ARWrapper />} />
        <Route path="/ar/:id" element={<ARWrapper />} />
      </Routes>
    </BrowserRouter>
  )
}
