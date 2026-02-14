const mongoose = require("mongoose");

const ClassSchema = new mongoose.Schema({
  classId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  term: {
    type: String, // e.g., "Term 1 2026", "Term 2 2026"
    required: true
  }
}, { timestamps: true }); // automatically adds createdAt & updatedAt

module.exports = mongoose.model("Class", ClassSchema);