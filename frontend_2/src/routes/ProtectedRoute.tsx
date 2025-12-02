import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isLoggedIn } from '../services/auth'
import { useEffect, useState } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const loc = useLocation()

  // 토큰 처리(파라미터 저장)가 끝났는지 여부
  const [ready, setReady] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(loc.search)

    const accessToken = params.get('access_token')
    const userId = params.get('user_id')
    const displayName = params.get('display_name')

    // 🔥 OAuth 콜백으로 들어온 경우 처리
    if (accessToken) {
      localStorage.setItem('spotify_access_token', accessToken)
      if (userId) localStorage.setItem('spotify_user_id', userId)
      if (displayName) localStorage.setItem('spotify_display_name', displayName)

      // URL에서 민감한 값 제거
      params.delete('access_token')
      params.delete('user_id')
      params.delete('display_name')

      const newSearch = params.toString()
      const newUrl = loc.pathname + (newSearch ? `?${newSearch}` : '')
      window.history.replaceState({}, '', newUrl)
    }

    // 토큰 저장이 끝난 뒤에 로그인 여부 계산
    setOk(isLoggedIn())
    setReady(true)
  }, [loc.pathname, loc.search])

  // 아직 토큰 처리 중이면 아무 것도 렌더하지 않음
  if (!ready) {
    return null
  }


  // 1) 로그인 안 했으면 → 로그인 페이지로
  if (!ok) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }

  // 2) 로그인은 했지만, 아직 설문 안 했는데 메인으로 가려고 하면 설문으로 이동
  if (loc.pathname === '/main') {
    const surveyDone = localStorage.getItem('survey_done') === '1'
    if (!surveyDone) {
      return <Navigate to="/survey" replace />
    }
  }

  // 3) 그 외엔 정상 통과
  return <>{children}</>
}
