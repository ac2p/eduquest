const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Institution = require("../models/Institution");
const EducatorAdmin = require("../models/EducatorAdmin");

function getInstitutionFromAdmin(req, res) {
  const adminId = req.query.adminId;

  if (!adminId) {
    return res.status(400).json({ message: "adminId required" });
  }

  EducatorAdmin.findById(adminId)
    .then(function (admin) {
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      res.json({
        institutionId: admin.institutionId,
      });
    })
    .catch(function (err) {
      console.log(err);

      res.status(500).json({ message: "Server error" });
    });
}
/** institution subscription detail  */
function getManageSubscription(req, res) {
  const institutionId = req.query.institutionId;

  if (!institutionId) {
    return res.status(400).json({ message: "institutionId required" });
  }

  Subscription.findOne({ institutionId: institutionId })
    .then(function (sub) {
      if (!sub) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      return SubscriptionPlan.findOne({ name: sub.planName }).then(
        function (plan) {
          return Institution.findById(institutionId).then(
            function (institution) {
              const usage = {
                educatorPercent: percent(
                  sub.educatorUsed,
                  plan.limits.maxEducators,
                ),
                studentPercent: percent(
                  sub.studentUsed,
                  plan.limits.maxStudents,
                ),
                classPercent: percent(sub.classesUsed, plan.limits.maxClasses),
              };

              res.json({
                subscription: sub,
                plan: plan,
                institution: institution,
                usage: usage,
              });
            },
          );
        },
      );
    })
    .catch(function (err) {
      console.log(err);

      res.status(500).json({ message: "Server error" });
    });
}

/** usage progress - educator,student, classes */
function percent(used, limit) {
  if (!limit || limit <= 0) return 0;

  return Math.round((used / limit) * 100);
}

/** cancel subscription */
function cancelSubscription(req, res) {
  const institutionId = String(req.body.institutionId || "").trim();

  if (!institutionId) {
    return res.status(400).json({
      message: "institutionId required",
    });
  }

  Subscription.findOneAndUpdate(
    { institutionId: institutionId },
    { status: "CANCELLED" },
    { new: true },
  )
    .then(function (sub) {
      if (!sub) {
        return res.status(404).json({
          message: "Subscription not found",
        });
      }

      res.json({
        message: "Subscription cancelled",
        subscription: sub,
      });
    })
    .catch(function (err) {
      console.log("CANCEL ERROR:", err);

      res.status(500).json({
        message: "Server error",
      });
    });
}
/** resubscribe */
function resubscribe(req, res) {
  const institutionId = String(req.body.institutionId || "").trim();

  if (!institutionId) {
    return res.status(400).json({
      message: "institutionId required",
    });
  }

  Subscription.findOneAndUpdate(
    { institutionId: institutionId },
    { status: "ACTIVE" },
    { new: true },
  )
    .then(function (sub) {
      if (!sub) {
        return res.status(404).json({
          message: "Subscription not found",
        });
      }

      res.json({
        message: "Subscription reactivated",
        subscription: sub,
      });
    })
    .catch(function () {
      res.status(500).json({ message: "Server error" });
    });
}

/** update subscription plan */

function updatePlan(req, res) {
  const institutionId = String(req.body.institutionId || "").trim();

  const planId = String(req.body.planId || "").trim();

  if (!institutionId || !planId) {
    return res.status(400).json({
      message: "institutionId and planId required",
    });
  }

  SubscriptionPlan.findOne({ planId: planId })
    .then(function (plan) {
      if (!plan) {
        return res.status(404).json({
          message: "Plan not found",
        });
      }

      return Subscription.findOneAndUpdate(
        { institutionId: institutionId },
        { planName: plan.name },
        { new: true },
      );
    })
    .then(function (sub) {
      if (!sub) {
        return res.status(404).json({
          message: "Subscription not found",
        });
      }

      res.json({
        message: "Plan updated",
        subscription: sub,
      });
    })
    .catch(function (err) {
      console.log("UPDATE PLAN ERROR:", err);

      res.status(500).json({
        message: "Server error",
      });
    });
}

module.exports = {
  getManageSubscription,
  cancelSubscription,
  resubscribe,
  getInstitutionFromAdmin,
  updatePlan,
};
