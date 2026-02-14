const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema(
  {
    stepNo: { type: Number, required: true },
    selectedIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, default: false }
  },
  { _id: false }
);

const AttemptChallengeSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    classId: { type: String, required: true },
    challengeId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Challenge" },
    type: { type: String, default: "INDIVIDUAL" }, 
    status: { type: String, default: "accepted" }, 
    currentStepNo: { type: Number, default: 1 },
    answers: { type: [AnswerSchema], default: [] },
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    scorePercent: { type: Number, default: 0 },
    submittedAt: { type: Date, default: null },
    coinsEarned: { type: Number, default: 0 },
    xpEarned: { type: Number, default: 0 },
    rewardsAwarded: { type: Boolean, default: false },
    rewardsAwardedAt: { type: Date, default: null },
    winnerBonusAwarded: { type: Boolean, default: false },
    winnerBonusAwardedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AttemptChallenge", AttemptChallengeSchema);
