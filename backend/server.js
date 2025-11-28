import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import User from "./models/User.js"
import OpenAI from "openai";
import crypto from "crypto";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
console.log("✅ MongoDB connected");

const app = express();
app.use(cors());
app.use(express.json());


import PlayLog from "./models/PlayLog.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


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
    const rawRadius = parseFloat(req.query.radius_km) || 5;
    const radiusKm = Math.min(Math.max(rawRadius, 0.01), 50);
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

  // ⭐ accessToken / refreshToken / expiresIn 변수 선언
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  // 2️⃣ 사용자 정보 가져오기
  const meResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const meData = await meResponse.json();

  const spotifyUserId = meData.id;
  const displayName = meData.display_name || spotifyUserId;
  const email = meData.email || null;

  // ⭐ User를 DB에 upsert
  await User.findOneAndUpdate(
    { spotify_user_id: spotifyUserId }, 
    {
      spotify_user_id: spotifyUserId,
      display_name: displayName,
      email,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: expiresAt,
    },
    { new: true, upsert: true }
  );
  const user = await User.findOneAndUpdate(
  { spotify_user_id: spotifyUserId }, 
  {
    spotify_user_id: spotifyUserId,
    display_name: displayName,
    email,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: expiresAt,
  },
  { new: true, upsert: true }
);

  let redirectPath = user.hasSurvey ? "/main" : "/survey";

  console.log("✅ User upserted:", spotifyUserId, displayName);

  // 프론트로 redirect
 const redirectUrl = new URL(`${process.env.FRONTEND_URL}${redirectPath}`);
redirectUrl.searchParams.set("access_token", accessToken);
redirectUrl.searchParams.set("user_id", spotifyUserId);
redirectUrl.searchParams.set("display_name", displayName);

return res.redirect(redirectUrl.toString());
});

  // Spotify 클라이언트 크레덴셜 토큰 받기 (앱용 토큰)
let spotifyAppToken = null;
let spotifyAppTokenExpiresAt = 0;

async function getSpotifyAppToken() {
  const now = Date.now();
  if (spotifyAppToken && now < spotifyAppTokenExpiresAt - 60_000) {
    return spotifyAppToken;
  }

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error("Spotify token error:", data);
    throw new Error("spotify_auth_error");
  }

  spotifyAppToken = data.access_token;
  spotifyAppTokenExpiresAt = Date.now() + data.expires_in * 1000;
  return spotifyAppToken;
}

// Spotify에서 트랙 하나 찾는 함수
async function searchSpotifyTrack(candidate) {
  const { title, artist, reason } = candidate;
  const token = await getSpotifyAppToken();

  // 조금 더 정확하게 검색
  const q = encodeURIComponent(`track:${title} artist:${artist}`);
  const url = `https://api.spotify.com/v1/search?q=${q}&type=track&limit=3`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error("Spotify search error:", data);
    return null;
  }

  const items = data.tracks?.items || [];
  if (!items.length) return null;

  const t = items[0];

  // --- GPT가 말한 제목/아티스트랑 너무 동떨어지면 버리기 ---
  const spTitle = (t.name || "").toLowerCase();
  const spArtists = (t.artists || [])
    .map((a) => a.name.toLowerCase())
    .join(" ");

  const candTitle = (title || "").toLowerCase();
  const candArtist = (artist || "").toLowerCase();

  const firstWord = (s) => s.split(/\s+/)[0] || "";

  const titleMatch =
    candTitle && spTitle.includes(firstWord(candTitle));
  const artistMatch =
    candArtist && spArtists.includes(firstWord(candArtist));

  if (!titleMatch && !artistMatch) {
    // 너무 안 맞으면 이 후보는 아예 제외
    return null;
  }

  // 🔥 화면에 보여줄 title/artist는 "실제 Spotify 트랙" 기준으로 사용
  return {
    title: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    reason, // GPT reason 그대로
    trackId: t.id,
    uri: t.uri,
    link: t.external_urls?.spotify,
    preview_url: t.preview_url,
    albumArt: t.album?.images?.[0]?.url,
    embed_url: `https://open.spotify.com/embed/track/${t.id}`,
  };
}

