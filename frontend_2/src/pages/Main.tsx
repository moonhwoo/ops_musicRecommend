import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getWeatherByCoords,
  reverseGeocode,
  iconUrl,
  type WeatherNow,
} from '../services/weather'

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

  const [songs, setSongs] = useState<Song[]>([])
  const [songsError, setSongsError] = useState<string | null>(null)
  const [songsLoading, setSongsLoading] = useState(false)

  const [weather, setWeather] = useState<WeatherNow | null>(null)
  const [city, setCity] = useState<string>('현재 위치')
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherErr, setWeatherErr] = useState<string | null>(null)

  // 현재 위치 기반 날씨 + 추천 음악 가져오기
  useEffect(() => {
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
          const msg =
            e instanceof Error
              ? e.message
              : '날씨 정보를 가져오지 못했습니다.'
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

      if (!resp.ok) {
        throw new Error(`weather-recommend error: ${resp.status}`)
      }

      const data = await resp.json()
      setSongs(data.songs ?? [])
    } catch (e: unknown) {
      console.error(e)
      const msg =
        e instanceof Error
          ? e.message
          : '추천 음악을 가져오지 못했습니다.'
      setSongsError(msg)
    } finally {
      setSongsLoading(false)
    }
  }

  function goTextChat() {
    nav('/chat')
  }

  function goNearby() {
    nav('/nearby')
  }

  return (
    <div className="min-h-screen w-full bg-[#121212] text-white">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">
        {/* 🌤️ 상단: 현재 날씨 카드 */}
        <section className="rounded-2xl border border-neutral-800 bg-[#181818] px-5 py-4 text-center shadow-[0_16px_40px_rgba(0,0,0,0.65)]">
          <h2 className="mb-3 text-lg font-semibold text-emerald-200">
            🌤️ 현재 날씨
          </h2>

          {weatherErr && (
            <p className="mb-2 text-sm text-red-400">{weatherErr}</p>
          )}

          <p className="mb-2 text-sm text-gray-300">
            위치: <b>{city}</b>
          </p>

          {weatherLoading && !weather && (
            <p className="text-sm text-gray-400 text-center">날씨를 불러오는 중…</p>
          )}

          {weather && (
            <div className="mt-3 flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
              {weather.icon && (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1f1f1f] shadow-lg">
                  <img
                    src={iconUrl(weather.icon)}
                    alt={weather.description ?? 'weather'}
                    className="h-14 w-14"
                  />
                </div>
              )}
              <ul className="flex flex-wrap justify-center gap-4 text-sm text-gray-200">
                <li>
                  기온: <b>{weather.temp.toFixed(1)}°C</b>
                </li>
                <li>
                  바람: <b>{weather.wind.toFixed(1)} m/s</b>
                </li>
                <li>
                  구름: <b>{weather.clouds}%</b>
                </li>
                <li>
                  강수(1h): <b>{weather.precip} mm</b>
                </li>
              </ul>
            </div>
          )}
        </section>

        {/* 중앙: 좌(날씨 기반 추천) / 우(챗봇 & 위치 추천) */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* 왼쪽: 날씨 기반 추천 리스트 */}
          <section className="rounded-2xl bg-[#181818] p-5 text-center shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
            <h2 className="mb-3 text-center text-lg font-semibold text-emerald-200">
              🎵 현재 날씨에 어울리는 노래
            </h2>

            {songsLoading && (
              <p className="text-sm text-gray-400">추천곡을 불러오는 중…</p>
            )}
            {songsError && (
              <p className="text-sm text-red-400">{songsError}</p>
            )}

            {!songsLoading && !songsError && songs.length === 0 && (
              <p className="text-sm text-gray-400">추천곡이 아직 없습니다.</p>
            )}

            {songs.length > 0 && (
              <ul className="mt-4 grid gap-3 text-sm">
                {songs.map((s, idx) => (
                  <li
                    key={s.trackId ?? idx}
                    className="rounded-xl border border-[#27272f] bg-[#111827] p-3 text-left"
                  >
                    <div className="font-semibold">
                      {idx + 1}. {s.title} - {s.artist}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">{s.reason}</div>

                    {s.embed_url && (
                      <div className="mt-2 overflow-hidden rounded-lg border border-[#27272f]">
                        <iframe
                          src={s.embed_url}
                          width="100%"
                          height="80"
                          style={{ border: 'none' }}
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 오른쪽: 기능 카드들 */}
          <section className="flex flex-col gap-4">
            {/* 텍스트 챗봇 카드 */}
            <div className="flex flex-1 flex-col justify-between rounded-2xl bg-[#181818] p-5 text-center shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
              <div>
                <h2 className="mb-2 text-center text-lg font-semibold text-emerald-200">
                  텍스트로 추천 받기
                </h2>
                <p className="text-sm text-gray-300">
                  지금 기분이나 상황을 한 줄로 적어보세요.
                  <br />
                  그 느낌에 어울리는 노래를 골라서 알려줄게요.
                </p>
              </div>
              <button
                onClick={goTextChat}
                className="mt-4 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-500"
              >
                💬 챗봇과 대화 시작하기
              </button>
            </div>

            {/* 위치 기반 카드 */}
            <div className="flex flex-1 flex-col justify-between rounded-2xl bg-[#181818] p-5 text-center shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
              <div>
                <h2 className="mb-2 text-center text-lg font-semibold text-emerald-200">
                  내 주변에서 인기 있는 노래
                </h2>
                <p className="text-sm text-gray-300">
                  내 위치 근처에서 사람들이 실제로 많이 듣는 노래를
                  보여줘요.
                  <br />
                  지도에서 어디서 어떤 곡이 재생 중인지 함께 볼 수 있어요.
                </p>
              </div>
              <button
                onClick={goNearby}
                className="mt-4 w-full rounded-lg border border-emerald-600 py-2 text-sm font-semibold text-emerald-200 hover:bg-[#052e16]"
              >
                📍 노래 탐색하러 가기
              </button>
            </div>
          </section>
        </div>

        {/* 하단: 인기 차트 영역 */}
        <section className="mt-8 rounded-2xl bg-[#181818] p-5 text-center shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <h2 className="mb-2 text-center text-lg font-semibold text-emerald-200">
            📈 인기 차트
          </h2>
          <p className="text-center text-sm text-gray-400">
            구현 예정
          </p>
        </section>
      </div>
    </div>
  )
}
