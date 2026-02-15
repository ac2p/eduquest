const API = "http://localhost:3000/api";


const params = new URLSearchParams(window.location.search);
const attemptId = params.get("attemptId");

if (!attemptId) {
  alert("Missing attemptId in URL");
  throw new Error("attemptId missing");
}


const title = document.getElementById("challengeTitle");
const desc = document.getElementById("challengeDescription");
const coins = document.getElementById("rewardCoins");
const xp = document.getElementById("rewardXp");

const qCount = document.getElementById("questionCount");
const qText = document.getElementById("questionText");
const answersBox = document.getElementById("answersBox");

const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const submitBtn = document.getElementById("submitBtn");
const saveDraftBtn = document.getElementById("saveDraftBtn");

const stepText = document.getElementById("stepText");
const completedText = document.getElementById("completedText");

const timeDisplay = document.getElementById("timeRemaining");
const timerBar = document.getElementById("timerBar");
const progressBar = document.getElementById("progressBar");

const questionsList = document.getElementById("questionsList");
const streakBadge = document.getElementById("streakBadge");
const savedAgoText = document.getElementById("savedAgoText");


let data = null;
let step = 1;
let timerInterval = null;
let viewOnly = false;

let lastSavedAtMs = 0;
let savedTicker = null;


loadAttempt();

function loadAttempt() {
  fetch(API + "/attempt-challenges/" + attemptId)
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load attempt");
      return res.json();
    })
    .then(function (json) {
      data = json;

      step = (data.attempt && data.attempt.currentStepNo)
        ? Number(data.attempt.currentStepNo)
        : 1;

      viewOnly = (data.attempt && data.attempt.status === "submitted");

      renderHeader();
      renderQuestion();
      updateNavButtons();
      updateProgress();
      startTimer();
      loadStreak();

      updateSavedTimeFromServer();
      startSavedAgoTicker();

      applyViewOnlyMode();
    })
    .catch(function (err) {
      console.log("loadAttempt error:", err);
      showPopup("Could not load challenge attempt");
    });
}


function renderHeader() {
  const ch = data.challenge;

  title.textContent = ch.title || "";
  desc.textContent = ch.description || "";

  const coinVal = (ch.rewards && ch.rewards.coins) ? ch.rewards.coins : 0;
  const xpVal = (ch.rewards && ch.rewards.xp) ? ch.rewards.xp : 0;

  coins.textContent = coinVal + " Coins";
  xp.textContent = "+" + xpVal + " XP";
}


function startTimer() {
  const schedule = data.challenge ? data.challenge.schedule : null;
  const endDate = schedule ? schedule.weekEnd : null;
  const startDate = schedule ? schedule.weekStart : null;

  if (!endDate || !timeDisplay) return;

  if (timerInterval) clearInterval(timerInterval);

  const start = startDate ? new Date(startDate).getTime() : Date.now();
  const end = new Date(endDate).getTime();
  const total = end - start;

  timerInterval = setInterval(function () {
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) {
      timeDisplay.textContent = "Expired";
      if (timerBar) timerBar.style.width = "100%";
      clearInterval(timerInterval);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    timeDisplay.textContent =
      String(days).padStart(2, "0") + "d " +
      String(hours).padStart(2, "0") + "h";

    if (timerBar) {
      const used = ((now - start) / total) * 100;
      timerBar.style.width = Math.min(100, Math.max(0, used)) + "%";
    }
  }, 1000);
}


