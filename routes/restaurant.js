const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");

// Buscar todos os restaurantes
router.get("/all", (req, res) => {
  const sql = "SELECT id_restaurante, nome, telefone FROM restaurante";

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }
    res.status(200).json({ success: true, restaurants: results.rows });
  });
});

// Buscar pedidos
router.get("/:restaurantId/orders", async (req, res) => {
  const { restaurantId } = req.params;
  const sqlOrders = `
    SELECT 
      p.id_pedido, 
      p.valor_total, 
      p.statusPedido AS "statusPedido", 
      p.data_pedido,
      u.nome as nome_cliente,
      e.rua, e.numero, e.bairro, ue.localizacao
    FROM pedido p
    JOIN usuario u ON p.id_usuario = u.id_usuario
    JOIN endereco e ON p.id_endereco = e.id_endereco
    LEFT JOIN usuario_endereco ue ON (ue.id_endereco = e.id_endereco AND ue.id_usuario = u.id_usuario)
    WHERE p.id_restaurante = $1
    ORDER BY p.data_pedido DESC`;

  try {
    const ordersResult = await db.query(sqlOrders, [restaurantId]);
    const orders = ordersResult.rows;

    if (orders.length === 0) {
      return res.status(200).json({ success: true, orders: [] });
    }

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const sqlItems = `
        SELECT pi.quantidade, c.nome_produto, pi.preco_unitario 
        FROM pedido_itens pi
        JOIN cardapio c ON pi.id_cardapio = c.id_cardapio
        WHERE pi.id_pedido = $1
      `;
        const itemsResult = await db.query(sqlItems, [order.id_pedido]);

        return { ...order, items: itemsResult.rows };
      })
    );

    res.status(200).json({ success: true, orders: ordersWithItems });
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    return res
      .status(500)
      .json({ success: false, message: "Erro ao buscar pedidos." });
  }
});

// Cardápio
router.get("/menu/:restaurantId", (req, res) => {
  const { restaurantId } = req.params;
  const sql = "SELECT * FROM cardapio WHERE id_restaurante = $1";

  db.query(sql, [restaurantId], (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "Erro ao buscar cardápio." });
    }
    res.status(200).json({ success: true, items: results.rows });
  });
});

router.post("/menu", (req, res) => {
  const { nome_produto, descricao, preco, categoria, id_restaurante } =
    req.body;

  const sql =
    "INSERT INTO cardapio (nome_produto, descricao, preco, categoria, id_restaurante) VALUES ($1, $2, $3, $4, $5)";

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

router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql =
    "SELECT id_restaurante, nome, email, telefone, cnpj FROM restaurante WHERE id_restaurante = $1";

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }

    if (results.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurante não encontrado" });
    }

    res.status(200).json({ success: true, user: results.rows[0] });
  });
});

// Atualizar info do restaurante
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, telefone, novaSenha } = req.body;

  let sql = "";
  let params = [];

  if (nome) {
    sql = "UPDATE restaurante SET nome = $1 WHERE id_restaurante = $2";
    params = [nome, id];
  } else if (telefone) {
    sql = "UPDATE restaurante SET telefone = $1 WHERE id_restaurante = $2";
    params = [telefone, id];
  } else if (novaSenha) {
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    sql = "UPDATE restaurante SET senha = $1 WHERE id_restaurante = $2";
    params = [hashedPassword, id];
  } else {
    return res.status(400).json({ success: false });
  }

  db.query(sql, params, (err) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "Erro ao atualizar." });
    }
    res.status(200).json({ success: true, message: "Atualizado!" });
  });
});

// Atualizar o endereço do restaurante
router.put("/:id/address", (req, res) => {
  const { id } = req.params;
  const { rua, numero, cep, bairro, cidade } = req.body;

  const sqlFind =
    "SELECT id_endereco FROM restaurante WHERE id_restaurante = $1";

  db.query(sqlFind, [id], (err, result) => {
    if (err || result.rows.length === 0) {
      console.error(err);
      return res.status(500).json({ success: false });
    }

    const id_endereco = result.rows[0].id_endereco;
    const sqlUpdate =
      "UPDATE endereco SET rua=$1, numero=$2, cep=$3, bairro=$4, cidade=$5 WHERE id_endereco=$6";

    db.query(
      sqlUpdate,
      [rua, numero, cep, bairro, cidade, id_endereco],
      (errUp) => {
        if (errUp) {
          console.error(errUp);
          return res
            .status(500)
            .json({ success: false, message: "Erro ao atualizar endereço." });
        }

        res
          .status(200)
          .json({ success: true, message: "Endereço atualizado!" });
      }
    );
  });
});

// Buscar endereço do restaurante
router.get("/:id/address", (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT e.* FROM endereco e
    JOIN restaurante r ON r.id_endereco = e.id_endereco
    WHERE r.id_restaurante = $1
  `;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }
    res.status(200).json({ success: true, address: results.rows[0] });
  });
});

module.exports = router;
