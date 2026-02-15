lucide.createIcons();

const API = "http://localhost:3000/api";

const planCard = document.querySelector(".glass-panel");
const planTitle = planCard.querySelector("h1");
const planPrice = document.getElementById("price-amount");
const featureList = planCard.querySelector("ul");

const summaryPlan = document.getElementById("summary-plan-name");
const summaryTotal = document.getElementById("summary-total");
const billingToggle = document.getElementById("billing-toggle");

const formContainer = document.getElementById("subscription-form-container");
const successView = document.getElementById("success-view");

const submitBtn = document.getElementById("submit-btn");
const btnText = document.getElementById("btn-text");
const btnLoader = document.getElementById("btn-loader");

const instName = document.getElementById("inst-name");
const instEmail = document.getElementById("inst-email");
const instPhone = document.getElementById("inst-phone");
const instCountry = document.getElementById("inst-country");
const instTimezone = document.getElementById("inst-timezone");

const billingName = document.getElementById("billing-name");
const billingEmail = document.getElementById("billing-email");
const billingRole = document.getElementById("billing-role");

const cardName = document.getElementById("card-name");
const cardNumber = document.getElementById("card-number");
const cardExpiry = document.getElementById("card-expiry");
const cardCvc = document.getElementById("card-cvc");

let plans = [];
let selectedIndex = 0;
let isYearly = false;

function loadPlans() {
  fetch(API + "/subscriptionplans")
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      plans = data || [];

      if (plans.length === 0) {
        showModal("No subscription plans found in database.");
        return;
      }
      selectedIndex = 0;
      showCurrentPlan();
      updateSummary();
    })
    .catch(function () {
      showModal("Failed to load subscription plans from server.");
    });
}

function showCurrentPlan() {
  const plan = plans[selectedIndex];
  if (!plan) return;

  planTitle.innerText = plan.name;

  if (isYearly) {
    planPrice.innerText = "$" + Math.round(plan.monthlyPrice * 0.8);
  } else {
    planPrice.innerText = "$" + plan.monthlyPrice;
  }

  featureList.innerHTML = "";

  for (let i = 0; i < plan.features.length; i++) {
    featureList.innerHTML += `
    <li class="flex items-start gap-3 text-sm font-medium text-slate-600">
      <div class="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mt-0.5">
        ✔
      </div>
      <span>${plan.features[i]}</span>
    </li>
  `;
  }
}
planCard.addEventListener("click", function (e) {
  const rect = planCard.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const half = rect.width / 2;

  if (clickX < half) {
    prevPlan();
  } else {
    nextPlan();
  }
});

function nextPlan() {
  if (plans.length === 0) return;

  selectedIndex = selectedIndex + 1;

  if (selectedIndex >= plans.length) {
    selectedIndex = 0;
  }

  showCurrentPlan();
  updateSummary();
}

function prevPlan() {
  if (plans.length === 0) return;

  selectedIndex = selectedIndex - 1;

  if (selectedIndex < 0) {
    selectedIndex = plans.length - 1;
  }

  showCurrentPlan();
  updateSummary();
}

function updateSummary() {
  const plan = plans[selectedIndex];
  if (!plan) return;

  if (isYearly) {
    summaryPlan.innerText = plan.name + " (Yearly)";

    const yearlyPrice =
      plan.monthlyPrice * 12 * ((100 - plan.yearlyDiscountPercent) / 100);

    summaryTotal.innerText = "$" + yearlyPrice.toFixed(2);
  } else {
    summaryPlan.innerText = plan.name + " (Monthly)";
    summaryTotal.innerText = "$" + Number(plan.monthlyPrice).toFixed(2);
  }
}

function togglePrice() {
  isYearly = billingToggle.checked;
  showCurrentPlan();
  updateSummary();
}

cardNumber.addEventListener("input", function () {
  let value = cardNumber.value.replace(/\D/g, "");
  value = value.slice(0, 16);

  let formatted = "";
  for (let i = 0; i < value.length; i++) {
    if (i > 0 && i % 4 === 0) formatted += " ";
    formatted += value[i];
  }

  cardNumber.value = formatted;
});
cardExpiry.addEventListener("input", function () {
  let value = cardExpiry.value.replace(/\D/g, "");
  value = value.slice(0, 4);

  if (value.length >= 3) {
    value = value.slice(0, 2) + " / " + value.slice(2);
  }

  cardExpiry.value = value;
});
cardCvc.addEventListener("input", function () {
  let value = cardCvc.value.replace(/\D/g, "");
  value = value.slice(0, 3);
  cardCvc.value = value;
});

function validateForm() {
  if (!instName.value.trim()) return false;
  if (!instEmail.value.trim()) return false;
  if (!instPhone.value.trim()) return false;

  if (!billingName.value.trim()) return false;
  if (!billingEmail.value.trim()) return false;

  if (!cardName.value.trim()) return false;
  if (cardNumber.value.replace(/\s/g, "").length !== 16) return false;
  if (cardExpiry.value.length < 5) return false;
  if (cardCvc.value.length !== 3) return false;

  return true;
}

function handleSubscribe(e) {
  e.preventDefault();

  if (!validateForm()) {
    alert("Please fill in all fields correctly before submitting.");
    return;
  }

  btnText.classList.add("hidden");
  btnLoader.classList.remove("hidden");
  submitBtn.disabled = true;

  const plan = plans[selectedIndex];

  const payload = {
    institutionName: instName.value.trim(),
    institutionEmail: instEmail.value.trim(),
    institutionPhone: instPhone.value.trim(),
    country: document.getElementById("inst-country").value,
    timezone: document.getElementById("inst-timezone").value,

    billingName: billingName.value.trim(),
    billingEmail: billingEmail.value.trim(),
    billingRole: document.getElementById("billing-role").value,

    planName: plan.name,
    billingType: isYearly ? "YEARLY" : "MONTHLY",
    totalPaid: isYearly
      ? plan.monthlyPrice * 12 * ((100 - plan.yearlyDiscountPercent) / 100)
      : plan.monthlyPrice,
  };

  fetch(API + "/subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(function (res) {
      return res.json().then(function (data) {
        return { status: res.status, body: data };
      });
    })
    .then(function (result) {
      btnText.classList.remove("hidden");
      btnLoader.classList.add("hidden");
      submitBtn.disabled = false;

      if (result.status === 400) {
        showModal(
          result.body.message || "This institution is already subscribed.",
        );
        return;
      }

      if (!result.body.success) {
        alert("Server error. Please try again.");
        return;
      }

      formContainer.classList.add("hidden");
      successView.classList.remove("hidden");
    })
    .catch(function () {
      btnText.classList.remove("hidden");
      btnLoader.classList.add("hidden");
      submitBtn.disabled = false;

      alert("Network error. Please check your connection.");
    });
}

function showModal(message) {
  const modal = document.getElementById("custom-modal");
  const text = document.getElementById("modal-message");

  text.innerText = message;
  modal.classList.remove("hidden");
}

function closeModal() {
  const modal = document.getElementById("custom-modal");
  modal.classList.add("hidden");
}

loadPlans();
