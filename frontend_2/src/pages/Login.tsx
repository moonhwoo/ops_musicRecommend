import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login, saveSession } from '../services/auth'

type NavState = { from?: string } | null

export default function Login() {
  /** -----------------------------
   *  1) 기존 앱 로그인 상태
   * ----------------------------- */
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /** -----------------------------
   *  2) Spotify OAuth 상태 표시
   * ----------------------------- */
  const [spotifyName, setSpotifyName] = useState<string | null>(null)

  const nav = useNavigate()
  const loc = useLocation()
  const navState = (loc.state as NavState) ?? null

  // 로그인 후 이동할 기본 경로
  const from = navState?.from || '/survey'

  /** 마운트 시 Spotify 연동 상태 읽기 */
  useEffect(() => {
    const name = localStorage.getItem('spotify_display_name')
    if (name) {
      setSpotifyName(name)
    }
  }, [])

  /** (A) 기존 앱 로그인 처리 */
  async function onSubmitApp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)

    if (!id || !pw) {
      setErr('아이디와 비밀번호를 입력하세요.')
      return
    }

    try {
      setLoading(true)
      const result = await login(id, pw)
      saveSession(result)
      nav(from, { replace: true })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '로그인 실패'
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }

  /** (B) Spotify OAuth 시작 */
  function handleSpotifyLogin() {
    window.location.href = 'http://127.0.0.1:4000/login'
  }

  return (
    <div
      style={{
        maxWidth: 420,
        margin: '60px auto',
        display: 'grid',
        gap: 24,
        color: '#e5e7eb',
      }}
    >
      {/* 1) 기존 앱 로그인 */}
      <section
        style={{
          padding: 24,
          borderRadius: 16,
          background: '#181818',
          boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
          border: '1px solid #27272f',
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0, marginBottom: 12 }}>
          앱 로그인
        </h1>

        <form
          onSubmit={onSubmitApp}
          style={{ display: 'grid', gap: 10, marginTop: 8 }}
        >
          <label style={{ fontSize: 13 }}>
            아이디
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="demo"
              autoComplete="username"
              style={{
                width: '100%',
                marginTop: 4,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #444',
                background: '#181818',
                color: '#f9fafb',
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ fontSize: 13 }}>
            비밀번호
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="pass1234"
              autoComplete="current-password"
              style={{
                width: '100%',
                marginTop: 4,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #444',
                background: '#181818',
                color: '#f9fafb',
                fontSize: 14,
              }}
            />
          </label>

          {err && (
            <div style={{ color: '#f97373', fontSize: 12, marginTop: 4 }}>
              {err}
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            style={{
              marginTop: 8,
              width: '100%',
              padding: '10px 0',
              borderRadius: 10,
              border: '1px solid #15803d',
              background: loading ? '#052e16' : '#15803d',
              color: '#ecfdf5',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {loading ? '확인 중…' : '로그인'}
          </button>
        </form>

        <p
          style={{
            marginTop: 8,
            fontSize: 12,
            color: '#9ca3af',
          }}
        >
          데모 계정: <b>demo / pass1234</b>
        </p>
      </section>

      {/* 2) Spotify OAuth 로그인 */}
      <section
        style={{
          padding: 24,
          borderRadius: 16,
          background: '#181818',
          boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
          border: '1px solid #27272f',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>🎧 Spotify 계정 연동</h2>

        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
          Spotify 계정을 연동하면
          <br />
          주변 사람들의 재생 정보를 활용할 수 있어요.
        </p>

        {spotifyName && (
          <div
            style={{
              marginTop: 6,
              padding: '6px 10px',
              borderRadius: 999,
              background: '#052e16',
              border: '1px solid #15803d',
              fontSize: 12,
              color: '#bbf7d0',
            }}
          >
            현재 <b>{spotifyName}</b> 계정으로 로그인되어 있습니다.
          </div>
        )}

        <button
          onClick={handleSpotifyLogin}
          style={{
            marginTop: 8,
            width: '100%',
            maxWidth: 260,
            background: '#1DB954',
            color: '#000',
            padding: '12px 0',
            fontSize: 15,
            fontWeight: 700,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 18px rgba(0,0,0,0.6)',
          }}
        >
          Spotify 로그인
        </button>

        <p
          style={{
            marginTop: 6,
            fontSize: 11,
            color: '#aaaaaa',
            lineHeight: 1.4,
          }}
        >
          * 이 버튼을 누르면 Spotify 공식 페이지로 이동합니다.
          <br />
          아이디/비밀번호는 Spotify에만 입력되고,
          <br />
          현재 웹에는 액세스 토큰과 프로필 정보만 전달됩니다.
        </p>
      </section>
    </div>
  )
}
