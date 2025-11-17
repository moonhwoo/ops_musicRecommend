import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'   

type Coords = { lat: number; lng: number }

export default function Nearby() {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tracks, setTracks] = useState<{ title: string; by?: string }[]>([])
  const nav = useNavigate()                     

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 기능을 지원하지 않습니다.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        // TODO: 여기에서 서버로 반경 검색 API 호출 (lat, lng, radius 단계 확장)
        setTracks([
          { title: 'lofi hip hop radio ☕' },
          { title: 'city pop mix - 80s vibe' },
          { title: 'jazz cafe ambience' },
        ])
      },
      (err) => {
        console.error(err)
        setError('위치 권한이 필요합니다.')
      },
      { enableHighAccuracy: false, maximumAge: 60_000 }
    )
  }, [])

  function goHome() {                           
    nav('/main')
  }

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', padding: 16, display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={goHome}
          aria-label="메인으로"
          title="메인으로"
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7', cursor: 'pointer' }}
        >
          ← 메인으로
        </button>
        <h1 style={{ margin: 0 }}>📍 위치 기반 추천</h1>
      </header>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        <p>
          현재 위치: {coords ? `(${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : '확인 중…'}
        </p>

        <h3>추천 목록 (데모)</h3>
        <ul>
          {tracks.map((t, i) => (
            <li key={i}>{t.title}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
