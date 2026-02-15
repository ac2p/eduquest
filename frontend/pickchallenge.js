const url = "http://localhost:3000/api";

const studentId = "TestStu_004";
const urlParams = new URLSearchParams(window.location.search);
const currentClassId = urlParams.get("classId") || "Class 4A";

const stage = document.getElementById("cards-stage");
const successOverlay = document.getElementById("success-overlay");
const header = document.getElementById("main-header");
const focusInstruction = document.getElementById("focus-instruction");

let focusedCard = null;
let weeklyChallenges = [];


function getDifficultyLabel(level) {
  const text = String(level || "").toLowerCase();
  if (text === "easy") return "easy";
  if (text === "medium") return "medium";
  return "hard";
}

function getDifficultyBars(level) {
  const text = String(level || "").toLowerCase();
  if (text === "easy") return 1;
  if (text === "medium") return 2;
  return 3;
}

function getTypeLabel(type) {
  const text = String(type || "").toLowerCase();
  if (text === "group") return "group";
  return "individual";
}

/*fetch list of challenges from db */
function loadWeeklyChallenges() {
  const apiUrl =
    url +
    "/pick-challenges/weekly?classId=" +
    encodeURIComponent(currentClassId) +
    "&studentId=" +
    encodeURIComponent(studentId);

  console.log("API:", apiUrl);

  fetch(apiUrl)
    .then(function (res) {
      if (!res.ok) {
        showFailMessage();
        return null;
      }
      return res.json();
    })
    .then(function (data) {
      if (!data) return;

      weeklyChallenges = data || [];
      showCards(weeklyChallenges);
    });
}

/*accepts the picked challenge for the student*/
function acceptChallenge(challengeId) {
  return fetch(url + "/attempt-challenges/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeId: challengeId,
      classId: currentClassId,
      studentId: studentId
    })
  })
    .then(function (res) {
      if (!res.ok) {
        alert("Failed to accept challenge");
        return null;
      }
      return res.json();
    })
    .then(function (data) {
      if (!data || !data.attemptId) {
        alert("No attemptId returned from server");
        return null;
      }

     
      return data.attemptId;
    });
}




/*individual challenges - eveyone can see, group challeges - only assigned students can see*/

function getAssignedChallenges(ch) { 
  const type = String(ch.challengeType || "").toUpperCase();

  if (type !== "group") return true;

  if (!ch.assignedStudentIds) return true;

  let list = [];

  if (Array.isArray(ch.assignedStudentIds)) {
    list = ch.assignedStudentIds;
  } else if (typeof ch.assignedStudentIds === "string") {
    list = ch.assignedStudentIds.split(",");
  }

  for (let i = 0; i < list.length; i++) {
    list[i] = String(list[i]).trim();
  }

  return list.indexOf(String(studentId).trim()) !== -1;
}


function showFailMessage() {
  stage.innerHTML = `
    <div class="text-center text-slate-400 max-w-md">
      <p class="text-lg font-semibold text-white mb-2">Failed to load challenges</p>
      <p class="text-sm">Check server route: /api/pick-challenges/weekly</p>
    </div>
  `;
}



function showEmptyMessage() {
  stage.innerHTML = `
    <div class="text-center text-slate-400 max-w-md">
      <p class="text-lg font-semibold text-white mb-2">No weekly challenges</p>
      <p class="text-sm">Nothing available to pick.</p>
    </div>
  `;
}



function showCards(list) {
  stage.innerHTML = "";
  focusedCard = null;

  header.classList.remove("opacity-0", "translate-y-[-20px]");
  focusInstruction.classList.add("opacity-0", "-translate-y-4");

  if (!list || list.length === 0) {
    showEmptyMessage();
    return;
  }

  let shownCount = 0;

  for (let i = 0; i < list.length; i++) {
    const ch = list[i];

    if (ch.isEnabled !== true) continue;
    if (String(ch.status) !== "published") continue;
    if (!getAssignedChallenges(ch)) continue;

    const challengeId = ch._id || ch.id;
    const title = ch.title || "";
    const desc = ch.description || "";
    const subject = ch.subject || "General";

    const typeLabel = getTypeLabel(ch.challengeType);
    const diffLabel = getDifficultyLabel(ch.difficulty);
    const diffBarsCount = getDifficultyBars(ch.difficulty);

    const color = "#a78bfa";
    const dimColor = "rgba(167, 139, 250, 0.4)";
    const icon = "fa-compass";

    let barsHtml = "";
    for (let b = 0; b < 3; b++) {
      const active = b < diffBarsCount ? "active" : "";
      barsHtml += `<div class="diff-bar ${active}"></div>`;
    }

    const card = document.createElement("div");
    card.className = "quest-card card-enter-initial";
    card.style.setProperty("--glow-color", color);
    card.style.setProperty("--glow-color-dim", dimColor);
    card.dataset.challengeId = challengeId;

    card.innerHTML = `
      <div class="flex justify-between items-start mb-8 w-full pointer-events-none z-10">
        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-white/10 bg-white/5 px-2 py-1 rounded-md self-start">
          ${subject}
        </span>

        <div class="diff-container">
          <span class="diff-label">${diffLabel}</span>
          <div class="diff-bars">${barsHtml}</div>
        </div>
      </div>

      <div class="card-icon-box text-white pointer-events-none z-10">
        <i class="fas ${icon}"></i>
      </div>

      <h3 class="text-2xl font-bold text-white font-display mb-2 pointer-events-none z-10">
        ${title}
      </h3>

      <p class="text-sm text-slate-400 font-medium leading-relaxed mb-auto pointer-events-none z-10">
        ${desc}
      </p>

      <div class="mt-8 pt-4 border-t border-white/10 flex items-center justify-between w-full pointer-events-none z-10">
        <div class="flex flex-col">
          <span class="text-[10px] text-slate-500 font-bold uppercase">Duration</span>
          <span class="font-bold text-white drop-shadow-md" style="color:${color}">Weekly</span>
        </div>

        <div class="flex flex-col items-end">
          <span class="text-[10px] text-slate-500 font-bold uppercase">Type</span>
          <span class="font-bold text-white drop-shadow-md">${typeLabel}</span>
        </div>
      </div>
    `;

    setupInteraction(card);
    stage.appendChild(card);
    shownCount++;
  }

  if (shownCount === 0) {
    showEmptyMessage();
  }
}


