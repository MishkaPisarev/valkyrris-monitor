import { useState } from 'react'
import { Lock, User, AlertCircle } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { translations } from './i18n'

interface AdminLoginProps {
  onLogin: (username: string, password: string) => Promise<boolean>
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const { language } = useLanguage()
  const t = translations[language]
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Call async login function
      const success = await onLogin(username, password)
      if (!success) {
        setError(language === 'ru' ? 'Неверное имя пользователя или пароль' : 'Invalid username or password')
      }
    } catch (error) {
      console.error('[ADMIN_LOGIN] Login error:', error)
      setError(language === 'ru' ? 'Ошибка при входе в систему' : 'Login error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1e293b] border border-cyan-500/30 rounded-lg p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-cyan-400 uppercase mb-2" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {language === 'ru' ? 'АДМИН_ПАНЕЛЬ' : 'ADMIN_PANEL'}
            </h1>
            <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {language === 'ru' ? 'Вход в систему управления' : 'System Control Access'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                {language === 'ru' ? 'Имя пользователя' : 'Username'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0f172a] border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder={language === 'ru' ? 'Введите имя пользователя' : 'Enter username'}
                  style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                {language === 'ru' ? 'Пароль' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0f172a] border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder={language === 'ru' ? 'Введите пароль' : 'Enter password'}
                  style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertCircle className="w-5 h-5" />
                <span style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 uppercase"
              style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'ru' ? 'Вход...' : 'Logging in...'}</span>
                </>
              ) : (
                <span>{language === 'ru' ? 'Войти' : 'Login'}</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
            {language === 'ru' ? 'Только для авторизованного персонала' : 'Authorized personnel only'}
          </div>
        </div>
      </div>
    </div>
  )
}
