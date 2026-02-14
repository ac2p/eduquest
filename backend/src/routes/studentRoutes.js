const express = require("express");
const router = express.Router();
const studentController = require("../controllers/StudenttController");

// Render HBS page
router.get("/login", (req, res) => {
  res.render("studentlogin");
});
router.post("/login", studentController.login);
router.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/student/login");
  }

  res.render("studentdashboard", {
    user: req.session.user
  });
});
router.get("/forgot-password", (req, res) => {
  res.render("studentforgot");
});
router.post("/forgot-password", studentController.forgotPassword);

router.get("/reset-password/:token", (req, res) => {
  const { token } = req.params;
  res.render("studentreset", { token }); // pass token to template
});
router.post("/reset-password/:token", studentController.resetPassword);
router.get("/logout", studentController.logout);

// ===== PROFILE =====
router.get("/profile", studentController.profile);
 

router.post("/profile/updateCredential", studentController.updateCredential);
 

router.post("/profile/platformReview", studentController.platformReview);

router.get('/profile/:id/classes', studentController.getClass);
router.post("/profile/generatestudent",studentController.generateStudentReport);

module.exports = router;