const mongoose = require("mongoose");

const quizPerformanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  classId: { type: String, required: true },
  quizId: { type: String, required: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  score: { type: Number, required: true },
  xp: { type: Number, required: true },
  coins: { type: Number, required: true },
  attempt: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("quizPerformance", quizPerformanceSchema);