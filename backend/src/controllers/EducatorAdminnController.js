
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Educator = require("../models/Educator");
const Student = require("../models/Student");
const Edadmin = require("../models/Edadmin");
const Class = require("../models/Class");
const ClassStudent = require("../models/ClassStudent");

exports.login = async (req, res) => {
  try {
    const user = await Edadmin.findOne({ email: req.body.email });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Incorrect password" });
    }

    // store user info in session
    req.session.user = {
      id: user._id.toString(),
      fullname: user.fullname,
      classlimit:user.classLimit
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
      return res.redirect("/edadmin/login");
    }

    res.clearCookie("connect.sid");
    return res.redirect("/edadmin/login");
  });
};
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await Edadmin.findOne({ email });
  if (!user) return res.json({ success: false, message: "No user with this email" });

  const token = crypto.randomBytes(20).toString("hex");

  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 min
  await user.save();

  const resetUrl = `http://localhost:3000/edadmin/reset-password/${token}`;

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

  const user = await Edadmin.findOne({
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
      return res.redirect("/edadmin/login");
    }

    // Get fresh data from DB
    const edadmin = await Edadmin.findById(req.session.user.id)
      .select("-password");

    if (!edadmin) {
      return res.status(404).send("User not found");
    }

    res.render("edadminprofile", {
      edadmin   // <-- IMPORTANT (matches your HBS)
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading profile");
  }
};

exports.updateCredential = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ success: false, message: "Not logged in" });
    }

    // Destructure all possible fields from request body
    const {
      fullname,
      displayname,
      position,
      contactNumber,
      institutionName,
      institutionType,
      country,
      billingAddress,
      password, // new password field
    } = req.body;

    // Build update object dynamically (only include fields that exist)
    const updateData = {};
    if (fullname) updateData.fullname = fullname;
    if (displayname) updateData.displayname = displayname;
    if (position) updateData.position = position;
    if (contactNumber) updateData.contactNumber = contactNumber;
    if (institutionName) updateData.institutionName = institutionName;
    if (institutionType) updateData.institutionType = institutionType;
    if (country) updateData.country = country;
    if (billingAddress) updateData.billingAddress = billingAddress;

    // If password is provided, hash it before saving
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }

    const updatedEdadmin = await Edadmin.findByIdAndUpdate(
      req.session.user.id,
      updateData,
      { new: true } // return updated document
    );

    // Update session with only the changed fields
    req.session.user = { ...req.session.user, ...updateData };

    return res.json({
      success: true,
      message: "Credentials updated successfully ✅",
    });
  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Error updating credentials ❌",
    });
  }
};


exports.viewEducators = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/edadmin/login");
    }
    const EdadminId = req.session.user.id;
    const educators = await Educator.find({ EdadminId });
    
    res.render("edaddashboard", { educators ,user: req.session.user});
  } catch (err) {
    console.error("Error fetching educators:", err);
    res.status(500).send("Failed to load educators");
  }
};
exports.viewClass= async (req, res) => {
   try {
    const classes = await Class.find({}, "name"); // fetch only the name field
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateClassLimit = async (req, res) => {
  try {
    const educator = await Educator.findById(req.params.id);
    

    const edadmin = await Edadmin.findById(req.session.user.id); // admin from session
    

    const newClassLimit = parseInt(req.body.classLimit);
    const diff = newClassLimit - educator.classLimit; // positive if increasing, negative if decreasing

    // 1️⃣ Check admin has enough limit for increase
    if (diff > 0 && diff > edadmin.classLimit) {
      return res.send("Not enough class limit in admin account");
    }

    // 2️⃣ Check newClassLimit is not below current classNumber
    if (newClassLimit < educator.classNumber) {
      return res.send("Updated ClassLimit Cannot be below Current Class Amount");
    }

    // 3️⃣ Update educator classLimit
    educator.classLimit = newClassLimit;
    await educator.save();

    // 4️⃣ Update admin classLimit
    edadmin.classLimit -= diff;  // subtract if increase, add back if decrease (diff negative)
    await edadmin.save();

    res.json({ message: "Class limit updated successfully", success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Suspend educator
exports.removeEducator = async (req, res) => {
  try {
    const educatorId = req.params.id;
    await Educator.findByIdAndUpdate(educatorId, { status: "suspended" });

    return res.json({ success: true, message: "Educator suspended successfully" });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
};

// Activate educator
exports.activeEducator = async (req, res) => {
  try {
    const educatorId = req.params.id;
    await Educator.findByIdAndUpdate(educatorId, { status: "active" });

    return res.json({ success: true, message: "Educator activated successfully" });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
};


exports.addStudent = async (req, res) => {
  try {
    const { fullname, displayname, email, parents, class: className, classId } = req.body;

    // 1️⃣ Check if student already exists
    const existingUser = await Student.findOne({ email });
    if (existingUser) {
      return res.send("Student details already exist");
    }

    // 2️⃣ Generate random password
    const randomPassword = crypto.randomBytes(6).toString("hex"); // 12-char random password

    // 3️⃣ Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    // 4️⃣ Create new student with hashed password
    const newStudent = await Student.create({
      fullname,
      displayname,
      email,
      password: hashedPassword,
      parents
    });

    // 5️⃣ Find the class
    const foundClass = await Class.findById(classId);
    if (!foundClass) {
      return res.send("Class not found");
    }

    // 6️⃣ Add student to class (link table)
    await ClassStudent.create({
      studentId: newStudent._id,
      classId: foundClass._id
    });

    // 7️⃣ Send email with login credentials
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS  // app password
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Student Account Created ✅",
      html: `
        <p>Hello ${fullname},</p>
        <p>Your account has been created successfully. Here are your login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> ${randomPassword}</li>
        </ul>
        <p>Please login and change your password after first login.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    // 8️⃣ Success response
     return res.json({ success: true, message: "Student created and email sent successfully ✅" });

  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Error creating student, check inputs ❌" });
  }
};

exports.addEducator = async (req, res) => {
    const EdadminId = req.session.user.id
  try {
    const { fullname, displayname, email, password, subject, timezone } = req.body;


    // 1️⃣ Check if educator already exists
    const existingUser = await Educator.findOne({ email });

    if (existingUser) {
      return res.send("Educator details already exist");
    }


    // 3️⃣ Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2️⃣ Create new educator
    await Educator.create({
      EdadminId,      // 👈 link to Ed Admin
      fullname,
      displayname,
      email,
      password: hashedPassword,
      subject,
      timezone,
      classLimit: 0,   // default limit (can change)
      classNumber: 0,
      status: "active"
    });

      return res.json({ success: true, message: "Create Educator Success" });

  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Error in signup, check inputs" });
  }
};