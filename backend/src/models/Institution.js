const mongoose = require("mongoose");

const institutionSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  country: String,
  timezone: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Institution", institutionSchema);