// 🌤️ 날씨 기반 노래 추천 (GPT + Spotify 필터링)
app.post("/api/weather-recommend", async (req, res) => {
  try {
    const { city, weather } = req.body;
    // weather: { temp, wind, clouds, precip, ... }

    if (!weather || typeof weather.temp !== "number") {
      return res.status(400).json({ error: "weather_required" });
    }

    const prompt = `
You are a music expert. Recommend 12 real songs that match the following conditions.

⚠ Very important:
- You should recommend songs based on weather information.
 Temperature = ${weather.temp} degrees Celsius, wind =  ${weather.wind} m/s, 
 clouds  = ${weather.clouds}%, precipitation = ${weather.precip}mm.
- Only recommend songs that ACTUALLY EXIST on Spotify.
- Never invent fake songs or fake artists.
- Write the exact title and exact artist name.
- Do not translate or modify the song title.
- Return only songs that are verifiable via Spotify search.
- You should recommend popular English pop songs and popular j-pop songs

Recommend 5 popular English pop songs.
Recommend 7 Korean songs.

Output as JSON array like:
[
  { "title": "Song Name", "artist": "Artist", "reason": "왜 추천하는지" }
]


설명 문장 없이 JSON만 출력해.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1", // 네 계정 상황에 맞게
      messages: [
        {
          role: "system",
          content:
            "너는 사용자의 날씨와 분위기에 맞춰 노래를 추천해주는 음악 큐레이터야.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
    });

    const text = completion.choices[0]?.message?.content || "[]";

    let candidates = [];
    try {
      candidates = JSON.parse(text);
    } catch (e) {
      console.error("JSON parse error:", e, text);
      candidates = [];
    }

    if (!Array.isArray(candidates)) {
      candidates = [];
    }

    // GPT가 준 후보들에 대해 Spotify에서 실제로 존재하는 트랙만 필터
    const checked = await Promise.all(
      candidates.map(async (c) => {
        if (!c.title || !c.artist) return null;
        const base = await searchSpotifyTrack(c);
        if (!base) return null;
        // GPT가 준 reason 붙이기
        return { ...base, reason: c.reason || "" };
      })
    );

    const valid = checked.filter((x) => x !== null);

    // 유효한 곡 없을 때
    if (valid.length == 0){
      return res.json({songs: [] });
    }
    /*랜덤 인덱스 하나 뽑기
    const idx = Math.floor(Math.random() * valid.length);
    const picked = valid[idx]
    return res.json({ songs: [picked] });*/

    // 랜덤 인덱스 3개 뽑기
    const shuffled = [...valid].sort(() => Math.random() - 0.5);
    const top3 = shuffled.slice(0, 3);
    return res.json({ songs: top3 });

    /* 여기서 상위 3개만 선택
    const top3 = valid.slice(0, 3);
    return res.json({ songs: top3 });*/
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
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
    const rawRadius = parseFloat(req.query.radius_km) || 2;
    const radiusKm = Math.min(Math.max(rawRadius, 0.01), 20);
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

import SurveyResponse from "./models/SurveyResponse.js";

app.post("/api/survey/submit", async (req, res) => {
  try {
    const { user_id, answers } = req.body;

    if (!user_id || !answers) {
      return res.status(400).json({ ok: false, error: "missing_fields" });
    }

    await SurveyResponse.create({
      user_id,
      novelty: answers.novelty,
      yearCategory: answers.yearCategory,
      genres: answers.genres,
      favorite_artists: answers.favorite_artists,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Survey save error:", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});


// 설문 제출
app.post("/api/survey", async (req, res) => {
  try {
    const { user_id, novelty, yearCategory, genres, favorite_artists } = req.body;

    await SurveyResponse.create({
      user_id,
      novelty,
      yearCategory,
      genres,
      favorite_artists,
    });

    // 🔥 설문 완료 처리
    await User.findOneAndUpdate(
      { spotify_user_id: user_id },
      { hasSurvey: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});


// 🌤️ 오늘 날씨 기반 노래 추천
app.post("/api/weather-recommend", async (req, res) => {
  try {
    const { city, weather } = req.body;
    // weather: { temp, wind, clouds, precip }

    if (!weather || typeof weather.temp !== "number") {
      return res.status(400).json({ error: "weather_required" });
    }

    const prompt = `
지금 나는 ${city || "어느 도시"}에 있고,
기온은 약 ${weather.temp}도, 바람은 ${weather.wind} m/s,
구름은 ${weather.clouds}%, 강수(1h)는 ${weather.precip}mm 정도인 날씨야.

이 날씨에 어울리는 한국 대중음악 10곡을 JSON 형식으로 추천해줘.
각 항목은 다음 필드를 가져야 해.

[
  {"title": "...", "artist": "...", "reason": "..."},
  ...
]

설명 말고 JSON만 출력해.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // 계정에 맞게 모델명 바꿔도 됨
      messages: [
        {
          role: "system",
          content: "너는 사용자의 날씨와 분위기에 맞춰 노래를 추천해주는 음악 큐레이터야.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices[0]?.message?.content || "[]";

    let songs = [];
    try {
      songs = JSON.parse(text);
    } catch (e) {
      console.error("JSON parse error:", e, text);
      // 망했으면 그냥 빈 배열로
      songs = [];
    }

    res.json({ songs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});




const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on :${PORT}`);
});