function renderQuestion() {
  const questions = data.challenge.missionSteps || [];

  if (questions.length === 0) {
    qText.textContent = "No questions found.";
    answersBox.innerHTML = "";
    return;
  }

  const q = questions[step - 1];

  qCount.textContent = "Question " + step + " of " + questions.length;
  qText.textContent = q.questionText || "";
  answersBox.innerHTML = "";

  for (let i = 0; i < (q.options || []).length; i++) {
    const label = document.createElement("label");
    label.className =
      "answer-card flex items-center gap-4 p-5 rounded-xl border border-slate-200 bg-white cursor-pointer transition-all";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = i;
    input.className = "hidden";

    input.onclick = function () {
      if (viewOnly) return;
      selectAnswer(i);
    };

    const badge = document.createElement("span");
    badge.className =
      "badge w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-extrabold flex items-center justify-center text-sm border border-slate-200";
    badge.textContent = String.fromCharCode(65 + i);

    const text = document.createElement("span");
    text.className = "flex-1 text-slate-700 font-bold text-base";
    text.textContent = q.options[i];

    label.appendChild(input);
    label.appendChild(badge);
    label.appendChild(text);

    answersBox.appendChild(label);
  }

  restoreSelected();
  updateProgress();
  renderSidebar();
  applyViewOnlyMode();
}


function restoreSelected() {
  const attempt = data.attempt || {};
  const saved = Array.isArray(attempt.answers) ? attempt.answers : [];

  for (let i = 0; i < saved.length; i++) {
    if (Number(saved[i].stepNo) === Number(step)) {
      highlightUI(saved[i].selectedIndex);
      break;
    }
  }
}

function highlightUI(index) {
  const cards = document.querySelectorAll(".answer-card");
  for (let i = 0; i < cards.length; i++) {
    cards[i].classList.remove("selected");
    if (i === index) cards[i].classList.add("selected");
  }
}


function selectAnswer(index) {
  highlightUI(index);

  fetch(API + "/attempt-challenges/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attemptId: attemptId,
      stepNo: step,
      selectedIndex: index,
      currentStep: step
    })
  })
    .then(function () {
      setLastSavedTime(Date.now());

      if (!data.attempt.answers) data.attempt.answers = [];

      let found = false;
      for (let i = 0; i < data.attempt.answers.length; i++) {
        if (Number(data.attempt.answers[i].stepNo) === Number(step)) {
          data.attempt.answers[i].selectedIndex = index;
          found = true;
        }
      }

      if (!found) {
        data.attempt.answers.push({
          stepNo: step,
          selectedIndex: index
        });
      }

      data.attempt.currentStepNo = step;
    })
    .catch(function (err) {
      console.log("save answer error:", err);
    });
}


function renderSidebar() {
  if (!questionsList) return;

  const steps = data.challenge.missionSteps || [];
  questionsList.innerHTML = "";

  for (let i = 0; i < steps.length; i++) {
    const row = document.createElement("div");
    row.className = "p-4 flex items-center justify-between group transition-colors";

    const left = document.createElement("span");
    left.className = "text-xs font-bold";
    left.textContent = "Question " + (i + 1);

    const status = document.createElement("span");
    status.className = "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase";

    if (i + 1 < step) {
      status.textContent = "Done";
      status.className += " text-emerald-600 bg-emerald-50 border border-emerald-100";
      row.classList.add("bg-emerald-50/30");
    } else if (i + 1 === step) {
      status.textContent = "Current";
      status.className += " text-orange-600 bg-white border border-orange-200";
      row.classList.add("bg-orange-50/40");
    } else {
      status.textContent = "Locked";
      status.className += " text-slate-400 bg-slate-100 border border-slate-200";
      row.classList.add("opacity-60");
    }

    row.appendChild(left);
    row.appendChild(status);
    questionsList.appendChild(row);
  }
}


function applyViewOnlyMode() {
  if (!viewOnly) return;

  const cards = document.querySelectorAll(".answer-card");
  for (let i = 0; i < cards.length; i++) {
    cards[i].style.pointerEvents = "none";
    cards[i].style.opacity = "0.75";
  }

  if (submitBtn) submitBtn.classList.add("hidden");
  if (saveDraftBtn) saveDraftBtn.classList.add("hidden");
}


