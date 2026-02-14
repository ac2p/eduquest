const mongoose = require("mongoose");


const answerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    questionType: { type: String, default: "" },
    selected: { type: mongoose.Schema.Types.Mixed },
    textAnswer: { type: String },
    pairs: [{ left: String, right: String }]
  },
  { _id: false }
);


const attemptQuizSchema = new mongoose.Schema(
  {
    quizId: { type: String, required: true },
    studentId: { type: String, required: true },
    answers: { type: [answerSchema], default: [] },
    currentIndex: { type: Number, default: 0 },
    scoredPoints: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    scorePercent: { type: Number, default: 0 },
    xpEarned: {type: Number,default: 0},
    coinsEarned: { type: Number, default: 0},
    passGrade: { type: Number, default: 0 },
    isPassed: { type: Boolean, default: false },
    status: { type: String, default: "in_progress" },
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const AttemptQuiz = mongoose.model("AttemptQuiz", attemptQuizSchema);

module.exports = AttemptQuiz;