function setupInteraction(card) {
  let holdTimer = null;
  let progress = 0;

  card.addEventListener("mousedown", onStart);
  card.addEventListener("touchstart", onStart, { passive: false });

  function onStart(e) {
    if (!card.classList.contains("is-focused")) {
      e.preventDefault();
      focusCard(card);
      return;
    }
    startHold(e);
  }

  function startHold(e) {
    e.preventDefault();
    progress = 0;
    card.classList.add("is-charging");

    holdTimer = setInterval(function () {
      progress += 1.5;

      if (progress > 10) card.classList.add("shake-1");
      if (progress > 50) {
        card.classList.remove("shake-1");
        card.classList.add("shake-2");
      }
      if (progress > 85) {
        card.classList.remove("shake-2");
        card.classList.add("shake-3");
      }

      if (progress >= 100) {
        clearInterval(holdTimer);
        holdTimer = null;
        finishAccept(card, card.dataset.challengeId);
      }
    }, 20);
  }

  function stopHold() {
    clearInterval(holdTimer);
    holdTimer = null;
    progress = 0;
    card.classList.remove("shake-1", "shake-2", "shake-3");
    card.classList.remove("is-charging");
  }

  window.addEventListener("mouseup", stopHold);
  window.addEventListener("touchend", stopHold);
}


function focusCard(card) {
  focusedCard = card;

  const allCards = document.querySelectorAll(".quest-card");
  for (let i = 0; i < allCards.length; i++) {
    if (allCards[i] === card) {
      allCards[i].classList.add("is-focused");
      allCards[i].classList.remove("is-hidden");
    } else {
      allCards[i].classList.remove("is-focused");
      allCards[i].classList.add("is-hidden");
    }
  }

  header.classList.add("opacity-0", "translate-y-[-20px]");
  focusInstruction.classList.remove("opacity-0", "-translate-y-4");
}

window.addEventListener("click", function (e) {
  if (focusedCard && !e.target.closest(".quest-card.is-focused")) {
    focusedCard = null;

    const allCards = document.querySelectorAll(".quest-card");
    for (let i = 0; i < allCards.length; i++) {
      allCards[i].classList.remove("is-focused");
      allCards[i].classList.remove("is-hidden");
    }

    header.classList.remove("opacity-0", "translate-y-[-20px]");
    focusInstruction.classList.add("opacity-0", "-translate-y-4");
  }
});


function finishAccept(card, challengeId) {
  card.classList.remove("shake-1", "shake-2", "shake-3");
  card.classList.add("shake-decay");

  acceptChallenge(challengeId).then(function (attemptId) {
    if (!attemptId) return;

    card.remove();

    setTimeout(function () {
      successOverlay.style.pointerEvents = "auto";
      successOverlay.style.opacity = "1";
    }, 300);

    setTimeout(function () {
      window.location.href =
        "student-acceptedchallenge.html?attemptId=" +
        encodeURIComponent(attemptId);
    }, 1200);
  });
}


function createStars() {
  const container = document.getElementById("stars-container");
  if (!container) return;

  for (let i = 0; i < 60; i++) {
    const star = document.createElement("div");
    star.className = "star";

    const size = Math.random() * 2 + "px";
    star.style.width = size;
    star.style.height = size;
    star.style.left = Math.random() * 100 + "%";
    star.style.top = Math.random() * 100 + "%";
    star.style.animationDuration = Math.random() * 3 + 2 + "s";

    container.appendChild(star);
  }
}


createStars();
loadWeeklyChallenges();


const style = document.createElement("style");
style.innerHTML = `
  .card-enter-initial {
    animation: fadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);
