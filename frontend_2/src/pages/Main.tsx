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

const GREEN = '#15803d'

export default function Main() {
  const nav = useNavigate()

  const [weather, setWeather] = useState<WeatherNow | null>(null)
  const [city, setCity] = useState<string>('현재 위치')
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherErr, setWeatherErr] = useState<string | null>(null)

  const [songs, setSongs] = useState<Song[]>([])
  const [songsLoading, setSongsLoading] = useState(false)
  const [songsErr, setSongsErr] = useState<string | null>(null)

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
        } catch (e: any) {
          console.error(e)
          setWeatherErr(e?.message ?? '날씨 정보를 가져오지 못했습니다.')
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
      setSongsErr(null)

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
    } catch (e: any) {
      console.error(e)
      setSongsErr(e?.message ?? '추천 음악을 가져오지 못했습니다.')
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
        {/* 날씨 카드 */}
        <section className="flex flex-col gap-4 rounded-2xl bg-[#181818] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.65)] md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-4">
            {weather?.icon && (
              <img
                src={iconUrl(weather.icon)}
                alt={weather.description ?? 'weather'}
                className="h-16 w-16"
              />
            )}
            <div>
              <div className="text-sm text-gray-400">지금 위치</div>
              <div className="text-xl font-semibold">{city}</div>
              {weather && (
                <div className="mt-1 text-sm text-gray-300">
                  {weather.description} · {weather.temp.toFixed(1)}°C · 바람{' '}
                  {weather.wind.toFixed(1)} m/s
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex-1 text-sm text-gray-300 md:mt-0 md:text-right">
            <div className="font-semibold text-emerald-300">
              오늘 날씨에 어울리는 음악을 골라봤어요 🎧
            </div>
            <div className="mt-1">
              <span className="text-xs text-gray-400">
                설문 + 현재 날씨를 함께 반영해 추천해요.
              </span>
            </div>
          </div>
        </section>

        {/* 메인 그리드 */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* 왼쪽: 날씨 기반 추천 리스트 */}
          <section className="rounded-2xl bg-[#181818] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
            <h2 className="mb-3 text-lg font-semibold text-emerald-200">
              오늘의 날씨 기반 추천
            </h2>

            {weatherLoading && (
              <p className="text-sm text-gray-400">날씨를 불러오는 중...</p>
            )}
            {weatherErr && (
              <p className="text-sm text-red-400">{weatherErr}</p>
            )}

            {songsLoading && (
              <p className="mt-3 text-sm text-gray-400">
                추천 곡을 불러오는 중입니다...
              </p>
            )}
            {songsErr && (
              <p className="mt-3 text-sm text-red-400">{songsErr}</p>
            )}

            {!songsLoading && !songsErr && songs.length === 0 && (
              <p className="mt-3 text-sm text-gray-400">
                아직 추천 곡이 없습니다. 잠시 후 다시 시도해주세요.
              </p>
            )}

            <ol className="mt-3 space-y-2 text-sm">
              {songs.map((s, idx) => (
                <li
                  key={s.trackId ?? `${s.title}-${idx}`}
                  className="flex items-center gap-3 rounded-xl border border-[#27272f] bg-[#111827] p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#052e16] text-xs font-bold text-emerald-300">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">
                      {s.title}{' '}
                      <span className="text-xs text-gray-400">
                        - {s.artist}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {s.reason}
                    </div>
                  </div>
                  {s.link && (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-emerald-300 underline"
                    >
                      열기
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* 오른쪽: 기능 카드들 */}
          <section className="flex flex-col gap-4">
            {/* 텍스트 챗봇 카드 */}
            <div className="flex flex-1 flex-col justify-between rounded-2xl bg-[#181818] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
              <div>
                <h2 className="mb-2 text-lg font-semibold text-emerald-200">
                  텍스트 챗봇 추천
                </h2>
                <p className="text-sm text-gray-300">
                  지금 기분이나 상황을 자유롭게 적으면,
                  <br />
                  LLM이 감정 분석 + 플레이리스트를 함께 추천해줘요.
                </p>
              </div>
              <button
                onClick={goTextChat}
                className="mt-4 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-500"
              >
                💬 텍스트로 추천 받기
              </button>
            </div>

            {/* 위치 기반 카드 */}
            <div className="flex flex-1 flex-col justify-between rounded-2xl bg-[#181818] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
              <div>
                <h2 className="mb-2 text-lg font-semibold text-emerald-200">
                  위치 기반 추천
                </h2>
                <p className="text-sm text-gray-300">
                  현재 내 위치 기준으로,
                  <br />
                  주변 사람들이 실제로 듣고 있는 곡과 인기곡을 보여줘요.
                </p>
              </div>
              <button
                onClick={goNearby}
                className="mt-4 w-full rounded-lg border border-emerald-600 py-2 text-sm font-semibold text-emerald-200 hover:bg-[#052e16]"
              >
                📍 내 주변 사람들 음악 보기
              </button>
            </div>
          </section>
        </div>

        {/* 플로팅 버튼: 바로 챗봇으로 */}
        <button
          onClick={goTextChat}
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl shadow-[0_12px_30px_rgba(0,0,0,0.8)] hover:bg-emerald-500"
          title="텍스트 챗봇으로"
          style={{ zIndex: 50 }}
        >
          💬
        </button>
      </div>
    </div>
  )
}
