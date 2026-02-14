const mongoose = require("mongoose");

const studentRewardSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  classId: { type: String, required: true },
  totalXp: { type: Number, default: 0 },
  totalCoins: { type: Number, default: 0 },
  streakDays: { type: Number, default: 1 },
  lastActivityDate: { type: Date }
});

module.exports = mongoose.model("StudentReward", studentRewardSchema);
