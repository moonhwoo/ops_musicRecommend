import 'leaflet/dist/leaflet.css'
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'

type NowPoint = {
  userName?: string
  lat: number
  lng: number
  title: string
  artist: string
  albumArt?: string
}

type Props = {
  pos: { lat: number; lng: number } | null
  radiusKm: number // 슬라이더에서 내려오는 반경 km
  nowFeed: NowPoint[]
}

const GREEN = '#15803d'

/** 🔄 반경에 맞춰 자동 줌/이동 */
function AutoZoom({
  center,
  radiusKm,
}: {
  center: [number, number]
  radiusKm: number
}) {
  const map = useMap()

  useEffect(() => {
    const [lat, lng] = center
    const radiusM = radiusKm * 1000 // km → m

    // 1도(위도) ≈ 111.32km
    const latOffset = radiusM / 111_320
    const lngOffset = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))

    const bounds: L.LatLngBoundsLiteral = [
      [lat - latOffset, lng - lngOffset],
      [lat + latOffset, lng + lngOffset],
    ]

    map.fitBounds(bounds, { padding: [30, 30] })
  }, [center, radiusKm, map])

  return null
}

/** "내 위치로 이동" 버튼 */
function MyLocationControl({
  center,
  radiusKm,
}: {
  center: [number, number]
  radiusKm: number
}) {
  const map = useMap()

  const handleClick = () => {
    const [lat, lng] = center
    const radiusM = radiusKm * 1000

    const latOffset = radiusM / 111_320
    const lngOffset = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))

    const bounds: L.LatLngBoundsLiteral = [
      [lat - latOffset, lng - lngOffset],
      [lat + latOffset, lng + lngOffset],
    ]

    map.fitBounds(bounds, { padding: [30, 30] })
  }

  return (
    <div className="leaflet-top leaflet-right">
      <div
        className="leaflet-control"
        style={{
          background: '#181818',
          borderRadius: 8,
          border: '1px solid #27272f',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={handleClick}
          style={{
            padding: '6px 10px',
            fontSize: 12,
            border: 'none',
            background: 'transparent',
            color: '#e5e7eb',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          내 위치
        </button>
      </div>
    </div>
  )
}

export default function MapView({ pos, radiusKm, nowFeed }: Props) {
  if (!pos) return <p>지도 로딩 중...</p>

  const center: [number, number] = [pos.lat, pos.lng]

  // 내 위치 표시 아이콘
  const myIcon = L.divIcon({
    html: `
    <div style="
      width: 14px;
      height: 14px;
      background: ${GREEN};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 8px rgba(0,0,0,0.4);
    "></div>`,
    className: '',
    iconSize: [20, 20],
  })

  // 다른 사람 아이콘
  const userIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
    iconSize: [32, 32],
  })

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{
        height: '400px',
        width: '100%',
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png"
      />

      {/* 반경 자동 줌 */}
      <AutoZoom center={center} radiusKm={radiusKm} />

      {/* 내 위치로 이동 버튼 */}
      <MyLocationControl center={center} radiusKm={radiusKm} />

      {/* 내 위치 마커 */}
      <Marker position={center} icon={myIcon}>
        <Popup>내 위치</Popup>
      </Marker>

      {/* 반경 원 */}
      <Circle
        center={center}
        radius={radiusKm * 1000}
        pathOptions={{
          color: GREEN,
          fillColor: 'rgba(21,128,61,0.25)',
          fillOpacity: 0.6,
        }}
      />

      {/* 주변 사람들 */}
      {nowFeed.map((p, i) => (
        <Marker key={i} position={[p.lat, p.lng]} icon={userIcon}>
          <Popup>
            <div style={{ width: 150 }}>
              <b>{p.userName || '익명 사용자'}</b>
              <br />
              🎵 {p.title}
              <br />
              {p.artist}
              {p.albumArt && (
                <img
                  src={p.albumArt}
                  style={{ width: '100%', marginTop: 6, borderRadius: 8 }}
                />
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
