const Educator = require("../models/Educator.js");

function getAllEducators(req, res) {
  Educator.find()
    .then(function (educators) {
      res.json(educators);
    })
    .catch(function (error) {
      console.log(error);
      res.status(500).json({ message: "Failed to load educators" });
    });
}

module.exports = {
  getAllEducators
};
