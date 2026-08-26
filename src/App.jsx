import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import ARWrapper from './pages/ARWrapper.jsx'
import NotFound from './pages/NotFound.jsx'
import ServerError from './pages/ServerError.jsx'
import Maintenance from './pages/Maintenance.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/ar" element={<ARWrapper />} />
          <Route path="/ar/:id" element={<ARWrapper />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/error" element={<ServerError />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
