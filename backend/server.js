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


//클라이언트가 곡 정보+위치를 직접 보내서 저장 (수동저장)
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
      loc: { type: "Point", coordinates: [loc.lng, loc.lat] },
      source: "popular", //인기곡
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
          query: { 
            playedAt: { $gte: since },
            source: "popular",
          },
        },
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

  // global 사용안함
  //global.spotifyAccessToken = tokenData.access_token;
  //global.spotifyUserId = meData.id;

  // ✅ 토큰/유저ID를 프론트에 쿼리파라미터로 넘기기
  const redirectUrl = new URL(`${process.env.FRONTEND_URL}/app`);
  redirectUrl.searchParams.set("access_token", tokenData.access_token);
  redirectUrl.searchParams.set("user_id", meData.id);
  redirectUrl.searchParams.set("display_name", meData.display_name || meData.id);

  res.redirect(redirectUrl.toString());

});


// 현재 재생 중인 곡 정보
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

// 현재 재생곡 저장 (버튼용: 인기곡 기록)
app.post("/currently-playing", async (req, res) => {
  const { lat, lng, accessToken, userId } = req.body;

  if (!accessToken || !userId)
    return res.status(400).json({ ok: false, error: "missing_token" });

  if (!lat || !lng)
    return res.status(400).json({ ok: false, error: "missing_location" });

  // Spotify 현재 재생곡 요청
  const apiResponse = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await apiResponse.json();

  if (!data || !data.is_playing || !data.item)
    return res.json({ ok: false, message: "현재 재생 중인 곡 없음" });

  const trackId = data.item.uri;
  const title = data.item.name;
  const artist = data.item.artists.map((a) => a.name).join(", ");
  const albumArt = data.item.album.images[0]?.url;
  const playedAt = new Date();

  try {
    const log = await PlayLog.create({
      userId: userId,
      trackId,
      title,
      artist,
      albumArt,
      playedAt,
      loc: { type: "Point", coordinates: [lng, lat] },
      source: "popular", // 인기곡
    });

    return res.json({ ok: true, log });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "db_error" });
  }
});



//반경 2km 이내에서 최근 2분 안에 재생된 곡들을 유저당 1건씩 가져옵니다. (실시간 공유용)
app.get("/api/now/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = Math.min(parseFloat(req.query.radius_km) || 2, 20);
    const windowSec = Math.min(parseInt(req.query.window_s || "120", 10), 600);
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

    if (!isFinite(lat) || !isFinite(lng)) {
      return res.status(400).json({ error: "lat/lng required" });
    }

    const since = new Date(Date.now() - windowSec * 1000);

    const pipeline = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          spherical: true,
          maxDistance: radiusKm * 1000,
          query: {
            playedAt: { $gte: since },
            source: "live", // ✅ 실시간 공유로 저장된 것만
          },
        },
      },
      { $sort: { userId: 1, playedAt: -1 } },
      {
        $group: {
          _id: "$userId",
          doc: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { playedAt: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          userId: 1,
          userName: 1, 
          trackId: 1,
          title: 1,
          artist: 1,
          albumArt: 1,
          playedAt: 1,
          distance: 1,
          loc: 1,
        },
      },
    ];

    const items = await PlayLog.aggregate(pipeline).allowDiskUse(true);
    res.json({ center: { lat, lng }, total: items.length, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});



// ✅ 위치공유용: 실시간으로 듣는 노래 기록 (인기곡에는 반영 X)
app.post("/live/now", async (req, res) => {
  const { lat, lng, accessToken, userId, userName} = req.body;

  // 프론트에서 받은 토큰/유저ID 검사
  if (!accessToken || !userId) {
    return res.status(400).json({
      ok: false,
      error: "missing_token_or_user",
      message: "accessToken 또는 userId 누락됨",
    });
  }

  if (!lat || !lng) {
    return res.status(400).json({ ok: false, error: "no_location" });
  }

  // Spotify 현재 재생곡 API 호출 (프론트의 token 사용!)
  const apiResponse = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await apiResponse.json();

  // 재생 중이 아닐 때는 저장 안 함
  if (!data || data.is_playing !== true || !data.item) {
    return res.json({ ok: false, message: "현재 재생 중인 곡이 없습니다." });
  }

  const trackId = data.item.uri;
  const title = data.item.name;
  const artist = data.item.artists.map(a => a.name).join(", ");
  const albumArt = data.item.album.images[0]?.url;
  const playedAt = new Date();

  try {
    const log = await PlayLog.create({
      userId, // ❗프론트에서 받은 userId 사용
       userName: userName || "익명 사용자",
      trackId,
      title,
      artist,
      albumArt,
      playedAt,
      loc: { type: "Point", coordinates: [lng, lat] },
      source: "live", // 실시간 공유용
    });

    return res.json({ ok: true, log });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "db_error" });
  }
});







const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on :${PORT}`);
});
