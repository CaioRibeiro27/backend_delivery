const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/all", (req, res) => {
  const sql = "SELECT id_restaurante, nome, telefone FROM restaurante";

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ success: false });
    res.status(200).json({ success: true, restaurants: results });
  });
});

//Buscar pedidos de um restaurante específico
router.get("/:restaurantId/orders", (req, res) => {
  const { restaurantId } = req.params;
  const sql = `
    SELECT 
      p.id_pedido, 
      p.valor_total, 
      p.statusPedido, 
      p.data_pedido,
      u.nome as nome_cliente,
      e.rua, e.numero, e.bairro, ue.localizacao -- Dados precisos do endereço escolhido
    FROM pedido p
    JOIN usuario u ON p.id_usuario = u.id_usuario
    JOIN endereco e ON p.id_endereco = e.id_endereco -- JOIN direto com o endereço do pedido
    LEFT JOIN usuario_endereco ue ON (ue.id_endereco = e.id_endereco AND ue.id_usuario = u.id_usuario) -- Só pra pegar o apelido
    WHERE p.id_restaurante = ?
    ORDER BY p.data_pedido DESC`;

  db.query(sql, [restaurantId], (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "Erro ao buscar pedidos." });
    }
    res.status(200).json({ success: true, orders: results });
  });
});

// Cardápio
router.get("/menu/:restaurantId", (req, res) => {
  const { restaurantId } = req.params;
  const sql = "SELECT * FROM cardapio WHERE id_restaurante = ?";

  db.query(sql, [restaurantId], (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "Erro ao buscar cardápio." });
    }
    res.status(200).json({ success: true, items: results });
  });
});

router.post("/menu", (req, res) => {
  const { nome_produto, descricao, preco, categoria, id_restaurante } =
    req.body;

  const sql =
    "INSERT INTO cardapio (nome_produto, descricao, preco, categoria, id_restaurante) VALUES (?, ?, ?, ?, ?)";

  db.query(
    sql,
    [nome_produto, descricao, preco, categoria, id_restaurante],
    (err, result) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Erro ao adicionar item." });
      }
      res.status(201).json({ success: true, message: "Item adicionado!" });
    }
  );
});

// Perfil do Restaurante
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT id_restaurante, nome, email, telefone, cnpj FROM restaurante WHERE id_restaurante = ?";

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurante não encontrado" });
    }

    res.status(200).json({ success: true, user: results[0] });
  });
});

// Atualizar info do restaurante
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, telefone, novaSenha } = req.body;

  let sql = "";
  let params = [];

  if (nome) {
    sql = "UPDATE restaurante SET nome = ? WHERE id_restaurante = ?";
    params = [nome, id];
  } else if (telefone) {
    sql = "UPDATE restaurante SET telefone = ? WHERE id_restaurante = ?";
    params = [telefone, id];
  } else if (novaSenha) {
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    sql = "UPDATE restaurante SET senha = ? WHERE id_restaurante = ?";
    params = [hashedPassword, id];
  } else {
    return res.status(400).json({ success: false });
  }

  db.query(sql, params, (err) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Erro ao atualizar." });
    res.status(200).json({ success: true, message: "Atualizado!" });
  });
});

// Atualizar o endereço do restaurante

router.put("/:id/address", (req, res) => {
  const { id } = req.params;
  const { rua, numero, cep, bairro, cidade } = req.body;

  const sqlFind =
    "SELECT id_endereco FROM restaurante WHERE id_restaurante = ?";

  db.query(sqlFind, [id], (err, result) => {
    if (err || result.length === 0)
      return res.status(500).json({ success: false });

    const id_endereco = result[0].id_endereco;
    const sqlUpdate =
      "UPDATE endereco SET rua=?, numero=?, cep=?, bairro=?, cidade=? WHERE id_endereco=?";

    db.query(
      sqlUpdate,
      [rua, numero, cep, bairro, cidade, id_endereco],
      (errUp) => {
        if (errUp)
          return res
            .status(500)
            .json({ success: false, message: "Erro ao atualizar endereço." });

        res
          .status(200)
          .json({ success: true, message: "Endereço atualizado!" });
      }
    );
  });
});

router.get("/:id/address", (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT e.* FROM endereco e
    JOIN restaurante r ON r.id_endereco = e.id_endereco
    WHERE r.id_restaurante = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false });
    res.status(200).json({ success: true, address: results[0] });
  });
});

module.exports = router;
