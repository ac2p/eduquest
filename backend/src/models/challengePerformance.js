const mongoose = require("mongoose");

const challengePerformanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  classId: { type: String, required: true },
  challengeId: { type: String, required: true },
  title: { type: String, required: true },
  difficulty: { type: String, required: true },
  score: { type: Number, required: true },
  xp: { type: Number, required: true },
  coins: { type: Number, required: true },
  attempt: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ChallengePerformance", challengePerformanceSchema);