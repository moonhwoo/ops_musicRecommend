// App.tsx
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Login from './pages/Login'
import Main from './pages/Main'
import ProtectedRoute from './routes/ProtectedRoute'
import Survey from './pages/Survey'
import TextChat from './pages/TextChat'
import Nearby from './pages/Nearby'

export default function App() {
  // 🔥 Spotify OAuth 콜백으로 들어온 토큰/유저 정보 정리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const userId = params.get('user_id')
    const displayName = params.get('display_name')

    if (accessToken && userId) {
      localStorage.setItem('spotify_access_token', accessToken)
      localStorage.setItem('spotify_user_id', userId)
      if (displayName) {
        localStorage.setItem('spotify_display_name', displayName)
      }

      // URL 깔끔하게 정리
      params.delete('access_token')
      params.delete('user_id')
      params.delete('display_name')
      const newSearch = params.toString()
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : '')
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  return (
    <div className="min-h-screen w-full bg-[#121212] text-white">
      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* 상단 네비게이션 */}
        <nav className="mb-6 flex flex-col items-center gap-3 md:flex-row md:justify-between">
          <div className="text-xl font-semibold tracking-tight">풍경음</div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-300">
            <Link className="hover:text-white" to="/login">
              로그인
            </Link>
            <span className="text-gray-600">|</span>
            <Link className="hover:text-white" to="/survey">
              설문
            </Link>
            <span className="text-gray-600">|</span>
            <Link className="hover:text-white" to="/main">
              메인
            </Link>
            <span className="text-gray-600">|</span>
            <Link className="hover:text-white" to="/chat">
              텍스트 챗봇
            </Link>
            <span className="text-gray-600">|</span>
            <Link className="hover:text-white" to="/nearby">
              위치 기반 추천
            </Link>
          </div>
        </nav>

        {/* 라우팅 */}
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/main"
            element={
              <ProtectedRoute>
                <Main />
              </ProtectedRoute>
            }
          />

          <Route
            path="/survey"
            element={
              <ProtectedRoute>
                <Survey />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <TextChat />
              </ProtectedRoute>
            }
          />

          <Route
            path="/nearby"
            element={
              <ProtectedRoute>
                <Nearby />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </div>
  )
}
