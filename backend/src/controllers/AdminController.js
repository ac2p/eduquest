const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const PlatformReview = require("../models/PlatformReview");

exports.login = async (req, res) => {
  try {
    const user = await Admin.findOne({ email: req.body.email });

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
      return res.redirect("/admin/login");
    }

    res.clearCookie("connect.sid");
    return res.redirect("/admin/login");
  });
};

exports.filterReview = async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword || keyword.trim() === "") {
      return res.status(400).send("Keyword required");
    }

    const result = await PlatformReview.updateMany(
      {
        content: { $regex: keyword, $options: "i" }
      },
      {
        $set: { isApproved: false }
      }
    );

    res.send(`${result.modifiedCount} reviews were unapproved`);
    
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
