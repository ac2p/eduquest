const mongoose = require("mongoose");

const Institution = require("../models/Institution");
const EducatorAdmin = require("../models/EducatorAdmin");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");
const emailService = require("../utils/emailService");


/** to generate an educator admin username  */
function generateUsername(name) {
  return (
    name.toLowerCase().replace(/ /g, "") +
    Math.floor(1000 + Math.random() * 9000) /** eg username-kanmani7651 */
  );
}

/** to generate password */
function generatePassword() {
  return Math.random().toString(36).slice(-8);
}

/** successfully subscribed  - then create  -
 *institution , edu admin account, institution subscription, 
 invoice and send email to edu admin */

function createSubscription(req, res) {
    const data = req.body || {};
    const institutionEmail = String(data.institutionEmail || "").trim();

  if (!institutionEmail) {
    return res.status(400).json({
      success: false,
      message: "Institution email required"
    });
  }

 Institution.findOne({
    email: institutionEmail
  })
  .then(function (existingInstitution) {

  if (existingInstitution) {
     return res.status(400).json({
      success: false,
      message:"This institution is already subscribed"
    });
  }
  const institution = new Institution({
        name: data.institutionName,
        email: institutionEmail,
        phone: data.institutionPhone,
        country: data.country,
        timezone: data.timezone
      });
        return institution.save();
    })
    .then(function (savedInstitution) {
    if (!savedInstitution) return null;
      const username = generateUsername(data.billingName);
      const password = generatePassword();
      const admin = new EducatorAdmin({
        institutionId: savedInstitution._id,
        name: data.billingName,
        email: data.billingEmail,
        role: data.billingRole,
        username: username,
        password: password
      });
          return admin.save()
      .then(function () {
       return {
            institution: savedInstitution,
            username: username,
            password: password
          };
        });
    })
   .then(function (result) {
      if (!result) return null;
        const institutionId = result.institution._id;
        const subscription = new Subscription({
          institutionId: institutionId,
          planName: data.planName,
          billingType: data.billingType,
          totalPaid: data.totalPaid,
          billingCard: data.billingCard,
          status: "ACTIVE",
          autoRenew: true,
          billingEmails: true
        });
         return subscription.save()
        .then(function (savedSubscription) {
        return {
            institution: result.institution,
            username: result.username,
            password: result.password,
            subscription: savedSubscription
          };
        });
    })
     .then(function (result) {
      if (!result) return null;
          const institutionId =  result.institution._id;
          const invoiceId = "INV-" + new Date().getFullYear() + "-" +  Math.floor(Math.random() * 10000);
          const invoice = new Invoice({
          institutionId: institutionId,
          invoiceId: invoiceId,
          amount: data.totalPaid,
          status: "PAID",
          date: new Date()
        });
          return invoice.save()
        .then(function (savedInvoice) {
          return {
            institution: result.institution,
            username: result.username,
            password: result.password,
            subscription: result.subscription,
            invoice: savedInvoice
          };
        });
    })
      .then(function (result) {
       if (!result) return;
        if (
        data.billingEmail &&
        data.billingEmail.includes("@")
      ){
        emailService .sendAdminCredentials(
            data.billingEmail,
            result.institution.name,
            result.username,
            result.password
          )
          .then(function () {
            console.log("Email sent");
          })
          .catch(function (err) {
            console.log( "Email failed:",  err.message);
          });
      }
      res.status(201).json({
        success: true,
        message:
          "Institution created successfully",
        institution: result.institution,
        subscription: result.subscription,
        invoice: result.invoice
      });
    })
    .catch(function (err) {
      console.log(  "Subscription error:", err );
      res.status(500).json({
        success: false,
        message: "Server error"
      });
    });
}

module.exports = { createSubscription};
