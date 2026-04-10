const mongoose = require("mongoose");

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment");
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

module.exports = connectToDatabase;
