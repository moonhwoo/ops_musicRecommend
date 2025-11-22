import { useEffect, useMemo, useState } from 'react'
import MapView from './MapView';

// 서버에서 받아올 곡 정보 타입 정의
type Item = {
  trackId: string;
  title?: string;
  artist?: string;
  albumArt?: string;
  count: number
}

type NowItem = {
  userId: string;
  userName?: string;
  title: string;
  artist: string;
  albumArt?: string;
  distance: number;
  playedAt: string;
  lat: number;
  lng: number;
};



export default function App() {

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const userId = params.get("user_id");
    const displayName = params.get("display_name");

    if (accessToken && userId) {
      localStorage.setItem("spotify_access_token", accessToken);
      localStorage.setItem("spotify_user_id", userId);
      localStorage.setItem("spotify_display_name", displayName || "");

      params.delete("access_token");
      params.delete("user_id");
      params.delete("display_name");
      const cleanURL =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState({}, "", cleanURL);
    }
  }, []);

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


  const [nowFeed, setNowFeed] = useState<NowItem[]>([]);
  const [nowLoading, setNowLoading] = useState(false);

  // ✅ 위치공유 스위치 상태
  const [shareOn, setShareOn] = useState(false);

  const [liveRadiusKm, setLiveRadiusKm] = useState(2);




  // ✅ 위치 가져오기
  useEffect(() => {
    if (!navigator.geolocation) { setErr('이 브라우저는 위치를 지원하지 않아요'); return }
    navigator.geolocation.getCurrentPosition(
      p => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErr('위치 권한이 필요해요 (임시로 0,0 사용)'),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])


  // ✅ 인기곡 API 쿼리 문자열 생성
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

  // ✅ 현재 재생곡 저장 (버튼 -> 인기곡용)
  async function logCurrentSong() {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 서비스를 지원하지 않아요 😢");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const accessToken = localStorage.getItem("spotify_access_token");
        const userId = localStorage.getItem("spotify_user_id");

        const res = await fetch("/currently-playing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          accessToken,
          userId
        }),
      });


        const data = await res.json();
        console.log("버튼 저장 응답:", data);

        if (data.ok) alert("인기곡에 반영되었습니다 🎵");
        else alert("❌ 재생 중인 곡이 없어서 저장되지 않았어요!");
      },
      () => alert("위치 권한이 필요합니다!"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // ✅ "지금 듣는 사람들" 불러오기 (live 전용)
  useEffect(() => {
    if (!pos) return;
    const timer = setInterval(async () => {
      try {
        setNowLoading(true);
        const res = await fetch(
          `/api/now/nearby?lat=${pos.lat}&lng=${pos.lng}&radius_km=${liveRadiusKm}&window_s=10`
        );
        const data = await res.json();

        const mapped = (data.items || []).map((item: any) => ({
        userName: item.userName,
        title: item.title,
        artist: item.artist,
        albumArt: item.albumArt,
        lat: item.loc.coordinates[1], // lat
        lng: item.loc.coordinates[0], // lng
        distance: item.distance, 
        }));

        setNowFeed(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setNowLoading(false);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [pos]);

  // ✅ 위치공유 ON일 때만 /live/now 자동 업로드
  useEffect(() => {
    if (!pos || !shareOn) return;

    const interval = setInterval(async () => {
      try {
        const accessToken = localStorage.getItem("spotify_access_token");
        const userId = localStorage.getItem("spotify_user_id");
        const userName = localStorage.getItem("spotify_display_name"); 

        const res = await fetch("/live/now", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: pos.lat,
            lng: pos.lng,
            accessToken,
            userId,
            userName, 
          }),
        });
        const data = await res.json();
        console.log("live 업로드 응답:", data);
      } catch (e) {
        console.error("live 업로드 실패:", e);
      }
    }, 10000); // 10초마다

    return () => clearInterval(interval);
  }, [pos, shareOn]);




  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>

      {/* ✅ 현재 위치 지도 표시 */}
      {pos ? (
      <MapView nowFeed={nowFeed} pos={pos} radiusKm={radiusKm} />
    ) : (
      <p style={{ fontSize: 14, color: '#999' }}>📍 위치를 불러오는 중...</p>
    )}

      {/* ✅ 위치공유 스위치 */}
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={shareOn}
            onChange={() => setShareOn(v => !v)}
          />
          <span>주변 사람들과 지금 듣는 노래 공유하기</span>
        </label>
        <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          ON 시, 10초마다 현재 듣는 노래와 내 위치가 익명으로 공유됩니다. (인기곡 통계에는 반영되지 않아요)
        </p>
      </div>

      {/* 현재 재생곡 저장 버튼 (인기곡용) */}
      <button onClick={logCurrentSong} style={{ padding: '10px', margin: '10px 0', fontSize: '16px' }}>
        🎧 현재 듣는 노래를 '내 주변 인기곡'에 반영하기
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

      <div style={{ marginTop: 12 }}>
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

      <h2 style={{ marginTop: 40 }}>🗣️ 주변에서 노래를 듣고 있는 사람들</h2>
      {nowLoading && <p>불러오는 중...</p>}
      {nowFeed.length === 0 && !nowLoading && <p>주변에서 듣는 사람이 없어요 🎵</p>}

      <div style={{ marginTop: 12 }}>
        {nowFeed.map((n, i) => (
          <div
            key={i}
            style={{
              background: "#f8f8f8",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {n.albumArt && (
                <img
                  src={n.albumArt}
                  alt={n.title}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    objectFit: "cover",
                  }}
                />
              )}
              <div>
                <div>
                  🎵 <b>{n.userName || "익명 사용자"}</b>(이)가{" "}
                  <span style={{ color: "#0077cc" }}>
                    {(n.distance / 1000).toFixed(1)}km
                  </span>{" "}
                  근처에서
                </div>
                <div>
                  <b>「{n.title}」</b> — {n.artist} 듣는 중 🎧
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}