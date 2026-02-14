const mongoose = require("mongoose");

const educatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Educator = mongoose.model("Educator", educatorSchema);

module.exports = Educator;
