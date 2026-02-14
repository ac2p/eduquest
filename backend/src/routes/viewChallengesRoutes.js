const express = require("express");
const router = express.Router();

const viewChallengesController = require("../controllers/viewChallengesController");

router.get("/", viewChallengesController.getStudentAcceptedChallenges);

module.exports = router;

