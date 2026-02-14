const express = require("express");
const router = express.Router();

const studentQuizController = require("../controllers/studentViewQuizController");


router.get("/", studentQuizController.getQuizzesForClass);
router.get("/:id", studentQuizController.getQuizById);

module.exports = router;
