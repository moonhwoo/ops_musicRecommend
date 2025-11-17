import mongoose from "mongoose";

//MongoDB 컬렉션 스키마 정의
//누가 언제 어디서 어떤곡을 들었는지 

const PlayLogSchema = new mongoose.Schema({
  userId: { type: String, index: true }, //사용자
  trackId: { type: String, required: true, index: true }, //트랙(spotify)
  title: String,
  artist: String,
  albumArt: String,
  playedAt: { type: Date, required: true, index: true }, //재생시각
  loc: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true } // [경도(lng), 위도(lat)]
  }
});

PlayLogSchema.index({ loc: "2dsphere" });
export default mongoose.model("PlayLog", PlayLogSchema);
