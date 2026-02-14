
const Challenge = require("../models/Challenge");
const AttemptChallenge = require("../models/AttemptChallenge");
const StudentReward = require("../models/StudentReward");


/** accept/start a challenge - create a new attempt in db */
function acceptChallenge(req, res) {
  const studentId = String(req.body.studentId || "").trim();
  const classId = String(req.body.classId || "").trim();
  const challengeId = String(req.body.challengeId || "").trim();

  if (!studentId || !classId || !challengeId) {
    return res.status(400).json({ message: "Missing fields" });
  }

  AttemptChallenge.findOne({ studentId, challengeId })
    .then(function (existing) {
      if (existing) return res.json({ attemptId: existing._id });

      Challenge.findById(challengeId).then(function (challenge) {
        if (!challenge) {
          return res.status(404).json({
            message: "Challenge not found"
          });
        }

        const attempt = new AttemptChallenge({
          studentId,
          classId,
          challengeId,
          type: String(
            challenge.challengeType || "INDIVIDUAL"
          ).toUpperCase(),
          status: "accepted",
          currentStepNo: 1,
          answers: [],
          submittedAt: null
        });

        attempt.save().then(function () {
          res.json({ attemptId: attempt._id });
        });
      });
    })
    .catch(function () {
      res.status(500).json({ message: "Server error" });
    });
}


/** get question from mission steps */
function getMissionStepByNo(challenge, stepNo) {
  const steps = Array.isArray(challenge.missionSteps)
    ? challenge.missionSteps
    : [];

  for (let i = 0; i < steps.length; i++) {
    if (Number(steps[i].stepNo) === Number(stepNo)) {
      return steps[i];
    }
  }
  return null;
}
/** check the student answer is correct*/
function isAnswerCorrect(stepObj, selectedIndex) {
  if (!stepObj) return false;

  const options = Array.isArray(stepObj.options)
    ? stepObj.options
    : [];

  const selectedValue = options[Number(selectedIndex)];
  if (selectedValue === undefined || selectedValue === null) return false;

  return (
    String(selectedValue).trim() ===
    String(stepObj.correctAnswer).trim()
  );
}


function calculateScorePercent(total, correct) {
  if (!total || total <= 0) return 0;
  return Math.round((correct / total) * 100); /** 40/50 * 100 = 80% */
}

function getRewardMultiplier(percent) {
        if (percent >= 85) {
           return 1.0; /** if score is greater than 85 , give 100 percent of rewards */
        } else if (percent >= 75) {
          return 0.8;  /** if score is greater than 75 , give 80 percent of rewards */
        } else if (percent >= 65) {
          return 0.6; /** if score is greater than 65 , give 60 percent of rewards */
        } else if (percent >= 50) {
          return 0.4;/** if score is greater than 50 , give 40 percent of rewards */
        }

        return 0.2; /** below 50% 20 percent of reward */
}

function calculateChallengeRewards(challenge, percent, isWinner) {
  const baseXp = Number(challenge.rewards.xp); /** get total xp from challenge */
  const baseCoins = Number(challenge.rewards.coins);  /** get gold coins from challenge */
/** 40/50 * 100 = 80%  - 80 percent reward ( 0.8)*/
  const multiplier = getRewardMultiplier(percent);

  let xp = Math.floor(baseXp * multiplier); /** 150 * 0.8 = 120 xp earned */
  let coins = Math.floor(baseCoins * multiplier); /** 100 * 0.8 = 80 gold coins earned */

  if (isWinner) {
    xp += 50; /** winner get bonus xp and gold coins */
    coins += 20;
  }

  return { xp, coins };
}
/** to store the each question answer in db , so student can continue where they left */
function submitAnswer(req, res) {
  const attemptId = String(req.body.attemptId || "").trim();
  const stepNo = Number(req.body.stepNo);
  const selectedIndex = Number(req.body.selectedIndex);
  const currentStep =
    Number(req.body.currentStep || stepNo);

  if (!attemptId) {
    return res
      .status(400)
      .json({ message: "attemptId required" });
  }

  AttemptChallenge.findById(attemptId).then(
    function (attempt) {
      if (!attempt)
        return res
          .status(404)
          .json({ message: "Not found" });

      if (String(attempt.status) === "submitted") {
        return res.json({
          ok: true,
          isCorrect: false
        });
      }

      Challenge.findById(attempt.challengeId)
        .lean()
        .then(function (challenge) {
          const stepObj =
            getMissionStepByNo(challenge, stepNo);
          const correct = isAnswerCorrect(
            stepObj,
            selectedIndex
          );

          let found = false;

          for (let i = 0; i < attempt.answers.length; i++) {
            if (
              Number(attempt.answers[i].stepNo) ===
              Number(stepNo)
            ) {
              attempt.answers[i].selectedIndex =
                selectedIndex;
              attempt.answers[i].isCorrect = correct;
              found = true;
            }
          }

          if (!found) {
            attempt.answers.push({
              stepNo,
              selectedIndex,
              isCorrect: correct
            });
          }

          attempt.status = "in_progress";
          attempt.currentStepNo = currentStep;

          attempt.save().then(function () {
            res.json({
              ok: true,
              isCorrect: correct
            });
          });
        });
    }
  );
}

