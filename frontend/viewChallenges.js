console.log("viewChallenges.js loaded");

const API = "http://localhost:3000/api/attempt-challenges";


const urlParams = new URLSearchParams(window.location.search);
const studentId = urlParams.get("studentId") || "TestStu_004";
const classId = urlParams.get("classId") || "Class 4A";


const grid = document.getElementById("challengeGrid");
const searchInput = document.getElementById("searchChallenges");



loadAcceptedChallenges();

function loadAcceptedChallenges() {
  const url =
    API +
    "?studentId=" +
    encodeURIComponent(studentId) +
    "&classId=" +
    encodeURIComponent(classId);

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load challenges");
      return res.json();
    })
    .then(function (items) {
      allItems = items || [];
      displayChallenges(allItems);
    })
    .catch(function (err) {
      console.log("loadAttempt error:", err);
      grid.innerHTML =
        '<div class="text-slate-500 font-semibold">Failed to load challenges.</div>';
    });
}


function displayChallenges(list) {
  grid.innerHTML = "";

  startChallengeCard();

  if (!list || list.length === 0) {
    const msg = document.createElement("p");
    msg.className = "text-sm font-medium text-slate-400 mt-4";
    msg.innerText = "No challenges found";
    grid.appendChild(msg);
    return;
  }

  for (let i = 0; i < list.length; i++) {
    const card = acceptedChallengeCard(list[i]);
    if (card) {
      grid.appendChild(card);
    }
  }
}

function searchChallenges() {
  const text = (searchInput.value || "")
    .trim()
    .toLowerCase();

  if (!text) {
  displayChallenges(allItems);
    return;
  }

  const filtered = [];

  for (let i = 0; i < allItems.length; i++) {
    const ch = allItems[i].challenge || {};

    const title = String(ch.title || "").toLowerCase();
    const subject = String(ch.subject || "").toLowerCase();
    const desc = String(ch.description || "").toLowerCase();
    const type = String(ch.challengeType || "").toLowerCase();

    if (
      title.includes(text) ||
      subject.includes(text) ||
      desc.includes(text) ||
      type.includes(text)
    ) {
      filtered.push(allItems[i]);
    }
  }

  displayChallenges(filtered);
}

if (searchInput) {
  searchInput.addEventListener("input", searchChallenges);
}


function startChallengeCard() {
  const btn = document.createElement("button");

  btn.className =
    "group flex flex-col min-h-[280px] border-dashed hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300 cursor-pointer bg-slate-50/50 border-slate-300 border-2 rounded-3xl items-center justify-center";

  btn.innerHTML = `
    <div class="flex group-hover:text-indigo-500 group-hover:scale-110 transition-all text-slate-300 bg-white w-16 h-16 border-slate-200 border rounded-full mb-4 shadow-sm items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14"></path>
        <path d="M12 5v14"></path>
      </svg>
    </div>
    <h3 class="text-lg font-bold text-slate-600">Start a new challenge</h3>
    <p class="text-xs font-medium text-slate-400 mt-1">Onwards!</p>
  `;

  btn.onclick = function () {
    window.location.href =
      "student-pickchallenge.html?studentId=" +
      encodeURIComponent(studentId) +
      "&classId=" +
      encodeURIComponent(classId);
  };

  grid.appendChild(btn);
}

