const Feedback = require("../models/feedback.js");

function createFeedback(req, res) {
  const studentId = req.body.studentId;
  const educatorId = req.body.educatorId;
  const message = req.body.message;
  const anonymous = req.body.anonymous;

  if (!studentId || !educatorId || !message) {
    res.status(400).json({ message: "Missing required fields" });
    return;
  }

  const feedback = new Feedback({
    studentId: studentId,
    educatorId: educatorId,
    message: message,
    anonymous: anonymous
  });

  feedback
    .save()
    .then(function (result) {
      res.status(201).json(result);
    })
    .catch(function (error) {
      console.log(error);
      res.status(500).json({ message: "Failed to save feedback" });
    });
}

module.exports = {
  createFeedback
};
