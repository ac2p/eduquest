const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
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
  parents: {
    type: String 
  },
  createdAt: {
    type: Date,
    default: Date.now
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

module.exports = mongoose.model("Student", StudentSchema);