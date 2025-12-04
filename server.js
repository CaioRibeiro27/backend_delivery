require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Importando a rota
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const restaurantRoutes = require("./routes/restaurant");
const orderRoutes = require("./routes/orders");

// Usando as rotas
app.use("/api/auth", authRoutes); // Login e Cadastro
app.use("/api/user", userRoutes); // Perfil, Endereços e Cartões
app.use("/api/restaurant", restaurantRoutes); // Coisas do Restaurante
app.use("/api/orders", orderRoutes); // Pedidos

// Rota genérica para testar
app.get("/", (req, res) => {
  res.send("Servidor Delivery Rodando! 🚀");
});

app.listen(port, () => {
  console.log(`🚀 Servidor backend rodando na porta ${port}`);
});
