import { useEffect, useMemo, useState } from 'react'

// 서버에서 받아올 곡 정보 타입 정의
type Item = {
  trackId: string;
  title?: string;
  artist?: string;
  albumArt?: string;
  count: number
}

export default function App() {
  // 사용자의 현재 위치
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)

  // 반경(km), 노출 개수
  const [radiusKm, setRadiusKm] = useState(5)
  const [limit, setLimit] = useState(10)

  const [windowD, setWindowD] = useState(30) // 기본 30일

  // 서버 응답 데이터
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)


  // ✅ 위치 가져오기
  useEffect(() => {
    if (!navigator.geolocation) { setErr('이 브라우저는 위치를 지원하지 않아요'); return }
    navigator.geolocation.getCurrentPosition(
      p => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErr('위치 권한이 필요해요 (임시로 0,0 사용)'),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])


  // ✅ API 쿼리 문자열 생성
  const query = useMemo(() => {
    const lat = pos?.lat ?? 0, lng = pos?.lng ?? 0
    const q = new URLSearchParams({
      lat: String(lat), lng: String(lng),
      radius_km: String(radiusKm),
      limit: String(limit),
      window_d: "30", // ✅ 최근 30일 데이터 요청
    })
    return `/api/stats/popular?${q.toString()}`
  }, [pos, radiusKm, limit, windowD])


  // ✅ 주변 인기곡 불러오기
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setLoading(true); setErr(null)
        const res = await fetch(query)
        if (!res.ok) throw new Error('API error')
        const json = await res.json()
        setItems(json.items || [])
      } catch (e: any) { setErr(e.message) }
      finally { setLoading(false) }
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  // ✅ 현재 재생곡 저장 (Spotify 연동)
  async function logCurrentSong() {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 서비스를 지원하지 않아요 😢");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const res = await fetch("/currently-playing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng })
        });

        const data = await res.json();
        console.log("서버 응답:", data);

        if (data.ok) alert("현재 듣는 노래가 저장되었습니다 🎵");
        else alert("노래 저장 실패 또는 현재 재생 중인 곡이 없어요.");
      },
      (err) => {
        console.error(err);
        alert("위치 권한이 필요합니다!");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }




  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>

      {/* ✅ 현재 위치 표시 */}
      {pos ? (
        <p style={{ fontSize: 14, color: '#555' }}>
          📍 내 현재 위치: 위도 {pos.lat.toFixed(6)}, 경도 {pos.lng.toFixed(6)}
        </p>
      ) : (
        <p style={{ fontSize: 14, color: '#999' }}>📍 위치를 불러오는 중...</p>
      )}

      {/* 현재 재생곡 저장 버튼 */}
      <button onClick={logCurrentSong} style={{ padding: '10px', margin: '10px 0', fontSize: '16px' }}>
        🎧 현재 듣는 노래 저장하기
      </button>

      <h2>내 주변 인기곡</h2>

      {/* 반경 및 개수 조정 UI */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        <label>
          반경: {radiusKm}km
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={radiusKm}
            onChange={e => setRadiusKm(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Top N: {limit}
          <input
            type="number"
            min={5}
            max={50}
            value={limit}
            onChange={e => setLimit(parseInt(e.target.value, 10))}
          />
        </label>
      </div>
      <div style={{ marginTop: 12}}>
      <p style={{ fontWeight: 600 }}>조회 기간</p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {[1, 7, 30, 90].map((d) => (
          <label key={d} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="radio"
              name="windowD" 
              value={d}
              checked={windowD === d}
              onChange={() => setWindowD(d)}
            />
            최근 {d}일
          </label>
        ))}
      </div>
      </div>

      {/* 오류 및 로딩 표시 */}
      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      {loading && <p>불러오는 중…</p>}

      {/* 인기곡 리스트 */}
      <ol style={{ marginTop: 12 }}>
        {items.map((it, i) => (
          <li key={it.trackId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #eee' }}>
            {/* ✅ 앨범 커버 이미지 표시 */}
            <div style={{ width: 48, height: 48 }}>
              {it.albumArt ? (
                <img
                  src={it.albumArt}
                  alt={it.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 8,
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#ddd',
                    borderRadius: 8
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{i + 1}. {it.title ?? it.trackId}</div>
              <div style={{ opacity: .7 }}>{it.artist ?? 'Unknown Artist'}</div>
            </div>
            <div style={{ fontVariantNumeric: 'tabular-nums' }}>{it.count}회</div>
          </li>
        ))}
      </ol>
    </div>
  )
}
