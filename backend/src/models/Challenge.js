const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    description: { type: String, default: "" },

    subject: { type: String, default: "" },

    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy"
    },

    challengeType: {
      type: String,
      enum: ["individual", "group"],
      default: "individual"
    },

    frequency: {
      type: String,
      enum: ["weekly"],
      default: "weekly"
    },
    classId: { type: String, default: "" },

    assignedClass: {
      type: [String],
      default: []
    },

    createdByEducatorId: { type: String, default: "" },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published"
    },

    isEnabled: { type: Boolean, default: true },

    assignedStudentIds: {
      type: [String],
      default: []
    },

    schedule: {
      weekStart: { type: Date },
      weekEnd: { type: Date },
      releaseDay: { type: String }
    },

    rewards: {
      xp: { type: Number, default: 0 },
      coins: { type: Number, default: 0 }
    },
    
    missionSteps: [
      {
        stepNo: { type: Number, required: true },
        questionType: {
          type: String,
          default: "multiple-choice"
        },
        questionText: { type: String, required: true },
        options: {
          type: [String],
          default: []
        },
        correctAnswer: { type: String, required: true }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Challenge", challengeSchema);
