// Spotify 기반 로그인만 사용하도록 변경
// - access_token / user_id / display_name 은 App.tsx, Login.tsx 등에서 localStorage에 저장

// 현재 Spotify 로그인 여부
export function isLoggedIn(): boolean {
  const hasSpotifyToken = !!localStorage.getItem('spotify_access_token')
  return hasSpotifyToken
}

// 로그아웃용 세션 정리
export function clearSession() {
  localStorage.removeItem('spotify_access_token')
  localStorage.removeItem('spotify_user_id')
  localStorage.removeItem('spotify_display_name')
}
