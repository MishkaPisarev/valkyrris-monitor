import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { MonitorLayout } from './monitor/MonitorLayout'
import { EarthquakeMonitor } from './monitor/EarthquakeMonitor'
import { AdminPanel } from './monitor/AdminPanel'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MonitorLayout />}>
          <Route path="" element={<EarthquakeMonitor />} />
          <Route path="admin/*" element={<AdminPanel />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
