const express = require("express");
const healthRoutes = require("./routes/health.routes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "LifeAI API funcionando!",
  });
});

app.use("/api", healthRoutes);

module.exports = app;