function acceptedChallengeCard(item) {
  const attempt = item.attempt || {};
  const data = item.challenge || {};

 
  const schedule = data.schedule || {};
  if (schedule.weekEnd) {
    const end = new Date(schedule.weekEnd).getTime();
    if (Date.now() > end) {
      return null;
    }
  }

  const totalSteps = Array.isArray(data.missionSteps)
    ? data.missionSteps.length
    : 0;

  const completedSteps = Array.isArray(attempt.answers)
    ? attempt.answers.length
    : 0;

  const dueDate = formatDate(
    schedule.weekEnd || data.dueDate
  );

  const attemptId = attempt._id || "";

  const card = document.createElement("div");

  card.dataset.status = attempt.status === "submitted" ? "completed" : "inprogress";

  card.className =
    "group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/40 hover:-translate-y-1 transition-all duration-300 flex flex-col";

  const isSubmitted = attempt.status === "submitted";
  const isGroup =
    String(data.challengeType || "")
      .toUpperCase() === "GROUP";

  card.innerHTML = `
    <div class="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-3xl"></div>

    <div class="p-6 pb-4 flex-1">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 2v7.5L4.7 20.5a1 1 0 0 0 .9 1.5h12.8a1 1 0 0 0 .9-1.5L14 9.5V2"></path>
              <path d="M8.5 2h7"></path>
            </svg>
          </div>

          <div>
            <h3 class="text-lg font-extrabold text-slate-800 leading-tight">
              ${data.title || "Untitled Challenge"}
            </h3>
            <span class="text-xs font-bold text-slate-400">
              ${data.subject || "General"}
            </span>
          </div>
        </div>

        <span class="text-[10px] uppercase font-extrabold text-amber-700 tracking-wide bg-amber-100 border-amber-200 border rounded-full px-2.5 py-1">
          ${(data.frequency || "WEEKLY").toUpperCase()}
        </span>
      </div>

      <p class="text-xs font-medium text-slate-500 mb-4 line-clamp-2">
        ${data.description || ""}
      </p>

      <div class="grid grid-cols-2 border-y border-slate-50 pt-3 pb-3">
        <div class="text-center">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Progress
          </div>
          <div class="text-sm font-black text-slate-700">
            ${completedSteps}/${totalSteps}
          </div>
        </div>

        <div class="text-center border-l border-slate-50">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Type
          </div>
          <div class="text-sm font-black text-slate-700">
            ${(data.challengeType || "INDIVIDUAL").toUpperCase()}
          </div>
        </div>
      </div>

      <!-- BADGES -->
      <div class="flex flex-wrap gap-2 mt-4">
        <span class="text-[10px] font-extrabold px-2 py-1 rounded-full border
          ${
            isSubmitted
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-indigo-50 text-indigo-700 border-indigo-100"
          }">
          ${isSubmitted ? "COMPLETED" : "IN PROGRESS"}
        </span>

        ${
          isSubmitted
            ? `<span class="text-[10px] font-extrabold px-2 py-1 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                Score: ${Number(attempt.scorePercent || 0)}%
              </span>`
            : ""
        }

        ${
          item.isWinner
            ? `<span class="text-[10px] font-extrabold px-2 py-1 rounded-full border bg-yellow-50 text-yellow-800 border-yellow-200">
                🏆 WINNER
              </span>`
            : ""
        }

        ${
          isGroup && isSubmitted && item.isWinner !== true
            ? `<span class="text-[10px] font-extrabold px-2 py-1 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                🎖 PARTICIPANT
              </span>`
            : ""
        }
      </div>

      <div class="flex mt-4 gap-x-3 items-center">
        <span class="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
          ${totalSteps} Questions
        </span>

        <span class="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
          Due ${dueDate}
        </span>
      </div>
    </div>

    <div class="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-3xl">
      <button
        type="button"
        class="flex gap-1.5 hover:text-indigo-600 transition-colors text-xs font-bold text-slate-500"
        onclick="continueChallenge('${attemptId}')"
      >
        ${isSubmitted ? "View" : "Continue Challenge"}
      </button>

      <button
        type="button"
        class="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white hover:shadow-sm transition-all"
        onclick="deleteChallenge('${attemptId}', this.closest('.group'))"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  return card;
}


function deleteChallenge(attemptId, cardEl) {
  if (!attemptId) return;

  fetch(
    "http://localhost:3000/api/attempt-challenges/" + attemptId,
    { method: "DELETE" }
  )
    .then(function (res) {
      if (!res.ok) {
        throw new Error("Delete failed");
      }

      if (cardEl) {
        cardEl.remove();
      }
    })
    .catch(function (err) {
      console.log("Delete error:", err);
      alert("Failed to delete challenge");
    });
}

window.deleteChallenge = deleteChallenge;



function continueChallenge(attemptId) {
  window.location.href =
    "student-challenge.html?attemptId=" +
    encodeURIComponent(attemptId);
}

window.continueChallenge = continueChallenge;


function formatDate(value) {
  if (!value) return "N/A";

  const d = new Date(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function filterChallenges() {
  const buttons = document.querySelectorAll(".toggle-btn");

  buttons.forEach(function (btn) {
    btn.onclick = function () {
      const filter = btn.dataset.filter;

     
      buttons.forEach(function (b) {
        b.classList.remove("bg-indigo-50", "text-indigo-600");
        b.classList.add("text-slate-500");
      });

      btn.classList.add("bg-indigo-50", "text-indigo-600");
      btn.classList.remove("text-slate-500");

      const cards = document.querySelectorAll("#challengeGrid > div");

      cards.forEach(function (card) {
      
        if (!card.dataset.status) {
          card.style.display = "";
          return;
        }

        card.style.display =
          card.dataset.status === filter ? "" : "none";
      });
    };
  });
}
filterChallenges();
