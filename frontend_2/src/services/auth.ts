export type LoginResult = { token: string; name: string }

export async function login(
  username: string,
  password: string,
): Promise<LoginResult> {
  // 데모용 로그인
  await new Promise((r) => setTimeout(r, 300))
  if (username === 'demo' && password === 'pass1234') {
    return { token: 'demo-token', name: 'Demo User' }
  }
  throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
}

export function saveSession(r: LoginResult) {
  localStorage.setItem('auth_token', r.token)
  localStorage.setItem('auth_name', r.name)
}

export function clearSession() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_name')
}

// 기존 앱 로그인 또는 Spotify 로그인 둘 중 하나라도 true면 로그인으로 간주
export function isLoggedIn() {
  const hasAppSession = !!localStorage.getItem('auth_token')
  const hasSpotifyToken = !!localStorage.getItem('spotify_access_token')
  return hasAppSession || hasSpotifyToken
}

export function currentUserName() {
  return localStorage.getItem('auth_name')
}
