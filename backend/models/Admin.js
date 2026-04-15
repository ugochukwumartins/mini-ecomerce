const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  resetPasswordToken: {
    type: String,
    default: ""
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);
