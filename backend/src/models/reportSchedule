const mongoose = require("mongoose")

const reportScheduleSchema = new mongoose.Schema({
  runAt: Date,
  status: {
    type: String,
    enum: ["pending", "done"],
    default: "pending"
  }
})

module.exports = mongoose.model("ReportSchedule", reportScheduleSchema)