function saveDraft(req, res) {
  const attemptId = String(req.body.attemptId || "").trim();
  const currentStepNo =
    Number(req.body.currentStepNo || 1);

  AttemptChallenge.findById(attemptId).then(
    function (attempt) {
      if (!attempt)
        return res
          .status(404)
          .json({ message: "Not found" });

      if (String(attempt.status) === "submitted") {
        return res.json({ ok: true });
      }

      attempt.currentStepNo = currentStepNo;
      attempt.status = "in_progress";

      attempt.save().then(function () {
        res.json({ ok: true });
      });
    }
  );
}

function submitChallenge(req, res) {

  const id = String(req.body.attemptId || "").trim();

  if (!id) {
    return res.status(400).json({ message: "attemptId required" });
  }

  AttemptChallenge.findById(id).then(function (attempt) {

    if (!attempt) {
      return res.status(404).json({ message: "Not found" });
    }

    if (attempt.status === "submitted") {
      return res.json({
        ok: true,
        scorePercent: attempt.scorePercent,
        correctCount: attempt.correctCount ,
        totalQuestions: attempt.totalQuestions
      });
    }
/** check answer  and calulate score*/
    Challenge.findById(attempt.challengeId).lean()
      .then(function (challenge) {

        const list = Array.isArray(attempt.answers)
          ? attempt.answers
          : [];

        let correct = 0;

        for (let i = 0; i < list.length; i++) {

      const step = getMissionStepByNo(challenge, list[i].stepNo );
      const ok = isAnswerCorrect(step, list[i].selectedIndex);

          list[i].isCorrect = ok;

          if (ok) correct++;
        }

        const total = Array.isArray(challenge.missionSteps)
          ? challenge.missionSteps.length
          : list.length;

        const percent = calculateScorePercent(total, correct);

        attempt.correctCount = correct;
        attempt.totalQuestions = total;
        attempt.scorePercent = percent;
        attempt.status = "submitted";
        attempt.submittedAt = new Date();

 /** winner check by score and earliest submit */
        AttemptChallenge.find({
          challengeId: attempt.challengeId,
          status: "submitted"
        }).then(function (others) {

          others.push(attempt);

          let winner = null;

          for (let i = 0; i < others.length; i++) {
            const current = others[i];
            if (!winner) {
              winner = current;
              continue;
            }

            const s1 = Number(current.scorePercent);
            const s2 = Number(winner.scorePercent);
        /** higher score win */
            if (s1 > s2) {
              winner = current;
              /** if same score - earlier submit wins */
            } else if (s1 === s2) {

              const t1 = new Date(current.submittedAt).getTime();
              const t2 = new Date(winner.submittedAt).getTime();

              if (t1 < t2) winner = current;
            }
          }

          for (let i = 0; i < others.length; i++) {
            others[i].winnerBonusAwarded = false;
          }

          const isWinner =
            winner && String(winner._id) === String(attempt._id);

          if (isWinner) {
            attempt.winnerBonusAwarded = true;
            attempt.winnerBonusAwardedAt = new Date();
          }
     /** caluclate reward and xp */
          const reward = calculateChallengeRewards(
            challenge,
            percent,
            isWinner
          );

          attempt.coinsEarned = reward.coins;
          attempt.xpEarned = reward.xp;

          const needReward = attempt.rewardsAwarded !== true;

  function saveAll() {
      attempt.save().then(function () {
        const jobs = [];

              for (let i = 0; i < others.length; i++) {
                if (String(others[i]._id) !== String(attempt._id)) {
                  jobs.push(others[i].save());
                }
              }

              Promise.all(jobs).then(function () {

                res.json({
                  ok: true,
                  scorePercent: percent,
                  correctCount: correct,
                  totalQuestions: total,
                  coinsEarned: attempt.coinsEarned,
                  xpEarned: attempt.xpEarned,
                  isWinner: isWinner
                });

              });

            });
          }
if (!needReward) return saveAll();

          addRewardsToStudent(
            attempt.studentId,
            attempt.classId,
            attempt.coinsEarned,
            attempt.xpEarned,
            "challenge",
            attempt.challengeId
          )
            .then(function () {
              attempt.rewardsAwarded = true;
              attempt.rewardsAwardedAt = new Date();
              saveAll();
            })
            .catch(saveAll);

        });
      });
    });
  }


