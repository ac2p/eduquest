lucide.createIcons();

const API = "http://localhost:3000/api";

const urlParams = new URLSearchParams(window.location.search);
const adminId = urlParams.get("eduAdminId") || "6989a467ce6d4e581f802816";

let institutionId = null;

const heroPlanName = document.getElementById("heroPlanName");
const heroRenewText = document.getElementById("heroRenewText");
const currentPlanPrice = document.getElementById("currentPlanPrice");
const educatorUsage = document.getElementById("educatorUsage");
const educatorBar = document.getElementById("educatorBar");
const studentUsage = document.getElementById("studentUsage");
const studentBar = document.getElementById("studentBar");
const classUsage = document.getElementById("classUsage");
const classPercent = document.getElementById("classPercent");
const cardBrand = document.getElementById("cardBrand");
const cardExpiry = document.getElementById("cardExpiry");
const cardEmail = document.getElementById("cardEmail");
const billingAddressBox = document.getElementById("billingAddressBox");
const invoiceTableBody = document.getElementById("invoiceTableBody");
const cancelBtn = document.getElementById("cancelSubscriptionBtn");
const toastBox = document.getElementById("toast");
const toastEndDate = document.getElementById("toastEndDate");
const changePlanBtn = document.getElementById("changePlanBtn");
const planModal = document.getElementById("planModal");
const planList = document.getElementById("planList");
const closePlanBtn = document.getElementById("closePlanModal");
const confirmPlanBtn = document.getElementById("confirmPlanBtn");

let selectedPlanId = null;

function getInstitutionFromAdmin() {

fetch(
API +
"/manage-subscription/admin-institution?adminId=" +
encodeURIComponent(adminId)
)
.then(function (response) {

  if (!response.ok) {
    console.log("Failed to load institution");
    return null;
  }

  return response.json();
})
.then(function (data) {

  if (!data || !data.institutionId) {
    console.log("No institution found");
    return;
  }

  institutionId = data.institutionId;

  loadSubscription();
  loadInvoices();
})
.catch(function (error) {
  console.log("INSTITUTION ERROR:", error);
});

}

function loadSubscription() {

  if (!institutionId) return;

  fetch(
    API + "/manage-subscription/manage?institutionId=" +
    encodeURIComponent(institutionId)
  )
  .then(function (res) {
    if (!res.ok) {
      console.log("Failed to load subscription");
      return null;
    }
    return res.json();
  })
  .then(function (data) {

    if (!data || !data.subscription || !data.plan) return;

    const sub = data.subscription;
    const plan = data.plan;
    const usage = data.usage || {};
    const inst = data.institution || {};

    window.currentSubscription = sub;

    if (cancelBtn) {
      const cancelled = sub.status === "CANCELLED";
      cancelBtn.innerText =
        cancelled ? "Re-subscribe" : "Cancel Subscription";
      cancelBtn.onclick =
        cancelled ? resubscribe : cancelSubscription;
    }

    const renew = new Date();

    if (sub.billingType === "YEARLY")
      renew.setFullYear(renew.getFullYear() + 1);
    else
      renew.setMonth(renew.getMonth() + 1);

    if (heroRenewText) {
      heroRenewText.innerText =
        "Renews " +
        renew.toLocaleDateString("en-US") +
        " • " + sub.billingType;
    }

    if (heroPlanName)
      heroPlanName.innerText = plan.name || "Plan";

    if (currentPlanPrice) {

      const yearly =
        plan.monthlyPrice * 12 *
        (1 - plan.yearlyDiscountPercent / 100);

      currentPlanPrice.innerText =
        sub.billingType === "YEARLY"
          ? "$" + yearly.toFixed(0) + "/year"
          : "$" + plan.monthlyPrice + "/month";
    }

    if (educatorUsage)
      educatorUsage.innerHTML =
        sub.educatorUsed +
        " <span class='text-slate-300'>/</span> " +
        plan.limits.maxEducators;

    if (studentUsage)
      studentUsage.innerHTML =
        sub.studentUsed +
        " <span class='text-slate-300'>/</span> " +
        plan.limits.maxStudents;

    if (classUsage)
      classUsage.innerText =
        sub.classesUsed + "/" + plan.limits.maxClasses;

    if (educatorBar)
      educatorBar.style.width =
        (usage.educatorPercent || 0) + "%";

    if (studentBar)
      studentBar.style.width =
        (usage.studentPercent || 0) + "%";

    if (classPercent)
      classPercent.innerText =
        (usage.classPercent || 0) + "%";

    if (cardBrand)
      cardBrand.innerText = "Visa ending in 4242";

    if (cardExpiry)
      cardExpiry.innerText = "Expires 08/2027";

    if (cardEmail)
      cardEmail.innerText =
        inst.email || "billing@demo.edu";

    if (billingAddressBox) {

      const parts = [];

      if (inst.name) parts.push(inst.name);
      if (inst.phone) parts.push(inst.phone);
      if (inst.email) parts.push(inst.email);
      if (inst.country)
        parts.push("Country: " + inst.country);
      if (inst.timezone)
        parts.push("Timezone: " + inst.timezone);

      billingAddressBox.innerHTML =
        parts.length > 0
          ? parts.map(function (p) {
              return "<div>" + p + "</div>";
            }).join("")
          : "<div>No billing address found.</div>";
    }

    lucide.createIcons();
  })
  .catch(function (err) {
    console.log("SUBSCRIPTION ERROR:", err);
  });
}

