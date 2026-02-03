import { useState, useEffect } from 'react'
import { AdminLogin } from './AdminLogin'
import { AdminDashboard, ADMIN_USERNAME, ADMIN_PASSWORD_HASH, sha256 } from './AdminDashboard'

export function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const authStatus = localStorage.getItem('monitor_admin_auth')
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    // Secure authentication using SHA256 hash comparison
    // Never compare plain passwords - always hash the input and compare hashes
    if (username !== ADMIN_USERNAME) {
      return false
    }
    
    try {
      // Compute SHA256 hash of the entered password
      const passwordHash = await sha256(password)
      
      // Compare hashes (constant-time comparison would be better, but for admin panel this is acceptable)
      if (passwordHash === ADMIN_PASSWORD_HASH) {
        localStorage.setItem('monitor_admin_auth', 'authenticated')
        setIsAuthenticated(true)
        return true
      }
    } catch (error) {
      console.error('[ADMIN] Error computing password hash:', error)
    }
    
    return false
  }

  const handleLogout = () => {
    localStorage.removeItem('monitor_admin_auth')
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />
  }

  return <AdminDashboard onLogout={handleLogout} />
}
