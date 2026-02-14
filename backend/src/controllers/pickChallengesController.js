const Challenge = require("../models/Challenge");
const AttemptChallenge = require("../models/AttemptChallenge");


function loadWeeklyChallenges(req, res) {
  const classId = String(req.query.classId || "").trim();
  const studentId = String(req.query.studentId || "").trim();

  if (!classId || !studentId) {
    res.status(400).json({ message: "classId and studentId required" });
    return;
  }


  Challenge.find({
    isEnabled: true,
    status: "published",
    $or: [
      { classId: classId },
      { assignedClass: classId }
    ]
  })
    .then(function (challenges) {
    
      return AttemptChallenge.find({
        studentId: studentId,
        classId: classId
      }).then(function (attempts) {
        const acceptedMap = {};

        for (let i = 0; i < attempts.length; i++) {
          acceptedMap[String(attempts[i].challengeId)] = true;
        }

        const result = [];

        for (let i = 0; i < challenges.length; i++) {
          const ch = challenges[i];

          if (acceptedMap[String(ch._id)]) continue;

          result.push(ch);
        }

        res.json(result);
      });
    })
    .catch(function (err) {
      console.log("PICK LOAD ERROR", err);
      res.status(500).json({ message: "Failed to load challenges" });
    });
}

module.exports = {
  loadWeeklyChallenges
};
