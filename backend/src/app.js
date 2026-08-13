const express = require("express");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const routineRoutes = require("./routes/routine.routes");
const routineScheduleRoutes = require("./routes/routineSchedule.routes");
const routineExecutionRoutes = require("./routes/routineExecution.routes");
const dayRoutes = require("./routes/day.routes");
const reminderRoutes = require("./routes/reminder.routes");
const unexpectedEventRoutes = require("./routes/unexpectedEvent.routes");
const calendarRoutes = require("./routes/calendar.routes");

const app = express();

app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/routines", routineRoutes);
app.use("/api", routineScheduleRoutes);
app.use("/api/routine-executions", routineExecutionRoutes);
app.use("/api/day", dayRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/unexpected-events", unexpectedEventRoutes);
app.use("/api/calendar", calendarRoutes);

module.exports = app;