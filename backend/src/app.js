const express = require("express");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const routineRoutes = require("./routes/routine.routes");
const routineScheduleRoutes = require("./routes/routineSchedule.routes");

const app = express();

app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/routines", routineRoutes);
app.use("/api", routineScheduleRoutes);

module.exports = app;