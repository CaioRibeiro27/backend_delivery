const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");

// Perfil
router.get("/users/:userId", (req, res) => {
  const { userId } = req.params;
  const sql =
    "SELECT id_usuario, nome, email, telefone FROM usuario WHERE id_usuario = ?";

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ success: false });
    if (results.length === 0) return res.status(404).json({ success: false });
    res.status(200).json({ success: true, user: results[0] });
  });
});

// Atualizar perfil (telefone e senha)
router.put("/users/:userId", async (req, res) => {
  const { userId } = req.params;
  const { telefone, email, novaSenha, senhaAtual } = req.body;

  if (novaSenha) {
    if (!senhaAtual) {
      return res
        .status(400)
        .json({ success: false, message: "Senha atual é obrigatória." });
    }
    const sqlCheck = "SELECT senha FROM usuario WHERE id_usuario = ?";

    db.query(sqlCheck, [userId], async (errCheck, resultsCheck) => {
      if (errCheck || resultsCheck.length === 0) {
        return res
          .status(500)
          .json({ success: false, message: "Erro ao verificar usuário." });
      }

      const currentHash = resultsCheck[0].senha;

      if (!currentHash) {
        return res.status(400).json({
          success: false,
          message: "Contas Google não possuem senha para alterar.",
        });
      }

      const isMatch = await bcrypt.compare(senhaAtual, currentHash);

      if (!isMatch) {
        return res
          .status(401)
          .json({ success: false, message: "Senha atual incorreta." });
      }

      const newHashedPassword = await bcrypt.hash(novaSenha, 10);
      const sqlUpdate = "UPDATE usuario SET senha = ? WHERE id_usuario = ?";

      db.query(sqlUpdate, [newHashedPassword, userId], (errUp) => {
        if (errUp)
          return res
            .status(500)
            .json({ success: false, message: "Erro ao atualizar senha." });

        res
          .status(200)
          .json({ success: true, message: "Senha alterada com sucesso!" });
      });
    });

    return;
  }

  let sql = "";
  let params = [];

  if (telefone) {
    sql = "UPDATE usuario SET telefone = ? WHERE id_usuario = ?";
    params = [telefone, userId];
  } else {
    return res
      .status(400)
      .json({ success: false, message: "Nenhum dado para atualizar." });
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "Erro ao atualizar dados." });
    }
    res
      .status(200)
      .json({ success: true, message: "Dados atualizados com sucesso!" });
  });
});

router.delete("/users/:userId", (req, res) => {
  const { userId } = req.params;
  const sql = "DELETE FROM usuario WHERE id_usuario = ?";

  db.query(sql, [userId], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Erro ao excluir conta." });
    res
      .status(200)
      .json({ success: true, message: "Conta excluída com sucesso." });
  });
});

// --- ENDEREÇOS ---
// Buscar endereços do usuário
router.get("/addresses/:userId", (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT e.id_endereco, e.rua, e.numero, e.cep, e.cidade, e.bairro, ue.localizacao 
    FROM endereco e
    JOIN usuario_endereco ue ON e.id_endereco = ue.id_endereco
    WHERE ue.id_usuario = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Erro ao buscar endereços." });
    res.status(200).json({ success: true, addresses: results });
  });
});

// Adicionar enderecos
router.post("/addresses", (req, res) => {
  const { rua, numero, cep, cidade, bairro, localizacao, id_usuario } =
    req.body;

  // Inserir Endereço
  const sqlAddress =
    "INSERT INTO endereco (rua, numero, cep, cidade, bairro) VALUES (?, ?, ?, ?, ?)";

  db.query(sqlAddress, [rua, numero, cep, cidade, bairro], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Erro ao salvar dados do endereço.",
      });
    }

    const id_endereco = result.insertId;

    // Vincular ao Usuário
    const sqlLink =
      "INSERT INTO usuario_endereco (id_usuario, id_endereco, localizacao) VALUES (?, ?, ?)";

    db.query(
      sqlLink,
      [id_usuario, id_endereco, localizacao],
      (errLink, resultLink) => {
        if (errLink) {
          console.error(errLink);
          return res
            .status(500)
            .json({ success: false, message: "Erro ao vincular endereço." });
        }
        res
          .status(201)
          .json({ success: true, message: "Endereço adicionado!" });
      }
    );
  });
});

//Atualizar endereço
router.put("/addresses/:addressId", (req, res) => {
  const { addressId } = req.params;
  const { rua, numero, cep, cidade, bairro, localizacao, id_usuario } =
    req.body;

  // Atualiza tabela endereco
  const sqlAddress =
    "UPDATE endereco SET rua=?, numero=?, cep=?, cidade=?, bairro=? WHERE id_endereco=?";

  db.query(sqlAddress, [rua, numero, cep, cidade, bairro, addressId], (err) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Erro ao atualizar endereço." });

    // Atualiza tabela de vinculo
    const sqlLink =
      "UPDATE usuario_endereco SET localizacao=? WHERE id_endereco=? AND id_usuario=?";
    db.query(sqlLink, [localizacao, addressId, id_usuario], (errLink) => {
      if (errLink) return res.status(500).json({ success: false });
      res.status(200).json({ success: true, message: "Endereço atualizado!" });
    });
  });
});

