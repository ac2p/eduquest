const express = require("express");
const router = express.Router();
const UnregController = require("../controllers/UnregController");

router.get("/", (req, res) => {
  res.render("landingpage");
});

router.get("/platformReview", UnregController.getPlatformReview);
module.exports = router;