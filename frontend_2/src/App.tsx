// App.tsx
import { Routes, Route, Link } from 'react-router-dom'
import { useEffect } from 'react'
import Login from './pages/Login'
import Main from './pages/Main'
import ProtectedRoute from './routes/ProtectedRoute'
import Survey from './pages/Survey'
import TextChat from './pages/TextChat'
import Nearby from './pages/Nearby'

export default function App() {

  // 🔥 Spotify callback에서 온 토큰/유저 정보 저장 + URL 정리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const userId = params.get('user_id')
    const displayName = params.get('display_name')

    if (accessToken && userId) {
      // 🔥 Spotify 로그인 정보 저장 (키 이름 통일)
      localStorage.setItem('spotify_access_token', accessToken)
      localStorage.setItem('spotify_user_id', userId)
      if (displayName) {
        localStorage.setItem('spotify_display_name', displayName)
      }

      // URL에서 토큰 파라미터 제거 (깔끔하게)
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
    <div style={{ maxWidth: 680, margin: '20px auto', padding: 16 }}>
      <nav style={{ marginBottom: 16 }}>
        <Link to="/login">로그인</Link> | <Link to="/survey">설문</Link> |{' '}
        <Link to="/main">메인</Link> | <Link to="/chat">텍스트 챗봇</Link> |{' '}
        <Link to="/nearby">위치 기반 음악 추천</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route path="/survey" element={<Survey />} />

        <Route
          path="/main"
          element={
            <ProtectedRoute>
              <Main />
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
      </Routes>
    </div>
  )
}
