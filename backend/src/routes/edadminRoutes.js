const express = require("express");
const router = express.Router();
const edadminController = require("../controllers/EducatorAdminnController");

// Render HBS page
router.get("/login", (req, res) => {
  res.render("edadminlogin");
});
router.post("/login", edadminController.login);
router.get("/logout", edadminController.logout);

router.get("/forgot-password", (req, res) => {
  res.render("edadminforgot");
});
router.post("/forgot-password", edadminController.forgotPassword);

router.get("/reset-password/:token", (req, res) => {
  const { token } = req.params;
  res.render("edadminreset", { token }); // pass token to template
});
router.post("/reset-password/:token", edadminController.resetPassword);

// ===== PROFILE =====

router.get("/profile", edadminController.profile); // optional alias

router.post("/profile/updateCredential", edadminController.updateCredential);




// TEMP LOGIN FOR TESTING SESSION

router.get("/dashboard", edadminController.viewEducators);
 
router.post("/dashboard/updateClassLimit/:id", edadminController.updateClassLimit); // update limit
router.post("/dashboard/removeEducator/:id", edadminController.removeEducator);
router.post("/dashboard/activeEducator/:id", edadminController.activeEducator);

router.post("/addStudent", edadminController.addStudent);





router.get("/addStudent", (req, res) => {
   if (!req.session.user) {
    return res.redirect("/edadmin/login");
  }
  res.render("addStudent", {
    user: req.session.user
  });
});

router.post("/addStudent", edadminController.addStudent);


router.post("/addEducator", edadminController.addEducator);

router.get("/addEducator", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/edadmin/login");
  }

  res.render("addEducator", {
    user: req.session.user
  });
});

router.get("/addStudent/classes",edadminController.viewClass);


module.exports = router;