import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isLoggedIn } from '../services/auth'

type NavState = { from?: string } | null

export default function Login() {
  const nav = useNavigate()
  const loc = useLocation()
  const navState = (loc.state as NavState) || null

  const [spotifyName, setSpotifyName] = useState<string | null>(null)
  const [spotifyUserId, setSpotifyUserId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)

  /** -----------------------------
   *  1) Spotify 콜백 파라미터 처리
   *     - ?display_name=..., ?user_id=...
   *     - localStorage에 저장 + 화면에 반영
   * ----------------------------- */
  useEffect(() => {
    const params = new URLSearchParams(loc.search)

    const displayName = params.get('display_name')
    const spotifyUserId = params.get('user_id')

    if (displayName) {
      localStorage.setItem('spotify_display_name', displayName)
      setSpotifyName(displayName)
    } else {
      const storedName = localStorage.getItem('spotify_display_name')
      if (storedName) setSpotifyName(storedName)
    }

    if (spotifyUserId) {
      localStorage.setItem('spotify_user_id', spotifyUserId)
      setSpotifyUserId(spotifyUserId)
    } else {
      const storedId = localStorage.getItem('spotify_user_id')
      if (storedId) setSpotifyUserId(storedId)
    }

    // 현재 로그인 여부 업데이트
    setLoggedIn(isLoggedIn())
    setChecking(false)
  }, [loc.search])

  /** -----------------------------
   *  2) Spotify 로그인 버튼 클릭
   *     - 백엔드(4000 포트) OAuth 페이지로 이동
   * ----------------------------- */
  function handleSpotifyLogin() {
    window.location.href = 'http://127.0.0.1:4000/login'
  }

  /** -----------------------------
   *  3) 이미 Spotify 로그인된 경우
   *     - 서비스 시작 버튼을 누르면 다음 페이지로 이동
   *     - 기본은 설문 페이지(/survey)
   *     - ProtectedRoute에서 왔으면 원래 가려던 페이지로 이동
   * ----------------------------- */
  function handleStart() {
    // 설문 완료 여부 체크
    const surveyDone = localStorage.getItem('survey_done') === '1'
    // 기본 이동 경로: 설문 완료면 메인, 아니면 설문
    const defaultTarget = surveyDone ? '/main' : '/survey'
    // 설문을 이미 한 사람만 ProtectedRoute에서 넘어온 경우 그 페이지로 우선 이동
    const target =
      surveyDone && navState?.from
        ? navState.from
        : defaultTarget

    nav(target)
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
          color: '#f9fafb',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1280,
          borderRadius: 36,
          padding: 48,
          boxShadow: '0 28px 80px rgba(0, 0, 0, 0.9)',
          backgroundImage:
            'radial-gradient(circle at top left, #1f2933 0, #020617 45%, #000000 100%)',
          backgroundSize: '160% 160%', 
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'row',
          gap: 32,
          alignItems: 'stretch',
        }}
      >
        {/* 왼쪽: 이름 / 설명 영역 */}
        <section
          style={{
            flex: 1.2,
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 14,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#9ca3af',
              marginBottom: 8,
            }}
          >
            SOUND & WEATHER
          </div>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 800,
              marginBottom: 12,
            }}
          >
            풍경음
          </h1>
          <p
            style={{
              fontSize: 18,
              color: '#d1d5db',
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            지금 이 순간의 날씨와 풍경,
            <br />
            그리고 당신의 기분에 어울리는 음악을 찾아 드릴게요.
          </p>

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 10,
              fontSize: 16,
              color: '#9ca3af',
            }}
          >
            <li>• 현재 위치 &amp; 날씨 기반 추천</li>
            <li>• 주변 사람들과 실시간 음악 공유</li>
            <li>• 텍스트로 감정을 전하면 곡을 추천</li>
          </ul>
        </section>

        {/* 오른쪽: Spotify 로그인 카드 */}
        <section
          style={{
            flex: 1,
            background:
              'linear-gradient(145deg, rgba(24,24,24,0.98), rgba(12,12,12,0.98))',
            borderRadius: 24,
            padding: 24,
            boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
            border: '1px solid rgba(75,85,99,0.8)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              Spotify로 시작하기
            </h2>
            <p
              style={{
                fontSize: 14,
                color: '#9ca3af',
                marginBottom: 18,
              }}
            >
              Spotify 계정으로 로그인하면,
              <br />
              좋아하는 음악과 취향을 바탕으로 더 정확한 추천을 만들 수 있어요.
            </p>

            {/* 상태 표시 */}
            {!checking && loggedIn && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(22,163,74,0.12)',
                  border: '1px solid rgba(34,197,94,0.6)',
                  fontSize: 16,
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>
                    {spotifyName || 'Spotify 사용자'}
                  </span>
                  님, 다시 오셨네요 🎧
                </div>
                <div style={{ color: '#a3e635' }}>
                  계정: {spotifyUserId || '연결된 계정 ID'}
                </div>
              </div>
            )}

            {/* Spotify 로그인 / 시작 버튼 */}
            {!loggedIn ? (
              <button
                type="button"
                onClick={handleSpotifyLogin}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#1DB954',
                  color: '#000000',
                  marginTop: 50,
                  marginBottom: 24,
                }}
              >
                <span style={{ fontSize: 18 }}>Spotify 로그인</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#22c55e',
                  color: '#022c22',
                }}
              >
                <span style={{ fontSize: 18 }}>서비스 시작하기</span>
              </button>
            )}
          </div>

          <p
            style={{
              marginTop: 20,
              fontSize: 13,
              color: '#9ca3af',
              lineHeight: 1.5,
            }}
          >
            “Spotify로 로그인” 버튼을 누르면 Spotify 공식 페이지로 이동합니다.
            <br />
            이 웹앱은 로그인에 사용된 아이디/비밀번호를 저장하지 않으며,
            <br />
            Spotify에서 발급한 액세스 토큰과 프로필 정보만 사용합니다.
          </p>
        </section>
      </div>
    </div>
  )
}
