lucide.createIcons();

const Url = "http://localhost:3000/api";
const studentId = "TestStu_001";

const params = new URLSearchParams(window.location.search);
const quizId = params.get("quizId");
const classId = params.get("classId") || "Class 4A";
const mode = params.get("mode") || "";
const wantReview = mode === "review";

if (!quizId) {
  alert("quizId missing in URL");
  throw new Error("quizId missing");
}
if (!classId) {
  alert("classId missing in URL");
  throw new Error("classId missing");
}

const quizTitle = document.getElementById("quizTitle");
const quizSubTitle = document.getElementById("quizSubTitle");
const quizLevel = document.getElementById("quizLevel");

const questionCount = document.getElementById("qCount");
const questionText = document.getElementById("qText");
const answerArea = document.getElementById("answerArea");

const progressQuestion = document.getElementById("progressQuestion");
const progressMap = document.getElementById("progressMap");

const previousButton = document.getElementById("prevBtn");
const nextButton = document.getElementById("nextBtn");

const timerText = document.getElementById("timeCount");

const submitModal = document.getElementById("submitModal");
const confirmSubmitButton = document.getElementById("confirmSubmitBtn");
const reviewButton = document.getElementById("reviewBtn");
const submitMessage = document.getElementById("submitModalText");
const submitTitle = document.getElementById("submitModalTitle");

const rewardXp = document.getElementById("rewardXp");
const rewardCoins = document.getElementById("rewardCoins");
const rewardStreak = document.getElementById("rewardStreak");


let quiz = null;
let currentIndex = 0;
let startedAt = new Date();
let answers = [];

let timerInterval = null;
let timerSecondsLeft = 0;

let isReviewMode = false;
let reviewData = [];

let quizRewardXp = 0;

/** save the in progress quiz */
function saveAttemptProgress() {
  if (isReviewMode) return;

  fetch(Url + "/attemptquiz/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quizId,
      studentId,
      answers: answers.filter(Boolean),
      currentIndex,
      startedAt
    })
  }).catch(() => {});
}

/** to load the saved in progress quiz attempt to continue where they left*/
function loadInProgressAttempt() {
  return fetch(
    Url +
      "/attemptquiz/inprogress?quizId=" +
      encodeURIComponent(quizId) +
      "&studentId=" +
      encodeURIComponent(studentId)
  )
    .then(res => res.json())
    .then(data => {
      if (!data || !data.attempt) return null;

      answers = [];
      const list = Array.isArray(data.attempt.answers)
        ? data.attempt.answers
        : [];

      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a) continue;
        answers[Number(a.questionIndex)] = a;
      }

      currentIndex = Number(data.attempt.currentIndex || 0);
      startedAt = data.attempt.startedAt
        ? new Date(data.attempt.startedAt)
        : new Date();

      return data.attempt;
    })
    .catch(() => null);
}

/** for review purpose to show lastest attempt review data */
function loadLatestAttemptOnly() {
  return fetch(
    Url +
      "/attemptquiz/latest?quizId=" +
      encodeURIComponent(quizId) +
      "&studentId=" +
      encodeURIComponent(studentId)
  )
    .then(res => {
      if (!res.ok) return null;
      return res.json();
    })
    .then(data => {
      if (!data || !data.attempt) return null;
      return data.attempt;
    })
    .catch(() => null);
}


/** quiz timer related functions */

function getTimeLimitMinutes() {
  let minutes = 15;
  if (quiz && quiz.timeLimit) minutes = Number(quiz.timeLimit);
  if (!minutes || minutes <= 0) minutes = 15;
  return minutes;
}


