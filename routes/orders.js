const express = require("express");
const router = express.Router();
const db = require("../db");

// Criar pedido
router.post("/", (req, res) => {
  const {
    id_usuario,
    id_restaurante,
    valor_total,
    forma_pagamento,
    itens,
    id_endereco,
  } = req.body;

  const data_pedido = new Date().toISOString().slice(0, 19).replace("T", " ");

  const sqlOrder =
    "INSERT INTO pedido (id_usuario, id_restaurante, valor_total, forma_pagamento, statusPedido, data_pedido, id_endereco) VALUES (?, ?, ?, ?, 'Em_andamento', ?, ?)";

  db.query(
    sqlOrder,
    [
      id_usuario,
      id_restaurante,
      valor_total,
      forma_pagamento,
      data_pedido,
      id_endereco,
    ],
    (err, result) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Erro ao criar pedido." });
      }

      const id_pedido = result.insertId;

      // Prepara os itens para inserção em lote
      const values = itens.map((item) => [
        item.quantidade,
        item.preco,
        id_pedido,
        item.id_cardapio,
      ]);

      const sqlItems =
        "INSERT INTO pedido_itens (quantidade, preco_unitario, id_pedido, id_cardapio) VALUES ?";

      db.query(sqlItems, [values], (errItems) => {
        if (errItems) {
          console.error(errItems);
          return res
            .status(500)
            .json({ success: false, message: "Erro ao adicionar itens." });
        }

        // Sucesso! Retorna o ID do pedido também.
        res.status(201).json({
          success: true,
          message: "Pedido realizado com sucesso!",
          orderId: id_pedido,
        });
      });
    }
  );
});

// Atualizar status
router.put("/:orderId/status", (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const sql = "UPDATE pedido SET statusPedido = ? WHERE id_pedido = ?";

  db.query(sql, [status, orderId], (err, result) => {
    if (err) return res.status(500).json({ success: false });
    res.status(200).json({ success: true, message: "Status atualizado!" });
  });
});

// Itens do pedido
router.get("/:orderId/items", (req, res) => {
  const { orderId } = req.params;
  const sql = `
    SELECT pi.quantidade, c.nome_produto, pi.preco_unitario
    FROM pedido_itens pi
    JOIN cardapio c ON pi.id_cardapio = c.id_cardapio
    WHERE pi.id_pedido = ?
  `;

  db.query(sql, [orderId], (err, results) => {
    if (err) return res.status(500).json({ success: false });
    res.status(200).json({ success: true, items: results });
  });
});

module.exports = router;
