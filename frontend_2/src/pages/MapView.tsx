import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";



type NowPoint = {
  userName?: string;
  lat: number;
  lng: number;
  title: string;
  artist: string;
  albumArt?: string;
};

type Props = {
  pos: { lat: number; lng: number } | null;
  radiusKm: number;         // ← 이름 radiusKm
  nowFeed: NowPoint[];
};

// 자동 줌 조절

function AutoZoom({ center, radiusKm }: { center: [number, number], radiusKm: number }) {
  const map = useMap();

  useEffect(() => {
    const [lat, lng] = center;
    const radiusM = radiusKm * 1000; // km → m

    // 1도(위도) ≈ 111.32km → meter 단위 변환
    const latOffset = radiusM / 111320;
    const lngOffset = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));

    // Bound 생성
    const bounds: L.LatLngBoundsLiteral = [
      [lat - latOffset, lng - lngOffset],
      [lat + latOffset, lng + lngOffset]
    ];

    map.fitBounds(bounds, { padding: [30, 30] });

  }, [center, radiusKm, map]);

  return null;
}

export default function MapView({ pos, radiusKm, nowFeed }: Props) {
  if (!pos) return <p>지도 로딩 중...</p>;

  // 내 위치 표시 아이콘
  const myIcon = L.divIcon({
    html: `
    <div style="
      width: 14px;
      height: 14px;
      background: #007aff;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 8px rgba(0,122,255,0.4);
    "></div>`,
    className: "",
    iconSize: [20, 20]
  });

  // 다른 사람 아이콘
  const userIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    iconSize: [32, 32],
  });

  return (
    <MapContainer
      center={[pos.lat, pos.lng]}
      zoom={15} //AutoZoom이 덮어씀
      style={{ height: "400px", width: "100%", borderRadius: "18px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png"
      />

      {/* 반경 자동 줌 */}
      <AutoZoom center={[pos.lat, pos.lng]} radiusKm={radiusKm} />

      {/* 내 위치 */}
      <Marker position={[pos.lat, pos.lng]} icon={myIcon}>
        <Popup>내 위치</Popup>
      </Marker>

      {/* 반경 원 */}
      <Circle
        center={[pos.lat, pos.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: "blue", fillColor: "rgba(0,0,255,0.2)" }}
      />

      {/* 주변 사람들 */}
      {nowFeed.map((p, i) => (
        <Marker key={i} position={[p.lat, p.lng]} icon={userIcon}>
          <Popup>
            <div style={{ width: 150 }}>
              <b>{p.userName || "익명 사용자"}</b>
              <br />
              🎵 {p.title}
              <br />
              {p.artist}
              {p.albumArt && (
                <img
                  src={p.albumArt}
                  style={{ width: "100%", marginTop: 6, borderRadius: 8 }}
                />
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
