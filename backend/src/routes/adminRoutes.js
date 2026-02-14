const express = require("express");
const router = express.Router();
const adminController = require("../controllers/AdminController");

router.get("/login", (req, res) => {
  res.render("adminlogin");
});

router.post("/login", adminController.login);
router.get("/logout", adminController.logout);

router.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/admin/login");
  }

  res.render("admindashboard", {
    user: req.session.user
  });
});
router.post("/dashboard/feature-reviews", adminController.filterReview);


module.exports = router;