//Deletar endereço
router.delete("/addresses/:addressId", (req, res) => {
  const { addressId } = req.params;

  // Deletar Vínculo
  const sqlLink = "DELETE FROM usuario_endereco WHERE id_endereco = ?";

  db.query(sqlLink, [addressId], (err, result) => {
    if (err) {
      console.error("Erro ao desvincular endereço:", err);
      return res
        .status(500)
        .json({ success: false, message: "Erro ao desvincular endereço." });
    }

    // Deletar Endereço Físico
    const sqlAddress = "DELETE FROM endereco WHERE id_endereco = ?";

    db.query(sqlAddress, [addressId], (errAddress, resultAddress) => {
      if (errAddress) {
        console.error("Erro ao deletar endereço físico:", errAddress);
        return res.status(200).json({
          success: true,
          message: "Endereço desvinculado com sucesso.",
        });
      }

      res
        .status(200)
        .json({ success: true, message: "Endereço removido completamente!" });
    });
  });
});

// --- CARTÕES ---
//Buscar cartão
router.get("/cards/:userId", (req, res) => {
  const { userId } = req.params;
  const sql =
    "SELECT id_cartao, numero_cartao, bandeira, nome_titular, data_vencimento FROM cartao WHERE id_usuario = ?";

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar cartões:", err);
      return res
        .status(500)
        .json({ success: false, message: "Erro no servidor." });
    }
    res.status(200).json({ success: true, cards: results });
  });
});

router.post("/cards", (req, res) => {
  const { numero_cartao, bandeira, nome_titular, data_vencimento, id_usuario } =
    req.body;
  const sql =
    "INSERT INTO cartao (numero_cartao, bandeira, nome_titular, data_vencimento, id_usuario) VALUES (?, ?, ?, ?, ?)";

  db.query(
    sql,
    [numero_cartao, bandeira, nome_titular, data_vencimento, id_usuario],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({
            success: false,
            message: "Este número de cartão já está cadastrado.",
          });
        }
        console.error("Erro ao salvar cartão:", err);
        return res
          .status(500)
          .json({ success: false, message: "Erro ao salvar cartão." });
      }
      res.status(201).json({
        success: true,
        message: "Cartão adicionado!",
        cardId: result.insertId,
      });
    }
  );
});

// Atualizar cartão
router.put("/cards/:cardId", (req, res) => {
  const { cardId } = req.params;
  const { nome_titular, data_vencimento } = req.body;
  const sql =
    "UPDATE cartao SET nome_titular = ?, data_vencimento = ? WHERE id_cartao = ?";

  db.query(sql, [nome_titular, data_vencimento, cardId], (err, result) => {
    if (err) {
      console.error("Erro ao atualizar cartão:", err);
      return res
        .status(500)
        .json({ success: false, message: "Erro ao atualizar cartão." });
    }
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Cartão não encontrado." });
    }
    res
      .status(200)
      .json({ success: true, message: "Cartão atualizado com sucesso!" });
  });
});

router.delete("/cards/:cardId", (req, res) => {
  const { cardId } = req.params;
  const sql = "DELETE FROM cartao WHERE id_cartao = ?";

  db.query(sql, [cardId], (err, result) => {
    if (err) {
      console.error("Erro ao deletar cartão:", err);
      return res
        .status(500)
        .json({ success: false, message: "Erro ao deletar cartão." });
    }
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Cartão não encontrado." });
    }
    res
      .status(200)
      .json({ success: true, message: "Cartão removido com sucesso!" });
  });
});

//Buscar pedido
router.get("/:userId/active-order", (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT p.id_pedido, p.statusPedido, r.nome as nome_restaurante
    FROM pedido p
    JOIN restaurante r ON p.id_restaurante = r.id_restaurante
    WHERE p.id_usuario = ? 
    AND p.statusPedido NOT IN ('Entregue', 'Cancelado')
    ORDER BY p.data_pedido DESC
    LIMIT 1
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ success: false });

    if (results.length > 0) {
      const order = results[0];

      // Buscar itens do pedido
      const sqlItems = `
        SELECT pi.quantidade, c.nome_produto 
        FROM pedido_itens pi
        JOIN cardapio c ON pi.id_cardapio = c.id_cardapio
        WHERE pi.id_pedido = ?
      `;

      db.query(sqlItems, [order.id_pedido], (errItems, items) => {
        if (errItems) return res.status(500).json({ success: false });
        res.status(200).json({
          success: true,
          activeOrder: { ...order, items: items },
        });
      });
    } else {
      // Nenhum pedido ativo encontrado
      res.status(200).json({ success: true, activeOrder: null });
    }
  });
});

//Rota historico
router.get("/:userId/orders", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT p.id_pedido, p.data_pedido, p.valor_total, p.statusPedido, r.nome as nome_restaurante
    FROM pedido p
    JOIN restaurante r ON p.id_restaurante = r.id_restaurante
    WHERE p.id_usuario = ?
    ORDER BY p.data_pedido DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "Erro ao buscar histórico." });
    }
    res.status(200).json({ success: true, orders: results });
  });
});

module.exports = router;
