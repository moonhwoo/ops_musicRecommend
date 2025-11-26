import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  // Spotify 고유 유저 ID (필수, 유니크)
  spotify_user_id: { type: String, required: true, unique: true },

  // 표시 이름 (display_name) – 없으면 spotify_user_id로 대체 가능
  display_name: { type: String },

  // 이메일 (Spotify에서 scope 허용해야 내려옴, 지금은 optional)
  email: { type: String },

  // 나중에 쓸 수도 있는 토큰 정보들
  access_token: { type: String },
  refresh_token: { type: String },
  token_expires_at: { type: Date },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  hasSurvey: { type: Boolean, default: false },
});

// updated_at 자동 갱신용
UserSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

const User = mongoose.model("User", UserSchema);
export default User;
