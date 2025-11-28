import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { Icon, LatLngExpression } from 'leaflet'

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
  radiusKm: number
  nowFeed: NowPoint[]
}

export default function MapView({ pos, radiusKm, nowFeed }: Props) {
  if (!pos) return <p>지도 로딩 중...</p>

  const center: LatLngExpression = [pos.lat, pos.lng]

  const myIcon: Icon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [32, 32],
  })

  const userIcon: Icon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
    iconSize: [32, 32],
  })

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: '400px', width: '100%', borderRadius: 12 }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 내 위치 */}
      <Marker position={center} icon={myIcon}>
        <Popup>내 위치</Popup>
      </Marker>

      {/* 반경 원 */}
      <Circle
        center={center}
        radius={radiusKm * 1000}
        pathOptions={{ color: 'blue', fillColor: 'rgba(0,0,255,0.2)' }}
      />

      {/* 주변 사람들 */}
      {nowFeed.map((p, i) => {
        const pos: LatLngExpression = [p.lat, p.lng]
        return (
          <Marker key={i} position={pos} icon={userIcon}>
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
        )
      })}
    </MapContainer>
  )
}
