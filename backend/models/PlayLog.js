import mongoose from "mongoose";

//MongoDB 컬렉션 스키마 정의
//누가 언제 어디서 어떤곡을 들었는지 

const PlayLogSchema = new mongoose.Schema({
  userId: { type: String, index: true }, //사용자
  userName: { type: String },   //스포티파이 닉
  trackId: { type: String, required: true, index: true }, //트랙(spotify)
  title: String,
  artist: String,
  albumArt: String,
  playedAt: { type: Date, required: true, index: true }, //재생시각
  loc: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true } // [경도(lng), 위도(lat)]
  },
  // ✅ 어떤 목적의 기록인지 구분
  // popular: 버튼으로 저장한 "인기곡용"
  // live:    위치공유 ON일 때 저장한 "실시간 공유용"
  source: {
    type: String,
    enum: ["popular", "live"],
    default: "popular",
    index: true,
  },
});

PlayLogSchema.index({ loc: "2dsphere" }); // 위치 기반 검색용

PlayLogSchema.index({ userId: 1, playedAt: -1 }); // 유저별 최신 로그용

export default mongoose.model("PlayLog", PlayLogSchema);