/** to format the timer */
function renderTimerText() {
  if (!timerText) return;

  const m = Math.floor(timerSecondsLeft / 60);
  const s = timerSecondsLeft % 60;

  timerText.innerText =
    String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function startCountdownTimer() {
  if (!quiz || !timerText || isReviewMode) {
    if (timerText) timerText.innerText = "Review";
    return;
  }

  const totalSeconds = getTimeLimitMinutes() * 60;
  const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  let remaining = totalSeconds - elapsed;

  if (remaining < 0) remaining = 0;

  function tick() {
    if (remaining <= 0) {
      timerSecondsLeft = 0;
      renderTimerText();
      clearInterval(timerInterval);
      submitAttempt(true);
      return;
    }

    timerSecondsLeft = remaining;
    renderTimerText();
    remaining--;
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}

function stopCountdownTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  if (timerText) timerText.innerText = "Review";
}


/** store the student selected answers */
function storeAnswer(realIndex, type, value) {
  const answer = {
    questionIndex: realIndex,
    questionType: type
  };

  if (type === "multiple-choice") answer.selected = value;
  if (type === "true-false") answer.selected = value;
  if (type === "short-answer") answer.textAnswer = value;
  if (type === "match-pairs") answer.pairs = value;

  answers[realIndex] = answer;
  saveAttemptProgress();
  renderProgressDots();
}

/** progress map ui - to navigates the progress dots */

function renderProgressDots() {
  if (!progressMap || !quiz) return;

  const total = quiz.questions.length;
  progressMap.innerHTML = "";

  for (let i = 0; i < total; i++) {
    const dot = document.createElement("button");
    const isCurrent = i === currentIndex;
    const isAnswered = !!answers[i];

    dot.className =
      "w-9 h-9 rounded-xl border text-xs font-bold transition-all " +
      (isCurrent
        ? "border-indigo-400 bg-indigo-50 text-indigo-600"
        : isAnswered
        ? "border-emerald-300 bg-emerald-50 text-emerald-600"
        : "border-slate-200 bg-white text-slate-400");

    dot.innerText = i + 1;
    dot.onclick = function () {
      currentIndex = i;
      renderCurrentQuestion();
    };

    progressMap.appendChild(dot);
  }
}

/** ui - navigation button when click prev and next button
 * to show the current question and q.no  */
function renderCurrentQuestion() {
  if (!quiz) return;

  const total = quiz.questions.length;
  if (currentIndex < 0) currentIndex = 0;
  if (currentIndex > total - 1) currentIndex = total - 1;

  const question = quiz.questions[currentIndex];
  const type = String(question.questionType || "");

  questionCount.innerText =
    "Question " + (currentIndex + 1) + " of " + total;

  progressQuestion.innerText =
    (currentIndex + 1) + "/" + total;

  questionText.innerText = question.questionText || "";
  answerArea.innerHTML = "";

  if (isReviewMode && nextButton) {
  nextButton.style.display = "none";
}


  if (type === "multiple-choice")
    renderMultipleChoiceQuestion(question, currentIndex);
  else if (type === "short-answer")
    renderShortAnswerQuestion(question, currentIndex);
  else if (type === "true-false")
    renderTrueFalseQuestion(question, currentIndex);
  else if (type === "match-pairs")
    renderMatchingQuestion(question, currentIndex);

  previousButton.disabled = currentIndex === 0;

  nextButton.innerText =
    currentIndex === total - 1 ? "Submit Quiz" : "Next";

  nextButton.onclick = goToNextQuestion;

  renderProgressDots();
  lucide.createIcons();

  highlightSelectedAnswer(currentIndex);
}


/** ui - highlights the selected answers */
function highlightSelectedAnswer(realIndex) {
  if (!answerArea) return;

  const saved = answers[realIndex];
  if (!saved) return;

  const buttons = answerArea.querySelectorAll("button");
  buttons.forEach(btn => {
    btn.classList.remove("border-indigo-400", "bg-indigo-50/60");
  });

  if (saved.questionType === "multiple-choice") {
    buttons.forEach(btn => {
      if (btn.innerText.trim() === String(saved.selected).trim()) {
        btn.classList.add("border-indigo-400", "bg-indigo-50/60");
      }
    });
  }

  if (saved.questionType === "true-false") {
    const val =
      saved.selected === true
        ? "true"
        : saved.selected === false
        ? "false"
        : String(saved.selected).toLowerCase();

    buttons.forEach(btn => {
      if (btn.innerText.toLowerCase() === val) {
        btn.classList.add("border-indigo-400", "bg-indigo-50/60");
      }
    });
  }
}

/** ui - mcq options buttons  */

function renderMultipleChoiceQuestion(question, realIndex) {
  const options = question.options || [];
  const rev = isReviewMode ? getReviewItem(realIndex) : null;

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];

    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "w-full text-left px-5 py-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all font-semibold text-slate-700";
    button.innerText = opt.text;

    if (!isReviewMode) {
      button.onclick = function () {
        storeAnswer(realIndex, "multiple-choice", opt.text);
        highlightSelectedAnswer(realIndex);
      };
    } else {
      button.disabled = true;

      if (rev) {
        const isSelected = String(rev.selected) === String(opt.text);
        const isCorrect = String(rev.correct) === String(opt.text);

        if (isCorrect) {
          button.classList.add("border-emerald-400", "bg-emerald-50");
        }
        if (isSelected && !isCorrect) {
          button.classList.add("border-rose-400", "bg-rose-50");
        }
      }
    }

    answerArea.appendChild(button);
  }

  highlightSelectedAnswer(realIndex);

  if (isReviewMode) renderReviewCard(realIndex);
}

