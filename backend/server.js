require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Product = require("./models/Product");
const Admin = require("./models/Admin");
const auth = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// serve frontend
app.use(express.static(path.join(__dirname, "frontend")));
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB connected"));

(async()=>{
  const exists = await Admin.findOne({ email:"admin@shop.com" });
  if(!exists){
    const hash = await bcrypt.hash("admin123",10);
    await Admin.create({ email:"admin@shop.com", password:hash });
    console.log("Default admin created");
  }
})();

const storage = multer.diskStorage({
  destination:"uploads/",
  filename:(req,file,cb)=>cb(null,Date.now()+path.extname(file.originalname))
});
const upload = multer({storage});
const SECRET="SECRET_KEY_123";

app.post("/admin/login", async(req,res)=>{
  const admin = await Admin.findOne({ email:req.body.email });
  if(!admin) return res.sendStatus(401);
  const ok = await bcrypt.compare(req.body.password, admin.password);
  if(!ok) return res.sendStatus(401);
  const token = jwt.sign({id:admin._id}, SECRET,{expiresIn:"1h"});
  res.json({token});
});

app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "admin.html"));
});

// PUBLIC: view products
app.get("/products", async(req,res)=>{
  res.json(await Product.find());
});

// ADMIN: add product
app.post("/products", auth, upload.single("image"), async(req,res)=>{
  res.json(await Product.create({...req.body,image:req.file.filename}));
});

// ADMIN: delete product
app.delete("/products/:id", auth, async(req,res)=>{
  await Product.findByIdAndDelete(req.params.id);
  res.json({msg:"deleted"});
});

app.listen(5001,()=>console.log("Server running on 5000"));
