const nodemailer = require("nodemailer");

function sendAdminCredentials(toEmail, institutionName, username, password) {
  
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER, 
      pass: process.env.GMAIL_PASS  
    }
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: "EduQuest Educator Admin Account Created",
    html: `
      <h2>Welcome to EduQuest</h2>
      <p>Your institution <strong>${institutionName}</strong> has been successfully registered.</p>
      <p><strong>Admin Username:</strong> ${username}</p>
      <p><strong>Admin Password:</strong> ${password}</p>
      <p>Please change your password after your first login.</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendAdminCredentials
};