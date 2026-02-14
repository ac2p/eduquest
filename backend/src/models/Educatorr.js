const mongoose = require("mongoose");

const EducatorSchema = new mongoose.Schema({
  EdadminId: {
    type: String,
    required: true
  },
  fullname: {
    type: String,
    required: true
  },
  displayname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  timezone: {
    type: String,
    required: true
  },
  classLimit: {
    type: Number,
    default: 5
  },
  classNumber: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active"
  },
  resetPasswordToken: {
  type: String,
  default: undefined
},
resetPasswordExpire: {
  type: Date,
  default: undefined
}
}, { timestamps: true });

module.exports = mongoose.model("Educator", EducatorSchema);