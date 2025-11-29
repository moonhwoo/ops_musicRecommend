import type { ReactNode } from "react";
import { Navigate, useLocation } from 'react-router-dom'
import { isLoggedIn } from '../services/auth'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const loc = useLocation()

  // 기존 앱 로그인 (demo/pass 같은 거)
  const appLoggedIn = isLoggedIn()

  // Spotify 로그인 여부: 토큰 있으면 로그인된 걸로 간주
  const spotifyLoggedIn = !!localStorage.getItem("spotify_access_token")

  const ok = appLoggedIn || spotifyLoggedIn

  if (!ok) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }

  return <>{children}</>
}