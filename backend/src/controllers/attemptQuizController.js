const AttemptQuiz = require("../models/AttemptQuiz.js");
const Quiz = require("../models/Quiz.js");
const StudentReward = require("../models/StudentReward.js");

/** total each question points for xp */
function calcTotalPoints(quiz) {
  let total = 0;

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  for (let i = 0; i < questions.length; i++) {
    total += Number(questions[i].points || 0);
  }

  return total;
}

function findAnswerByIndex(answers, index) {
  const list = Array.isArray(answers) ? answers : [];

  for (let i = 0; i < list.length; i++) {
    if (Number(list[i].questionIndex) === Number(index)) {
      return list[i];
    }
  }

  return null;
}

/** to check answer and to calculate total points student earned */
function calcScoredPoints(quiz, answers) {
  let score = 0;

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    if (!question) continue;

    const studentAnswer = findAnswerByIndex(answers, i);
    if (!studentAnswer) continue;

    const points = Number(question.points || 0);
    const type = String(question.questionType || "");

    if (type === "multiple-choice") {
      const correct = (question.options || []).find(
        (opt) => opt && opt.isCorrect,
      );

      if (correct && String(studentAnswer.selected) === String(correct.text)) {
        score += points;
      }
    }

    if (type === "true-false") {
      const correct = (question.options || []).find(
        (opt) => opt && opt.isCorrect,
      );

      if (!correct) continue;

      const correctValue = String(correct.text).toLowerCase() === "true";

      const studentValue =
        typeof studentAnswer.selected === "boolean"
          ? studentAnswer.selected
          : String(studentAnswer.selected).toLowerCase() === "true";

      if (studentValue === correctValue) {
        score += points;
      }
    }

    if (type === "short-answer") {
      const studentText = String(studentAnswer.textAnswer || "")
        .toLowerCase()
        .trim();

      const explanation = String(question.explanation || "").toLowerCase();

      const stopWords = [
        "the",
        "is",
        "a",
        "an",
        "our",
        "in",
        "of",
        "to",
        "and",
        "for",
      ];

      const words = explanation.split(/\W+/);

      let match = false;

      for (let i = 0; i < words.length; i++) {
        const word = words[i].trim();

        if (!word) continue;
        if (stopWords.includes(word)) continue;

        // ✅ case insensitive match
        if (studentText.includes(word)) {
          match = true;
          break;
        }
      }

      if (match) {
        score += points;
      }
    }

    if (type === "match-pairs") {
      const correctPairs = Array.isArray(question.pairs) ? question.pairs : [];

      const studentPairs = Array.isArray(studentAnswer.pairs)
        ? studentAnswer.pairs
        : [];

      let allCorrect = true;

      for (let j = 0; j < correctPairs.length; j++) {
        const pair = correctPairs[j];

        const found = studentPairs.find(
          (p) => p && p.left === pair.left && p.right === pair.right,
        );

        if (!found) {
          allCorrect = false;
          break;
        }
      }

      if (allCorrect && correctPairs.length > 0) {
        score += points;
      }
    }
  }

  return score;
}

/** xp and gold coins  */
function getRewardMultiplier(percent) {
  const score = Number(percent || 0);

  if (score >= 85)
    return 1.0; /** if score 85 - 100 , then give 100% of reward */
  if (score >= 75) return 0.8; /** if score 75 - 85 , then give 80% of reward */
  if (score >= 65) return 0.6; /** if score 65 - 74 , then give 60% of reward */
  if (score >= 50) return 0.4; /** if score 50 - 64 , then give 40% of reward */

  return 0.2; /** anything below 50% only 20% award */
}

function calculateRewards(quiz, scoredPoints, totalPoints) {
  /** scored points 46 , total points 100*/
  const percent =
    totalPoints > 0 ? Math.round((scoredPoints / totalPoints) * 100) : 0;
  /**  76/100 * 100 =  76% --  80% (0.8)*/
  const passGrade = Number(quiz.passGrade || 0);

  if (percent < passGrade) {
    /** passGrade - if student fails no rewards */
    return {
      percent,
      xpEarned: 0,
      coinsEarned: 0,
      passed: false,
    };
  }

  const baseXp = calcTotalPoints(quiz); /** xp - total points */
  const baseCoins = Math.floor(baseXp / 2); /** gold coins - half of xp */

  const multiplier = getRewardMultiplier(percent);

  return {
    percent,
    xpEarned: Math.floor(baseXp * multiplier) /** 100 * 0.8 = 80 xp earned */,
    coinsEarned: Math.floor(
      baseCoins * multiplier,
    ) /** 100/2 , 50 * 0.8  = 40 gold goins earned*/,
    passed: true,
  };
}

