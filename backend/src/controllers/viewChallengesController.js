const AttemptChallenge = require("../models/AttemptChallenge");
const Challenge = require("../models/Challenge");


function getStudentAcceptedChallenges(req, res) {
  const studentId = String(req.query.studentId || "").trim();
  const classId = String(req.query.classId || "").trim();

  if (!studentId || !classId) {
    res.status(400).json({
      message: "studentId and classId required"
    });
    return;
  }

  AttemptChallenge.find({
    studentId: studentId,
    classId: classId
  })
    .populate("challengeId")
    .then(function (attempts) {
      const result = [];

      for (let i = 0; i < attempts.length; i++) {
        const attempt = attempts[i];
        const challenge = attempt.challengeId;

        if (!challenge) continue;

        result.push({
          attempt: attempt,
          isWinner: attempt.winnerBonusAwarded === true
        });
      }

      res.json(result);
    })
    .catch(function (err) {
      console.log("VIEW CHALLENGES ERROR", err);
      res.status(500).json({
        message: "Failed to load challenges"
      });
    });
}


module.exports = {
 getStudentAcceptedChallenges
};
