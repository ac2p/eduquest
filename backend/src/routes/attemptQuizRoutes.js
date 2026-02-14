const express = require("express");
const router = express.Router();

const controller = require("../controllers/attemptQuizController");

router.post("/save", controller.saveProgress);
router.post("/submit", controller.submitQuiz);
router.get("/inprogress", controller.loadInProgress);
router.get("/latest", controller.loadLatest);
router.get("/all", controller.getAllAttempts);
router.post("/reset", controller.resetAttempt);

module.exports = router;
