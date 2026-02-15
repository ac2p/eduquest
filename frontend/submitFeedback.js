lucide.createIcons();

  const url = "http://localhost:3000/api";
  
  const studentId = "TestStu_001";

  const educatorList = document.getElementById("educatorList");
  const educatorSearch = document.getElementById("educatorSearch");
  const feedbackText = document.getElementById("feedbackMessage");
  const anonymousCheckbox = document.getElementById("anon");
  const submitButton = document.getElementById("submitFeedbackBtn");
  const charCount = document.getElementById("charCount");
  const resultText = document.getElementById("submitResult");

  let educators = [];
  let selectedEducatorId = null;

  async function loadEducators() {
  const res = await fetch(url + "/educators");
  const data = await res.json();

  educators = data;
  showEducators(educators);
}

function showEducators(list) {
 
  educatorList.innerHTML = "";

 
  if (list.length === 0) {
    educatorList.innerHTML =
      "<p class='text-sm text-slate-500'>No educators found</p>";
    return;
  }

  for (let i = 0; i < list.length; i++) {
    const educator = list[i];

  
    if (i === 0 && selectedEducatorId === null) {
      selectedEducatorId = educator._id;
    }

    
    let isSelected = false;
    if (educator._id === selectedEducatorId) {
      isSelected = true;
    }

    
    let avatarUrl = educator.avatarUrl;
    if (!avatarUrl) {
      avatarUrl =
        "https://api.dicebear.com/7.x/avataaars/svg?seed=" +
        encodeURIComponent(educator.name);
    }

   
    educatorList.innerHTML += `
      <label class="block cursor-pointer mb-2">
        <input
          type="radio"
          name="educator"
          value="${educator._id}"
          ${isSelected ? "checked" : ""}
          class="hidden"
        >

        <div class="p-3 rounded-xl border ${
          isSelected
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-200 bg-white"
        }">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img
                src="${avatarUrl}"
                alt="${educator.name}"
                class="w-10 h-10 rounded-full border border-slate-200 bg-white"
              />
              <div>
                <p class="font-semibold text-sm text-slate-800">
                  ${educator.name}
                </p>
                <p class="text-xs text-slate-500">
                  ${educator.subject}
                </p>
              </div>
            </div>

            ${
              isSelected
                ? "<span class='text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-600'>Selected</span>"
                : ""
            }
          </div>
        </div>
      </label>
    `;
  }

  const radios = document.querySelectorAll("input[name='educator']");
  for (let i = 0; i < radios.length; i++) {
    radios[i].addEventListener("change", function () {
      selectedEducatorId = this.value;
      showEducators(educators);
    });
  }
}


 function searchEducator() {
  const text = educatorSearch.value.toLowerCase();

  const filtered = [];

  for (let i = 0; i < educators.length; i++) {
    if (
      educators[i].name.toLowerCase().includes(text) ||
      educators[i].subject.toLowerCase().includes(text)
    ) {
      filtered.push(educators[i]);
    }
  }

  showEducators(filtered);
}


function submitFeedback() {

  if (!selectedEducatorId) {
    showResult("Please select a educator", false);
    return;
  }

  if (feedbackText.value.trim() === "") {
    showResult("Please write your feedback", false);
    return;
  }

  const feedbackData = {
    studentId: studentId,
    educatorId: selectedEducatorId,
    message: feedbackText.value.trim(),
    anonymous: anonymousCheckbox.checked
  };

  fetch(url + "/feedbacks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feedbackData)
  })
  .then(function (res) {
    return res.json();
  })
  .then(function (data) {

    feedbackText.value = "";
    updateCharCount();
    showResult("Feedback submitted successfully!", true);
    console.log(data);

  });
}




function showResult(message, isSuccess) {
    resultText.innerText = message;
    resultText.className = isSuccess
      ? "mt-3 text-xs font-semibold text-center text-green-600"
      : "mt-3 text-xs font-semibold text-center text-red-600";
  }

  function updateCharCount() {
    charCount.innerText = feedbackText.value.length + " / 500";
  }

  feedbackText.addEventListener("input", updateCharCount);
  educatorSearch.addEventListener("input", searchEducator);
  submitButton.addEventListener("click", submitFeedback);

  updateCharCount();
  loadEducators();