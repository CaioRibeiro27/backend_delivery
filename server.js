require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

app.use(express.json());

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const restaurantRoutes = require("./routes/restaurant");
const orderRoutes = require("./routes/orders");

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/orders", orderRoutes);

app.get("/", (req, res) => {
  res.send("Servidor Delivery Rodando! 🚀");
});

app.listen(port, () => {
  console.log(`🚀 Servidor backend rodando na porta ${port}`);
});