/** ui - for short answer shows text area */

function renderShortAnswerQuestion(question, realIndex) {
  const box = document.createElement("textarea");
  box.className =
    "w-full min-h-[120px] px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 font-medium text-slate-700";
  box.placeholder = "Type your answer here...";

  const saved = answers[realIndex];
  if (saved && saved.textAnswer) box.value = saved.textAnswer;

  if (isReviewMode) {
    box.disabled = true;
    box.classList.add("bg-slate-50");
  } else {
    box.oninput = function () {
      storeAnswer(realIndex, "short-answer", box.value);
    };
  }

  answerArea.appendChild(box);

  if (isReviewMode) renderReviewCard(realIndex);
}

/** ui - for true/false button */

function renderTrueFalseQuestion(question, realIndex) {
  const wrap = document.createElement("div");
  wrap.className = "grid grid-cols-2 gap-4";

  function makeBtn(label, value) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "px-5 py-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all font-semibold text-slate-700";
    btn.innerText = label;

    if (!isReviewMode) {
      btn.onclick = function () {
        storeAnswer(realIndex, "true-false", value);
        highlightSelectedAnswer(realIndex);
      };
    }

    return btn;
  }

  wrap.appendChild(makeBtn("True", true));
  wrap.appendChild(makeBtn("False", false));

  answerArea.appendChild(wrap);

  highlightSelectedAnswer(realIndex);

  if (isReviewMode) renderReviewCard(realIndex);
}


/** match-pairs - creates dropdown options  */

function renderMatchingQuestion(question, realIndex) {
  const pairs = question.pairs || [];

  if (!pairs.length) {
    const note = document.createElement("div");
    note.className =
      "px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 font-semibold";
    note.innerText = "No matching pairs found.";
    answerArea.appendChild(note);
    return;
  }

  const savedPairs =
    answers[realIndex] && answers[realIndex].pairs
      ? answers[realIndex].pairs
      : [];

  const wrap = document.createElement("div");
  wrap.className = "space-y-3";

  for (let i = 0; i < pairs.length; i++) {
    const row = document.createElement("div");
    row.className = "grid grid-cols-1 md:grid-cols-2 gap-3 items-center";

    const leftBox = document.createElement("div");
    leftBox.className =
      "px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700";
    leftBox.innerText = pairs[i].left;

    const select = document.createElement("select");
    select.className =
      "px-4 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-700";

    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.innerText = "Choose match...";
    select.appendChild(opt0);

    for (let j = 0; j < pairs.length; j++) {
      const opt = document.createElement("option");
      opt.value = pairs[j].right;
      opt.innerText = pairs[j].right;
      select.appendChild(opt);
    }

    for (let k = 0; k < savedPairs.length; k++) {
      if (savedPairs[k].left === pairs[i].left) {
        select.value = savedPairs[k].right;
      }
    }

    if (!isReviewMode) {
      select.onchange = function () {
        const allSelects = wrap.querySelectorAll("select");
        const newPairs = [];

        for (let x = 0; x < allSelects.length; x++) {
          const left = pairs[x].left;
          const right = allSelects[x].value;
          if (right) newPairs.push({ left, right });
        }

        storeAnswer(realIndex, "match-pairs", newPairs);
      };
    } else {
      select.disabled = true;
    }

    row.appendChild(leftBox);
    row.appendChild(select);
    wrap.appendChild(row);
  }

  answerArea.appendChild(wrap);

  if (isReviewMode) renderReviewCard(realIndex);
}

/** submit the quiz and swith to review mode */

function submitAttempt(isAuto) {
  fetch(Url + "/attemptquiz/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quizId,
      studentId,
      answers: answers.filter(Boolean),
      currentIndex,
      startedAt
    })
  })
    .then(res => {
      if (!res.ok) throw new Error("Submit failed");
      return res.json();
    })
    .then(result => {
      stopCountdownTimer();
      closeSubmitModal();

      renderReviewHeaderBox(
        result.scoredPoints,
        result.totalPoints,
        result.xpEarned,
        result.totalXp,
        result.scorePercent,
        result.passGrade,
        result.isPassed
      );

    
      awardStudentRewards(result);

      isReviewMode = true;
      reviewData = Array.isArray(result.review)
        ? result.review
        : [];

      renderCurrentQuestion();
      renderProgressDots();
    })
    .catch(() => {
      if (!isAuto) alert("Submit failed. Try again.");
    });
}


