import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getWeatherByCoords,
  reverseGeocode,
  iconUrl,
  type WeatherNow,
} from '../services/weather'

// 차트 데이터 타입
type ChartTrack = {
  rank: number
  title: string
  artist: string
  image: string
  id: string
}

type Song = {
  title: string
  artist: string
  reason: string
  trackId?: string
  link?: string
  preview_url?: string
  albumArt?: string
  embed_url?: string
}

export default function Main() {
  const nav = useNavigate()

  // --- 기존 State ---
  const [songs, setSongs] = useState<Song[]>([])
  const [songsError, setSongsError] = useState<string | null>(null)
  const [songsLoading, setSongsLoading] = useState(false)

  const [weather, setWeather] = useState<WeatherNow | null>(null)
  const [city, setCity] = useState<string>('현재 위치')
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherErr, setWeatherErr] = useState<string | null>(null)

  // --- 차트 관련 State ---
  const [chart, setChart] = useState<ChartTrack[]>([])
  const [chartLoading, setChartLoading] = useState(false)

  // ✅ [추가] 현재 재생 중인 트랙 ID (이게 있으면 플레이어가 뜸)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)

  // 1. 초기 실행
  useEffect(() => {
    fetchChart()

    if (!navigator.geolocation) {
      setWeatherErr('이 브라우저는 위치 정보를 지원하지 않아요.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        try {
          setWeatherLoading(true)
          setWeatherErr(null)

          const [w, cityName] = await Promise.all([
            getWeatherByCoords(lat, lon),
            reverseGeocode(lat, lon),
          ])

          setWeather(w)
          setCity(cityName)

          await fetchSongs(cityName, w)
        } catch (e: unknown) {
          console.error(e)
          const msg = e instanceof Error ? e.message : '날씨 정보를 가져오지 못했습니다.'
          setWeatherErr(msg)
        } finally {
          setWeatherLoading(false)
        }
      },
      (err) => {
        console.error(err)
        setWeatherErr('위치 권한이 필요합니다.')
      },
      { enableHighAccuracy: false, maximumAge: 60_000 },
    )
  }, [])

  // 차트 데이터 가져오기
  async function fetchChart() {
    try {
      setChartLoading(true)
      const resp = await fetch('http://localhost:4000/api/chart/top50')
      const json = await resp.json()

      if (json.success) {
        setChart(json.data)
      } else {
        console.error('차트 로딩 실패:', json.message)
      }
    } catch (e) {
      console.error('차트 API 에러:', e)
    } finally {
      setChartLoading(false)
    }
  }

  // 날씨 추천곡 가져오기
  async function fetchSongs(cityName: string, w: WeatherNow) {
    try {
      setSongsLoading(true)
      setSongsError(null)

      const resp = await fetch(
        'http://localhost:4000/api/weather-recommend',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: cityName,
            weather: w,
          }),
        },
      )

      if (!resp.ok) throw new Error(`weather-recommend error: ${resp.status}`)

      const data = await resp.json()
      setSongs(data.songs ?? [])
    } catch (e: unknown) {
      console.error(e)
      const msg = e instanceof Error ? e.message : '추천 음악을 가져오지 못했습니다.'
      setSongsError(msg)
    } finally {
      setSongsLoading(false)
    }
  }

  function goTextChat() { nav('/chat') }
  function goNearby() { nav('/nearby') }

  return (
    <div className="min-h-screen w-full bg-[#121212] text-white pb-32"> 
      {/* 👆 pb-32 추가: 하단 플레이어가 컨텐츠 가리지 않게 여백 확보 */}
      
      <div className="mx-auto max-w-5xl px-4 pt-6">
        {/* 🌤️ 상단: 현재 날씨 */}
        <section className="rounded-2xl border border-neutral-800 bg-[#181818] px-5 py-4 text-center shadow-lg">
          <h2 className="mb-3 text-lg font-semibold text-emerald-200">🌤️ 현재 날씨</h2>
          {weatherErr && <p className="mb-2 text-sm text-red-400">{weatherErr}</p>}
          <p className="mb-2 text-sm text-gray-300">위치: <b>{city}</b></p>
          {weatherLoading && !weather && <p className="text-sm text-gray-400 text-center">날씨를 불러오는 중…</p>}
          {weather && (
            <div className="mt-3 flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
              {weather.icon && (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1f1f1f] shadow-lg">
                  <img src={iconUrl(weather.icon)} alt="weather" className="h-14 w-14" />
                </div>
              )}
              <ul className="flex flex-wrap justify-center gap-4 text-sm text-gray-200">
                <li>기온: <b>{weather.temp.toFixed(1)}°C</b></li>
                <li>바람: <b>{weather.wind.toFixed(1)} m/s</b></li>
                <li>구름: <b>{weather.clouds}%</b></li>
              </ul>
            </div>
          )}
        </section>

        {/* 중앙 컨텐츠 */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* 날씨 추천 리스트 */}
          <section className="rounded-2xl bg-[#181818] p-5 text-center shadow-lg">
            <h2 className="mb-3 text-center text-lg font-semibold text-emerald-200">🎵 날씨 어울림 추천</h2>
            {songsLoading && <p className="text-sm text-gray-400">불러오는 중…</p>}
            {!songsLoading && songs.length > 0 && (
              <ul className="mt-4 grid gap-3 text-sm">
                {songs.map((s, idx) => (
                  <li key={idx} className="rounded-xl border border-[#27272f] bg-[#111827] p-3 text-left">
                    <div className="font-semibold">{idx + 1}. {s.title} - {s.artist}</div>
                    <div className="mt-1 text-xs text-gray-400">{s.reason}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 기능 버튼들 */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-1 flex-col justify-between rounded-2xl bg-[#181818] p-5 text-center shadow-lg">
              <div>
                <h2 className="mb-2 text-lg font-semibold text-emerald-200">텍스트 추천</h2>
                <p className="text-sm text-gray-300">기분이나 상황을 입력해보세요.</p>
              </div>
              <button onClick={goTextChat} className="mt-4 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold hover:bg-emerald-500">💬 챗봇 대화</button>
            </div>
            <div className="flex flex-1 flex-col justify-between rounded-2xl bg-[#181818] p-5 text-center shadow-lg">
              <div>
                <h2 className="mb-2 text-lg font-semibold text-emerald-200">내 주변 인기곡</h2>
                <p className="text-sm text-gray-300">근처 사람들은 뭘 들을까요?</p>
              </div>
              <button onClick={goNearby} className="mt-4 w-full rounded-lg border border-emerald-600 py-2 text-sm font-semibold text-emerald-200 hover:bg-[#052e16]">📍 노래 탐색</button>
            </div>
          </section>
        </div>

        {/* 📉 인기 차트 영역 */}
        <section className="mt-8 rounded-2xl bg-[#181818] p-5 shadow-lg">
          <h2 className="mb-4 text-center text-lg font-semibold text-emerald-200">🔥 Spotify 대한민국 인기 차트</h2>
          
          {chartLoading && <p className="text-center text-sm text-gray-400">데이터 로딩 중...</p>}
          
          <div className="max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600">
            <ul className="flex flex-col gap-2">
              {chart.map((track) => (
                <li
                  key={track.rank}
                  // ✅ [추가] 클릭 시 해당 트랙 ID를 playingTrack 상태에 저장
                  onClick={() => setPlayingTrack(track.id)}
                  className="flex cursor-pointer items-center gap-4 rounded-lg bg-[#222] p-3 transition hover:bg-[#2a2a2a] hover:scale-[1.01]"
                >
                  <span className={`w-8 text-center text-lg font-bold ${track.rank <= 3 ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {track.rank}
                  </span>
                  <img 
                    src={track.image} 
                    alt={track.title} 
                    className="h-12 w-12 rounded bg-gray-700 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=No+Img' }}
                  />
                  <div className="flex flex-col overflow-hidden text-left">
                    <span className="truncate text-sm font-medium text-white">{track.title}</span>
                    <span className="truncate text-xs text-gray-400">{track.artist}</span>
                  </div>
                  {/* 재생 아이콘 (장식) */}
                  <div className="ml-auto text-emerald-500">▶</div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* ✅ [추가] 하단 고정 뮤직 플레이어 */}
      {playingTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#333] bg-black bg-opacity-95 p-2 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex-1">
              <iframe
                src={`https://open.spotify.com/embed/track/${playingTrack}?utm_source=generator&theme=0`}
                width="100%"
                height="80"
                style={{ border: 'none' }}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
            {/* 닫기 버튼 */}
            <button 
              onClick={() => setPlayingTrack(null)}
              className="ml-4 rounded-full bg-[#333] p-2 text-white hover:bg-[#444]"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}