/** save student in progress quiz to db - so they continue the quiz where they left */
function saveProgress(req, res) {
  const quizId = String(req.body.quizId || "").trim();
  const studentId = String(req.body.studentId || "").trim();

  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];

  const currentIndex = Number(req.body.currentIndex || 0);

  const startedAtFromClient = req.body.startedAt
    ? new Date(req.body.startedAt)
    : null;

  if (!quizId || !studentId) {
    res.status(400).json({
      message: "quizId and studentId required",
    });
    return;
  }

  AttemptQuiz.findOne({
    quizId,
    studentId,
    status: "in_progress",
  })
    .then(function (attempt) {
      if (!attempt) {
        attempt = new AttemptQuiz({
          quizId: quizId,
          studentId: studentId,
          status: "in_progress",
          startedAt: startedAtFromClient || new Date(),
          answers: [],
          currentIndex: 0,
        });
      }

      attempt.answers = answers;
      attempt.currentIndex = currentIndex;

      return attempt.save();
    })
    .then(function (saved) {
      res.json({
        ok: true,
        attemptId: saved._id,
      });
    })
    .catch(function (err) {
      console.log("SAVE ERROR", err);

      res.status(500).json({
        message: "Save failed",
      });
    });
}

/** to load the saved in progress quiz - so they can start from where they left */
function loadInProgress(req, res) {
  const quizId = String(req.query.quizId || "").trim();

  const studentId = String(req.query.studentId || "").trim();

  if (!quizId || !studentId) {
    res.json({ attempt: null });
    return;
  }

  AttemptQuiz.findOne({
    quizId,
    studentId,
    status: "in_progress",
  })
    .then(function (attempt) {
      res.json({
        attempt: attempt || null,
      });
    })
    .catch(function (err) {
      console.log("LOAD ERROR", err);

      res.status(500).json({
        message: "Load failed",
      });
    });
}

function submitQuiz(req, res) {
  const quizId = String(req.body.quizId || "").trim();
  const studentId = String(req.body.studentId || "").trim();
  const classId = String(req.body.classId || "").trim() || "Class 4A";

  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];

  if (!quizId || !studentId) {
    res.status(400).json({
      message: "quizId and studentId required",
    });
    return;
  }

  Quiz.findById(quizId)
    .lean()
    .then(function (quiz) {
      if (!quiz) {
        res.status(404).json({
          message: "Quiz not found",
        });
        return;
      }

      const totalPoints = calcTotalPoints(quiz);
      const scoredPoints = calcScoredPoints(quiz, answers);
      const rewards = calculateRewards(quiz, scoredPoints, totalPoints);
      const review = buildReview(quiz, answers);

      return AttemptQuiz.findOneAndUpdate(
        { quizId, studentId },
        {
          quizId,
          studentId,
          answers,
          status: "submitted",
          submittedAt: new Date(),
          totalPoints: totalPoints,
          scoredPoints: scoredPoints,
          scorePercent: rewards.percent,
          passGrade: Number(quiz.passGrade || 0),
          isPassed: rewards.passed,
          xpEarned: rewards.xpEarned,
          coinsEarned: rewards.coinsEarned,
          review: review,
        },
        { new: true, upsert: true },
      ).then(function (attempt) {
        return StudentReward.findOne({
          studentId,
          classId,
        }).then(function (reward) {
          if (!reward) {
            reward = new StudentReward({
              studentId: studentId,
              classId: classId,
              totalXp: 0,
              totalCoins: 0,
              streakDays: 1,
            });
          }

          const streakAction = updateStreak(reward.lastActivityDate);

          if (streakAction === "increment") {
            reward.streakDays += 1;
          }

          if (streakAction === "reset") {
            reward.streakDays = 1;
          }

          reward.lastActivityDate = new Date();
          reward.totalXp += rewards.xpEarned;
          reward.totalCoins += rewards.coinsEarned;

          return reward.save().then(function () {
            res.json({
              ok: true,
              attemptId: attempt._id,
              scoredPoints: scoredPoints,
              totalPoints: totalPoints,
              scorePercent: rewards.percent,
              passGrade: Number(quiz.passGrade || 0),
              xpEarned: rewards.xpEarned,
              coinsEarned: rewards.coinsEarned,
              totalXp: reward.totalXp,
              totalCoins: reward.totalCoins,
              streakDays: reward.streakDays,
              isPassed: rewards.passed,
              review: review,
            });
          });
        });
      });
    })
    .catch(function (err) {
      console.log("SUBMIT ERROR", err);

      res.status(500).json({
        message: "Submit failed",
      });
    });
}

