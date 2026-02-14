const express = require("express");
const router = express.Router();
const controller = require("../controllers/attemptChallengeController");



router.get("/", controller.getAllAttempts);
router.get("/streak", controller.getStudentStreak);
router.get("/:attemptId", controller.getOneAttempt);
router.post("/accept", controller.acceptChallenge);
router.post("/answer", controller.submitAnswer);
router.post("/save-draft", controller.saveDraft);
router.post("/submit", controller.submitChallenge);
router.delete("/:attemptId", controller.deleteAttempt);

module.exports = router;

