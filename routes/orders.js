const express = require("express");
const router = express.Router();
const db = require("../db");

// Criar pedido
router.post("/", async (req, res) => {
  const {
    id_usuario,
    id_restaurante,
    valor_total,
    forma_pagamento,
    itens,
    id_endereco,
  } = req.body;

  const data_pedido = new Date();

  const sqlOrder =
    "INSERT INTO pedido (id_usuario, id_restaurante, valor_total, forma_pagamento, statusPedido, data_pedido, id_endereco) VALUES ($1, $2, $3, $4, 'Em_andamento', $5, $6) RETURNING id_pedido";

  try {
    // Criar o Pedido
    const orderResult = await db.query(sqlOrder, [
      id_usuario,
      id_restaurante,
      valor_total,
      forma_pagamento,
      data_pedido,
      id_endereco,
    ]);

    const id_pedido = orderResult.rows[0].id_pedido;

    // Inserir Itens
    const sqlItem =
      "INSERT INTO pedido_itens (quantidade, preco_unitario, id_pedido, id_cardapio) VALUES ($1, $2, $3, $4)";

    for (const item of itens) {
      await db.query(sqlItem, [
        item.quantidade,
        item.preco,
        id_pedido,
        item.id_cardapio,
      ]);
    }

    res.status(201).json({
      success: true,
      message: "Pedido realizado com sucesso!",
      orderId: id_pedido,
    });
  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    return res
      .status(500)
      .json({ success: false, message: "Erro ao processar pedido." });
  }
});

// Atualizar status
router.put("/:orderId/status", (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const sql = "UPDATE pedido SET statusPedido = $1 WHERE id_pedido = $2";

  db.query(sql, [status, orderId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }
    res.status(200).json({ success: true, message: "Status atualizado!" });
  });
});

// Buscar item do pedido
router.get("/:orderId/items", (req, res) => {
  const { orderId } = req.params;

  const sql = `
    SELECT pi.quantidade, c.nome_produto, pi.preco_unitario
    FROM pedido_itens pi
    JOIN cardapio c ON pi.id_cardapio = c.id_cardapio
    WHERE pi.id_pedido = $1
  `;

  db.query(sql, [orderId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }
    res.status(200).json({ success: true, items: results.rows });
  });
});

module.exports = router;
