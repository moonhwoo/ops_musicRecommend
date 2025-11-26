import mongoose from "mongoose";

const SurveyResponseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  novelty: { type: Number, required: true },
  yearCategory: { type: String, required: true },
  genres: { type: [String], required: true },
  favorite_artists: { type: [String], required: true },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model("SurveyResponse", SurveyResponseSchema);
