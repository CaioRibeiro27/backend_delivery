const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");
const axios = require("axios");

//Registra usuario
router.post("/register", async (req, res) => {
  const { nome, telefone, senha, email } = req.body;
  const hashedPassword = await bcrypt.hash(senha, 10);

  const sql =
    "INSERT INTO usuario (nome, telefone, senha, email) VALUES ($1, $2, $3, $4) RETURNING id_usuario";

  db.query(sql, [nome, telefone, hashedPassword, email], (err, result) => {
    if (err) {
      console.log("ERRO DB:", err.code, err.message);

      if (err.code === "23505") {
        return res.status(400).json({
          success: false,
          message: "Este e-mail já está cadastrado.",
        });
      }

      return res
        .status(500)
        .json({ success: false, message: "Erro ao registrar usuário." });
    }

    const novoId = result.rows[0].id_usuario;
    res.status(201).json({
      success: true,
      message: "Usuário registrado com sucesso!",
      userID: novoId,
    });
  });
});

//Registrar restaurante
router.post("/register-restaurant", async (req, res) => {
  const {
    nome,
    email,
    senha,
    telefone,
    cnpj,
    cidade,
    cep,
    bairro,
    rua,
    numero,
  } = req.body;

  const hashedPassword = await bcrypt.hash(senha, 10);

  // Inserir endereco
  const sqlAddress =
    "INSERT INTO endereco (rua, numero, cep, cidade, bairro) VALUES ($1, $2, $3, $4, $5) RETURNING id_endereco";

  db.query(
    sqlAddress,
    [rua, numero, cep, cidade, bairro],
    (err, resultAddr) => {
      if (err) {
        console.error("Erro Endereço:", err);
        return res
          .status(500)
          .json({ success: false, message: "Erro ao salvar endereço." });
      }

      // Pegar ID do endereco recém criado
      const id_endereco = resultAddr.rows[0].id_endereco;

      // Inserir restaurante
      const sqlRest =
        "INSERT INTO restaurante (nome, telefone, cnpj, id_endereco, email, senha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_restaurante";

      db.query(
        sqlRest,
        [nome, telefone, cnpj, id_endereco, email, hashedPassword],
        (errRest, resultRest) => {
          if (errRest) {
            if (errRest.code === "23505") {
              return res.status(400).json({
                success: false,
                message: "Restaurante (email ou CNPJ) já cadastrado.",
              });
            }
            console.error("Erro restaurante:", errRest);
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

//Login restaurante e usuario
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Buscar usuario
  const sqlUser = "SELECT * FROM usuario WHERE email = $1";

  db.query(sqlUser, [email], async (err, resultsUser) => {
    if (err) {
      console.error("Erro login user:", err);
      return res
        .status(500)
        .json({ success: false, message: "Erro no servidor." });
    }

    if (resultsUser.rows.length > 0) {
      const user = resultsUser.rows[0];

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

    const sqlRest = "SELECT * FROM restaurante WHERE email = $1";

    db.query(sqlRest, [email], async (errRest, resultsRest) => {
      if (errRest) {
        return res
          .status(500)
          .json({ success: false, message: "Erro no servidor." });
      }
      if (resultsRest.rows.length > 0) {
        const rest = resultsRest.rows[0];
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

    const sqlCheck = "SELECT * FROM usuario WHERE email = $1";

    db.query(sqlCheck, [email], (err, results) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "Erro no banco." });

      if (results.rows.length > 0) {
        const user = results.rows[0];
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
        const sqlInsert =
          "INSERT INTO usuario (nome, email) VALUES ($1, $2) RETURNING id_usuario";

        db.query(sqlInsert, [name, email], (errInsert, resultInsert) => {
          if (errInsert)
            return res
              .status(500)
              .json({ success: false, message: "Erro ao criar usuário." });

          const novoID = resultInsert.rows[0].id_usuario;

          return res.status(201).json({
            success: true,
            created: true,
            type: "usuario",
            user: {
              id: novoID,
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
