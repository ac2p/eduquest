const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
    unique: true, // ensure adminId is unique
  },
  fullname: {
    type: String,
    required: true,
    trim: true,
  },
  displayname: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6, // optional password length rule
  },
  role: {
    type: String,
    enum: ["admin", "superadmin"], // optional, for future role handling
    default: "admin",
  },
}, { timestamps: true }); // automatically add createdAt and updatedAt

module.exports = mongoose.model("Admin", AdminSchema);