const express = require("express");
const router = express.Router();
const controller = require("../controllers/subscriptionPlanController");

router.get("/", controller.getAllPlans);

module.exports = router;
