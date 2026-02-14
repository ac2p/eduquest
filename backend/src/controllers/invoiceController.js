const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");


/** get invoice details */
function getInvoices(req, res) {
  const institutionId = String(req.query.institutionId || "").trim();

  if (!institutionId) {
    return res.status(400).json({
      message: "institutionId required"
    });
  }

  let objectId = null;

  if (mongoose.Types.ObjectId.isValid(institutionId)) {
    objectId =
      new mongoose.Types.ObjectId(institutionId);
  }

  Invoice.find({
    $or: [
      { institutionId: institutionId },
      { institutionId: objectId }
    ]
  })
    .then(function (list) {
      res.json(list);
    })
    .catch(function (err) {
      console.log("ERROR:", err);
      res.status(500).json({
        message: "Server error"
      });
    });
}

module.exports = {
  getInvoices
};