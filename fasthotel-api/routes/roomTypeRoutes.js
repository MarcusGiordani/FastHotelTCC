// fasthotel-api/routes/roomTypeRoutes.js
const express = require('express');
const router = express.Router();
const roomTypeController = require('../controllers/roomTypeController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Leitura: qualquer autenticado (cliente inclusive) — precisa para filtrar
// quartos por tipo ao criar a própria reserva.
router.get('/', auth, roomTypeController.getAllRoomTypes);
router.get('/:id', auth, roomTypeController.getRoomTypeById);

// Escrita: só administrador (mais restrito que quartos, que admite recepcionista).
router.post('/', auth, authorize(['admin']), roomTypeController.createRoomType);
router.put('/:id', auth, authorize(['admin']), roomTypeController.updateRoomType);
router.put('/:id/desativar', auth, authorize(['admin']), roomTypeController.deactivateRoomType);

module.exports = router;
