lucide.createIcons();

const url = "http://localhost:3000/api";

const studentId = "TestStu_001";

const quizContainer = document.getElementById("quizList");
const statusMessage = document.getElementById("quizMsg");

const urlParams = new URLSearchParams(window.location.search);
const currentClassId = urlParams.get("classId") || "Class 4A";


function formatDueDate(dateValue) {
  if (!dateValue) return "No due date";

  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "Invalid date";

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/**Add each quiz points for xp */
function calculateTotalPoints(list) {
  let total = 0;
  if (Array.isArray(list)) {
    for (let i = 0; i < list.length; i++) {
      total += Number(list[i].points || 0);
    }
  }
  return total;
}


function loadClassQuizzes() {
  if (statusMessage) statusMessage.innerText = "Loading quizzes...";
  if (quizContainer) quizContainer.innerHTML = "";
/** to fecth quizzes */
  fetch(url + "/quizzes?classId=" + encodeURIComponent(currentClassId))
  .then(function (quizRes) {
    return quizRes.json();
  })
  .then(function (quizzes) {
      /** to get attempt status - not started, in progress, submiited */
  fetch( url + "/attemptquiz/all?studentId=" + encodeURIComponent(studentId))
    .then(function (attemptRes) {
        return attemptRes.json();
  })
    .then(function (attempts) {

    const attemptsByQuizId = {};

      for (let i = 0; i < attempts.length; i++) {
        const attempt = attempts[i];
        attemptsByQuizId[attempt.quizId] = attempt;
      }

      if (!quizzes || quizzes.length === 0) {
        statusMessage.innerText = "No quizzes found.";
          return;
      }

    statusMessage.innerText = "";
    let quizCardsText = "";

      for (let i = 0; i < quizzes.length; i++) {
        const quiz = quizzes[i];
        const attempt = attemptsByQuizId[quiz._id];
        quizCardsText += quizCard(quiz, attempt);
     }
      quizContainer.innerHTML = quizCardsText;
          lucide.createIcons();
  })
      .catch(function () {
          statusMessage.innerText = "Failed to load quizzes.";
        });
    })
    .catch(function () {
      statusMessage.innerText = "Failed to load quizzes.";
    });
}

/* bulid ui card for view quizzes*/
function quizCard(q, attempt) {
  const questionCount = q.questions ? q.questions.length : 0;
  const dueText = formatDueDate(q.dueDate);
  const totalXP = calculateTotalPoints(q.questions);

  let badgeText = "NOT STARTED";
  let badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
  let buttonText = "Start";
  let buttonOnclick = `openQuiz('${q._id}')`;
  let retakeBtn = "";

  if (attempt && attempt.status === "in_progress") {
    badgeText = "IN PROGRESS";
    badgeClass = "bg-amber-50 text-amber-600 border-amber-100";
    buttonText = "Continue";
  }

  if (attempt && attempt.status === "submitted") {
    badgeText = "COMPLETED";
    badgeClass = "bg-emerald-50 text-emerald-600 border-emerald-100";
    buttonText = "Review";
    buttonOnclick = `reviewQuiz('${q._id}')`;

    if (q.allowRetakes === true) {
      retakeBtn = `
        <button
          class="mt-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 w-full rounded-xl py-2"
          onclick="retakeQuiz('${q._id}')"
        >
          Retake
        </button>
      `;
    }
  }

  return `
  <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:border-indigo-200 transition-all">
    <div class="flex justify-between items-center">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-bold text-slate-800">
            ${q.title || "Untitled Quiz"}
          </h3>
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeClass}">
            ${badgeText}
          </span>
        </div>

        <p class="text-sm text-slate-500">
          ${q.moduleTopic || q.subject || "Quiz"}
        </p>

        <div class="flex gap-4 text-xs text-slate-400 mt-2">
          <span>${questionCount} Qs</span>
          <span>Due ${dueText}</span>
          <span class="text-indigo-500">${totalXP} XP</span>
        </div>
      </div>

      <div class="w-40">
        <button
          class="bg-indigo-600 hover:bg-indigo-700 text-white w-full rounded-xl py-2 font-bold"
          onclick="${buttonOnclick}"
        >
          ${buttonText}
        </button>
        ${retakeBtn}
      </div>
    </div>
  </div>
  `;
}

/** when click start quiz redirect to student quiz page */
function openQuiz(quizId) {
  window.location.href =
    "student-quiz.html?quizId=" +
    encodeURIComponent(quizId) +
    "&classId=" +
    encodeURIComponent(currentClassId);
}

/** when click review goes to review mode */

function reviewQuiz(quizId) {
  window.location.href =
    "student-quiz.html?quizId=" +
    encodeURIComponent(quizId) +
    "&classId=" +
    encodeURIComponent(currentClassId) +
    "&mode=review";
}

function retakeQuiz(quizId) {
  fetch(url + "/attemptquiz/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quizId,
      studentId
    })
  })
    .then(() => openQuiz(quizId))
    .catch(() => alert("Failed to retake quiz"));
}

window.openQuiz = openQuiz;
window.reviewQuiz = reviewQuiz;
window.retakeQuiz = retakeQuiz;

loadClassQuizzes();