function buildReview(quiz, answers) {
  const review = [];
  const questions = quiz.questions || [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const studentAnswer = findAnswerByIndex(answers, i);

    const type = String(question.questionType || "");

    let selected = null;
    let correct = null;
    let isCorrect = false;

    if (type === "multiple-choice") {
      const correctOption = (question.options || []).find(
        (o) => o && o.isCorrect,
      );

      correct = correctOption ? correctOption.text : null;

      selected = studentAnswer ? studentAnswer.selected : null;

      isCorrect = String(selected) === String(correct);
    }

    if (type === "true-false") {
      const correctOption = (question.options || []).find(
        (o) => o && o.isCorrect,
      );

      correct = correctOption ? String(correctOption.text).toLowerCase() : null;

      if (studentAnswer) {
        selected =
          typeof studentAnswer.selected === "boolean"
            ? studentAnswer.selected
              ? "true"
              : "false"
            : String(studentAnswer.selected).toLowerCase();
      }

      isCorrect = String(selected) === String(correct);
    }

    if (type === "short-answer") {
      selected = studentAnswer ? studentAnswer.textAnswer || "" : "";

      correct = question.explanation || "";

      const studentText = String(selected).toLowerCase().trim();

      const explanation = String(correct).toLowerCase();

      const stopWords = [
        "the", "is", "a", "an", "our", "in", "of",
        "to","and","for",
      ];

      const words = explanation.split(/\W+/);

      isCorrect = false;

      for (let i = 0; i < words.length; i++) {
        const word = words[i].trim();

        if (!word) continue;
        if (stopWords.includes(word)) continue;

        if (studentText.includes(word)) {
          isCorrect = true;
          break;
        }
      }
    }

    if (type === "match-pairs") {
      const correctPairs = Array.isArray(question.pairs) ? question.pairs : [];

      const studentPairs =
        studentAnswer && Array.isArray(studentAnswer.pairs)
          ? studentAnswer.pairs
          : [];

      correct = correctPairs;
      selected = studentPairs;

      isCorrect = true;

      for (let j = 0; j < correctPairs.length; j++) {
        const pair = correctPairs[j];

        const found = studentPairs.find(
          (p) => p && p.left === pair.left && p.right === pair.right,
        );

        if (!found) {
          isCorrect = false;
          break;
        }
      }
    }

    review.push({
      questionIndex: i,
      questionType: type,
      selected: selected,
      correct: correct,
      explanation: question.explanation || "",
      isCorrect: isCorrect,
    });
  }

  return review;
}

/** lastest quiz result for retake and review purpose */
function loadLatest(req, res) {
  const quizId = String(req.query.quizId || "").trim();

  const studentId = String(req.query.studentId || "").trim();

  if (!quizId || !studentId) {
    res.json({ attempt: null });
    return;
  }

  AttemptQuiz.findOne({
    quizId,
    studentId,
    status: "submitted",
  })
    .sort({ submittedAt: -1 })
    .then(function (attempt) {
      res.json({
        attempt: attempt || null,
      });
    })
    .catch(function (err) {
      console.log("LATEST ERROR", err);

      res.status(500).json({
        message: "Load failed",
      });
    });
}

function getAllAttempts(req, res) {
  const studentId = String(req.query.studentId || "").trim();

  if (!studentId) {
    res.json([]);
    return;
  }

  AttemptQuiz.find({
    studentId,
  })
    .then(function (list) {
      res.json(list);
    })
    .catch(function (err) {
      console.log("ALL ERROR", err);

      res.status(500).json({
        message: "Load failed",
      });
    });
}

function resetAttempt(req, res) {
  const quizId = String(req.body.quizId || "").trim();

  const studentId = String(req.body.studentId || "").trim();

  if (!quizId || !studentId) {
    res.status(400).json({
      message: "quizId and studentId required",
    });
    return;
  }

  AttemptQuiz.deleteMany({
    quizId,
    studentId,
  })
    .then(function () {
      res.json({ ok: true });
    })
    .catch(function (err) {
      console.log("RESET ERROR", err);

      res.status(500).json({
        message: "Reset failed",
      });
    });
}

function updateStreak(oldDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!oldDate) return 1;

  const last = new Date(oldDate);
  last.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "increment";
  if (diffDays === 0) return "same";
  return "reset";
}

module.exports = {
  saveProgress,
  submitQuiz,
  loadInProgress,
  loadLatest,
  getAllAttempts,
  resetAttempt,
};
