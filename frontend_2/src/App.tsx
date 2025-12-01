import {
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useEffect } from 'react'
import Login from './pages/Login'
import Main from './pages/Main'
import ProtectedRoute from './routes/ProtectedRoute'
import Survey from './pages/Survey'
import TextChat from './pages/TextChat'
import Nearby from './pages/Nearby'
import { isLoggedIn, clearSession } from './services/auth'

export default function App() {
  const loc = useLocation()
  const nav = useNavigate()

  // 현재 로그인 상태 (매 렌더마다 localStorage 기준으로 판단)
  const loggedIn = isLoggedIn()

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
  
  // 로그아웃 처리
  function handleLogout() {
    // auth.ts에 있는 세션 정리
    clearSession()
    // Spotify / 설문 관련 로컬 상태도 함께 제거
    localStorage.removeItem('spotify_access_token')
    localStorage.removeItem('spotify_user_id')
    localStorage.removeItem('spotify_display_name')
    localStorage.removeItem('survey_done')

    nav('/login')
  }

  // "설문 다시하기"는 메인 페이지에서만
  function handleRetrySurvey() {
    nav('/survey')
  }

  return (
    <div className="min-h-screen w-full text-white">
      <div className="w-full bg-[#121212]">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <nav className="mb-6 flex flex-col items-center gap-3 md:flex-row md:justify-between">
            <div className="text-xl font-semibold tracking-tight">
              <Link to="/main" className="hover:text-white">
                풍경음
              </Link>
            </div>

            {/* 우측 영역: 설문 다시하기 + 로그아웃 */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-300">
              {!loggedIn && (
                <Link className="hover:text-white" to="/login">
                  로그인
                </Link>
              )}

              {loggedIn && (
                <>
                  {loc.pathname === '/main' && (
                    <>
                      <button
                        type="button"
                        onClick={handleRetrySurvey}
                        className="hover:text-white"
                      >
                        설문 다시하기
                      </button>
                      <span className="text-gray-600">|</span>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="hover:text-white"
                  >
                    로그아웃
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* 본문: 여기선 bg 안 줌 → body 배경이 보이게 */}
      <div className="mx-auto max-w-6xl px-4 py-8">
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
