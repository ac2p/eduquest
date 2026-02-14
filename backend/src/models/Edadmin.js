const mongoose = require("mongoose");

const EdadminSchema = new mongoose.Schema({
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
  position: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, 
  },
  contactNumber: {
    type: String,
    trim: true,
  },
  institutionName: {
    type: String,
    trim: true,
  },
  institutionType: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  billingAddress: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  classLimit: {
    type: Number,
    default: 5,
  },
  resetPasswordToken: {
    type: String,
    default: undefined,
  },
  resetPasswordExpire: {
    type: Date,
    default: undefined,
  }
}, { timestamps: true }); 

module.exports = mongoose.model("Edadmin", EdadminSchema);