function goToNextQuestion() {
  if (!quiz) return;

  if (currentIndex === quiz.questions.length - 1) {
    openConfirmSubmitModal();
    return;
  }

  currentIndex++;
  renderCurrentQuestion();
}

function goToPreviousQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCurrentQuestion();
  }
}

previousButton.onclick = goToPreviousQuestion;

/** comfirm submit  pop up */
function openConfirmSubmitModal() {
  if (!submitModal) {
    if (confirm("Submit quiz now?")) submitAttempt(false);
    return;
  }

  submitTitle.innerText = "Submit Quiz?";
  submitMessage.innerText = "Are you sure you want to submit your quiz?";

  confirmSubmitButton.innerText = "Submit";
  confirmSubmitButton.onclick = function () {
    closeSubmitModal();
    submitAttempt(false);
  };

  reviewButton.innerText = "Cancel";
  reviewButton.onclick = closeSubmitModal;

  submitModal.classList.remove("hidden");
}

function closeSubmitModal() {
  if (!submitModal) return;
  submitModal.classList.add("hidden");
}


/** reviews and reward related functions */

function calcQuizTotalXp(q) {
  if (!q || !Array.isArray(q.questions)) return 0;

  let total = 0;
  for (let i = 0; i < q.questions.length; i++) {
    total += Number(q.questions[i].points || 0);
  }
  return total;
}

function getReviewItem(realIndex) {
  if (!Array.isArray(reviewData)) return null;

  for (let i = 0; i < reviewData.length; i++) {
    if (Number(reviewData[i].questionIndex) === Number(realIndex)) {
      return reviewData[i];
    }
  }
  return null;
}

function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function loadStudentRewardStatus() {
  fetch(
    Url +
      "/studentreward/status?studentId=" +
      encodeURIComponent(studentId) +
      "&classId=" +
      encodeURIComponent(classId)
  )
    .then(res => res.json())
    .then(data => {
      const days = Number(data.streakDays || 1);

      if (rewardStreak) {
        rewardStreak.innerText =
          "Streak: " + days + " day" + (days === 1 ? "" : "s");
      }
    })
    .catch(() => {
      if (rewardStreak) {
        rewardStreak.innerText = "Streak: 1 day";
      }
    });
}


function awardStudentRewards(result) {
  fetch(Url + "/studentreward/award", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId,
      classId,
      sourceType: "quiz",
      sourceId: quizId,
      xpEarned: result.xpEarned,
      percent: result.scorePercent
    })
  })
    .then(res => res.json())
    .then(() => {
      loadStudentRewardStatus();
    })
    .catch(() => {
      console.log("Reward save failed");
    });
}

function renderReviewHeaderBox(
  scoredPoints,
  totalPoints,
  xpEarned,
  totalXp,
  scorePercent,
  passGrade,
  isPassed
) {
  const boxId = "reviewHeaderBox";
  let box = document.getElementById(boxId);

  const safeXp = xpEarned != null ? Number(xpEarned) : 0;
  const safePass = passGrade != null ? Number(passGrade) : 0;

  if (!box) {
    box = document.createElement("div");
    box.id = boxId;
    box.className = "mb-4 p-4 rounded-2xl border border-slate-200 bg-slate-50";
    answerArea.parentNode.insertBefore(box, answerArea);
  }

  box.innerHTML =
    `<div class="flex justify-between font-bold">
      <span>Quiz Result</span>
      <span class="${isPassed ? "text-emerald-600" : "text-rose-600"}">
        ${isPassed ? "PASS" : "FAIL"}
      </span>
    </div>
    <div class="mt-2 text-sm">
      Score: ${scoredPoints} / ${totalPoints} (${scorePercent}%)
    </div>
    <div class="text-sm">Pass Grade: ${safePass}%</div>
    <div class="text-sm">XP Earned: ${safeXp}</div>`;
}



