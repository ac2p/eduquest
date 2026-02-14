const mongoose = require("mongoose");

function connectDB() {
  const mongoUri = process.env.MONGO_URI;


  mongoose
    .connect(mongoUri)
    .then(function () {
      console.log("MongoDB connected");
    })
    .catch(function (error) {
      console.log("MongoDB connection error");
      console.log(error.message);
    });
}

module.exports = connectDB;
