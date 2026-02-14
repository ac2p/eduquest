const mongoose = require("mongoose");
const Quiz = require("../models/Quiz.js");


function getQuizzesForClass(req, res) {
  const classId = String(req.query.classId || "").trim();

  if (!classId) {
    res.json([]);
    return;
  }

  Quiz.find({
    status: "published",
    assignedClasses: classId
  })
    .sort({ createdAt: -1 })
    .then(function (quizzes) {
      res.json(quizzes);
    })
    .catch(function (error) {
      console.log("Load Quiz Error", error);
      res.status(500).json({ message: "Failed to load quizzes" });
    });
}



function getQuizById(req, res) {
  const id = String(req.params.id || "").trim();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid quiz id" });
    return;
  }

  Quiz.findById(id)
    .then(function (quiz) {
      if (!quiz) {
        res.status(404).json({ message: "Quiz not found" });
        return;
      }

      if (String(quiz.status || "").toLowerCase() !== "published") {
        res.status(404).json({ message: "Quiz not available" });
        return;
      }

      res.json(quiz);
    })
    .catch(function (error) {
      console.log("Load Quiz Error", error);
      res.status(500).json({ message: "Failed to load quiz" });
    });
}


module.exports = {
  getQuizzesForClass,
  getQuizById
};