function getAllAttempts(req, res) {
  const studentId = String(req.query.studentId || "").trim();
  const classId = String(req.query.classId || "").trim();

  if (!studentId || !classId) {
    return res.status(400).json({
      message: "studentId and classId required"
    });
  }

  AttemptChallenge.find({
    studentId,
    classId,
    status: { $in: ["accepted", "in_progress", "submitted"] }
  })
    .populate("challengeId")
    .then(function (attempts) {
      const output = [];

      for (let i = 0; i < attempts.length; i++) {
        const a = attempts[i];
        if (!a.challengeId) continue;

        output.push({
          attempt: a,
          challenge: a.challengeId,
          isWinner: a.winnerBonusAwarded === true
        });
      }

      res.json(output);
    })
    .catch(function (err) {
      console.log("GET ATTEMPTS ERROR", err);
      res.status(500).json({ message: "Server error" });
    });
}

function getOneAttempt(req, res) {
  const attemptId = String(req.params.attemptId || "").trim();
  if (!attemptId)
    return res.status(400).json({ message: "attemptId required" });

  AttemptChallenge.findById(attemptId)
    .populate("challengeId")
    .then(function (attempt) {
      if (!attempt)
        return res.status(404).json({ message: "Not found" });

      res.json({
        attempt: attempt,
        challenge: attempt.challengeId
      });
    })
    .catch(function () {
      res.status(500).json({ message: "Server error" });
    });
}

function getTodayDate() {
  const now = new Date();
  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0")
  );
}

function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);

  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function updateDailyStreak(studentReward) {
  const today = getTodayDate();
  const yesterday = getYesterdayDate();

  if (studentReward.lastStreakDate === today) return;

  if (studentReward.lastStreakDate === yesterday) {
    studentReward.streakDays =
      Number(studentReward.streakDays || 0) + 1;
    studentReward.lastStreakDate = today;
    return;
  }

  studentReward.streakDays = 1;
  studentReward.lastStreakDate = today;
}

function getStudentStreak(req, res) {
  const studentId = String(req.query.studentId || "").trim();
  const classId = String(req.query.classId || "").trim();

  if (!studentId || !classId) {
    return res.json({ streak: 0 });
  }

  StudentReward.findOne({
    studentId,
    classId
  })
    .then(function (studentReward) {
      if (!studentReward) {
        return res.json({ streak: 0 });
      }

      res.json({
        streak:
          Number(studentReward.streakDays || 0)
      });
    })
    .catch(function () {
      res.json({ streak: 0 });
    });
}

function addRewardsToStudent(
  studentId,
  classId,
  coinsToAdd,
  xpToAdd,
  sourceType,
  sourceId
) {
  return StudentReward.findOne({
    studentId,
    classId
  }).then(function (studentReward) {

    if (!studentReward) {
      studentReward = new StudentReward({
        studentId,
        classId,
        totalCoins: 0,
        totalXp: 0,
        streakDays: 1
      });
    }

    studentReward.totalCoins =
      Number(studentReward.totalCoins || 0) +
      Math.max(0, coinsToAdd);

    studentReward.totalXp =
      Number(studentReward.totalXp || 0) +
      Math.max(0, xpToAdd);

    studentReward.lastSourceType = sourceType || "challenge";
    studentReward.lastSourceId = String(sourceId || "");

    updateDailyStreak(studentReward);

    return studentReward.save();
  });
}


function deleteAttempt(req, res) {
  const attemptId = String(req.params.attemptId || "").trim();
  if (!attemptId) return res.json({ ok: true });

  AttemptChallenge.findByIdAndDelete(attemptId)
    .then(function () {
      res.json({ ok: true });
    })
    .catch(function () {
      res.json({ ok: true });
    });
}


module.exports = {
  getAllAttempts,
  getOneAttempt,
  acceptChallenge,
  submitAnswer,
  saveDraft,
  submitChallenge,
  getStudentStreak,
  deleteAttempt
};

