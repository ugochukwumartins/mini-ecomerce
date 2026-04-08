const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  amount: Number,
  details: String,
  quantity: Number,
  image: String
});

module.exports = mongoose.model("Product", productSchema);
