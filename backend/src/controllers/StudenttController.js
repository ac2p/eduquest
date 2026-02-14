const Student = require("../models/Student");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const PlatformReview = require("../models/PlatformReview");
const ChallengePerformance = require("../models/challengePerformance");
const QuizPerformance = require("../models/quizPerformance");
const ClassStudent = require("../models/ClassStudent");
const Class = require("../models/Class");
const { createBarChart } = require("../utils/chart");


exports.login = async (req, res) => {
  try {
    const user = await Student.findOne({ email: req.body.email });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.status === "suspended") {
      return res.json({ 
        success: false, 
        message: "Your account was suspended. Please contact your admin to reactivate." 
      });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Incorrect password" });
    }

    // store user info in session
    req.session.user = {
      id: user._id.toString(),
      fullname: user.fullname
    };

    // Success
    return res.json({ success: true, message: "Login successful!" });

  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.redirect("/student/login");
    }

    res.clearCookie("connect.sid");
    return res.redirect("/student/login");
  });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await Student.findOne({ email });
  if (!user) return res.send("No user with this email");

  const token = crypto.randomBytes(20).toString("hex");

  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 min
  await user.save();

  const resetUrl = `http://localhost:3000/student/reset-password/${token}`;
  

  // --------- Nodemailer setup ----------
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // your email
      pass: process.env.EMAIL_PASS  // your app password (or real password)
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Password Reset",
    html: `<p>You requested a password reset</p>
           <p>Click this link to reset your password:</p>
           <a href="${resetUrl}">${resetUrl}</a>
           <p>This link expires in 10 minutes.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
     return res.json({
      success: true,
      message: "Reset link sent to your email ✅"
      
    });

  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Reset failed ❌"
    });
  }
};
// ==================
// RESET PASSWORD
// ==================
exports.resetPassword = async (req, res) => {
  const token = req.body.token || req.params.token; // get token from hidden input or URL
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await Student.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) return res.send("Token invalid or expired ❌");

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(req.body.password, salt);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  return res.json({
      success: true,
      message: "Password reset successfully ✅"
    });
};


exports.profile = async (req, res) => {
  try {
    // Make sure user is logged in
    if (!req.session.user) {
      return res.redirect("/student/login");
    }

    // Get fresh data from DB
    const student = await Student.findById(req.session.user.id)
      .select("-password");

    if (!student) {
      return res.status(404).send("User not found");
    }

    res.render("studentprofile", {
      student   // <-- IMPORTANT (matches your HBS)
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading profile");
  }
};





exports.platformReview = async (req, res) => {
  try {
    const fullname=req.session.user.fullname;
    const { content, rating, tags } = req.body;

    const review = new PlatformReview({
      fullname,
      content,
      rating,
      tags
    });

    await review.save();
    return res.json({ success: true, message: "Platform review submitted ✅" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to submit review");
  }
};

exports.updateCredential = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/student/login");
    }

    const { fullname, displayname, parents, password } = req.body;

    let updateData = {
      fullname,
      displayname,
      parents,
    };

    // ✅ Only hash and update password IF user actually entered a new one
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.session.user.id,
      updateData,
      { new: true }
    );

    // Update session (DON’T store password in session)
    req.session.user = {
      ...req.session.user,
      fullname: updatedStudent.fullname,
      displayname: updatedStudent.displayname,
      parents: updatedStudent.parents,
    };

    
    res.json({ message: "Credential successfully", success: true });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating profile");
  }
};










exports.generateStudentReport = async (req, res) => {
  try {
    
    const {
      classId,
      studentID,
      reportType,   // overview / quizPerformance / challengePerformance
      timeRange,
      customStart,
      customEnd,
    } = req.body;

    // ----- Time filter -----
    let startDate, endDate;
    const now = new Date();

    if (timeRange === "thisweek") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date();
    } 
    else if (timeRange === "thismonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date();
    }
    else if (timeRange === "30days") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      endDate = new Date();
    }
    else if (timeRange === "thisterm") {
  const classData = await Class.findById(classId);
  startDate = classData.termStartDate; // from class collection
  endDate = classData.termEndDate;     // from class collection
}
    else if (timeRange === "custom") {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    }

    const report = {
      main: null,
      chart: null,
      summary: {}
    };

    // ----- OVERVIEW REPORT -----
    if (reportType === "overview") {

      const quizData = await QuizPerformance.find({
        studentId: studentID,
        classId: classId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const challengeData = await ChallengePerformance.find({
        studentId: studentID,
        classId: classId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const combined = [...quizData, ...challengeData].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      // Aggregate XP & Coins by date
      const xpByDateMap = {};
      combined.forEach(r => {
        const date = new Date(r.createdAt).toISOString().split("T")[0];
        if (!xpByDateMap[date]) xpByDateMap[date] = { totalXP: 0, totalCoins: 0 };
        xpByDateMap[date].totalXP += r.xp || 0;
        xpByDateMap[date].totalCoins += r.coins || 0;
      });

      const labels = Object.keys(xpByDateMap);
      const dataXP = labels.map(d => xpByDateMap[d].totalXP);

      report.chart = await createBarChart(labels, dataXP, "Total XP Over Time");

      report.summary.totalXP = combined.reduce((sum, r) => sum + (r.xp || 0), 0);
      report.summary.totalCoins = combined.reduce((sum, r) => sum + (r.coins || 0), 0);
      report.summary.totalQuiz = quizData.length;
      report.summary.totalChallenge = challengeData.length;

      report.main = combined; // full quiz + challenge data for frontend

    }

    // ----- QUIZ PERFORMANCE -----
    else if (reportType === "quizPerformance") {
      const quizData = await QuizPerformance.find({
        studentId: studentID,
        classId: classId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      report.main = quizData;

      const scores = quizData.map(q => q.score);
      const labels = quizData.map((q, i) => q.title || `Quiz ${i + 1}`);

      report.chart = await createBarChart(labels, scores, "Quiz Performance");

      report.summary.totalXP = quizData.reduce((sum, q) => sum + (q.xp || 0), 0);
      report.summary.totalCoins = quizData.reduce((sum, q) => sum + (q.coins || 0), 0);
      report.summary.attempts = quizData.length;
      report.summary.highestScore = Math.max(...scores);
      report.summary.lowestScore = Math.min(...scores);
      report.summary.averageScore = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    }

    // ----- CHALLENGE PERFORMANCE -----
    else if (reportType === "challengePerformance") {
      const challengeData = await ChallengePerformance.find({
        studentId: studentID,
        classId: classId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      report.main = challengeData;

      const scores = challengeData.map(c => c.score);
      const labels = challengeData.map((c, i) => c.title || `Challenge ${i + 1}`);

      report.chart = await createBarChart(labels, scores, "Challenge Performance");

      report.summary.totalXP = challengeData.reduce((sum, c) => sum + (c.xp || 0), 0);
      report.summary.totalCoins = challengeData.reduce((sum, c) => sum + (c.coins || 0), 0);
      report.summary.attempts = challengeData.length;
      report.summary.highestScore = Math.max(...scores);
      report.summary.lowestScore = Math.min(...scores);
      report.summary.averageScore = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    }

    res.json({
  success: true,
  chart: report.chart, // this must be a string starting with 'data:image/png;base64,'
  summary: report.summary,
  main: report.main
});
  } catch (err) {
    console.error("Backend Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getClass = async (req, res) => {
  try {
    const { studentID } = req.params;

    const classStudents = await ClassStudent.find({ studentID }).populate("classId");

    const classes = classStudents
      .filter(cs => cs.classId)  // skip null
      .map(cs => ({
        id: cs.classId._id,
        name: cs.classId.name
      }));

    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load classes" });
  }
};
