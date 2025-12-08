require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3001;
const db = require("./db");

app.use(cors());

app.use(express.json());

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const restaurantRoutes = require("./routes/restaurant");
const orderRoutes = require("./routes/orders");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`📥 Recebi uma requisição ${req.method} em ${req.url}`);
  console.log("📝 Headers:", req.headers["content-type"]);
  console.log("📦 Body:", req.body);
  next();
});

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

//Teste render
app.get("/test-db", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json({
      mensagem: "✅ Conexão bem sucedida!",
      hora_no_banco: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensagem: "❌ Erro ao conectar no banco",
      erro: error.message,
    });
  }
});
