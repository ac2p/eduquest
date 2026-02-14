const express = require("express");
const router = express.Router();
const pickChallengesController = require("../controllers/pickChallengesController");

router.get("/weekly", pickChallengesController.loadWeeklyChallenges);

module.exports = router;
