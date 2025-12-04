const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");
const axios = require("axios");

router.post("/register", async (req, res) => {
  const { nome, telefone, senha, email } = req.body;
  const hashedPassword = await bcrypt.hash(senha, 10);

  const sql =
    "INSERT INTO usuario (nome, telefone, senha, email) VALUES (?, ?, ?, ?)";

  db.query(sql, [nome, telefone, hashedPassword, email], (err, result) => {
    if (err) {
      console.log("ERRO MYSQL DETECTADO:", err.code, err.errno, err.sqlMessage);

      if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
        return res.status(400).json({
          success: false,
          message: "Este e-mail já está cadastrado.",
        });
      }
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "Erro ao registrar usuário." });
    }
    res
      .status(201)
      .json({ success: true, message: "Usuário registrado com sucesso!" });
  });
});

// Inserir Endereço do Restaurante
router.post("/register-restaurant", async (req, res) => {
  const {
    nome,
    email,
    senha,
    telefone,
    cnpj,
    estado,
    cidade,
    cep,
    bairro,
    rua,
    numero,
  } = req.body;

  const hashedPassword = await bcrypt.hash(senha, 10);
  const sqlAddress =
    "INSERT INTO endereco (rua, numero, cep, cidade, bairro) VALUES (?, ?, ?, ?, ?)";

  db.query(
    sqlAddress,
    [rua, numero, cep, cidade, bairro],
    (err, resultAddr) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Erro ao salvar endereço." });
      }

      const id_endereco = resultAddr.insertId;
      const sqlRest =
        "INSERT INTO restaurante (nome, telefone, cnpj, id_endereco, email, senha) VALUES (?, ?, ?, ?, ?, ?)";

      db.query(
        sqlRest,
        [nome, telefone, cnpj, id_endereco, email, hashedPassword],
        (errRest, resultRest) => {
          if (errRest) {
            if (errRest.code === "ER_DUP_ENTRY") {
              return res.status(400).json({
                success: false,
                message: "Restaurante já cadastrado.",
              });
            }
            console.error(errRest);
            return res
              .status(500)
              .json({ success: false, message: "Erro ao salvar restaurante." });
          }
          res
            .status(201)
            .json({ success: true, message: "Restaurante cadastrado!" });
        }
      );
    }
  );
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sqlUser = "SELECT * FROM usuario WHERE email = ?";

  db.query(sqlUser, [email], async (err, resultsUser) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Erro no servidor." });

    if (resultsUser.length > 0) {
      const user = resultsUser[0];

      if (user.senha === null) {
        return res.status(400).json({
          success: false,
          message:
            "Esta conta foi criada com o Google. Por favor, entre clicando no botão do Google.",
        });
      }

      const isMatch = await bcrypt.compare(password, user.senha);

      if (isMatch) {
        return res.status(200).json({
          success: true,
          message: "Login bem-sucedido!",
          type: "usuario",
          user: { id: user.id_usuario, nome: user.nome, email: user.email },
        });
      } else {
        return res
          .status(401)
          .json({ success: false, message: "Email ou senha inválidos." });
      }
    }

    const sqlRest = "SELECT * FROM restaurante WHERE email = ?";

    db.query(sqlRest, [email], async (errRest, resultsRest) => {
      if (errRest)
        return res
          .status(500)
          .json({ success: false, message: "Erro no servidor." });

      if (resultsRest.length > 0) {
        const rest = resultsRest[0];
        const isMatch = await bcrypt.compare(password, rest.senha);

        if (isMatch) {
          return res.status(200).json({
            success: true,
            message: "Login bem-sucedido!",
            type: "restaurante",
            user: {
              id: rest.id_restaurante,
              nome: rest.nome,
              email: rest.email,
            },
          });
        }
      }

      return res
        .status(401)
        .json({ success: false, message: "Email ou senha inválidos." });
    });
  });
});

// Login com o google
router.post("/google", async (req, res) => {
  const { token } = req.body;

  try {
    const googleResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { email, name } = googleResponse.data;

    const sqlCheck = "SELECT * FROM usuario WHERE email = ?";

    db.query(sqlCheck, [email], (err, results) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "Erro no banco." });

      if (results.length > 0) {
        const user = results[0];
        return res.status(200).json({
          success: true,
          created: false,
          type: "usuario",
          user: {
            id: user.id_usuario,
            nome: user.nome,
            email: user.email,
            telefone: user.telefone,
          },
        });
      } else {
        const sqlInsert = "INSERT INTO usuario (nome, email) VALUES (?, ?)";

        db.query(sqlInsert, [name, email], (errInsert, resultInsert) => {
          if (errInsert)
            return res
              .status(500)
              .json({ success: false, message: "Erro ao criar usuário." });

          return res.status(201).json({
            success: true,
            created: true,
            type: "usuario",
            user: {
              id: resultInsert.insertId,
              nome: name,
              email: email,
              telefone: null,
            },
          });
        });
      }
    });
  } catch (error) {
    console.error("Erro Google:", error);
    res.status(401).json({ success: false, message: "Token inválido." });
  }
});

module.exports = router;
