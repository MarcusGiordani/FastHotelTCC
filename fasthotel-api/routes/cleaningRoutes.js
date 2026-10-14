// fasthotel-api/routes/cleaningRoutes.js
const express = require('express');
const router = express.Router();
const cleaningController = require('../controllers/cleaningController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Módulo operacional interno — restrito à equipe (mesmo padrão de bookingController/reportRoutes).
// Rotas literais ANTES de '/:id', mesmo padrão já usado em paymentRoutes.js.
router.get('/quartos', auth, authorize(['admin', 'recepcionista']), cleaningController.getRoomsCleaningStatus);
router.get('/resumo', auth, authorize(['admin', 'recepcionista']), cleaningController.getCleaningSummary);
router.get('/funcionarios', auth, authorize(['admin', 'recepcionista']), cleaningController.getFuncionariosDisponiveis);
router.get('/', auth, authorize(['admin', 'recepcionista']), cleaningController.getAllCleanings);
router.get('/:id', auth, authorize(['admin', 'recepcionista']), cleaningController.getCleaningById);
router.put('/:id', auth, authorize(['admin', 'recepcionista']), cleaningController.updateCleaning);

module.exports = router;
