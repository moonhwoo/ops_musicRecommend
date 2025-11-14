const API = 'https://api.openweathermap.org'
const KEY = import.meta.env.VITE_OWM_API_KEY as string

export type WeatherNow = {
  temp: number
  wind: number
  clouds: number
  precip: number
  icon?: string
  description?: string
}

export async function getWeatherByCoords(lat: number, lon: number): Promise<WeatherNow> {
  const url = `${API}/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEY}&units=metric&lang=kr`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`OpenWeather error: ${r.status}`)
  const j = await r.json()
  // 강수량: rain.1h 또는 snow.1h가 있을 수 있음
  const precip = (j.rain?.['1h'] ?? j.snow?.['1h'] ?? 0) as number
  const icon = j.weather?.[0]?.icon as string | undefined
  const description = j.weather?.[0]?.description as string | undefined
  return {
    temp: j.main?.temp ?? NaN,
    wind: j.wind?.speed ?? NaN,
    clouds: j.clouds?.all ?? NaN,
    precip,
    icon,
    description,
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `${API}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${KEY}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Geocoding error: ${r.status}`)
  const arr = await r.json()
  const item = arr?.[0]
  if (!item) return '현재 위치'
  // city / name / state / country 조합
  return item.local_names?.ko || item.name || '현재 위치'
}

export function iconUrl(icon?: string) {
  return icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : ''
}
