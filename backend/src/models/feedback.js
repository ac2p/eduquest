const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true
    },

    educatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Educator",
      required: true
    },

    message: {
      type: String,
      required: true,
      maxlength: 500
    },

    anonymous: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Just this one line - no separate const Feedback declaration
module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);