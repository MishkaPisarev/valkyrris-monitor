import { Outlet } from 'react-router-dom'
import { LanguageProvider } from './LanguageContext'

/**
 * Layout for the Earthquake Monitor at /monitor/*
 * This layout does NOT include NavBar, Footer, Ticker, etc.
 * It's a completely separate monitoring dashboard.
 */
export function MonitorLayout() {
  return (
    <LanguageProvider>
      <div 
        className="min-h-screen w-full overflow-x-hidden" 
        style={{ 
          backgroundColor: '#0f172a', 
          fontFamily: 'Inter, Roboto, sans-serif',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          minHeight: '-webkit-fill-available' // iOS Safari fix - must be after min-h-screen
        }}
      >
        <Outlet />
      </div>
    </LanguageProvider>
  )
}
