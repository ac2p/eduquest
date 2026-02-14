const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({

  institutionId: {
    type: String,
    required: true
  },

  invoiceId: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    default: "PAID"
  },

  date: {
    type: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports =
  mongoose.model("Invoice", invoiceSchema);

