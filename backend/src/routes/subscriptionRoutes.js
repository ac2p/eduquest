const express = require("express");
const router = express.Router();
const controller = require("../controllers/SubscriptionController");

router.post("/", controller.createSubscription);

module.exports = router;
