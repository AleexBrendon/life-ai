const express = require("express");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");

const app = express();

app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

module.exports = app;