export type LoginResult = { token: string; name: string }

export async function login(username: string, password: string): Promise<LoginResult> {
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
export function isLoggedIn() {
  return !!localStorage.getItem('auth_token')
}
export function currentUserName() {
  return localStorage.getItem('auth_name')
}
