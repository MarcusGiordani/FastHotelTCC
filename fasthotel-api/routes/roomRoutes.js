// fasthotel-api/routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController'); // Importa o controlador de quartos
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Leitura: qualquer usuário autenticado (cliente inclusive) — necessário para
// o cliente escolher um quarto ao criar a própria reserva (ver bookingRoutes.js).
router.get('/', auth, roomController.getAllRooms);         // Obter todos os quartos (com filtros)
router.get('/:id', auth, roomController.getRoomById);      // Obter um quarto por ID

// Escrita: somente funcionários (admin/recepcionista).
router.post('/', auth, authorize(['admin', 'recepcionista']), roomController.createRoom);
router.put('/:id', auth, authorize(['admin', 'recepcionista']), roomController.updateRoom);
router.delete('/:id', auth, authorize(['admin', 'recepcionista']), roomController.deleteRoom);

module.exports = router;