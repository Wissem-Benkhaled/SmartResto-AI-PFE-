import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

// 📌 Récupérer toutes les commandes
router.get("", async (req: Request, res: Response) => {
  try {
    //  Mettre à jour les commandes expirées (3h)
    await pool.query(`
      UPDATE orders
      SET status = 3
      WHERE created_at <= NOW() - INTERVAL '24 hours'
      AND status = 0
    `);
    const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");

    if (result.rowCount === 0) {
      return res.status(200).json({ message: "La table est vide" });
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Récupérer les commandes avec date specefic 
router.get("/date/:date", async (req: Request, res: Response) => {
  const { date } = req.params; // format attendu : 2026-03-02

  try {
    await pool.query(`
      UPDATE orders
      SET status = 3
      WHERE created_at <= NOW() - INTERVAL '24 hours'
      AND status = 0
    `);
    const result = await pool.query(
      `
      SELECT *
      FROM orders
      WHERE created_at::date = $1::date
      ORDER BY created_at DESC
      `,
      [date]
    );

    if (result.rowCount === 0) {
      return res.status(200).json({ message: "Aucune commande pour cette date" });
    }

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Récupérer une commande pour kds
router.get("/date2/:date", async (req: Request, res: Response) => {
   const { date } = req.params; 

  try {
    await pool.query(`
      UPDATE orders
      SET status = 3
      WHERE created_at <= NOW() - INTERVAL '24 hours'
      AND status = 0
    `);
    const result = await pool.query(
    `
    SELECT 
      o.id, 
      o.user_id, 
      o.client_id, 
      o.created_at, 
      o.service_mode, 
      o.status, 
      json_agg(
        json_build_object(
          'id', od.id,
          'name', od.name,
          'quantity', od.count,
          'supplement', od.supplement
        )
      ) AS items
    FROM orders o
    JOIN order_details od ON o.id = od.order_id
    WHERE o.created_at::date = $1::date
    GROUP BY o.id
    ORDER BY o.created_at DESC;
    `,[date]
);
{/*
  o.status, 
  'supplement', od.supplement -- Assurez-vous que ce champ est de type JSONB en DB
*/}
    if (result.rowCount === 0) {
      return res.status(200).json({ message: "Aucune commande pour cette date" });
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Insérer une commande
// router.post("", async (req: Request, res: Response) => {
//   try {
//     const {orderDetails} = req.body;
//     const insert_data = await pool.query(
//       `INSERT INTO orders (user_id, client_id, service_mode, points_merci_gagner, total_cmd, code_promo, paiement, prix_finale, points_consommes,promo_percent ) 
//        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10 ) 
//        RETURNING *`,
//       [
//         orderDetails.user_id || 1,
//         orderDetails.clientId || 1,
//         orderDetails.serviceMode || 0,
//         orderDetails.points_merci_gagner || 0,
//         orderDetails.total_Inial || 0,
//         orderDetails.CodePromo?.code_promo || '',
//         orderDetails.paiement || 0,
//         orderDetails.total_Finale || 0,
//         orderDetails.pointsConsommes || 0,
//         orderDetails.CodePromo?.discountPercent || 0,
//       ]
//     );

//     if (insert_data.rowCount === 0) {
//       return res.status(400).json({ error: "Insertion failed" });
//     }
    
//     // DETAIL CMD
//     const id_order = insert_data.rows[0].id;
//     for(const detail of orderDetails.detail_cmd){
//       const insertDetails = await pool.query(
//         `INSERT INTO order_details 
//         (order_id, name, point_fidelite, price, count)
//         VALUES ($1, $2, $3, $4, $5)
//         RETURNING *`,
//         [
//           id_order,
//           detail.name||'',
//           detail.point_fidelite||0,
//           detail.price||0,
//           detail.count||0
//         ]
//       );
//       if(insertDetails.rowCount === 0){
//         return res.status(400).json({ error: "Insertion des détails de commande échouée" });
//       }
//     }

//     // client update points fidelite
//     const result = await pool.query(
//           "UPDATE clients SET point_fid = $1  WHERE client_id = $2 RETURNING *",
//           [orderDetails.pointsRestants, orderDetails.clientId]
//         );
//     if(result.rowCount === 0){
//       return res.status(404).json({ error: "Client non trouvé" });
//     }
//     //promo

//     res.status(201).json(insert_data.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

router.post("", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { orderDetails } = req.body ?? {};
    if (!orderDetails) {
      return res.status(400).json({ error: "orderDetails est requis" });
    }

    if (!Array.isArray(orderDetails.detail_cmd) || orderDetails.detail_cmd.length === 0) {
      return res.status(400).json({ error: "detail_cmd doit être un tableau non vide" });
    }
    await client.query("BEGIN");
    const insertOrder = await client.query(
      `INSERT INTO orders 
      (user_id, client_id, service_mode, points_merci_gagner, total_cmd, code_promo, paiement, prix_finale, points_consommes, promo_percent) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        orderDetails.user_id ?? 1,
        orderDetails.clientId ?? null,
        orderDetails.serviceMode ?? 0,
        orderDetails.Points_Fidal_Ganier ?? 0,
        orderDetails.total_Inial ?? orderDetails.total_Initial ?? 0,
        orderDetails.CodePromo?.code_promo ?? "",
        orderDetails.paiement ?? 0,
        orderDetails.total_Finale ?? 0,
        orderDetails.pointsConsommes ?? 0,
        orderDetails.CodePromo?.discountPercent ?? 0,
      ]
    );
    if (insertOrder.rowCount !== 1) {
      throw new Error("ORDER_INSERT_FAILED");
    }
    const orderId = insertOrder.rows[0].id;
    for (const detail of orderDetails.detail_cmd) {
      const insertDetail = await client.query(
      `INSERT INTO order_details (order_id, name, point_fidelite, price, count, supplement)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        orderId,
        detail?.name ?? "",
        detail?.point_fidelite ?? 0,
        detail?.price ?? 0,
        detail?.count ?? 0,
        JSON.stringify(detail?.supplement ?? []) 
      ]
    );

      if (insertDetail.rowCount !== 1) {
        throw new Error("DETAIL_INSERT_FAILED");
      }
    }
    if (orderDetails.clientId != null) {
      const updateClient = await client.query(
        "UPDATE clients SET point_fid =point_fid - $1 + $2 WHERE client_id = $3 RETURNING *",
        [orderDetails.pointsConsommes ?? 0,orderDetails.Points_Fidal_Ganier ?? 0, orderDetails.clientId]
      );

      if (updateClient.rowCount === 0) {
        throw new Error("CLIENT_NOT_FOUND");
      }
    }

    await client.query("COMMIT");
    return res.status(201).json(insertOrder.rows[0]);
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error(err);

    if (err?.message === "CLIENT_NOT_FOUND") {
      return res.status(404).json({ error: "Client non trouvé" });
    }

    if (err?.message === "ORDER_INSERT_FAILED" || err?.message === "DETAIL_INSERT_FAILED") {
      return res.status(400).json({ error: "Insertion échouée" });
    }

    return res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

// 📌 Mettre à jour une commande
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id, client_id, service_mode, points_merci_gagner, total_cmd, code_promo, paiement, Prix_finale, points_Consommes,promo_percent } = req.body;

    const result = await pool.query(
      `UPDATE orders 
       SET user_id = $1, client_id = $2, service_mode = $3, points_merci_gagner = $4, total_cmd = $5, code_promo = $6, paiement = $7, Prix_finale = $8, points_Consommes = $9, promo_percent = $10
       WHERE id = $11 
       RETURNING *`,
      [
        user_id || 1,
        client_id || 1,
        service_mode || 0,
        points_merci_gagner || 0,
        total_cmd || 0,
        code_promo || "aucun",
        paiement || 0,
        Prix_finale || 0,
        points_Consommes || 0,
        promo_percent || 0,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// PATCH : Modification partielle d'une ressource, ici on ne modifie que le status
// 📌 Mettre à jour le status d'une commande
router.patch("/updateStatus/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newStatus } = req.body;

    const result = await pool.query(
      `UPDATE orders 
       SET status = $1
       WHERE id = $2 
       RETURNING *`,
      [newStatus, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});



// 📌 Supprimer une commande
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM orders WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    res.status(200).json({ message: "Commande supprimée avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;


// import { Router, Request, Response } from "express";
// import { pool } from "../db";

// const router = Router();

// // 📌 Récupérer toutes les commandes
// router.get("", async (req: Request, res: Response) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         o.*,
//         rt.table_number,
//         rt.capacity as table_capacity,
//         u.username as user_name,
//         c.name as customer_name,
//         c.email as customer_email
//       FROM orders o
//       LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
//       LEFT JOIN users u ON o.user_id = u.user_id
//       LEFT JOIN customers c ON o.customer_id = c.customer_id
//       ORDER BY o.created_at DESC
//     `);
    
//     if (result.rowCount === 0) {
//       return res.status(200).json({ message: "La table est vide" });
//     }
    
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 📌 Récupérer une commande par ID
// router.get("/:id", async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const result = await pool.query(`
//       SELECT 
//         o.*,
//         rt.table_number,
//         rt.capacity as table_capacity,
//         u.username as user_name,
//         c.name as customer_name,
//         c.email as customer_email,
//         c.phone as customer_phone
//       FROM orders o
//       LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
//       LEFT JOIN users u ON o.user_id = u.user_id
//       LEFT JOIN customers c ON o.customer_id = c.customer_id
//       WHERE o.order_id = $1
//     `, [id]);
    
//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Commande non trouvée" });
//     }
    
//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 📌 Récupérer les commandes par date
// router.get("/date/:date", async (req: Request, res: Response) => {
//   const { date } = req.params; // format attendu : 2026-03-02

//   try {
//     const result = await pool.query(
//       `
//       SELECT *
//       FROM orders
//       WHERE created_at::date = $1::date
//       ORDER BY created_at DESC
//       `,
//       [date]
//     );

//     if (result.rowCount === 0) {
//       return res.status(200).json({ message: "Aucune commande pour cette date" });
//     }

//     res.json(result.rows);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 📌 Récupérer les commandes par table
// router.get("/table/:tableId", async (req: Request, res: Response) => {
//   try {
//     const { tableId } = req.params;
//     const result = await pool.query(`
//       SELECT 
//         o.*,
//         rt.table_number,
//         u.username as user_name,
//         c.name as customer_name
//       FROM orders o
//       LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
//       LEFT JOIN users u ON o.user_id = u.user_id
//       LEFT JOIN customers c ON o.customer_id = c.customer_id
//       WHERE o.table_id = $1
//       ORDER BY o.created_at DESC
//     `, [tableId]);
    
//     if (result.rowCount === 0) {
//       return res.status(200).json({ message: "Aucune commande pour cette table" });
//     }
    
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 📌 Récupérer les commandes par utilisateur
// router.get("/user/:userId", async (req: Request, res: Response) => {
//   try {
//     const { userId } = req.params;
//     const result = await pool.query(`
//       SELECT 
//         o.*,
//         rt.table_number,
//         c.name as customer_name
//       FROM orders o
//       LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
//       LEFT JOIN customers c ON o.customer_id = c.customer_id
//       WHERE o.user_id = $1
//       ORDER BY o.created_at DESC
//     `, [userId]);
    
//     if (result.rowCount === 0) {
//       return res.status(200).json({ message: "Aucune commande pour cet utilisateur" });
//     }
    
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 📌 Récupérer les commandes par client
// router.get("/customer/:customerId", async (req: Request, res: Response) => {
//   try {
//     const { customerId } = req.params;
//     const result = await pool.query(`
//       SELECT 
//         o.*,
//         rt.table_number,
//         u.username as user_name
//       FROM orders o
//       LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
//       LEFT JOIN users u ON o.user_id = u.user_id
//       WHERE o.customer_id = $1
//       ORDER BY o.created_at DESC
//     `, [customerId]);
    
//     if (result.rowCount === 0) {
//       return res.status(200).json({ message: "Aucune commande pour ce client" });
//     }
    
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 📌 Récupérer les commandes d'aujourd'hui
// router.get("/today/all", async (req: Request, res: Response) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         o.*,
//         rt.table_number,
//         u.username as user_name,
//         c.name as customer_name
//       FROM orders o
//       LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
//       LEFT JOIN users u ON o.user_id = u.user_id
//       LEFT JOIN customers c ON o.customer_id = c.customer_id
//       WHERE DATE(o.created_at) = CURRENT_DATE
//       ORDER BY o.created_at DESC
//     `);
    
//     if (result.rowCount === 0) {
//       return res.status(200).json({ message: "Aucune commande aujourd'hui" });
//     }
    
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 📌 Récupérer les commandes par plage de dates
// router.get("/date-range/:startDate/:endDate", async (req: Request, res: Response) => {
//   try {
//     const { startDate, endDate } = req.params;
//     const result = await pool.query(`
//       SELECT 
//         o.*,
//         rt.table_number,
//         u.username as user_name,
//         c.name as customer_name
//       FROM orders o
//       LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
//       LEFT JOIN users u ON o.user_id = u.user_id
//       LEFT JOIN customers c ON o.customer_id = c.customer_id
//       WHERE o.created_at BETWEEN $1 AND $2
//       ORDER BY o.created_at DESC
//     `, [startDate, endDate]);
    
//     if (result.rowCount === 0) {
//       return res.status(200).json({ message: "Aucune commande dans cette période" });
//     }
    
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 📌 Insérer une commande
// router.post("", async (req: Request, res: Response) => {
//   try {
//     const { table_id, user_id, customer_id, total_amount, created_at } = req.body;

//     // Validation des champs requis
//     if (!table_id || !user_id || total_amount === undefined) {
//       return res.status(400).json({ 
//         error: "Les champs 'table_id', 'user_id' et 'total_amount' sont requis" 
//       });
//     }

//     // Validation du montant total
//     if (total_amount < 0) {
//       return res.status(400).json({ error: "Le montant total ne peut pas être négatif" });
//     }

//     // Vérifier si la table existe
//     const tableExists = await pool.query(
//       "SELECT table_id FROM restaurant_tables WHERE table_id = $1",
//       [table_id]
//     );
    
//     if (tableExists.rowCount === 0) {
//       return res.status(404).json({ error: "Table non trouvée" });
//     }

//     // Vérifier si l'utilisateur existe
//     const userExists = await pool.query(
//       "SELECT user_id FROM users WHERE user_id = $1",
//       [user_id]
//     );
    
//     if (userExists.rowCount === 0) {
//       return res.status(404).json({ error: "Utilisateur non trouvé" });
//     }

//     // Vérifier si le client existe (si fourni)
//     if (customer_id) {
//       const customerExists = await pool.query(
//         "SELECT customer_id FROM customers WHERE customer_id = $1",
//         [customer_id]
//       );
      
//       if (customerExists.rowCount === 0) {
//         return res.status(404).json({ error: "Client non trouvé" });
//       }
//     }

//     const insert_data = await pool.query(
//       `INSERT INTO orders (table_id, user_id, customer_id, total_amount, created_at) 
//        VALUES ($1, $2, $3, $4, $5) 
//        RETURNING *`,
//       [
//         table_id,
//         user_id,
//         customer_id || null,
//         total_amount,
//         created_at || new Date()
//       ]
//     );

//     if (insert_data.rowCount === 0) {
//       return res.status(400).json({ error: "Insertion failed" });
//     }

//     res.status(201).json(insert_data.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 📌 Mettre à jour une commande
// router.put("/:id", async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { table_id, user_id, customer_id, total_amount, created_at } = req.body;

//     // Vérifier si la commande existe
//     const existing = await pool.query(
//       "SELECT * FROM orders WHERE order_id = $1",
//       [id]
//     );

//     if (existing.rowCount === 0) {
//       return res.status(404).json({ error: "Commande non trouvée" });
//     }

//     const currentOrder = existing.rows[0];

//     // Validation du montant total si fourni
//     if (total_amount !== undefined && total_amount < 0) {
//       return res.status(400).json({ error: "Le montant total ne peut pas être négatif" });
//     }

//     // Vérifier si la table existe (si fournie)
//     if (table_id) {
//       const tableExists = await pool.query(
//         "SELECT table_id FROM restaurant_tables WHERE table_id = $1",
//         [table_id]
//       );
      
//       if (tableExists.rowCount === 0) {
//         return res.status(404).json({ error: "Table non trouvée" });
//       }
//     }

//     // Vérifier si l'utilisateur existe (si fourni)
//     if (user_id) {
//       const userExists = await pool.query(
//         "SELECT user_id FROM users WHERE user_id = $1",
//         [user_id]
//       );
      
//       if (userExists.rowCount === 0) {
//         return res.status(404).json({ error: "Utilisateur non trouvé" });
//       }
//     }

//     // Vérifier si le client existe (si fourni)
//     if (customer_id) {
//       const customerExists = await pool.query(
//         "SELECT customer_id FROM customers WHERE customer_id = $1",
//         [customer_id]
//       );
      
//       if (customerExists.rowCount === 0) {
//         return res.status(404).json({ error: "Client non trouvé" });
//       }
//     }

//     const result = await pool.query(
//       `UPDATE orders 
//        SET table_id = $1, user_id = $2, customer_id = $3, total_amount = $4, created_at = $5
//        WHERE order_id = $6 
//        RETURNING *`,
//       [
//         table_id || currentOrder.table_id,
//         user_id || currentOrder.user_id,
//         customer_id !== undefined ? customer_id : currentOrder.customer_id,
//         total_amount !== undefined ? total_amount : currentOrder.total_amount,
//         created_at || currentOrder.created_at,
//         id
//       ]
//     );

//     res.status(200).json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });



// // 📌 Associer un client à une commande
// router.patch("/:id/customer", async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { customer_id } = req.body;

//     // Vérifier si le client existe (si fourni et non null)
//     if (customer_id) {
//       const customerExists = await pool.query(
//         "SELECT customer_id FROM customers WHERE customer_id = $1",
//         [customer_id]
//       );
      
//       if (customerExists.rowCount === 0) {
//         return res.status(404).json({ error: "Client non trouvé" });
//       }
//     }

//     const result = await pool.query(
//       `UPDATE orders 
//        SET customer_id = $1
//        WHERE order_id = $2 
//        RETURNING *`,
//       [customer_id || null, id]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Commande non trouvée" });
//     }

//     res.status(200).json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 📌 Supprimer une commande
// router.delete("/:id", async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const result = await pool.query("DELETE FROM orders WHERE order_id = $1", [id]);
    
//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Commande non trouvée" });
//     }
    
//     res.status(200).json({ message: "Commande supprimée avec succès" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });


// export default router;
