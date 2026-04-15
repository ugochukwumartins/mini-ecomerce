const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Product = require("./models/Product");
const Admin = require("./models/Admin");
const Order = require("./models/Order");
const auth = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "SECRET_KEY_123";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mini_ecommerce";
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE || 2500);
const frontendPath = path.join(__dirname, "..", "frontend");
const uploadPath = path.join(__dirname, "uploads");

fs.mkdirSync(uploadPath, { recursive: true });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadPath));
app.use(express.static(frontendPath));

const storage = multer.diskStorage({
  destination: uploadPath,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-z0-9.]/gi, "-").toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  }
});

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const toBoolean = value => value === true || value === "true" || value === "on";
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildProductPayload = body => ({
  name: body.name,
  amount: Number(body.amount),
  details: body.details || "",
  category: body.category || "General",
  quantity: Number(body.quantity),
  featured: toBoolean(body.featured)
});

const createOrderNumber = () => `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
const hashResetToken = token => crypto.createHash("sha256").update(token).digest("hex");

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@shop.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const exists = await Admin.findOne({ email });

  if (!exists) {
    const hash = await bcrypt.hash(password, 10);
    await Admin.create({ email, password: hash });
    console.log(`Default admin created: ${email}`);
  }
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await seedAdmin();
  })
  .catch(error => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "mini-ecommerce" });
});

const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });

  if (!admin) return res.status(401).json({ message: "Invalid login details" });

  const ok = await bcrypt.compare(password, admin.password);
  if (!ok) return res.status(401).json({ message: "Invalid login details" });

  const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, admin: { email: admin.email } });
});

app.post("/api/admin/login", loginAdmin);

app.post("/api/admin/forgot-password", asyncHandler(async (req, res) => {
  const { email } = req.body;
  const admin = await Admin.findOne({ email });

  if (!admin) {
    return res.status(404).json({ message: "No admin account found with that email" });
  }

  const resetCode = String(Math.floor(100000 + Math.random() * 900000));
  admin.resetPasswordToken = hashResetToken(resetCode);
  admin.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await admin.save();

  console.log(`Admin password reset code for ${admin.email}: ${resetCode}`);

  res.json({
    message: "Reset code generated. Use it within 15 minutes.",
    resetCode
  });
}));

app.post("/api/admin/reset-password", asyncHandler(async (req, res) => {
  const { email, resetCode, password } = req.body;

  if (!email || !resetCode || !password) {
    return res.status(400).json({ message: "Email, reset code, and new password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const admin = await Admin.findOne({
    email,
    resetPasswordToken: hashResetToken(resetCode),
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!admin) {
    return res.status(400).json({ message: "Invalid or expired reset code" });
  }

  admin.password = await bcrypt.hash(password, 10);
  admin.resetPasswordToken = "";
  admin.resetPasswordExpires = null;
  await admin.save();

  res.json({ message: "Password reset successful. You can login now." });
}));

app.get("/api/products", asyncHandler(async (req, res) => {
  const { search, category, sort } = req.query;
  const query = {};

  if (search) {
    const searchPattern = new RegExp(escapeRegExp(search), "i");
    query.$or = [
      { name: searchPattern },
      { details: searchPattern },
      { category: searchPattern }
    ];
  }

  if (category && category !== "All") {
    query.category = category;
  }

  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { amount: 1 },
    price_desc: { amount: -1 },
    name: { name: 1 }
  };

  const products = await Product.find(query).sort(sortMap[sort] || sortMap.newest);
  res.json(products);
}));

app.get("/api/products/:id", asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
}));

app.post("/api/products", auth, upload.single("image"), asyncHandler(async (req, res) => {
  const payload = buildProductPayload(req.body);
  if (req.file) payload.image = req.file.filename;

  const product = await Product.create(payload);
  res.status(201).json(product);
}));

app.put("/api/products/:id", auth, upload.single("image"), asyncHandler(async (req, res) => {
  const payload = buildProductPayload(req.body);
  if (req.file) payload.image = req.file.filename;

  const product = await Product.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  });

  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
}));

app.delete("/api/products/:id", auth, asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Product deleted" });
}));

app.post("/api/orders", asyncHandler(async (req, res) => {
  const { customer, items, paymentMethod } = req.body;

  if (!customer || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Customer details and cart items are required" });
  }

  const productIds = items.map(item => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map(product => [product._id.toString(), product]));

  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = productMap.get(item.productId);
    const quantity = Number(item.quantity);

    if (!product || quantity < 1) {
      return res.status(400).json({ message: "One or more cart items are invalid" });
    }

    if (product.quantity < quantity) {
      return res.status(409).json({ message: `${product.name} has only ${product.quantity} left` });
    }

    subtotal += product.amount * quantity;
    orderItems.push({
      product: product._id,
      name: product.name,
      amount: product.amount,
      quantity,
      image: product.image
    });
  }

  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
  }

  const order = await Order.create({
    orderNumber: createOrderNumber(),
    customer,
    items: orderItems,
    subtotal,
    deliveryFee: DELIVERY_FEE,
    total: subtotal + DELIVERY_FEE,
    paymentMethod: paymentMethod || "pay_on_delivery"
  });

  res.status(201).json(order);
}));

app.get("/api/orders", auth, asyncHandler(async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
}));

app.patch("/api/orders/:id/status", auth, asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );

  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
}));

// Backward-compatible endpoints for the original frontend files.
app.post("/admin/login", loginAdmin);
app.get("/products", asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
}));
app.post("/products", auth, upload.single("image"), asyncHandler(async (req, res) => {
  const payload = buildProductPayload(req.body);
  if (req.file) payload.image = req.file.filename;
  res.status(201).json(await Product.create(payload));
}));
app.delete("/products/:id", auth, asyncHandler(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Product deleted" });
}));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(frontendPath, "admin.html"));
});

app.get("*", (req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/uploads") ||
    path.extname(req.path)
  ) {
    return next();
  }

  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || "Server error" });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin-login.html`);
});

server.on("error", error => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Set PORT in backend/.env or stop the other process.`);
    process.exit(1);
  }

  throw error;
});
