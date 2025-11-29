import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const router = express.Router();

router.get("/top50", async (req, res) => {
  try {
    const manualToken = process.env.TEMP_SPOTIFY_TOKEN;
    if (!manualToken) return res.status(400).json({ message: "토큰 없음" });

    // 2일 전 날짜 계산
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 2); 
    const dateStr = targetDate.toISOString().split('T')[0];

    console.log(`📅 요청 날짜: ${dateStr}`);

    // 내부 API 요청
    const url = `https://charts-spotify-com-service.spotify.com/auth/v0/charts/regional-kr-daily/${dateStr}`;
    const response = await axios.get(url, {
      headers: { "Authorization": manualToken },
    });

    // 50개 자르기
    const entries = response.data.entries.slice(0, 50);

    const tracks = entries.map((entry) => {
      const track = entry.trackMetadata;
      
      // 🔥 [완전 해결] 주소 다듬기 포기 -> "ID만 뽑아서 새로 만들기"
      let imageId = "";

      // 1. URL이든 URI든 일단 가져옴
      const rawImg = track.displayImageUrl || track.displayImageUri;

      if (rawImg) {
          // 2. "/" 또는 ":" 로 다 잘라버리고 맨 마지막 조각(ID)만 가져옴
          // 예: "https://i.scdn.co/image/ab67..." -> "ab67..."
          // 예: "spotify:image:ab67..." -> "ab67..."
          const parts = rawImg.split(/[:/]/); 
          imageId = parts[parts.length - 1]; // 맨 뒤에 있는게 무조건 ID
      }

      // 3. 깨끗한 주소로 재조립
      // ID가 있으면 표준 주소에 붙이고, 없으면 빈 문자열
      const finalImageUrl = imageId ? `https://i.scdn.co/image/${imageId}` : "";

      return {
        rank: entry.chartEntryData.currentRank,
        title: track.trackName,
        artist: track.artists.map(a => a.name).join(", "),
        image: finalImageUrl, 
        id: track.trackUri.split(":").pop()
      };
    });

    console.log(`✅ 로딩 성공: ${tracks.length}곡`);
    
    // (확인용) 첫 번째 이미지 주소 로그
    if (tracks.length > 0) {
        console.log(`📸 이미지 주소 최종: ${tracks[0].image}`);
    }

    res.json({ success: true, count: tracks.length, data: tracks });

  } catch (error) {
    console.error("🔥 에러 발생:", error.message);
    if (error.response) {
      console.error("상태 코드:", error.response.status);
    }
    res.status(500).json({ message: "서버 에러" });
  }
});

export default router;