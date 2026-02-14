const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Institution"
  },

  planName: String,
  billingType: String,
  totalPaid: Number,

  educatorUsed: {
    type: Number,
    default: 0
  },

  studentUsed: {
    type: Number,
    default: 0
  },

  classesUsed: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    default: "ACTIVE"
  },

  autoRenew: {
    type: Boolean,
    default: true
  },

  billingEmails: {
    type: Boolean,
    default: true
  },

  billingCard: {
    name: String,
    last4: String,
    expiry: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model(
  "Subscription",
  subscriptionSchema
);