function loadInvoices() {

if (!institutionId) return;

fetch(
API +
"/invoice/list?institutionId=" +
encodeURIComponent(institutionId)
)
.then(function (response) {

  if (!response.ok) {
    console.log("Failed to load invoices");
    return null;
  }

  return response.json();
})
.then(function (list) {

  if (!invoiceTableBody) return;

  invoiceTableBody.innerHTML = "";

  if (!list || list.length === 0) {

    invoiceTableBody.innerHTML =
      "<tr>" +
      "<td colspan='5' class='px-8 py-6 text-left text-slate-400 text-sm font-semibold'>" +
      "No invoices found" +
      "</td>" +
      "</tr>";

    return;
  }

  for (let i = 0; i < list.length; i++) {

    const inv = list[i];

    let dateText = "";

    if (inv.date) {

      const d = new Date(inv.date);

      dateText =
        d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
    }

    const amountText =
      "$" +
      Number(inv.amount || 0).toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );

    const statusText =
      String(inv.status || "").toUpperCase();

    const statusBadge =
      "<span class='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase border border-emerald-100'>" +
      statusText +
      "</span>";

    const downloadIcon =
      "<button class='text-slate-300 hover:text-indigo-600 transition-colors' type='button'>" +
      "<i data-lucide='download' class='w-4 h-4'></i>" +
      "</button>";

    const row =
      "<tr class='group hover:bg-indigo-50/30 transition-colors'>" +
      "<td class='px-8 py-4'>" +
      (dateText || "-") +
      "</td>" +
      "<td class='px-8 py-4 font-mono text-xs text-slate-500'>" +
      (inv.invoiceId || "-") +
      "</td>" +
      "<td class='px-8 py-4'>" +
      amountText +
      "</td>" +
      "<td class='px-8 py-4'>" +
      statusBadge +
      "</td>" +
      "<td class='px-8 py-4 text-right'>" +
      downloadIcon +
      "</td>" +
      "</tr>";

    invoiceTableBody.innerHTML += row;
  }

  lucide.createIcons();
})
.catch(function (error) {
  console.log("INVOICE ERROR:", error);
});

}

function cancelSubscription() {

if (!institutionId) return;

fetch(API + "/manage-subscription/cancel", {
method: "PATCH",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify({
institutionId: institutionId
})
})
.then(function (res) {

  if (!res.ok) {
    console.log("Cancel failed");
    return;
  }

  if (toastEndDate && window.currentSubscription) {

    const endDate =
      calculateEndDate(window.currentSubscription);

    toastEndDate.innerText =
      "Plan ends on " + endDate + ".";
  }

  showToast();
  loadSubscription();
})
.catch(function (err) {
  console.log("CANCEL ERROR:", err);
});

}

function resubscribe() {

  if (!institutionId) return;

  fetch(API + "/manage-subscription/resubscribe", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      institutionId: institutionId
    })
  })
    .then(function () {

      showToast();
      loadSubscription();
    });
}

function openPlanModal() {

if (!planModal) return;

selectedPlanId = null;

loadPlans();

planModal.classList.remove("hidden");
planModal.classList.add("flex");
}

function closePlanModal() {

if (!planModal) return;

planModal.classList.add("hidden");
planModal.classList.remove("flex");
}

function confirmPlanChange() {

if (!selectedPlanId || !institutionId) {
alert("Select a plan first");
return;
}

fetch(API + "/manage-subscription/update-plan", {
method: "PATCH",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify({
institutionId: institutionId,
planId: selectedPlanId
})
})
.then(function () {

  closePlanModal();
  loadSubscription();
});

}

function loadPlans() {

fetch(API + "/subscriptionplans")
.then(function (res) {
return res.json();
})
.then(function (plans) {

  if (!planList) return;

  planList.innerHTML = "";

  for (let i = 0; i < plans.length; i++) {

    const p = plans[i];

    const card = document.createElement("div");

    card.className =
      "border rounded-xl p-5 cursor-pointer hover:bg-indigo-50";

    let featuresHtml = "";

    if (Array.isArray(p.features)) {

      for (let j = 0; j < p.features.length; j++) {

        featuresHtml +=
          "<li class='text-sm text-slate-600'>✓ " +
          p.features[j] +
          "</li>";
      }
    }

    card.innerHTML =
      "<div class='font-bold text-lg'>" +
      p.name +
      "</div>" +
      "<div class='text-indigo-600 font-semibold'>$" +
      p.monthlyPrice +
      "/month</div>" +
      "<ul class='mt-2 space-y-1'>" +
      featuresHtml +
      "</ul>";

    card.onclick = function () {

      selectedPlanId = p.planId;

      const items = planList.children;

      for (let k = 0; k < items.length; k++) {
        items[k].classList.remove("bg-indigo-100");
      }

      card.classList.add("bg-indigo-100");
    };

    planList.appendChild(card);
  }
});

}

function calculateEndDate(sub) {

const today = new Date();
let endDate;

if (String(sub.billingType) === "YEARLY") {
endDate = new Date(today);
endDate.setFullYear(today.getFullYear() + 1);
} else {
endDate = new Date(today);
endDate.setMonth(today.getMonth() + 1);
}

return endDate.toLocaleDateString("en-US", {
month: "short",
day: "numeric",
year: "numeric"
});
}

function showToast() {

if (!toastBox) return;

toastBox.classList.remove("translate-y-24", "opacity-0");

setTimeout(function () {
toastBox.classList.add("translate-y-24", "opacity-0");
}, 4000);

}

if (cancelBtn) {
cancelBtn.addEventListener("click", cancelSubscription);
}

if (changePlanBtn) {
changePlanBtn.addEventListener("click", openPlanModal);
}

if (closePlanBtn) {
closePlanBtn.addEventListener("click", closePlanModal);
}

if (confirmPlanBtn) {
confirmPlanBtn.addEventListener("click", confirmPlanChange);
}

getInstitutionFromAdmin();
