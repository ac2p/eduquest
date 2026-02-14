const mongoose = require("mongoose");

const ClassStudentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("ClassStudent", ClassStudentSchema);