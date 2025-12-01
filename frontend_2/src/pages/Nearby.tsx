import { useEffect, useMemo, useState } from 'react'
import MapView from './MapView'
import { useNavigate } from "react-router-dom";


type Item = {
  trackId: string
  title?: string
  artist?: string
  albumArt?: string
  count: number
}

type NowItem = {
  userId: string
  userName?: string
  title: string
  artist: string
  albumArt?: string
  distance: number
  playedAt?: string
  lat: number
  lng: number
}

const GREEN = '#15803d'

export default function Nearby() {
  const nav = useNavigate();

  // Spotify 콜백 파라미터 처리 (혹시 App에서 못 받았을 때 대비)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const userId = params.get('user_id')
    const displayName = params.get('display_name')

    if (accessToken && userId) {
      localStorage.setItem('spotify_access_token', accessToken)
      localStorage.setItem('spotify_user_id', userId)
      localStorage.setItem('spotify_display_name', displayName || '')

      params.delete('access_token')
      params.delete('user_id')
      params.delete('display_name')
      const cleanURL =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : '')
      window.history.replaceState({}, '', cleanURL)
    }
  }, [])

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)

  const [radiusKm, setRadiusKm] = useState(1)
  const [limit, setLimit] = useState(10)
  const [windowD, setWindowD] = useState(30)

  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [nowFeed, setNowFeed] = useState<NowItem[]>([])
  const [nowLoading, setNowLoading] = useState(false)

  const [shareOn, setShareOn] = useState(false)

  // 위치 가져오기
  useEffect(() => {
    if (!navigator.geolocation) {
      setErr('이 브라우저는 위치를 지원하지 않아요')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErr('위치 권한이 필요해요 (임시로 0,0 사용)'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [])

  // 인기곡 API 쿼리 문자열
  const query = useMemo(() => {
    const lat = pos?.lat ?? 0
    const lng = pos?.lng ?? 0
    const q = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius_km: String(radiusKm),
      limit: String(limit),
      window_d: String(windowD),
    })
    return `/api/stats/popular?${q.toString()}`
  }, [pos, radiusKm, limit, windowD])

  // 인기곡 가져오기
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setLoading(true)
        setErr(null)
        const res = await fetch(query)
        if (!res.ok) throw new Error('API error')
        const json = await res.json()
        setItems(json.items || [])
      } catch (e: any) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  // 현재 재생곡 저장 (인기곡용)
  async function logCurrentSong() {
    if (!navigator.geolocation) {
      alert('이 브라우저는 위치 서비스를 지원하지 않아요 😢')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude

        const accessToken = localStorage.getItem('spotify_access_token')
        const userId = localStorage.getItem('spotify_user_id')

        const res = await fetch('/currently-playing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lng,
            accessToken,
            userId,
          }),
        })

        const data = await res.json()
        console.log('버튼 저장 응답:', data)

        if (data.ok) alert('인기곡에 반영되었습니다 🎵')
        else alert('❌ 재생 중인 곡이 없어서 저장되지 않았어요!')
      },
      () => alert('위치 권한이 필요합니다!'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  // "지금 듣는 사람들" 불러오기
  useEffect(() => {
    if (!pos) return
    const timer = setInterval(async () => {
      try {
        setNowLoading(true)
        const res = await fetch(
          `/api/now/nearby?lat=${pos.lat}&lng=${pos.lng}&radius_km=${radiusKm}&window_s=10`,
        )
        const data = await res.json()

        const mapped = (data.items || []).map((item: any) => ({
          userName: item.userName,
          title: item.title,
          artist: item.artist,
          albumArt: item.albumArt,
          lat: item.loc.coordinates[1],
          lng: item.loc.coordinates[0],
          distance: item.distance,
        }))

        setNowFeed(mapped)
      } catch (err) {
        console.error(err)
      } finally {
        setNowLoading(false)
      }
    }, 10000)
    return () => clearInterval(timer)
  }, [pos, radiusKm])

  // 위치 공유 ON일 때 /live/now
  useEffect(() => {
    if (!pos || !shareOn) return

    const interval = setInterval(async () => {
      try {
        const accessToken = localStorage.getItem('spotify_access_token')
        const userId = localStorage.getItem('spotify_user_id')
        const userName = localStorage.getItem('spotify_display_name')

        const res = await fetch('/live/now', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: pos.lat,
            lng: pos.lng,
            accessToken,
            userId,
            userName,
          }),
        })
        const data = await res.json()
        console.log('live 업로드 응답:', data)
      } catch (e) {
        console.error('live 업로드 실패:', e)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [pos, shareOn])

  const [tab, setTab] = useState<'popular' | 'live'>('popular')

  return (
    <div className="min-h-screen bg-[#121212] text-white">

      {/* 메인으로 돌아가기 + 제목 */}
      <div className="flex items-center gap-3 border-b border-[#1f2937] px-4 py-3 bg-[#0b0f13]">
        <button
          onClick={() => nav('/main')}
          className="rounded-md border border-emerald-600 px-3 py-1 text-sm text-emerald-300 hover:bg-[#052e16] transition"
        >
          ← 홈으로
        </button>
        <h2 className="text-base font-semibold text-emerald-200">
          내 주변 인기 음악
        </h2>
      </div>

    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        color: '#e5e7eb',
      }}
    >
      {/* 지도 */}
      {pos ? (
        <MapView nowFeed={nowFeed} pos={pos} radiusKm={radiusKm} />
      ) : (
        <p style={{ fontSize: 14, color: '#9ca3af' }}>
          📍 위치를 불러오는 중...
        </p>
      )}

      {/* 반경 */}
      <div
        style={{
          background: '#181818',
          padding: 16,
          borderRadius: 16,
          boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
          border: `1px solid ${GREEN}`,
        }}
      >
        <label style={{ fontWeight: 600 }}>
          반경: {radiusKm.toFixed(2)}km
        </label>
        <input
          type="range"
          min={0.01}
          max={5}
          step={0.01}
          value={radiusKm}
          onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
          style={{
            width: '100%',
            marginTop: 8,
            accentColor: '#22c55e',
            height: 6,
            borderRadius: 999,
            background:
              'linear-gradient(90deg, #064e3b 0%, #16a34a 50%, #4ade80 100%)',
            }}
        />
      </div>

      {/* 탭 */}
      <div
        style={{
          background: '#181818',
          padding: 6,
          borderRadius: 12,
          display: 'flex',
          gap: 6,
          border: '1px solid #27272f',
        }}
      >
        <button
          onClick={() => setTab('popular')}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 10,
            border: 'none',
            fontWeight: 600,
            fontSize: 15,
            background: tab === 'popular' ? GREEN : 'transparent',
            color: tab === 'popular' ? '#ecfdf5' : '#9ca3af',
            transition: '0.2s',
            cursor: 'pointer',
          }}
        >
          인기곡
        </button>

        <button
          onClick={() => setTab('live')}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 10,
            border: 'none',
            fontWeight: 600,
            fontSize: 15,
            background: tab === 'live' ? GREEN : 'transparent',
            color: tab === 'live' ? '#ecfdf5' : '#9ca3af',
            transition: '0.2s',
            cursor: 'pointer',
          }}
        >
          실시간
        </button>
      </div>
    </div>

      {tab === 'popular' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 현재 재생곡 저장 버튼 */}
          <div
            style={{
              background: '#181818',
              padding: 16,
              borderRadius: 16,
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              border: '1px solid #27272f',
            }}
          >
            <button
              onClick={logCurrentSong}
              style={{
                width: '100%',
                padding: '12px 0',
                fontSize: 16,
                borderRadius: 12,
                border: 'none',
                background: GREEN,
                color: '#ecfdf5',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🎧 지금 듣는 노래를 &apos;내 주변 인기곡&apos;에 반영하기
            </button>
          </div>

          {/* 인기곡 카드 */}
          <div
            style={{
              background: '#181818',
              padding: 16,
              borderRadius: 16,
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              border: '1px solid #27272f',
            }}
          >
            <h2
              style={{
                marginBottom: 12,
                fontSize: 18,
                color: '#bbf7d0',
              }}
            >
              내 주변 인기곡
            </h2>

            {/* 조회 기간 */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>조회 기간</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {[1, 7, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setWindowD(d)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 10,
                      border:
                        windowD === d
                          ? `1px solid ${GREEN}`
                          : '1px solid #374151',
                      background:
                        windowD === d ? '#052e16' : '#020617',
                      color: windowD === d ? '#bbf7d0' : '#e5e7eb',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {d}일
                  </button>
                ))}
              </div>
            </div>

            {/* TOP N */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600 }}>TOP N</label>
              <input
                type="number"
                min={5}
                max={50}
                value={limit}
                onChange={(e) =>
                  setLimit(parseInt(e.target.value || '0', 10))
                }
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #374151',
                  background: '#020617',
                  color: '#e5e7eb',
                }}
              />
            </div>

            {/* 오류/로딩 */}
            {err && <p style={{ color: '#f97373' }}>{err}</p>}
            {loading && <p>불러오는 중…</p>}

            {/* 인기곡 리스트 */}
            <ol style={{ marginTop: 12, paddingLeft: 0 }}>
              {items.map((it, i) => (
                <li
                  key={it.trackId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid #27272f',
                    listStyle: 'none',
                  }}
                >
                  <div style={{ width: 48, height: 48 }}>
                    {it.albumArt ? (
                      <img
                        src={it.albumArt}
                        alt={it.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 8,
                          objectFit: 'cover',
                          border: `1px solid ${GREEN}`,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: '#020617',
                          borderRadius: 8,
                          border: '1px solid #374151',
                        }}
                      />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {i + 1}. {it.title ?? it.trackId}
                    </div>
                    <div style={{ opacity: 0.7 }}>
                      {it.artist ?? 'Unknown Artist'}
                    </div>
                  </div>

                  <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {it.count}회
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {tab === 'live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 공유 스위치 */}
          <div
            style={{
              background: '#181818',
              padding: 16,
              borderRadius: 16,
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              border: '1px solid #27272f',
              marginBottom: 4,
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={shareOn}
                onChange={() => setShareOn((v) => !v)}
                style={{ accentColor: GREEN }}
              />
              <span>주변 사람들과 지금 듣는 노래 공유하기</span>
            </label>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              ON 시, 현재 듣는 노래와 위치가 10초마다 업데이트됩니다.
            </p>
          </div>

          {/* 실시간 카드 */}
          <div
            style={{
              background: '#181818',
              padding: 16,
              borderRadius: 16,
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              border: '1px solid #27272f',
            }}
          >
            <h2
              style={{
                marginBottom: 8,
                fontSize: 18,
                color: '#bbf7d0',
              }}
            >
              🗣️ 주변에서 노래 듣는 사람들
            </h2>

            {nowLoading && <p>불러오는 중...</p>}
            {nowFeed.length === 0 && !nowLoading && (
              <p>주변에서 듣는 사람이 없어요 🎵</p>
            )}

            <div style={{ marginTop: 12 }}>
              {nowFeed.map((n, i) => (
                <div
                  key={i}
                  style={{
                    background: '#020617',
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 10,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
                    border: `1px solid ${GREEN}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    {n.albumArt && (
                      <img
                        src={n.albumArt}
                        alt={n.title}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          objectFit: 'cover',
                          border: '1px solid #374151',
                        }}
                      />
                    )}
                    <div>
                      <div>
                        🎵 <b>{n.userName || '익명 사용자'}</b>(이)가{' '}
                        <span style={{ color: GREEN }}>
                          {(n.distance / 1000).toFixed(1)}km
                        </span>{' '}
                        근처에서
                      </div>
                      <div>
                        <b>「{n.title}」</b> — {n.artist} 듣는 중 🎧
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
