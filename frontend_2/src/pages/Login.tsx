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
   *  2) Spotify OAuth 상태 표시용
   *     (토큰/이름은 localStorage에 있다고 가정)
   * ----------------------------- */
  const [spotifyName, setSpotifyName] = useState<string | null>(null)

  const nav = useNavigate()
  const loc = useLocation()
  const navState = loc.state as NavState

  const from = navState?.from || '/survey'

  /* -----------------------------
   *  마운트 시 Spotify 연동 상태 읽기
   *  (Nearby나 다른 페이지에서 OAuth 완료 후
   *   localStorage에 저장해 두었다고 가정)
   * ----------------------------- */
  useEffect(() => {
    const name = localStorage.getItem('spotify_display_name')
    if (name) setSpotifyName(name)
  }, [])

   {/*  (A) 기존 앱 로그인 처리   */}
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

  /** -----------------------------
   *  (B) Spotify OAuth 시작
   * -----------------------------
   *  - OAuth 흐름에서는
   *    1) 이 버튼 → 백엔드 /spotify/login 같은 URL로 이동
   *    2) 백엔드에서 Spotify authorize URL로 리다이렉트
   *    3) Spotify 로그인/동의 후 → 백엔드 callback
   *    4) 백엔드가 토큰 발급받고, 프론트로 토큰/이름 전달
   * ----------------------------- */
  function handleSpotifyLogin() {
    // TODO: 실제 백엔드 OAuth 시작 URL로 수정하기.
    // 예시: http://localhost:4000/spotify/login
    window.location.href = 'http://127.0.0.1:4000/login'
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', display: 'grid', gap: 24 }}>
      {/* 1) 기존 앱 로그인          */}
      <section>
        <h1>앱 로그인</h1>

        <form onSubmit={onSubmitApp} style={{ display: 'grid', gap: 8 }}>
          <label>
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

          <label>
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

          {err && <div style={{ color: 'crimson' }}>{err}</div>}

          <button disabled={loading} type="submit">
            {loading ? '확인 중…' : '로그인'}
          </button>
        </form>

        <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
          데모 계정: <b>demo / pass1234</b>
        </p>
      </section>

      {/* 2) Spotify OAuth 로그인   */}
      <section
        style={{
          padding: 16,
          borderRadius: 12,
          border: '1px solid #eee',
          background: '#121212',
          color: '#fff',
        }}
      >
        <h2 style={{ marginTop: 0 }}>🎧 Spotify 연동</h2>

        {spotifyName ? (
          <p style={{ fontSize: 13, color: '#bbb' }}>
            현재 연결된 계정: <b>{spotifyName}</b>
          </p>
        ) : (
          <p style={{ fontSize: 13, color: '#bbb' }}>
            아직 Spotify 계정이 연결되지 않았습니다.
          </p>
        )}

        <button
          onClick={handleSpotifyLogin}
          style={{
            marginTop: 8,
            background: '#1DB954',
            color: '#fff',
            padding: '12px 24px',
            fontSize: 16,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Spotify로 로그인
        </button>

        <p style={{ marginTop: 8, fontSize: 11, color: '#aaa' }}>
          * 실제 Spotify 공식 로그인은 아이디/비밀번호를 받지 않고,
          <br />
          * Spotify 로그인 페이지로 이동했다가, 토큰만 받아오는 OAuth 방식입니다.
        </p>
      </section>
    </div>
  )
}
