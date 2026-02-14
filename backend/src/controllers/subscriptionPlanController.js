const mongoose = require("mongoose");
const SubscriptionPlan = require("../models/SubscriptionPlan");

function getAllPlans(req, res) {
  SubscriptionPlan.find()
    .then(function (plans) {
      res.json(plans);
    });
}

module.exports = {
  getAllPlans
};
