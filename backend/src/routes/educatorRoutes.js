const express = require("express");
const router = express.Router();
const educatorController = require("../controllers/EducatorController");
const Class = require("../models/Class");
const Quiz = require("../models/Quiz");
const Student = require("../models/Student");
const Attempt = require("../models/Attempt");
const mongoose = require("mongoose");

// Add this debug at the top
console.log("✅ Educator Routes Loaded -", new Date().toLocaleTimeString());

// Middleware to check if educator is logged in
const isEducator = (req, res, next) => {
  console.log("🔒 isEducator middleware - Session:", req.session ? "exists" : "none");
  if (req.session && req.session.user) {
    next();
  } else {
    console.log("⛔ No session, redirecting to login");
    res.redirect("/educator/login");
  }
};

// ===== AUTH ROUTES =====
router.get("/login", (req, res) => {
  console.log("📝 Rendering educator-login");
  res.render("educator-login");
});

router.post("/login", educatorController.login);

router.get("/forgot-password", (req, res) => {
  res.render("educator-forgot");
});

router.post("/forgot-password", educatorController.forgotPassword);

router.get("/reset-password/:token", (req, res) => {
  const { token } = req.params;
  res.render("educator-reset", { token });
});

router.post("/reset-password/:token", educatorController.resetPassword);

router.get("/logout", educatorController.logout);

// ===== PROFILE ROUTES =====
router.get("/profile", isEducator, (req, res) => {
  res.render("educator-profile", { 
    user: req.session.user,
    title: "My Profile" 
  });
});
router.post("/profile/updateCredential", isEducator, educatorController.updateCredential);
router.post("/profile/platformReview", isEducator, educatorController.platformReview);

// ===== DASHBOARD ROUTES =====
router.get("/dashboard", isEducator, educatorController.info);
router.get("/dashboard/feedback", isEducator, educatorController.getFeedbacks);
router.post("/dashboard/replyFeedback/:feedbackId", isEducator, educatorController.replyFeedback);
router.post("/dashboard/manageClass", isEducator, educatorController.manageClass);

// ===== CLASS MANAGEMENT ROUTES =====
// List all classes for the educator - USING educator-class.hbs (singular)
router.get("/class", isEducator, async (req, res) => {
  console.log("📚 /educator/class route accessed (list view)");
  try {
    const educatorId = req.session.user.id;
    console.log("👤 Educator ID:", educatorId);
    
    // Find all classes for this educator
    const classes = await Class.find({ teacherId: educatorId }).sort({ createdAt: -1 });
    console.log(`📚 Found ${classes.length} classes`);
    
    // If no classes found, still render with empty array
    res.render("educator-class", {
      user: req.session.user,
      classes: classes,
      isList: true,
      title: "My Classes"
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).send("Error loading classes: " + error.message);
  }
});

// View specific class details
router.get("/class/:classId", isEducator, async (req, res) => {
  console.log("📚 /educator/class/:classId route accessed (detail view)");
  try {
    const { classId } = req.params;
    const educatorId = req.session.user.id;
    
    const classData = await Class.findOne({ 
      _id: classId, 
      teacherId: educatorId 
    });
    
    if (!classData) {
      return res.status(404).send("Class not found");
    }
    
    const students = await Student.find({ classId: classId }).sort({ name: 1 });
    const quizzes = await Quiz.find({ classId: classId }).sort({ createdAt: -1 });
    
    res.render("educator-class", {
      user: req.session.user,
      class: classData,
      students,
      quizzes,
      isList: false,
      title: `${classData.className} - Class Details`
    });
  } catch (error) {
    console.error("Error fetching class details:", error);
    res.status(500).send("Error loading class details: " + error.message);
  }
});

// Create a new class
router.get("/create-class", isEducator, (req, res) => {
  res.render("educator-createclass", {
    user: req.session.user,
    title: "Create New Class"
  });
});

router.post("/create-class", isEducator, async (req, res) => {
  try {
    const { className, subject, grade } = req.body;
    const teacherId = req.session.user.id;
    
    let accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const existingClass = await Class.findOne({ accessCode });
    if (existingClass) {
      accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    const newClass = new Class({
      className,
      subject,
      grade,
      accessCode,
      teacherId,
      status: 'active'
    });
    
    await newClass.save();
    res.redirect(`/educator/class/${newClass._id}`);
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).send("Error creating class: " + error.message);
  }
});

// Edit class
router.get("/edit-class/:classId", isEducator, async (req, res) => {
  try {
    const { classId } = req.params;
    const educatorId = req.session.user.id;
    
    const classData = await Class.findOne({ 
      _id: classId, 
      teacherId: educatorId 
    });
    
    if (!classData) {
      return res.status(404).send("Class not found");
    }
    
    res.render("educator-manageclass", {
      user: req.session.user,
      class: classData,
      title: "Edit Class",
      isEdit: true
    });
  } catch (error) {
    console.error("Error loading class for edit:", error);
    res.status(500).send("Error loading class: " + error.message);
  }
});

router.post("/edit-class/:classId", isEducator, async (req, res) => {
  try {
    const { classId } = req.params;
    const { className, subject, grade, status } = req.body;
    const educatorId = req.session.user.id;
    
    await Class.findOneAndUpdate(
      { _id: classId, teacherId: educatorId },
      { className, subject, grade, status }
    );
    
    res.redirect(`/educator/class/${classId}`);
  } catch (error) {
    console.error("Error updating class:", error);
    res.status(500).send("Error updating class: " + error.message);
  }
});

// Delete class
router.post("/delete-class/:classId", isEducator, async (req, res) => {
  try {
    const { classId } = req.params;
    const educatorId = req.session.user.id;
    
    await Class.findOneAndDelete({ _id: classId, teacherId: educatorId });
    await Quiz.updateMany({ classId: classId }, { status: 'archived' });
    
    res.redirect("/educator/class");
  } catch (error) {
    console.error("Error deleting class:", error);
    res.status(500).send("Error deleting class: " + error.message);
  }
});

// ===== QUIZ ROUTES =====
router.get("/create-quiz", isEducator, (req, res) => {
  res.render("educator-createquiz", {
    user: req.session.user,
    classId: req.query.classId,
    title: "Create Quiz"
  });
});

// ===== CHALLENGE ROUTES =====
router.get("/create-challenge", isEducator, (req, res) => {
  res.render("educator-createchallenge", {
    user: req.session.user
  });
});

// ===== LEADERBOARD ROUTES =====
router.get("/leaderboard", isEducator, (req, res) => {
  res.render("educator-leaderboard", {
    user: req.session.user,
    classId: req.query.classId,
    title: "Leaderboard"
  });
});

// ===== REPORT ROUTES =====
router.get("/reports", isEducator, (req, res) => {
  res.render("educator-reports", {
    user: req.session.user,
    title: "Reports"
  });
});

// ===== SIGNUP ROUTE =====
router.get("/signup", (req, res) => {
  res.render("educator-signup", {
    title: "Educator Sign Up"
  });
});

module.exports = router;