function renderReviewCard(realIndex) {
  const rev = getReviewItem(realIndex);
  if (!rev) return;

  const badge = document.createElement("div");
  badge.className =
    "mt-3 text-sm font-bold " +
    (rev.isCorrect ? "text-emerald-600" : "text-rose-600");
  badge.innerText = rev.isCorrect ? "Correct" : "Wrong";

  answerArea.appendChild(badge);

  const box = document.createElement("div");
  box.className = "mt-3 p-4 rounded-2xl border border-slate-200 bg-slate-50";

  const type = String(rev.questionType || "");

  if (
    type === "multiple-choice" ||
    type === "true-false" ||
    type === "short-answer"
  ) {
    box.innerHTML =
      `<div><b>Your answer:</b> ${safeText(rev.selected || "No answer")}</div>
       <div class="mt-1"><b>Correct answer:</b> ${safeText(rev.correct || "-")}</div>`;
  }

  if (type === "match-pairs") {
    const correctPairs = Array.isArray(rev.correct) ? rev.correct : [];
    const selectedPairs = Array.isArray(rev.selected) ? rev.selected : [];

    const map = {};
    for (let i = 0; i < selectedPairs.length; i++) {
      map[selectedPairs[i].left] = selectedPairs[i].right;
    }

    let html = `<div class="font-bold mb-2">Matching Review</div>`;

    for (let i = 0; i < correctPairs.length; i++) {
      const cp = correctPairs[i];
      const student = map[cp.left] || "No answer";
      const ok = student === cp.right;

      html += `
        <div class="p-3 rounded-xl border mb-2 ${
          ok
            ? "border-emerald-200 bg-emerald-50"
            : "border-rose-200 bg-rose-50"
        }">
          <div><b>${safeText(cp.left)}</b></div>
          <div>Your match: ${safeText(student)}</div>
          <div>Correct: ${safeText(cp.right)}</div>
        </div>
      `;
    }

    box.innerHTML = html;
  }

  answerArea.appendChild(box);
}


function renderQuizRewardsBox() {
  if (!quiz) return;

  const totalXp = calcQuizTotalXp(quiz);

  const maxCoins = Math.floor(totalXp / 10);

  if (rewardXp) {
    rewardXp.innerText = "+ " + totalXp + " Experience (Max)";
  }

  if (rewardCoins) {
    rewardCoins.innerText = "+ " + maxCoins + " Gold Coins (Max)";
  }


  loadStudentRewardStatus();
}


function loadQuizData() {
  fetch(Url + "/quizzes?classId=" + encodeURIComponent(classId))
    .then(res => res.json())
    .then(list => {
      quiz = list.find(q => String(q._id) === String(quizId));
      if (!quiz) {
        alert("Quiz not found");
        window.history.back();
        return;
      }

      quizRewardXp = calcQuizTotalXp(quiz);
      renderQuizRewardsBox();

      quizTitle.innerText = quiz.title || "Quiz";
      quizSubTitle.innerText =
        (quiz.subject || "") +
        (quiz.moduleTopic ? " • " + quiz.moduleTopic : "");

      if (wantReview) {
        isReviewMode = true;
        loadReviewAttempt();
        return;
      }

      if (nextButton) {
      nextButton.style.display = "inline-flex";
      }


      loadLatestAttemptOnly().then(latest => {
        if (latest && latest.status === "submitted") {
          window.location.href =
            "student-quiz.html?quizId=" +
            quizId +
            "&classId=" +
            classId +
            "&mode=review";
          return;
        }

        loadInProgressAttempt().then(() => {
          renderCurrentQuestion();
          renderProgressDots();
          startCountdownTimer();
        });
      });
    })
    .catch(() => {
      alert("Failed to load quiz");
      window.history.back();
    });
}


/** for review purpose to show lastest attempt review data */

function loadReviewAttempt() {
  fetch(
    Url +
      "/attemptquiz/latest?quizId=" +
      encodeURIComponent(quizId) +
      "&studentId=" +
      encodeURIComponent(studentId)
  )
    .then(res => res.json())
    .then(data => {
      if (!data || !data.attempt) {
        alert("No submitted attempt found");
        window.history.back();
        return;
      }

      answers = [];
      const list = Array.isArray(data.attempt.answers)
        ? data.attempt.answers
        : [];

      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a) continue;
        answers[Number(a.questionIndex)] = a;
      }

      reviewData = Array.isArray(data.attempt.review)
        ? data.attempt.review
        : [];

      renderReviewHeaderBox(
        data.attempt.scoredPoints,
        data.attempt.totalPoints,
        data.attempt.xpEarned,
        data.attempt.totalXp,
        data.attempt.scorePercent,
        data.attempt.passGrade,
        data.attempt.isPassed
      );

      currentIndex = 0;
      renderCurrentQuestion();
      renderProgressDots();
    })
    .catch(() => {
      alert("Failed to load review");
      window.history.back();
    });
}

loadQuizData();