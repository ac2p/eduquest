const mongoose = require("mongoose");

const ChallengeSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["available", "unavailable"],
      default: "unavailable",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Challenge", ChallengeSchema);