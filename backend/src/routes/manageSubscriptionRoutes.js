const express = require("express");
const router = express.Router();
const controller = require("../controllers/manageSubscriptionController");

router.get("/admin-institution", controller.getInstitutionFromAdmin);
router.get("/manage", controller.getManageSubscription);
router.patch("/cancel", controller.cancelSubscription);
router.patch("/resubscribe", controller.resubscribe);
router.patch("/update-plan", controller.updatePlan);

module.exports = router;