function updateProgress() {
  const total = (data.challenge.missionSteps || []).length;

  if (stepText) stepText.textContent = "Step " + step;
  if (completedText) {
    completedText.textContent = (step - 1) + " of " + total + " completed";
  }

  if (progressBar && total > 0) {
    const percent = ((step - 1) / total) * 100;
    progressBar.style.width = percent + "%";
  }
}


function updateNavButtons() {
  const total = (data.challenge.missionSteps || []).length;

  if (step >= total) {
    nextBtn.classList.add("hidden");
  } else {
    nextBtn.classList.remove("hidden");
  }
}


function saveDraft() {
  if (viewOnly) return;

  fetch(API + "/attempt-challenges/save-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attemptId: attemptId,
      currentStepNo: step
    })
  })
    .then(function (res) {
      if (!res.ok) throw new Error("Save failed");

      setLastSavedTime(Date.now());
      showPopup("Draft saved");
    })
    .catch(function () {
      showPopup("Draft save failed");
    });
}


function submitChallenge() {
  if (viewOnly) return;

  fetch(API + "/attempt-challenges/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId: attemptId })
  })
    .then(function (res) {
      if (!res.ok) throw new Error("Submit failed");
      return res.json();
    })
    .then(function () {
      showPopup("Challenge submitted!");
      setTimeout(function () {
        window.location.href = "student-acceptedchallenge.html";
      }, 1200);
    })
    .catch(function () {
      showPopup("Submit failed");
    });
}


nextBtn.onclick = function () {
  const max = (data.challenge.missionSteps || []).length;
  if (step < max) {
    step++;
    if (data.attempt) data.attempt.currentStepNo = step;
    renderQuestion();
    updateNavButtons();
  }
};

prevBtn.onclick = function () {
  if (step > 1) {
    step--;
    if (data.attempt) data.attempt.currentStepNo = step;
    renderQuestion();
    updateNavButtons();
  }
};

submitBtn.onclick = function () {
  submitChallenge();
};

saveDraftBtn.onclick = function () {
  saveDraft();
};


function setLastSavedTime(ms) {
  lastSavedAtMs = ms;
  updateSavedAgoText();
}

function updateSavedTimeFromServer() {
  if (data.attempt && data.attempt.updatedAt) {
    lastSavedAtMs = new Date(data.attempt.updatedAt).getTime();
    updateSavedAgoText();
  }
}

function startSavedAgoTicker() {
  if (savedTicker) clearInterval(savedTicker);
  savedTicker = setInterval(updateSavedAgoText, 15000);
}

function updateSavedAgoText() {
  if (!savedAgoText || !lastSavedAtMs) return;

  const diffMs = Date.now() - lastSavedAtMs;
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes < 1) {
    savedAgoText.textContent = "Saved just now";
  } else if (minutes < 60) {
    savedAgoText.textContent = "Saved " + minutes + "m ago";
  } else {
    const hours = Math.floor(minutes / 60);
    savedAgoText.textContent = "Saved " + hours + "h ago";
  }
}

function loadStreak() {
  if (!data.attempt || !data.attempt.studentId || !streakBadge) {
    streakBadge.textContent = "0 Day Streak";
    return;
  }

  fetch(
    API +
      "/attempt-challenges/streak?studentId=" +
      encodeURIComponent(data.attempt.studentId)
  )
  
    .then(function (res) {
      return res.json();
    })
    .then(function (json) {
      if (json && typeof json.streak === "number") {
        streakBadge.textContent = json.streak + " Day Streak";
      } else {
        streakBadge.textContent = "0 Day Streak";
      }
    })
    .catch(function () {
      streakBadge.textContent = "0 Day Streak";
    });
}


function showPopup(text) {
  const popup = document.getElementById("uiPopup");
  const popupText = document.getElementById("uiPopupText");
  if (popupText) popupText.textContent = text;

  if (popup) {
    popup.classList.remove("hidden");
    popup.classList.add("flex");
  }
}

function closePopup() {
  const popup = document.getElementById("uiPopup");
  if (popup) {
    popup.classList.add("hidden");
    popup.classList.remove("flex");
  }
}
