const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true
  },

  name: {
    type: String,
    required: true
  },

  monthlyPrice: {
    type: Number,
    required: true
  },

  yearlyDiscountPercent: {
    type: Number,
    default: 0
  },

  limits: {
    maxStudents: {
      type: Number,
      required: true
    },

    maxEducators: {
      type: Number,
      required: true
    },

    maxClasses: {
      type: Number,
      required: true
    }
  },

  features: [String]
});

module.exports =
  mongoose.model(
    "SubscriptionPlan",
    subscriptionPlanSchema
  );
