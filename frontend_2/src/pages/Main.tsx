import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWeatherByCoords, reverseGeocode, iconUrl, type WeatherNow } from '../services/weather'

export default function Main() {
  const nav = useNavigate()

  const [city, setCity] = useState('현재 위치')
  const [weather, setWeather] = useState<WeatherNow | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 위치 권한 & OWM 호출
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 기능을 지원하지 않습니다.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        try {
          const [cityName, w] = await Promise.all([
            reverseGeocode(lat, lng),
            getWeatherByCoords(lat, lng),
          ])
          setCity(cityName)
          setWeather(w)
        } catch (e) {
          console.error(e)
          setError('날씨 정보를 불러오지 못했습니다.')
        }
      },
      (err) => {
        console.error(err)
        setError('위치 권한이 필요합니다.')
      },
      { enableHighAccuracy: false, maximumAge: 60_000 }
    )
  }, [])

  function goTextChat() {
    nav('/chat')
  }
  function goNearby() {
    nav('/nearby')
  }

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', padding: 16, display: 'grid', gap: 16 }}>
      {/* 상단: 날씨 카드 */}
      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>🌤️ 현재 날씨</h2>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        <p style={{ margin: '4px 0' }}>
          위치: <b>{city}</b>
          {coords ? ` (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})` : ' - 위치 확인 중'}
        </p>
        {weather ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {weather.icon && <img alt={weather.description ?? 'weather'} src={iconUrl(weather.icon)} />}
            <ul style={{ display: 'flex', gap: 16, padding: 0, margin: 0, listStyle: 'none' }}>
              <li>기온: <b>{weather.temp}°C</b></li>
              <li>바람: <b>{weather.wind} m/s</b></li>
              <li>구름: <b>{weather.clouds}%</b></li>
              <li>강수(1h): <b>{weather.precip} mm</b></li>
            </ul>
          </div>
        ) : (
          <p>날씨를 불러오는 중…</p>
        )}
      </section>

      {/* 오른쪽 하단 플로팅 액션들 */}
      {/* 공통 스타일: 툴팁 가능한 버튼 래퍼 */}
      <div
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          display: 'grid',
          gap: 12,
          zIndex: 1000,
        }}
      >
        {/* 💬 챗봇 버튼 (위쪽) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={goTextChat}
            title="챗봇"
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              border: '1px solid #2c68ff',
              background: '#2f6bff',
              color: '#fff',
              fontSize: 24,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            }}
            aria-label="챗봇"
          >
            💬
          </button>
          <span
            style={{
              position: 'absolute',
              right: 72,
              bottom: 12,
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 12,
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity .2s',
            }}
            className="chat-tooltip"
          >
            챗봇
          </span>
        </div>
        
        {/* 📍 위치 기반 음악 추천 버튼 (아래쪽) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={goNearby}
            title="위치 기반 음악 추천"
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              border: '1px solid #18a058',
              background: '#1baa6a',
              color: '#fff',
              fontSize: 24,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            }}
            aria-label="위치 기반 음악 추천"
          >
            📍
          </button>
          {/* 간단 툴팁 */}
          <span
            style={{
              position: 'absolute',
              right: 72,
              bottom: 12,
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 12,
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity .2s',
            }}
            className="nearby-tooltip"
          >
            위치 기반 추천
          </span>
        </div>

      </div>

      {/* 툴팁 표시를 위한 인라인 스타일 */}
      <style>{`
        div[style] > div:hover > .chat-tooltip,
        div[style] > div:hover > .nearby-tooltip {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
