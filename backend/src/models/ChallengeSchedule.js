const mongoose = require("mongoose");

const ChallengeScheduleSchema = new mongoose.Schema({
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge", required: true },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  }
}, { timestamps: true }); // adds createdAt and updatedAt

module.exports = mongoose.model("ChallengeSchedule", ChallengeScheduleSchema);