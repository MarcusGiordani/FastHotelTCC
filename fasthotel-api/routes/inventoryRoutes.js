// fasthotel-api/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Módulo operacional interno — restrito à equipe (mesmo padrão de cleaningRoutes.js).
router.get('/resumo', auth, authorize(['admin', 'recepcionista']), inventoryController.getStockSummary);
router.get('/movimentacoes', auth, authorize(['admin', 'recepcionista']), inventoryController.getAllMovements);

router.get('/produtos', auth, authorize(['admin', 'recepcionista']), inventoryController.getAllProducts);
router.get('/produtos/:id', auth, authorize(['admin', 'recepcionista']), inventoryController.getProductById);
router.post('/produtos', auth, authorize(['admin', 'recepcionista']), inventoryController.createProduct);
router.put('/produtos/:id', auth, authorize(['admin', 'recepcionista']), inventoryController.updateProduct);
router.put('/produtos/:id/desativar', auth, authorize(['admin', 'recepcionista']), inventoryController.deactivateProduct);

router.post('/produtos/:id/entrada', auth, authorize(['admin', 'recepcionista']), inventoryController.registrarEntrada);
router.post('/produtos/:id/saida', auth, authorize(['admin', 'recepcionista']), inventoryController.registrarSaida);

module.exports = router;
