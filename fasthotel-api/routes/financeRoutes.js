// fasthotel-api/routes/financeRoutes.js
const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Módulo operacional interno — restrito à equipe (mesmo padrão de cleaningRoutes.js / inventoryRoutes.js).
router.get('/resumo', auth, authorize(['admin', 'recepcionista']), financeController.getFinanceSummary);
router.get('/resumo-mensal', auth, authorize(['admin', 'recepcionista']), financeController.getMonthlySummary);

router.get('/categorias', auth, authorize(['admin', 'recepcionista']), financeController.getAllCategories);
router.post('/categorias', auth, authorize(['admin', 'recepcionista']), financeController.createCategory);

router.post('/receitas', auth, authorize(['admin', 'recepcionista']), financeController.createRevenue);
router.post('/despesas', auth, authorize(['admin', 'recepcionista']), financeController.createExpense);

router.get('/', auth, authorize(['admin', 'recepcionista']), financeController.getAllMovements);
router.get('/:id', auth, authorize(['admin', 'recepcionista']), financeController.getMovementById);
router.put('/:id', auth, authorize(['admin', 'recepcionista']), financeController.updateMovement);
router.put('/:id/cancelar', auth, authorize(['admin', 'recepcionista']), financeController.cancelMovement);

module.exports = router;
