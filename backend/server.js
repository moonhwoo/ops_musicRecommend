import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
console.log("✅ MongoDB connected");

const app = express();
app.use(cors());
app.use(express.json());


import PlayLog from "./models/PlayLog.js"; 


//클라이언트가 곡 정보+위치를 직접 보내서 저장
app.post("/api/playlog", async (req, res) => {
  try {
    const { trackId, title, artist, albumArt, playedAt, loc } = req.body;
    if (!trackId || !playedAt || !loc) {
      return res.status(400).json({ error: "필수 값 누락" });
    }

    // 임시 사용자 (Spotify 로그인 연결 시 실제 ID 사용)
    const userId = "test-user";

    const log = await PlayLog.create({
      userId,
      trackId,
      title,
      artist,
      albumArt,
      playedAt: new Date(playedAt),
      loc: { type: "Point", coordinates: [loc.lng, loc.lat] }
    });

    res.json({ ok: true, log });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});


//인기곡 통계
app.get("/api/stats/popular", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = Math.min(parseFloat(req.query.radius_km) || 5, 50);
    const windowD = Math.min(parseInt(req.query.window_d || "1", 10), 90); //최대 90일(3개월)
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);

    if (!isFinite(lat) || !isFinite(lng)) {
      return res.status(400).json({ error: "lat/lng required" });
    }

   // ✅ 최근 N일 이내의 데이터만 사용
    const since = new Date(Date.now() - windowD * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          spherical: true,
          maxDistance: radiusKm * 1000, 
          query: { playedAt: { $gte: since } }
        }
      },
      { $group: { _id: "$trackId", count: { $sum: 1 }, title: { $first: "$title" }, artist: { $first: "$artist" }, albumArt: { $first: "$albumArt" } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ];

    const results = await PlayLog.aggregate(pipeline).allowDiskUse(true);

    res.json({
      center: { lat, lng },
      radiusKm,
      windowD,
      total: results.length,
      items: results.map(r => ({
        trackId: r._id,
        title: r.title,
        artist: r.artist,
        albumArt: r.albumArt,
        count: r.count
      }))
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});


// --- Spotify OAuth 플로우--- //
import querystring from "querystring";
import fetch from "node-fetch";

// 1️⃣ Spotify 로그인 시작
app.get("/login", (req, res) => {
  const scope = [
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-read-recently-played"
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// 2️⃣ Spotify에서 redirect될 때 (토큰 교환)
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;
  if (!code) return res.status(400).send("Missing code");

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
        ).toString("base64")
    },
    body: querystring.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    return res.status(400).send("토큰 발급 실패: " + JSON.stringify(tokenData));
  }

  // ✅ 사용자 정보 가져오기
  const meResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const meData = await meResponse.json();

  // ✅ 토큰 및 사용자 정보 전역 저장 (임시)
  global.spotifyAccessToken = tokenData.access_token;
  global.spotifyUserId = meData.id;

  console.log("✅ Spotify 로그인 성공:", meData.display_name || meData.id);

  // ✅ 로그인 성공 시 프론트엔드 /app 으로 리다이렉트
  res.redirect(`${process.env.FRONTEND_URL}/app`);

});


// 3️⃣ 현재 재생 중인 곡 정보
app.get("/currently-playing", async (req, res) => {
  if (!global.spotifyAccessToken) {
    return res.status(400).send("⚠️ 먼저 /login 으로 로그인하세요");
  }



  const apiResponse = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: { Authorization: `Bearer ${global.spotifyAccessToken}` }
    }
  );

  const data = await apiResponse.json();

  if (!data.item) return res.json({ message: "현재 재생 중인 곡 없음" });

  // 필요한 정보 추출
  const trackId = data.item.uri;
  const title = data.item.name;
  const artist = data.item.artists.map(a => a.name).join(", ");
  const albumArt = data.item.album.images[0]?.url;
  const playedAt = new Date();
  const loc = { lat: 37.5665, lng: 126.9780 }; // 임시 (위치 기능 붙일 때 교체)

  // MongoDB 저장
  try {
    const log = await PlayLog.create({
      userId: global.spotifyUserId || "unknown-user",
      trackId,
      title,
      artist,
      albumArt,
      playedAt,
      loc: { type: "Point", coordinates: [loc.lng, loc.lat] }
    });

    res.json({ ok: true, log });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB 저장 실패" });
  }
});

//현재 재생곡 저장
app.post("/currently-playing", async (req, res) => {
  if (!global.spotifyAccessToken) {
    return res.status(400).json({
      ok: false,
      error: "no_token",
      message: "⚠️ 먼저 /login 으로 로그인하세요"
    });
  }

  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: "위치 정보 누락" });

  const apiResponse = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    { headers: { Authorization: `Bearer ${global.spotifyAccessToken}` } }
  );
  const data = await apiResponse.json();

  if (!data.item) return res.json({ message: "현재 재생 중인 곡 없음" });

  const trackId = data.item.uri;
  const title = data.item.name;
  const artist = data.item.artists.map(a => a.name).join(", ");
  const albumArt = data.item.album.images[0]?.url;
  const playedAt = new Date();

  try {
    const log = await PlayLog.create({
      userId: global.spotifyUserId || "unknown-user",
      trackId,
      title,
      artist,
      albumArt,
      playedAt,
      loc: { type: "Point", coordinates: [lng, lat] }
    });
    res.json({ ok: true, log });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB 저장 실패" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on :${PORT}`);
});
